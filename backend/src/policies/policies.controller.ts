import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { PoliciesService } from './policies.service';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Public()
  @Get('defaults')
  @ApiOperation({ summary: 'Política de cancelación por defecto', description: 'Devuelve las reglas de reembolso por defecto (24h: 100%, 2h: 50%, <2h: 0%).' })
  @ApiResponse({ status: 200, description: 'Reglas de política por defecto' })
  defaults() {
    return { rules: this.policies.getDefaultRules() };
  }

  @Public()
  @Get('resource/:resourceId')
  @ApiOperation({ summary: 'Política de cancelación para un recurso', description: 'Devuelve las reglas de reembolso aplicables a un recurso específico (custom, global o default).' })
  @ApiResponse({ status: 200, description: 'Reglas de política para el recurso' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  async getResourcePolicy(@Param('resourceId', ParseCuidPipe) resourceId: string) {
    const { rules, source } = await this.policies.getRulesForResource(resourceId);
    return { rules, source };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('global')
  @ApiOperation({ summary: 'Establecer política global (ADMIN)', description: 'Define la política de cancelación por defecto para todos los recursos que no tengan una política propia.' })
  @ApiResponse({ status: 201, description: 'Política global establecida' })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Rol insuficiente', type: ErrorResponseDto })
  setGlobal(@Body() body: { rules: { hoursBeforeStart: number; refundPct: number }[] }) {
    return this.policies.setGlobal(body.rules);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('resource/:resourceId')
  @ApiOperation({ summary: 'Establecer política por recurso (ADMIN)', description: 'Define una política de cancelación específica para un recurso. Sobreescribe la política global.' })
  @ApiResponse({ status: 201, description: 'Política de recurso establecida' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  setForResource(
    @Param('resourceId', ParseCuidPipe) resourceId: string,
    @Body() body: { rules: { hoursBeforeStart: number; refundPct: number }[] },
  ) {
    return this.policies.setForResource(resourceId, body.rules);
  }
}