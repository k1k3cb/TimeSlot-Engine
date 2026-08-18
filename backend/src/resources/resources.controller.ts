import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { ResourcesService } from './resources.service';
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  ResourceResponseDto,
  UpdateResourceDto,
} from './dto/resource.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar canchas disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de recursos', type: [ResourceResponseDto] })
  list(@Query() q: ListResourcesQueryDto) {
    return this.resources.list(q.onlyActive !== false);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una cancha' })
  @ApiResponse({ status: 200, description: 'Recurso encontrado', type: ResourceResponseDto })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  findOne(@Param('id', ParseCuidPipe) id: string) {
    return this.resources.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Crear cancha (ADMIN)' })
  @ApiResponse({ status: 201, description: 'Recurso creado', type: ResourceResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'No autorizado', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Rol insuficiente', type: ErrorResponseDto })
  create(@Body() dto: CreateResourceDto) {
    return this.resources.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cancha (ADMIN)' })
  @ApiResponse({ status: 200, description: 'Recurso actualizado', type: ResourceResponseDto })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resources.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cancha (ADMIN)' })
  @ApiResponse({ status: 204, description: 'Recurso eliminado' })
  @ApiResponse({ status: 404, description: 'Recurso no encontrado', type: ErrorResponseDto })
  remove(@Param('id', ParseCuidPipe) id: string) {
    return this.resources.remove(id);
  }
}