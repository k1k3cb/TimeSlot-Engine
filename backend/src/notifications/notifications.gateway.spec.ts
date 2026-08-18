import { NotificationsGateway, type BookingEvent } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let mockServer: Record<string, jest.Mock>;

  beforeEach(() => {
    gateway = new NotificationsGateway();
    mockServer = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };
    gateway.server = mockServer as never;
  });

  describe('handleConnection', () => {
    it('joins user room and emits connected event', () => {
      const client = {
        data: { user: { id: 'user-1', role: 'CLIENT' } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-1',
      };
      gateway.handleConnection(client as never);
      expect(client.join).toHaveBeenCalledWith('user:user-1');
      expect(client.emit).toHaveBeenCalledWith('connected', { userId: 'user-1', role: 'CLIENT' });
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('joins admins room for ADMIN users', () => {
      const client = {
        data: { user: { id: 'admin-1', role: 'ADMIN' } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-2',
      };
      gateway.handleConnection(client as never);
      expect(client.join).toHaveBeenCalledWith('user:admin-1');
      expect(client.join).toHaveBeenCalledWith('admins');
    });

    it('does not join admins room for non-ADMIN users', () => {
      const client = {
        data: { user: { id: 'user-1', role: 'CLIENT' } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-3',
      };
      gateway.handleConnection(client as never);
      expect(client.join).not.toHaveBeenCalledWith('admins');
    });

    it('disconnects client when no user in data', () => {
      const client = {
        data: {},
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        id: 'socket-4',
      };
      gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('notifyBookingChange', () => {
    it('emits to user room and admins room', () => {
      const event: BookingEvent = {
        type: 'created',
        booking: { id: 'b-1', userId: 'user-1' } as BookingEvent['booking'],
        actorId: 'user-1',
        message: 'test',
        at: new Date().toISOString(),
      };
      gateway.notifyBookingChange(event);
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.to).toHaveBeenCalledWith('admins');
    });
  });

  describe('emitToUser', () => {
    it('emits event to specific user room', () => {
      gateway.emitToUser('user-1', 'custom-event', { data: 1 });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('ping', () => {
    it('returns pong with receivedAt', () => {
      const result = gateway.ping({ test: true }, {} as never);
      expect(result.event).toBe('pong');
      expect(result.data.receivedAt).toBeDefined();
    });

    it('throws WsException on missing payload', () => {
      expect(() => gateway.ping(null, {} as never)).toThrow();
    });
  });
});
