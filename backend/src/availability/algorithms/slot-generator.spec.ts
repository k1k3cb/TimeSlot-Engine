import { generateSlots } from './slot-generator';

describe('generateSlots', () => {
  const schedules = [
    { dayOfWeek: 1, openTime: '09:00', closeTime: '12:00' },
    { dayOfWeek: 2, openTime: '10:00', closeTime: '13:00' },
  ];

  it('returns empty when no schedule matches weekday', () => {
    // 2026-01-15 is a Thursday
    const slots = generateSlots({
      date: '2026-01-15',
      timezone: 'UTC',
      schedules,
      existingBookings: [],
      slotMinutes: 60,
    });
    expect(slots).toHaveLength(0);
  });

  it('generates slots aligned to schedule window', () => {
    // 2026-01-12 is a Monday (UTC)
    const slots = generateSlots({
      date: '2026-01-12',
      timezone: 'UTC',
      schedules,
      existingBookings: [],
      slotMinutes: 60,
    });
    expect(slots).toHaveLength(3);
    expect(slots[0].start.toISOString()).toBe('2026-01-12T09:00:00.000Z');
    expect(slots[0].end.toISOString()).toBe('2026-01-12T10:00:00.000Z');
    expect(slots[2].end.toISOString()).toBe('2026-01-12T12:00:00.000Z');
  });

  it('respects resource timezone when generating', () => {
    // 2026-01-13 is a Tuesday. With America/Mexico_City (UTC-6),
    // openTime 10:00 local == 16:00 UTC
    const slots = generateSlots({
      date: '2026-01-13',
      timezone: 'America/Mexico_City',
      schedules,
      existingBookings: [],
      slotMinutes: 60,
    });
    expect(slots).toHaveLength(3);
    expect(slots[0].start.toISOString()).toBe('2026-01-13T16:00:00.000Z');
    expect(slots[0].end.toISOString()).toBe('2026-01-13T17:00:00.000Z');
  });

  it('subtracts existing bookings', () => {
    // 2026-01-12 Monday 09:00-10:00 UTC is taken
    const slots = generateSlots({
      date: '2026-01-12',
      timezone: 'UTC',
      schedules,
      existingBookings: [
        {
          start: new Date('2026-01-12T09:00:00Z'),
          end: new Date('2026-01-12T10:00:00Z'),
        },
      ],
      slotMinutes: 60,
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].start.toISOString()).toBe('2026-01-12T10:00:00.000Z');
  });

  it('half-open semantics: booking [10,11) does not block [11,12)', () => {
    const slots = generateSlots({
      date: '2026-01-12',
      timezone: 'UTC',
      schedules,
      existingBookings: [
        {
          start: new Date('2026-01-12T10:00:00Z'),
          end: new Date('2026-01-12T11:00:00Z'),
        },
      ],
      slotMinutes: 60,
    });
    expect(slots.map((s) => s.start.toISOString())).toEqual([
      '2026-01-12T09:00:00.000Z',
      '2026-01-12T11:00:00.000Z',
    ]);
  });

  it('15-minute granularity with 60-min duration works', () => {
    const slots = generateSlots({
      date: '2026-01-12',
      timezone: 'UTC',
      schedules,
      existingBookings: [],
      slotMinutes: 15,
    });
    expect(slots).toHaveLength(12); // 3h / 15min = 12 slots
  });
});