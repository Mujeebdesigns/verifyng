/**
 * Test environment bootstrap — runs before any test file imports src modules.
 * Points Prisma at the dedicated test database and satisfies env.ts validation.
 * NEVER point this at the development or production database.
 */
process.env.DATABASE_URL = 'postgresql://mujeebqozeem@localhost:5432/verifyng_test';
process.env.JWT_SECRET = 'test-secret-not-for-production-use-only-in-vitest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
// Ensure no real emails or AI calls can fire from tests
delete process.env.SMTP_HOST;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.RESEND_API_KEY;
delete process.env.AI_API_KEY;
