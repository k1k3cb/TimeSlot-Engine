import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Booking, BookingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';
import { differenceInMinutes } from '../policies/utils/time-diff';

interface CreateBookingInput {
  resourceId: string;
  userId: string;
  startAt: Date;
  durationMinutes?: number;
  notes?: string;
}

interface CancelBookingInput {
  bookingId: string;
  userId: string;
  userRole: Role;
  reason?: string;
  now?: Date;
}

const EXCLUSION_VIOLATION = 'P2010';
const PG_EXCLUSION = '23P01';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: PoliciesService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(input: CreateBookingInput): Promise<Booking> {
    const duration = input.durationMinutes ?? 60;
    const startAt = input.startAt;
    const endAt = new Date(startAt.getTime() + duration * 60_000);

    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const now = new Date();
    if (startAt < now) {
      throw new BadRequestException('Cannot book in the past');
    }

    const resource = await this.prisma.resource.findUnique({
      where: { id: input.resourceId },
      include: { schedules: true },
    });
    if (!resource) throw new NotFoundException(`Resource ${input.resourceId} not found`);
    if (!resource.isActive) throw new BadRequestException('Resource is not active');

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const conflict = await tx.$queryRaw<Array<{ exists: boolean }>>`
            SELECT EXISTS (
              SELECT 1 FROM "Booking"
              WHERE "resourceId" = ${input.resourceId}
                AND status IN ('PENDING','CONFIRMED')
                AND tstzrange(${startAt}::timestamptz, ${endAt}::timestamptz, '[)')
                     && "time_range"
            ) AS exists
          `;
          if (conflict[0]?.exists) {
            throw new ConflictException('Slot already booked');
          }

          return tx.booking.create({
            data: {
              resourceId: input.resourceId,
              userId: input.userId,
              startAt,
              endAt,
              notes: input.notes,
              status: 'CONFIRMED',
            },
            include: { resource: { select: { id: true, name: true } } },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (this.isOverlapError(e)) {
        throw new ConflictException('Slot already booked');
      }
      throw e;
    }
  }

  /** Wrapper that creates and notifies (callers that want side effects). */
  async createAndNotify(input: CreateBookingInput): Promise<Booking> {
    const booking = await this.create(input);
    this.notifications.bookingCreated(booking as Booking & { resource: { id: string; name: string } });
    return booking;
  }

  async findById(id: string): Promise<Booking & { resource: { id: string; name: string } }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { resource: { select: { id: true, name: true, timezone: true } } },
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking as Booking & { resource: { id: string; name: string } };
  }

  async listForUser(userId: string, statuses?: BookingStatus[]): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: {
        userId,
        ...(statuses && statuses.length > 0 ? { status: { in: statuses } } : {}),
      },
      include: { resource: { select: { id: true, name: true, timezone: true } } },
      orderBy: { startAt: 'desc' },
    });
  }

  async listAll(filter?: { resourceId?: string; userId?: string; status?: BookingStatus }): Promise<Booking[]> {
    return this.prisma.booking.findMany({
      where: {
        ...(filter?.resourceId ? { resourceId: filter.resourceId } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
      },
      include: { resource: { select: { id: true, name: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { startAt: 'desc' },
    });
  }

  async cancel(input: CancelBookingInput): Promise<Booking & { refundPct: number; refundAmount: number }> {
    const now = input.now ?? new Date();
    const booking = await this.prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) throw new NotFoundException(`Booking ${input.bookingId} not found`);
    if (booking.userId !== input.userId && input.userRole !== 'ADMIN') {
      throw new ForbiddenException('Cannot cancel another user booking');
    }
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException(`Cannot cancel booking in state ${booking.status}`);
    }
    if (booking.startAt <= now) {
      throw new BadRequestException('Cannot cancel a booking that already started');
    }

    const policy = await this.policies.resolveForResource(booking.resourceId);
    const { refundPct, appliedRule } = policy.calculateRefund({
      now,
      bookingStart: booking.startAt,
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        refundPct,
      },
      include: { resource: { select: { id: true, name: true } } },
    });

    this.logger.log(
      `Booking ${booking.id} cancelled by user=${input.userId} rule=${appliedRule} refund=${refundPct}%`,
    );
    this.notifications.bookingCancelled(
      updated as Booking & { resource: { id: string; name: string } },
      input.userId,
    );
    return Object.assign(updated, { refundPct, refundAmount: 0 });
  }

  async confirm(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot confirm a cancelled booking');
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async complete(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') {
      throw new BadRequestException(`Cannot complete booking in state ${booking.status}`);
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async markNoShow(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
      throw new BadRequestException(`Cannot mark no-show for booking in state ${booking.status}`);
    }
    const now = new Date();
    if (booking.startAt > now) {
      throw new BadRequestException('Cannot mark no-show before the booking start time');
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'NO_SHOW' },
    });
  }

  private isOverlapError(e: unknown): boolean {
    if (!(e instanceof Error)) return false;
    const msg = e.message ?? '';
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === EXCLUSION_VIOLATION) {
        const meta = (e.meta ?? {}) as { code?: string };
        return meta.code === PG_EXCLUSION || msg.includes(PG_EXCLUSION);
      }
    }
    return msg.includes(PG_EXCLUSION) || msg.includes('booking_no_overlap');
  }

  getMinutesUntil(start: Date, now: Date): number {
    return differenceInMinutes(start, now);
  }
}