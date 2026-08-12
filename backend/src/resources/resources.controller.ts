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
import { Roles } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { ResourcesService } from './resources.service';
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  UpdateResourceDto,
} from './dto/resource.dto';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  list(@Query() q: ListResourcesQueryDto) {
    return this.resources.list(q.onlyActive !== false);
  }

  @Get(':id')
  findOne(@Param('id', ParseCuidPipe) id: string) {
    return this.resources.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateResourceDto) {
    return this.resources.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resources.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseCuidPipe) id: string) {
    return this.resources.remove(id);
  }
}