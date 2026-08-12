import { DateTime, Interval } from 'luxon';

export interface ScheduleWindow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface BookingWindow {
  start: Date;
  end: Date;
}

export interface Slot {
  start: Date;
  end: Date;
}

export interface GenerateSlotsInput {
  date: string;
  timezone: string;
  schedules: ScheduleWindow[];
  existingBookings: BookingWindow[];
  slotMinutes: number;
  /** When provided, slots ending before this Date are filtered out. */
  now?: Date;
  fromTime?: string;
  toTime?: string;
}

export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const { date, timezone, schedules, existingBookings, slotMinutes } = input;

  const tzDate = DateTime.fromISO(date, { zone: timezone });
  if (!tzDate.isValid) {
    throw new Error(`Invalid date "${date}" for timezone "${timezone}"`);
  }
  const dow = tzDate.weekday % 7;

  const todaysWindows = schedules.filter((s) => s.dayOfWeek === dow);

  const nowUtc = input.now ? DateTime.fromJSDate(input.now, { zone: 'utc' }) : null;
  const minStartUtc =
    nowUtc && nowUtc < tzDate.startOf('day').toUTC() ? nowUtc : null;

  const bookingsUtc = existingBookings.map((b) => ({
    start: DateTime.fromJSDate(b.start, { zone: 'utc' }),
    end: DateTime.fromJSDate(b.end, { zone: 'utc' }),
  }));

  const slots: Slot[] = [];
  for (const w of todaysWindows) {
    const [oh, om] = w.openTime.split(':').map(Number);
    const [ch, cm] = w.closeTime.split(':').map(Number);

    const openLocal = tzDate.set({ hour: oh, minute: om, second: 0, millisecond: 0 });
    const closeLocal = tzDate.set({ hour: ch, minute: cm, second: 0, millisecond: 0 });

    const windowUtc = Interval.fromDateTimes(openLocal, closeLocal);
    if (!windowUtc.isValid) continue;

    let cursor = openLocal;
    while (cursor.plus({ minutes: slotMinutes }) <= closeLocal) {
      const slotEnd = cursor.plus({ minutes: slotMinutes });
      const slotStartUtc = cursor.toUTC();
      const slotEndUtc = slotEnd.toUTC();

      const overlapsBooking = bookingsUtc.some(
        (b) => slotStartUtc < b.end && slotEndUtc > b.start,
      );
      if (overlapsBooking) {
        cursor = slotEnd;
        continue;
      }

      if (!minStartUtc || slotEndUtc > minStartUtc) {
        slots.push({
          start: slotStartUtc.toJSDate(),
          end: slotEndUtc.toJSDate(),
        });
      }

      cursor = slotEnd;
    }
  }

  if (input.fromTime || input.toTime) {
    const [fh, fm] = (input.fromTime ?? '00:00').split(':').map(Number);
    const [th, tm] = (input.toTime ?? '23:59').split(':').map(Number);
    const fromUtc = tzDate.set({ hour: fh, minute: fm }).toUTC();
    const toUtc = tzDate.set({ hour: th, minute: tm }).toUTC();
    return slots.filter((s) => {
      const sUtc = DateTime.fromJSDate(s.start, { zone: 'utc' });
      const eUtc = DateTime.fromJSDate(s.end, { zone: 'utc' });
      return sUtc >= fromUtc && eUtc <= toUtc;
    });
  }

  return slots;
}