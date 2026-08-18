const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.payment.findUnique({
  where: {id: 17},
  include: {
    lease: {
      include: {
        unit: { include: { property: true } },
        tenant: { include: { user: true } }
      }
    }
  }
}).then(p => {
  if (p) {
    console.log("PAYMENT:", p.id);
    console.log("LEASE:", p.lease?.id);
    console.log("TENANT:", p.lease?.tenant?.id);
    console.log("USER:", p.lease?.tenant?.user?.id);
    console.log("UNIT:", p.lease?.unit?.id);
    console.log("PROPERTY:", p.lease?.unit?.property?.id);
  } else {
    console.log("Payment 17 not found in DB.");
  }
}).finally(()=>prisma.$disconnect());
