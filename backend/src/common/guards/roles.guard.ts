import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/auth.decorators';
import type { RequestUser } from '../types/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user) throw new ForbiddenException('No user in request');

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} not in required: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}