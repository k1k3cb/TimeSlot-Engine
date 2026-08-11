import { api } from './client';
import type {
  AuthResponse,
  AvailabilityResponse,
  Booking,
  Resource,
  CreateBookingInput,
} from '../types/domain';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, name: string) =>
    api
      .post<AuthResponse['user']>('/auth/register', { email, password, name })
      .then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const resourcesApi = {
  list: () => api.get<Resource[]>('/resources').then((r) => r.data),
  get: (id: string) => api.get<Resource>(`/resources/${id}`).then((r) => r.data),
  create: (payload: Partial<Resource> & { schedules: unknown[] }) =>
    api.post<Resource>('/resources', payload).then((r) => r.data),
};

export const availabilityApi = {
  compute: (params: { resourceId: string; date: string; slotMinutes?: number }) =>
    api
      .get<AvailabilityResponse>('/availability', { params })
      .then((r) => r.data),
};

export const bookingsApi = {
  create: (payload: CreateBookingInput) =>
    api.post<Booking>('/bookings', payload).then((r) => r.data),
  list: (params?: { status?: string }) =>
    api.get<Booking[]>('/bookings', { params }).then((r) => r.data),
  cancel: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
};