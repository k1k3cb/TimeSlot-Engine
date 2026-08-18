import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('./algorithms/slot-generator', () => ({
  generateSlots: jest.fn().mockReturnValue([
    { start: new Date('2026-01-12T09:00:00Z'), end: new Date('2026-01-12T10:00:00Z') },
  ]),
}));

import { generateSlots } from './algorithms/slot-generator';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: any;

  const mockResource = {
    id: 'res-1',
    name: 'Court 1',
    isActive: true,
    timezone: 'UTC',
    schedules: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' }],
  };

  beforeEach(async () => {
    prisma = {
      resource: { findUnique: jest.fn().mockResolvedValue(mockResource) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('compute', () => {
    it('returns slots for valid resource and date', async () => {
      const result = await service.compute('res-1', '2026-01-12');
      expect(result.resourceId).toBe('res-1');
      expect(result.slots).toHaveLength(1);
      expect(result.timezone).toBe('UTC');
    });

    it('throws NotFoundException for missing resource', async () => {
      prisma.resource.findUnique.mockResolvedValue(null);
      await expect(service.compute('missing', '2026-01-12')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for inactive resource', async () => {
      prisma.resource.findUnique.mockResolvedValue({ ...mockResource, isActive: false });
      await expect(service.compute('res-1', '2026-01-12')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid date', async () => {
      await expect(service.compute('res-1', 'not-a-date')).rejects.toThrow(BadRequestException);
    });

    it('passes timezone from resource to generateSlots', async () => {
      prisma.resource.findUnique.mockResolvedValue({ ...mockResource, timezone: 'America/Mexico_City' });
      await service.compute('res-1', '2026-01-12');
      expect(generateSlots).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: 'America/Mexico_City' }),
      );
    });

    it('passes existing bookings to generateSlots', async () => {
      const bookings = [
        { startAt: new Date('2026-01-12T09:00:00Z'), endAt: new Date('2026-01-12T10:00:00Z') },
      ];
      prisma.booking.findMany.mockResolvedValue(bookings);
      await service.compute('res-1', '2026-01-12');
      expect(generateSlots).toHaveBeenCalledWith(
        expect.objectContaining({
          existingBookings: [{ start: bookings[0].startAt, end: bookings[0].endAt }],
        }),
      );
    });

    it('passes fromTime and toTime when provided', async () => {
      await service.compute('res-1', '2026-01-12', '10:00', '11:00', 30);
      expect(generateSlots).toHaveBeenCalledWith(
        expect.objectContaining({ fromTime: '10:00', toTime: '11:00', slotMinutes: 30 }),
      );
    });
  });
});
