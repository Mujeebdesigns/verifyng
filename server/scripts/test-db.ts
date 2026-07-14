import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database smoke test...');
  
  try {
    // 1. Check database connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database.');

    // 2. Query seed vendors
    const vendorCount = await prisma.vendor.count();
    console.log(`✅ Found ${vendorCount} vendors in the database.`);

    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        businessName: true,
        trustLabel: true,
        trustScore: true,
        scamFlag: true,
      },
    });

    console.log('\nSeeded Vendors:');
    vendors.forEach((v) => {
      console.log(`- ${v.businessName} [${v.trustLabel}] (Score: ${v.trustScore}, Scam: ${v.scamFlag})`);
    });

    // 3. Query reviews
    const reviewCount = await prisma.review.count();
    console.log(`\n✅ Found ${reviewCount} reviews in the database.`);

    // 4. Query users
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in the database.`);

    console.log('\nSmoke test PASSED! Database connection and queries are working properly.');
  } catch (error) {
    console.error('❌ Database smoke test failed:', error);
    (globalThis as any).process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
