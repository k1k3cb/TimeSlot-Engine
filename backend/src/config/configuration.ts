import { registerAs } from '@nestjs/config';
import type { Env } from './env.validation';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET as string,
  refreshSecret: process.env.JWT_REFRESH_SECRET as string,
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
}));

export const argon2Config = registerAs('argon2', () => ({
  memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
  timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
  parallelism: Number(process.env.ARGON2_PARALLELISM ?? 1),
}));

export const corsConfig = registerAs('cors', () => ({
  origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}));

export type AppConfig = {
  JWT_ACCESS_SECRET: Env['JWT_ACCESS_SECRET'];
  JWT_REFRESH_SECRET: Env['JWT_REFRESH_SECRET'];
  JWT_ACCESS_TTL: Env['JWT_ACCESS_TTL'];
  JWT_REFRESH_TTL: Env['JWT_REFRESH_TTL'];
};