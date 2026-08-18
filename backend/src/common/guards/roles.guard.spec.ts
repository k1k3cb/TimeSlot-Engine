import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/auth.decorators';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockContext = (user?: { id: string; role: string }) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  });

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const ctx = mockContext({ id: '1', role: 'CLIENT' });
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('allows when roles array is empty', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);
    const ctx = mockContext({ id: '1', role: 'CLIENT' });
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('throws ForbiddenException when no user in request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = mockContext(undefined);
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });

  it('allows when user role matches', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN', 'CLIENT']);
    const ctx = mockContext({ id: '1', role: 'ADMIN' });
    expect(guard.canActivate(ctx as never)).toBe(true);
  });

  it('throws when user role does not match', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    const ctx = mockContext({ id: '1', role: 'CLIENT' });
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
  });
});
