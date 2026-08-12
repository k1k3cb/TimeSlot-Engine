import type { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface RequestUser extends AuthenticatedUser {
  iat?: number;
  exp?: number;
}