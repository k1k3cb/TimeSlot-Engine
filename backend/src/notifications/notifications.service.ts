import { Injectable, Logger } from '@nestjs/common';
import { NotificationsGateway, type BookingEvent } from './notifications.gateway';
import type { Booking } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  bookingCreated(booking: Booking & { resource?: { id: string; name: string } }): void {
    const event: BookingEvent = {
      type: 'created',
      booking,
      actorId: booking.userId,
      message: `Nueva reserva en ${booking.resource?.name ?? 'recurso'}`,
      at: new Date().toISOString(),
    };
    this.gateway.notifyBookingChange(event);
  }

  bookingConfirmed(booking: Booking & { resource?: { id: string; name: string } }): void {
    const event: BookingEvent = {
      type: 'confirmed',
      booking,
      actorId: 'system',
      message: `Reserva confirmada en ${booking.resource?.name ?? 'recurso'}`,
      at: new Date().toISOString(),
    };
    this.gateway.notifyBookingChange(event);
  }

  bookingCancelled(
    booking: Booking & { resource?: { id: string; name: string } },
    actorId: string,
  ): void {
    const event: BookingEvent = {
      type: 'cancelled',
      booking,
      actorId,
      message: `Reserva cancelada en ${booking.resource?.name ?? 'recurso'}`,
      at: new Date().toISOString(),
    };
    this.gateway.notifyBookingChange(event);
  }
}