import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { Booking } from '@prisma/client';
import { WsJwtGuard } from './ws-jwt.guard';

export interface BookingEvent {
  type: 'created' | 'confirmed' | 'cancelled' | 'modified';
  booking: Booking & { resource?: { id: string; name: string } };
  actorId: string;
  message: string;
  at: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const user = client.data?.user;
    if (!user) {
      client.disconnect(true);
      return;
    }
    void client.join(`user:${user.id}`);
    if (user.role === 'ADMIN') void client.join('admins');
    this.logger.log(`Client ${client.id} connected (user=${user.id}, role=${user.role})`);
    client.emit('connected', { userId: user.id, role: user.role });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  ping(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    if (!data) throw new WsException('Missing payload');
    return { event: 'pong', data: { receivedAt: new Date().toISOString() } };
  }

  notifyBookingChange(event: BookingEvent): void {
    this.server.to(`user:${event.booking.userId}`).emit(`booking.${event.type}`, event);
    this.server.to('admins').emit(`booking.${event.type}`, event);
    this.logger.log(
      `booking.${event.type} → user:${event.booking.userId} + admins (booking=${event.booking.id})`,
    );
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}