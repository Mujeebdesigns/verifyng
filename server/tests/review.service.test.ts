import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/utils/prisma.js';
import { createReview, deleteReview } from '../src/services/review.service.js';

const OWNER_EMAIL = 'vitest-owner@review.local';
const BUYER_EMAIL = 'vitest-buyer@review.local';

let ownerId: string;
let buyerId: string;
let vendorId: string;

async function cleanup() {
  await prisma.review.deleteMany({ where: { user: { email: { endsWith: '@review.local' } } } });
  await prisma.vendor.deleteMany({ where: { businessName: 'Vitest Review Vendor' } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@review.local' } } });
}

beforeAll(async () => {
  await cleanup();
  const owner = await prisma.user.create({
    data: { email: OWNER_EMAIL, passwordHash: 'x', displayName: 'Owner', role: 'VENDOR', isVerified: true },
  });
  const buyer = await prisma.user.create({
    data: { email: BUYER_EMAIL, passwordHash: 'x', displayName: 'Buyer', role: 'BUYER', isVerified: true },
  });
  const vendor = await prisma.vendor.create({
    data: { businessName: 'Vitest Review Vendor', ownerId: owner.id, claimStatus: 'CLAIMED' },
  });
  ownerId = owner.id;
  buyerId = buyer.id;
  vendorId = vendor.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const VALID_TEXT = 'This review text is definitely longer than the thirty character minimum.';

describe('createReview guards', () => {
  it('blocks vendors from reviewing their own business (403)', async () => {
    await expect(
      createReview(ownerId, { vendorId, rating: 5, reviewText: VALID_TEXT }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('accepts a valid review and recalculates the trust score', async () => {
    const review = await createReview(buyerId, { vendorId, rating: 5, reviewText: VALID_TEXT });
    expect(review.rating).toBe(5);

    const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
    expect(vendor.reviewCount).toBe(1);
    expect(vendor.trustScore).toBe(10);
    expect(vendor.trustLabel).toBe('Highly Trusted');
  });

  it('blocks duplicate reviews from the same user (409)', async () => {
    await expect(
      createReview(buyerId, { vendorId, rating: 4, reviewText: VALID_TEXT }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('404s for a nonexistent vendor', async () => {
    await expect(
      createReview(buyerId, { vendorId: 'does-not-exist', rating: 3, reviewText: VALID_TEXT }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('deleteReview guards', () => {
  it('blocks deleting someone else\'s review (403)', async () => {
    const review = await prisma.review.findFirstOrThrow({ where: { vendorId } });
    await expect(deleteReview(review.id, ownerId)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('owner can delete within the window; score resets', async () => {
    const review = await prisma.review.findFirstOrThrow({ where: { vendorId } });
    await deleteReview(review.id, buyerId);

    const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
    expect(vendor.reviewCount).toBe(0);
    expect(vendor.trustScore).toBe(0);
  });

  it('blocks deletion after the 48-hour window (403)', async () => {
    const review = await createReview(buyerId, { vendorId, rating: 4, reviewText: VALID_TEXT });
    // Backdate creation past the window
    await prisma.review.update({
      where: { id: review.id },
      data: { createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000) },
    });
    await expect(deleteReview(review.id, buyerId)).rejects.toMatchObject({ statusCode: 403 });
  });
});
