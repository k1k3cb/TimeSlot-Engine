import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'juan@timeslot.dev', description: 'Email del usuario' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Client#2026', minLength: 8, description: 'Contraseña (mín. 8 chars, mayúscula, minúscula, dígito)' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain at least one digit' })
  password!: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre completo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@timeslot.dev' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Admin#2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token obtenido del login' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'CLIENT'], example: 'CLIENT' })
  @IsOptional()
  role?: 'ADMIN' | 'CLIENT';
}