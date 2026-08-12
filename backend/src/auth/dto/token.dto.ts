import { Role } from '@prisma/client';

export class TokenPairDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
  user!: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export class AccessTokenDto {
  accessToken!: string;
  expiresIn!: number;
}