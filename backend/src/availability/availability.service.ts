import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlots } from './algorithms/slot-generator';
import type { AvailabilityResponseDto, SlotDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(
    resourceId: string,
    date: string,
    fromTime?: string,
    toTime?: string,
    slotMinutes = 60,
  ): Promise<AvailabilityResponseDto> {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { schedules: true },
    });
    if (!resource) throw new NotFoundException(`Resource ${resourceId} not found`);
    if (!resource.isActive) {
      throw new BadRequestException('Resource is not active');
    }

    const tz = resource.timezone || 'UTC';
    const dayStartLocal = DateTime.fromISO(date, { zone: tz });
    if (!dayStartLocal.isValid) {
      throw new BadRequestException(`Invalid date for timezone ${tz}`);
    }
    const dayEndLocal = dayStartLocal.plus({ days: 1 });

    const bookings = await this.prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: { lt: dayEndLocal.toJSDate() },
        endAt: { gt: dayStartLocal.toJSDate() },
      },
      select: { startAt: true, endAt: true },
    });

    const slots = generateSlots({
      date,
      timezone: tz,
      schedules: resource.schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        openTime: s.openTime,
        closeTime: s.closeTime,
      })),
      existingBookings: bookings.map((b) => ({ start: b.startAt, end: b.endAt })),
      slotMinutes,
      now: new Date(),
      fromTime,
      toTime,
    });

    const dto: AvailabilityResponseDto = {
      resourceId,
      timezone: tz,
      date,
      slotMinutes,
      slots: slots.map<SlotDto>((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    };
    return dto;
  }
}