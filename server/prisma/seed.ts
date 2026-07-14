import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function getEnvOrPrompt(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

async function main() {
  console.log('Seeding database...');

  // 1. Clean up existing records (optional, but good for clean state)
  await prisma.report.deleteMany();
  await prisma.vendorSummary.deleteMany();
  await prisma.review.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();

  console.log('Cleared existing data.');

  // Read credentials from environment; fall back to random defaults for dev safety
  const testUserPassword = getEnvOrPrompt('SEED_TEST_USER_PASSWORD', crypto.randomBytes(12).toString('hex'));
  const adminPassword = getEnvOrPrompt('SEED_ADMIN_PASSWORD', crypto.randomBytes(12).toString('hex'));
  const devPassword = getEnvOrPrompt('SEED_DEV_PASSWORD', adminPassword);

  // 2. Create a pre-verified test user for development
  const testPasswordHash = await bcrypt.hash(testUserPassword, 12);
  const testUser = await prisma.user.create({
    data: {
      email: 'testuser@verifyng.com',
      displayName: 'Test Buyer',
      passwordHash: testPasswordHash,
      isVerified: true,
    },
  });

  console.log(`Created test user: ${testUser.email}`);
  console.log(`  Password: ${testUserPassword}`);

  // Create pre-verified admin user
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@verifyng.com',
      displayName: 'System Admin',
      passwordHash: adminPasswordHash,
      isVerified: true,
      role: 'ADMIN',
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);
  console.log(`  Password: ${adminPassword}`);

  // Create developer account as admin
  const devPasswordHash = await bcrypt.hash(devPassword, 12);
  const devUser = await prisma.user.create({
    data: {
      email: 'admin@verifyng.dev',
      displayName: 'Developer',
      passwordHash: devPasswordHash,
      isVerified: true,
      role: 'ADMIN',
    },
  });

  console.log(`Created developer admin user: ${devUser.email}`);
  console.log(`  Password: ${devPassword}`);

  // 3. Create placeholder vendors
  const vendorsData = [
    {
      businessName: 'Abuja Gadgets Store',
      instagramHandle: 'abujagadgets',
      phoneNumber: '08031234567',
      bankAccountLast4: '5678',
      trustScore: 9.2,
      trustLabel: 'Highly Trusted',
      reviewCount: 4,
      scamFlag: false,
      moderationFlag: false,
      featured: true,
      coverImage: '/gadgets-cover.png',
    },
    {
      businessName: 'Lagos Wears',
      instagramHandle: 'lagoswears',
      phoneNumber: '08123456789',
      bankAccountLast4: '1234',
      trustScore: 7.5,
      trustLabel: 'Mostly Reliable',
      reviewCount: 3,
      scamFlag: false,
      moderationFlag: false,
      featured: true,
      coverImage: '/wears-cover.png',
    },
    {
      businessName: 'Kano Electronics',
      instagramHandle: 'kanoelectronics',
      phoneNumber: '09045678901',
      bankAccountLast4: '9012',
      trustScore: 5.8,
      trustLabel: 'Proceed with Caution',
      reviewCount: 3,
      scamFlag: false,
      moderationFlag: false,
      featured: true,
      coverImage: '/electronics-cover.png',
    },
    {
      businessName: 'Port Harcourt Glam',
      instagramHandle: 'phglam',
      phoneNumber: '07011122233',
      bankAccountLast4: '4321',
      trustScore: 3.5,
      trustLabel: 'Poor Track Record',
      reviewCount: 3,
      scamFlag: false,
      moderationFlag: false,
    },
    {
      businessName: 'Instagram Scam Shop',
      instagramHandle: 'scamshop_ng',
      phoneNumber: '08099998888',
      bankAccountLast4: '9999',
      trustScore: 1.2,
      trustLabel: 'High Risk',
      reviewCount: 3,
      scamFlag: true,
      moderationFlag: false,
    },
    {
      businessName: 'Spammy Reviews Ltd',
      instagramHandle: 'spamreviews',
      phoneNumber: '08111222333',
      bankAccountLast4: '2222',
      trustScore: 8.8,
      trustLabel: 'Highly Trusted',
      reviewCount: 4,
      scamFlag: false,
      moderationFlag: true,
    },
  ];

  const vendors = [];
  for (const data of vendorsData) {
    const vendor = await prisma.vendor.create({ data });
    vendors.push(vendor);
    console.log(`Created vendor: ${vendor.businessName} (${vendor.trustLabel})`);
  }

  // 4. Create placeholder reviews for the vendors
  // We need to associate reviews so the counts match and summary has enough reviews (min 3)
  const usersData = [
    { email: 'reviewer1@verifyng.com', displayName: 'Chidi Obi', hash: await bcrypt.hash('Reviewer1!', 12) },
    { email: 'reviewer2@verifyng.com', displayName: 'Amina Yusuf', hash: await bcrypt.hash('Reviewer2!', 12) },
    { email: 'reviewer3@verifyng.com', displayName: 'Funmi Ade', hash: await bcrypt.hash('Reviewer3!', 12) },
    { email: 'reviewer4@verifyng.com', displayName: 'Emeka Uche', hash: await bcrypt.hash('Reviewer4!', 12) },
  ];

  const reviewers = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        displayName: userData.displayName,
        passwordHash: userData.hash,
        isVerified: true,
      },
    });
    reviewers.push(user);
  }

  // Add reviews to Abuja Gadgets Store (Highly Trusted, 4 reviews)
  const abujaReviews = [
    { rating: 5, text: 'Amazing service! Ordered an iPhone and got it same day in Abuja.', verified: true },
    { rating: 5, text: 'Fast delivery, authentic products. Highly recommend them.', verified: true },
    { rating: 4, text: 'Very good communications and item was packaged well.', verified: false },
    { rating: 4, text: 'Friendly staff and prompt responses to my Instagram DMs.', verified: false },
  ];
  for (let i = 0; i < abujaReviews.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[0].id,
        userId: reviewers[i].id,
        rating: abujaReviews[i].rating,
        reviewText: abujaReviews[i].text,
        verifiedBuyer: abujaReviews[i].verified,
        transactionChannel: 'Instagram',
      },
    });
  }

  // Add reviews to Lagos Wears (Mostly Reliable, 3 reviews)
  const lagosReviews = [
    { rating: 4, text: 'Got my shoes after 3 days. Quality is good but delivery was slightly delayed.', verified: true },
    { rating: 4, text: 'Nice clothing. The sizing was correct and customer service was polite.', verified: false },
    { rating: 3, text: 'Average experience. Dress was fine but they took long to reply.', verified: false },
  ];
  for (let i = 0; i < lagosReviews.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[1].id,
        userId: reviewers[i].id,
        rating: lagosReviews[i].rating,
        reviewText: lagosReviews[i].text,
        verifiedBuyer: lagosReviews[i].verified,
        transactionChannel: 'WhatsApp',
      },
    });
  }

  // Add reviews to Kano Electronics (Proceed with Caution, 3 reviews)
  const kanoReviews = [
    { rating: 3, text: 'Ordered a laptop charger. It works but feels cheap.', verified: true },
    { rating: 2, text: 'They sent the wrong model charger. Had to pay return shipping to fix it.', verified: false },
    { rating: 3, text: 'Slow response times. Kept calling their phone before they shipped.', verified: false },
  ];
  for (let i = 0; i < kanoReviews.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[2].id,
        userId: reviewers[i].id,
        rating: kanoReviews[i].rating,
        reviewText: kanoReviews[i].text,
        verifiedBuyer: kanoReviews[i].verified,
        transactionChannel: 'Instagram',
      },
    });
  }

  // Add reviews to PH Glam (Poor Track Record, 3 reviews)
  const phReviews = [
    { rating: 2, text: 'Highly unprofessional. Delays in shipment and rude responses.', verified: true },
    { rating: 1, text: 'The wig I received looks completely different from the Instagram video. Disappointed.', verified: false },
    { rating: 2, text: 'Spent 2 weeks trying to get my order. Kept making excuses.', verified: false },
  ];
  for (let i = 0; i < phReviews.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[3].id,
        userId: reviewers[i].id,
        rating: phReviews[i].rating,
        reviewText: phReviews[i].text,
        verifiedBuyer: phReviews[i].verified,
        transactionChannel: 'WhatsApp',
      },
    });
  }

  // Add reviews to Instagram Scam Shop (High Risk, 3 reviews)
  const scamReviews = [
    { rating: 1, text: 'Total fraud! Paid for a handbag and they blocked me immediately on Instagram.', verified: true },
    { rating: 1, text: 'Paid for shoes, never delivered. Avoid at all costs, they are scammers.', verified: false },
    { rating: 1, text: 'Scammers. Used bank account to receive money and stopped picking my calls.', verified: false },
  ];
  for (let i = 0; i < scamReviews.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[4].id,
        userId: reviewers[i].id,
        rating: scamReviews[i].rating,
        reviewText: scamReviews[i].text,
        verifiedBuyer: scamReviews[i].verified,
        transactionChannel: 'Instagram',
      },
    });
  }

  // Add reviews to Spammy Reviews Ltd (Moderation Flag, 4 reviews)
  // These reviews have identical positive text to simulate fake reviews
  const spamReviewsText = [
    { rating: 5, text: 'Extremely good vendor! Highly recommend their products.', verified: false },
    { rating: 5, text: 'Extremely good vendor! Highly recommend their products.', verified: false },
    { rating: 5, text: 'Extremely good vendor! Highly recommend their products.', verified: false },
    { rating: 4, text: 'Good vendor and nice customer service.', verified: true },
  ];
  for (let i = 0; i < spamReviewsText.length; i++) {
    await prisma.review.create({
      data: {
        vendorId: vendors[5].id,
        userId: reviewers[i].id,
        rating: spamReviewsText[i].rating,
        reviewText: spamReviewsText[i].text,
        verifiedBuyer: spamReviewsText[i].verified,
        transactionChannel: 'Instagram',
      },
    });
  }

  // 5. Create default vendor summaries for seeded data
  await prisma.vendorSummary.create({
    data: {
      vendorId: vendors[0].id,
      summaryText: 'Abuja Gadgets Store is highly trusted by customers for fast delivery, authentic products, and responsive customer service.',
      deliveryReliability: 'Highly reliable with same-day shipping in Abuja.',
      customerSatisfaction: 'Very high satisfaction, praised for good communication.',
      recurringComplaints: 'None identified.',
      trustPatterns: 'Consistently authentic products and quick responses.',
      scamReason: null,
      reviewCountAtGeneration: 4,
    },
  });

  await prisma.vendorSummary.create({
    data: {
      vendorId: vendors[4].id,
      summaryText: 'This shop exhibits a patterns of scam behaviour including blocking buyers after payment and non-delivery of items.',
      deliveryReliability: 'None. Paid items are never shipped.',
      customerSatisfaction: 'Extremely poor, 100% negative feedback.',
      recurringComplaints: 'Blocking customer after payment, non-delivery.',
      trustPatterns: 'None.',
      scamReason: 'Vendor blocks customers after receiving payment and fails to deliver any items.',
      reviewCountAtGeneration: 3,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
