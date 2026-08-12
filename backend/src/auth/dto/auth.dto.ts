import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, { message: 'password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'password must contain at least one digit' })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class UpdateUserRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  role?: 'ADMIN' | 'CLIENT';
}