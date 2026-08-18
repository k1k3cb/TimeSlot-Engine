import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let gateway: Record<string, jest.Mock>;

  const mockBooking = {
    id: 'b-1',
    userId: 'user-1',
    resourceId: 'res-1',
    startAt: new Date(),
    endAt: new Date(),
    status: 'CONFIRMED',
    notes: null,
    refundPct: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    resource: { id: 'res-1', name: 'Court 1' },
  };

  beforeEach(() => {
    gateway = {
      notifyBookingChange: jest.fn(),
    };
    service = new NotificationsService(gateway as unknown as NotificationsGateway);
  });

  describe('bookingCreated', () => {
    it('emits created event with correct type and actorId', () => {
      service.bookingCreated(mockBooking as never);
      expect(gateway.notifyBookingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'created',
          actorId: 'user-1',
          message: 'Nueva reserva en Court 1',
        }),
      );
    });
  });

  describe('bookingConfirmed', () => {
    it('emits confirmed event with actorId=system', () => {
      service.bookingConfirmed(mockBooking as never);
      expect(gateway.notifyBookingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirmed',
          actorId: 'system',
        }),
      );
    });
  });

  describe('bookingCancelled', () => {
    it('emits cancelled event with passed actorId', () => {
      service.bookingCancelled(mockBooking as never, 'admin-1');
      expect(gateway.notifyBookingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cancelled',
          actorId: 'admin-1',
        }),
      );
    });
  });
});
