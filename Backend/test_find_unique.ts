import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
p.maintenance.findUnique({ where: { id: 20 }, include: { unit: { include: { property: true } }, reportedBy: { select: { id: true, name: true, email: true } } } })
  .then(console.dir)
  .finally(() => p.$disconnect());
