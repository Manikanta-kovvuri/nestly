const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function inspect() {
  const tenants = await prisma.tenant.findMany({
    include: {
      leases: {
        include: {
          unit: {
            include: {
              property: true,
            }
          }
        }
      }
    }
  });

  console.log(`Total tenants: ${tenants.length}`);
  
  let withLease = 0;
  let withoutLease = 0;
  let safelyBackfillable = 0;
  let ambiguous = 0;

  for (const t of tenants) {
    if (t.leases.length > 0) {
      withLease++;
      const ownerIds = new Set(t.leases.map(l => l.unit.property.ownerId));
      if (ownerIds.size === 1) {
        safelyBackfillable++;
        console.log(`Tenant ${t.id} has leases with owner ${[...ownerIds][0]}`);
      } else {
        ambiguous++;
      }
    } else {
      withoutLease++;
    }
  }

  console.log(`Tenants with lease: ${withLease}`);
  console.log(`Tenants without lease: ${withoutLease}`);
  console.log(`Safely backfillable (single owner): ${safelyBackfillable}`);
  console.log(`Ambiguous (multiple owners): ${ambiguous}`);

  if (withoutLease > 0) {
    console.log('\nTenants without lease details:');
    for (const t of tenants.filter(t => t.leases.length === 0)) {
      console.log(`- Tenant ID: ${t.id}, User ID: ${t.userId}`);
    }
  }
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
