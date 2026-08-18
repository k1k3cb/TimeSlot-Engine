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

  list(onlyActive = true) {
    return this.prisma.resource.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        schedules: { orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }] },
        photos: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const r = await this.prisma.resource.findUnique({
      where: { id },
      include: {
        schedules: { orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }] },
        photos: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
      },
    });
    if (!r) throw new NotFoundException(`Resource ${id} not found`);
    return r;
  }

  async create(dto: CreateResourceDto) {
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
          pricePerHour: dto.pricePerHour ?? 0,
          isActive: dto.isActive ?? true,
          schedules: {
            create: dto.schedules.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              openTime: s.openTime,
              closeTime: s.closeTime,
            })),
          },
          photos: dto.photos
            ? {
                create: dto.photos.map((p, i) => ({
                  url: p.url,
                  isCover: p.isCover ?? i === 0,
                  order: i,
                })),
              }
            : undefined,
        },
        include: {
          schedules: true,
          photos: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException(e.message);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateResourceDto) {
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

      if (dto.photos) {
        await tx.resourcePhoto.deleteMany({ where: { resourceId: id } });
        if (dto.photos.length > 0) {
          await tx.resourcePhoto.createMany({
            data: dto.photos.map((p, i) => ({
              resourceId: id,
              url: p.url,
              isCover: p.isCover ?? i === 0,
              order: i,
            })),
          });
        }
      }

      const data: Prisma.ResourceUpdateInput = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.mode !== undefined) data.mode = dto.mode;
      if (dto.capacity !== undefined) data.capacity = dto.capacity;
      if (dto.timezone !== undefined) data.timezone = dto.timezone;
      if (dto.pricePerHour !== undefined) data.pricePerHour = dto.pricePerHour;
      if (dto.isActive !== undefined) data.isActive = dto.isActive;

      return tx.resource.update({
        where: { id },
        data,
        include: {
          schedules: true,
          photos: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        },
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