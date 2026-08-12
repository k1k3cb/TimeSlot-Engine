export type Role = 'ADMIN' | 'CLIENT';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type BookingMode = 'EXCLUSIVE' | 'SHARED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface ResourceSchedule {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  mode: BookingMode;
  capacity: number;
  timezone: string;
  isActive: boolean;
  schedules: ResourceSchedule[];
  createdAt: string;
  updatedAt: string;
}

export interface Slot {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  resourceId: string;
  timezone: string;
  date: string;
  slotMinutes: number;
  slots: Slot[];
}

export interface CreateBookingInput {
  resourceId: string;
  startAt: string;
  durationMinutes?: number;
  notes?: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  notes: string | null;
  cancelledAt: string | null;
  refundPct: number | null;
  resource: { id: string; name: string; timezone?: string };
  user?: { id: string; name: string; email: string };
}

export interface TieredRule {
  hoursBeforeStart: number;
  refundPct: number;
  label?: string;
}

export interface CancellationPolicy {
  id: string;
  resourceId: string | null;
  rules: TieredRule[];
}

export interface BookingEvent {
  type: 'created' | 'confirmed' | 'cancelled' | 'modified';
  booking: Booking;
  actorId: string;
  message: string;
  at: string;
}