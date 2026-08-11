import { io, type Socket } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../api/client';
import type { BookingEvent } from '../types/domain';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000/ws';

export function useBookingNotifications(onEvent: (e: BookingEvent) => void) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.onAny((event: string, payload: unknown) => {
      if (event.startsWith('booking.') && payload) {
        onEvent(payload as BookingEvent);
      }
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected };
}