import { api } from './client';
import type {
  AuthResponse,
  AvailabilityResponse,
  Booking,
  CancellationPolicy,
  Resource,
  TieredRule,
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

export interface CreateResourcePayload {
  name: string;
  description?: string;
  mode?: 'EXCLUSIVE' | 'SHARED';
  capacity?: number;
  timezone?: string;
  isActive?: boolean;
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[];
}

export interface UpdateResourcePayload {
  name?: string;
  description?: string;
  mode?: 'EXCLUSIVE' | 'SHARED';
  capacity?: number;
  timezone?: string;
  isActive?: boolean;
  schedules?: { dayOfWeek: number; openTime: string; closeTime: string }[];
}

export const resourcesApi = {
  list: (params?: { onlyActive?: boolean }) =>
    api.get<Resource[]>('/resources', { params }).then((r) => r.data),
  listAll: () =>
    api.get<Resource[]>('/resources', { params: { onlyActive: false } }).then((r) => r.data),
  get: (id: string) => api.get<Resource>(`/resources/${id}`).then((r) => r.data),
  create: (payload: CreateResourcePayload) =>
    api.post<Resource>('/resources', payload).then((r) => r.data),
  update: (id: string, payload: UpdateResourcePayload) =>
    api.patch<Resource>(`/resources/${id}`, payload).then((r) => r.data),
  delete: (id: string) => api.delete(`/resources/${id}`),
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
  list: (params?: { status?: string; resourceId?: string; userId?: string }) =>
    api.get<Booking[]>('/bookings', { params }).then((r) => r.data),
  cancel: (id: string, reason?: string) =>
    api.patch<Booking>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
  confirm: (id: string) =>
    api.patch<Booking>(`/bookings/${id}/confirm`).then((r) => r.data),
  attend: (id: string) =>
    api.patch<Booking>(`/bookings/${id}/attend`).then((r) => r.data),
  markNoShow: (id: string) =>
    api.patch<Booking>(`/bookings/${id}/no-show`).then((r) => r.data),
};

export const policiesApi = {
  defaults: () => api.get<{ rules: TieredRule[] }>('/policies/defaults').then((r) => r.data),
  setGlobal: (rules: TieredRule[]) =>
    api.post<CancellationPolicy>('/policies/global', { rules }).then((r) => r.data),
  setForResource: (resourceId: string, rules: TieredRule[]) =>
    api.post<CancellationPolicy>(`/policies/resource/${resourceId}`, { rules }).then((r) => r.data),
};