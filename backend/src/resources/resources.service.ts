import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingMode, Prisma, Resource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  list(onlyActive = true): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: { schedules: { orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<Resource & { schedules: unknown[] }> {
    const r = await this.prisma.resource.findUnique({
      where: { id },
      include: { schedules: { orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }] } },
    });
    if (!r) throw new NotFoundException(`Resource ${id} not found`);
    return r as Resource & { schedules: unknown[] };
  }

  async create(dto: CreateResourceDto): Promise<Resource> {
    this.validateSchedules(dto.schedules);
    const mode: BookingMode = dto.mode ?? 'EXCLUSIVE';
    const capacity = mode === 'EXCLUSIVE' ? 1 : dto.capacity ?? 1;

    try {
      return await this.prisma.resource.create({
        data: {
          name: dto.name,
          description: dto.description,
          mode,
          capacity,
          timezone: dto.timezone ?? 'UTC',
          isActive: dto.isActive ?? true,
          schedules: {
            create: dto.schedules.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              openTime: s.openTime,
              closeTime: s.closeTime,
            })),
          },
        },
        include: { schedules: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException(e.message);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateResourceDto): Promise<Resource> {
    const exists = await this.prisma.resource.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Resource ${id} not found`);
    if (dto.schedules) this.validateSchedules(dto.schedules);

    return this.prisma.$transaction(async (tx) => {
      if (dto.schedules) {
        await tx.resourceSchedule.deleteMany({ where: { resourceId: id } });
        await tx.resourceSchedule.createMany({
          data: dto.schedules.map((s) => ({
            resourceId: id,
            dayOfWeek: s.dayOfWeek,
            openTime: s.openTime,
            closeTime: s.closeTime,
          })),
        });
      }

      const data: Prisma.ResourceUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.mode !== undefined) data.mode = dto.mode;
      if (dto.capacity !== undefined) data.capacity = dto.capacity;
      if (dto.timezone !== undefined) data.timezone = dto.timezone;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      return tx.resource.update({
        where: { id },
        data,
        include: { schedules: true },
      });
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.prisma.resource.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Resource ${id} not found`);
    await this.prisma.resource.delete({ where: { id } });
  }

  private validateSchedules(
    schedules: { dayOfWeek: number; openTime: string; closeTime: string }[],
  ): void {
    for (const s of schedules) {
      if (s.openTime >= s.closeTime) {
        throw new BadRequestException(
          `Schedule for day ${s.dayOfWeek}: openTime must be before closeTime`,
        );
      }
    }
  }
}