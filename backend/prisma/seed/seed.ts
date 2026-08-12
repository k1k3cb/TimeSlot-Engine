import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined');

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const COURTS = [
  { name: 'Cancha 1 - Pádel Cristal', description: 'Cancha de pádel con paredes de cristal' },
  { name: 'Cancha 2 - Pádel Cristal', description: 'Cancha de pádel con paredes de cristal' },
  { name: 'Cancha 3 - Tenis', description: 'Cancha de tenis superficie dura' },
  { name: 'Cancha 4 - Tenis', description: 'Cancha de tenis superficie dura' },
];

async function main(): Promise<void> {
  const argonOpts = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

  const adminEmail = 'admin@timeslot.dev';
  const adminPassword = 'Admin#2026';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword, argonOpts),
      name: 'Admin TimeSlot',
      role: 'ADMIN',
    },
  });

  const clients = await Promise.all(
    [
      { email: 'juan@timeslot.dev', name: 'Juan Pérez' },
      { email: 'ana@timeslot.dev', name: 'Ana Gómez' },
      { email: 'luis@timeslot.dev', name: 'Luis Ruiz' },
    ].map(async (c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: {
          email: c.email,
          passwordHash: await argon2.hash('Client#2026', argonOpts),
          name: c.name,
          role: 'CLIENT',
        },
      }),
    ),
  );

  for (const court of COURTS) {
    const resource = await prisma.resource.upsert({
      where: { id: `seed-${court.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      update: { name: court.name, description: court.description },
      create: {
        id: `seed-${court.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: court.name,
        description: court.description,
        mode: 'EXCLUSIVE',
        capacity: 1,
        timezone: 'America/Mexico_City',
        isActive: true,
      },
    });

    await prisma.resourceSchedule.deleteMany({ where: { resourceId: resource.id } });
    await prisma.resourceSchedule.createMany({
      data: [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
        resourceId: resource.id,
        dayOfWeek: dow,
        openTime: '07:00',
        closeTime: '23:00',
      })),
    });
  }

  const existingGlobal = await prisma.cancellationPolicy.findFirst({
    where: { resourceId: null },
  });
  if (!existingGlobal) {
    await prisma.cancellationPolicy.create({
      data: {
        resourceId: null,
        rules: [
          { hoursBeforeStart: 24, refundPct: 100, label: 'free-24h' },
          { hoursBeforeStart: 2, refundPct: 50, label: 'partial-2h-24h' },
          { hoursBeforeStart: 0, refundPct: 0, label: 'no-refund' },
        ],
      },
    });
  }

  console.log(`Seed complete. Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Clients (password: Client#2026):`);
  for (const c of clients) console.log(`  - ${c.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());