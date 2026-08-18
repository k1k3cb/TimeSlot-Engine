import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;
  let policies: any;
  let notifications: any;

  const mockBooking = {
    id: 'booking-1',
    resourceId: 'res-1',
    userId: 'user-1',
    startAt: new Date('2030-01-15T10:00:00Z'),
    endAt: new Date('2030-01-15T11:00:00Z'),
    status: 'CONFIRMED',
    notes: null,
    refundPct: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResource = {
    id: 'res-1',
    name: 'Court 1',
    isActive: true,
    schedules: [],
  };

  beforeEach(async () => {
    prisma = {
      resource: { findUnique: jest.fn().mockResolvedValue(mockResource) },
      booking: {
        findUnique: jest.fn().mockResolvedValue(mockBooking),
        create: jest.fn().mockResolvedValue(mockBooking),
        update: jest.fn().mockResolvedValue(mockBooking),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    };

    // Default: transaction executes callback with tx
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => {
      return cb(prisma);
    });
    prisma.$queryRaw.mockResolvedValue([{ exists: false }]);

    policies = {
      resolveForResource: jest.fn().mockResolvedValue({
        calculateRefund: jest.fn().mockReturnValue({ refundPct: 100, appliedRule: 'free-24h' }),
      }),
    };

    notifications = {
      bookingCreated: jest.fn(),
      bookingCancelled: jest.fn(),
      bookingConfirmed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PoliciesService, useValue: policies },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const futureDate = new Date('2030-01-15T10:00:00Z');

    it('creates a booking with correct endAt', async () => {
      const result = await service.create({
        resourceId: 'res-1',
        userId: 'user-1',
        startAt: futureDate,
        durationMinutes: 90,
      });
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startAt: futureDate,
            endAt: new Date(futureDate.getTime() + 90 * 60000),
            status: 'CONFIRMED',
          }),
        }),
      );
    });

    it('throws on past date', async () => {
      const pastDate = new Date('2020-01-01T10:00:00Z');
      await expect(
        service.create({ resourceId: 'res-1', userId: 'user-1', startAt: pastDate }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws on endAt <= startAt (duration 0)', async () => {
      await expect(
        service.create({ resourceId: 'res-1', userId: 'user-1', startAt: futureDate, durationMinutes: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws on inactive resource', async () => {
      prisma.resource.findUnique.mockResolvedValue({ ...mockResource, isActive: false });
      await expect(
        service.create({ resourceId: 'res-1', userId: 'user-1', startAt: futureDate }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws on non-existent resource', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ resourceId: 'missing', userId: 'user-1', startAt: futureDate }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on overlap', async () => {
      prisma.$queryRaw.mockResolvedValue([{ exists: true }]);
      await expect(
        service.create({ resourceId: 'res-1', userId: 'user-1', startAt: futureDate }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws on Prisma exclusion violation error', async () => {
      prisma.$transaction.mockRejectedValue(
        Object.assign(new Error('23P01 exclusion violation'), {
          code: 'P2010',
          meta: { code: '23P01' },
          name: 'PrismaClientKnownRequestError',
        }),
      );
      await expect(
        service.create({ resourceId: 'res-1', userId: 'user-1', startAt: futureDate }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('cancels a valid booking and returns refund info', async () => {
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'CANCELLED', refundPct: 100 });

      const result = await service.cancel({
        bookingId: 'booking-1',
        userId: 'user-1',
        userRole: 'CLIENT',
        now: new Date('2030-01-14T08:00:00Z'),
      });
      expect(result.status).toBe('CANCELLED');
      expect(result.refundPct).toBe(100);
      expect(notifications.bookingCancelled).toHaveBeenCalled();
    });

    it('throws on non-existent booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.cancel({ bookingId: 'missing', userId: 'user-1', userRole: 'CLIENT' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when user cancels another user booking', async () => {
      await expect(
        service.cancel({ bookingId: 'booking-1', userId: 'other-user', userRole: 'CLIENT' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to cancel another user booking', async () => {
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'CANCELLED', refundPct: 100 });
      const result = await service.cancel({
        bookingId: 'booking-1',
        userId: 'admin-1',
        userRole: 'ADMIN',
        now: new Date('2030-01-14T08:00:00Z'),
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('throws on already cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'CANCELLED' });
      await expect(
        service.cancel({ bookingId: 'booking-1', userId: 'user-1', userRole: 'CLIENT' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws on already started booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        startAt: new Date('2020-01-01T10:00:00Z'),
      });
      await expect(
        service.cancel({
          bookingId: 'booking-1',
          userId: 'user-1',
          userRole: 'CLIENT',
          now: new Date('2020-01-01T11:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('confirms a booking', async () => {
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'CONFIRMED' });
      const result = await service.confirm('booking-1');
      expect(result.status).toBe('CONFIRMED');
    });

    it('throws on cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'CANCELLED' });
      await expect(service.confirm('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('throws on non-existent booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.confirm('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAttendance', () => {
    it('marks booking as completed', async () => {
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'COMPLETED' });
      const result = await service.markAttendance('booking-1');
      expect(result.status).toBe('COMPLETED');
    });

    it('throws on cancelled booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'CANCELLED' });
      await expect(service.markAttendance('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('throws on NO_SHOW booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'NO_SHOW' });
      await expect(service.markAttendance('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('throws on already completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'COMPLETED' });
      await expect(service.markAttendance('booking-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markNoShow', () => {
    it('marks confirmed booking as NO_SHOW when past start', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        startAt: new Date('2020-01-01T10:00:00Z'),
        status: 'CONFIRMED',
      });
      prisma.booking.update.mockResolvedValue({ ...mockBooking, status: 'NO_SHOW' });
      const result = await service.markNoShow('booking-1');
      expect(result.status).toBe('NO_SHOW');
    });

    it('throws on COMPLETED booking', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...mockBooking, status: 'COMPLETED' });
      await expect(service.markNoShow('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('throws when booking has not started yet', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        startAt: new Date('2030-01-15T10:00:00Z'),
        status: 'CONFIRMED',
      });
      await expect(service.markNoShow('booking-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('returns booking with resource', async () => {
      const result = await service.findById('booking-1');
      expect(result.id).toBe('booking-1');
    });

    it('throws on non-existent booking', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listForUser', () => {
    it('returns user bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([mockBooking]);
      const result = await service.listForUser('user-1');
      expect(result).toHaveLength(1);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('filters by statuses when provided', async () => {
      prisma.booking.findMany.mockResolvedValue([]);
      await service.listForUser('user-1', ['CONFIRMED', 'PENDING']);
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['CONFIRMED', 'PENDING'] } }),
        }),
      );
    });
  });

  describe('getMinutesUntil', () => {
    it('returns correct minutes', () => {
      const start = new Date('2030-01-15T12:00:00Z');
      const now = new Date('2030-01-15T10:00:00Z');
      expect(service.getMinutesUntil(start, now)).toBe(120);
    });
  });
});
