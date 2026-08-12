import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import { TokenPairDto, UserDto } from './dto/token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/auth.decorators';
import { ErrorResponseDto } from '../common/dto/response.dto';
import type { RequestUser } from '../common/types/auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado', type: UserDto })
  @ApiResponse({ status: 409, description: 'Email ya registrado', type: ErrorResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Tokens JWT + datos de usuario', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas', type: ErrorResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Nuevo access token', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado', type: ErrorResponseDto })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar sesión (revocar refresh token)' })
  @ApiResponse({ status: 204, description: 'Sesión cerrada' })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar todas las sesiones' })
  @ApiResponse({ status: 204, description: 'Todas las sesiones cerradas' })
  async logoutAll(@CurrentUser() user: RequestUser) {
    await this.auth.logoutAll(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Obtener usuario actual' })
  @ApiResponse({ status: 200, description: 'Datos del usuario autenticado', type: UserDto })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}