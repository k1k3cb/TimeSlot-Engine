import axios, { type AxiosInstance } from 'axios';
import type { AuthResponse } from '../types/domain';

const STORAGE_KEY = 'timeslot-auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthResponse['user'];
}

export function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function persistAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api: AxiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let memoryAuth: StoredAuth | null = loadStoredAuth();

export function setMemoryAuth(auth: StoredAuth | null): void {
  memoryAuth = auth;
  if (auth) persistAuth(auth);
  else clearAuth();
}

export function getAccessToken(): string | null {
  return memoryAuth?.accessToken ?? null;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as { _retry?: boolean; headers: Record<string, string> };
    if (
      error.response?.status === 401 &&
      !original._retry &&
      memoryAuth?.refreshToken
    ) {
      original._retry = true;
      try {
        const res = await axios.post<AuthResponse>(
          `${baseURL}/auth/refresh`,
          { refreshToken: memoryAuth.refreshToken },
        );
        const next: StoredAuth = {
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          user: memoryAuth.user,
        };
        setMemoryAuth(next);
        original.headers.Authorization = `Bearer ${next.accessToken}`;
        return api.request(original);
      } catch (e) {
        setMemoryAuth(null);
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);