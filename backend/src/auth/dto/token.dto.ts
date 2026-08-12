import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserDto {
  @ApiProperty({ example: 'cmspa0dc200007ggxsn3bsgow' })
  id!: string;

  @ApiProperty({ example: 'admin@timeslot.dev' })
  email!: string;

  @ApiProperty({ example: 'Admin TimeSlot' })
  name!: string;

  @ApiProperty({ enum: ['ADMIN', 'CLIENT'], example: 'ADMIN' })
  role!: Role;
}

export class TokenPairDto {
  @ApiProperty({ description: 'JWT access token (15 min TTL)' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token (7 días TTL)' })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'TTL del access token en segundos' })
  expiresIn!: number;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}

export class AccessTokenDto {
  @ApiProperty({ description: 'Nuevo JWT access token' })
  accessToken!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}