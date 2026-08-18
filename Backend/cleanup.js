const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  console.log('Cleaning up orphaned tenants...');
  
  const tenants = await prisma.tenant.findMany({
    include: { leases: true }
  });

  for (const t of tenants) {
    if (t.leases.length === 0) {
      console.log(`Deleting tenant ${t.id} and user ${t.userId}`);
      await prisma.tenant.delete({ where: { id: t.id } });
      await prisma.user.delete({ where: { id: t.userId } });
    }
  }

  console.log('Cleanup complete.');
}

cleanup().catch(console.error).finally(() => prisma.$disconnect());
