import { describe, it, expect } from 'vitest';
import { computeTrustScore, getTrustLabel } from '../src/utils/trustScore.js';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('computeTrustScore', () => {
  it('returns 0 / High Risk for no reviews', () => {
    expect(computeTrustScore([])).toEqual({ score: 0, label: 'High Risk' });
  });

  it('maps a single recent 5-star review to a 10', () => {
    const { score, label } = computeTrustScore([
      { rating: 5, verifiedBuyer: false, createdAt: daysAgo(1) },
    ]);
    expect(score).toBe(10);
    expect(label).toBe('Highly Trusted');
  });

  it('maps a single 1-star review to a 0', () => {
    const { score, label } = computeTrustScore([
      { rating: 1, verifiedBuyer: true, createdAt: daysAgo(1) },
    ]);
    expect(score).toBe(0);
    expect(label).toBe('High Risk');
  });

  it('weights verified-buyer reviews more heavily', () => {
    // Unverified 5-star + verified 1-star: verified negative pulls harder
    const mixed = computeTrustScore([
      { rating: 5, verifiedBuyer: false, createdAt: daysAgo(200) },
      { rating: 1, verifiedBuyer: true, createdAt: daysAgo(200) },
    ]);
    expect(mixed.score).toBeLessThan(5);
  });

  it('weights recent reviews (within 90 days) more heavily', () => {
    const recentBad = computeTrustScore([
      { rating: 5, verifiedBuyer: false, createdAt: daysAgo(200) },
      { rating: 1, verifiedBuyer: false, createdAt: daysAgo(5) },
    ]);
    const oldBad = computeTrustScore([
      { rating: 5, verifiedBuyer: false, createdAt: daysAgo(5) },
      { rating: 1, verifiedBuyer: false, createdAt: daysAgo(200) },
    ]);
    expect(recentBad.score).toBeLessThan(oldBad.score);
  });

  it('never exceeds 10', () => {
    const { score } = computeTrustScore(
      Array.from({ length: 20 }, () => ({
        rating: 5,
        verifiedBuyer: true,
        createdAt: daysAgo(1),
      })),
    );
    expect(score).toBeLessThanOrEqual(10);
  });
});

describe('getTrustLabel boundaries', () => {
  it.each([
    [10, 'Highly Trusted'],
    [8.5, 'Highly Trusted'],
    [8.4, 'Mostly Reliable'],
    [7.0, 'Mostly Reliable'],
    [6.9, 'Proceed with Caution'],
    [5.0, 'Proceed with Caution'],
    [4.9, 'Poor Track Record'],
    [3.0, 'Poor Track Record'],
    [2.9, 'High Risk'],
    [0, 'High Risk'],
  ])('score %f → %s', (score, label) => {
    expect(getTrustLabel(score)).toBe(label);
  });
});
