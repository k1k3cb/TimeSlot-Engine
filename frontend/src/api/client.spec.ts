import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  },
  writable: true,
});

// We need to reset modules so that loadStoredAuth re-reads localStorage
beforeEach(() => {
  vi.resetModules();
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockRemoveItem.mockReset();
});

describe('loadStoredAuth', () => {
  it('returns null when no stored auth', async () => {
    mockGetItem.mockReturnValue(null);
    const { loadStoredAuth } = await import('./client');
    expect(loadStoredAuth()).toBeNull();
  });

  it('returns parsed auth when valid JSON', async () => {
    const auth = { accessToken: 'at', refreshToken: 'rt', user: { id: '1' } };
    mockGetItem.mockReturnValue(JSON.stringify(auth));
    const { loadStoredAuth } = await import('./client');
    expect(loadStoredAuth()).toEqual(auth);
  });

  it('returns null when JSON is malformed', async () => {
    mockGetItem.mockReturnValue('not-json{{{');
    const { loadStoredAuth } = await import('./client');
    expect(loadStoredAuth()).toBeNull();
  });
});

describe('persistAuth', () => {
  it('stores auth in localStorage', async () => {
    mockGetItem.mockReturnValue(null);
    const { persistAuth } = await import('./client');
    const auth = { accessToken: 'at', refreshToken: 'rt', user: { id: '1' } };
    persistAuth(auth);
    expect(mockSetItem).toHaveBeenCalledWith('timeslot-auth', JSON.stringify(auth));
  });
});

describe('clearAuth', () => {
  it('removes auth from localStorage', async () => {
    mockGetItem.mockReturnValue(null);
    const { clearAuth } = await import('./client');
    clearAuth();
    expect(mockRemoveItem).toHaveBeenCalledWith('timeslot-auth');
  });
});

describe('setMemoryAuth / getAccessToken', () => {
  it('returns token after setMemoryAuth', async () => {
    mockGetItem.mockReturnValue(null);
    const { setMemoryAuth, getAccessToken } = await import('./client');
    const auth = { accessToken: 'my-token', refreshToken: 'rt', user: { id: '1' } };
    setMemoryAuth(auth);
    expect(getAccessToken()).toBe('my-token');
  });

  it('returns null after setMemoryAuth(null)', async () => {
    mockGetItem.mockReturnValue(null);
    const { setMemoryAuth, getAccessToken } = await import('./client');
    setMemoryAuth(null);
    expect(getAccessToken()).toBeNull();
  });

  it('persists to localStorage when auth is set', async () => {
    mockGetItem.mockReturnValue(null);
    const { setMemoryAuth } = await import('./client');
    const auth = { accessToken: 'at', refreshToken: 'rt', user: { id: '1' } };
    setMemoryAuth(auth);
    expect(mockSetItem).toHaveBeenCalledWith('timeslot-auth', JSON.stringify(auth));
  });

  it('clears localStorage when auth is null', async () => {
    mockGetItem.mockReturnValue(null);
    const { setMemoryAuth } = await import('./client');
    setMemoryAuth(null);
    expect(mockRemoveItem).toHaveBeenCalledWith('timeslot-auth');
  });
});
