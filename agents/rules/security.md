# security.md — VerifyNG

This file defines the security rules for VerifyNG. These are non-negotiable. Apply every rule here to every file you create or modify that touches user data, authentication, or API endpoints.

---

## Sensitive Data Rules

### Bank Account Numbers
- VerifyNG does not collect or store bank account numbers, in whole or in part — this was removed from the Vendor model and every vendor-facing form
- If a future feature needs a bank-account identifier again, only the **last 4 digits** may ever be stored, truncated at the **API input validation layer** before any data reaches the service or Prisma — never log, return in API responses, or pass through the system a full bank account number

### Raw SQL (Full-Text Search)
- Architecture.md permits raw SQL only where Prisma does not support the operation (e.g. full-text search)
- When writing raw SQL, **always use parameterized queries** — never interpolate user input into query strings
- Use `$1`, `$2`, etc. placeholders and pass values as a separate array

```typescript
// ✅ Correct — parameterized
const vendors = await prisma.$queryRawUnsafe<Vendor[]>(
  `SELECT * FROM "Vendor" WHERE to_tsvector('english', "businessName") @@ plainto_tsquery('english', $1)`,
  query
);

// ❌ Wrong — SQL injection risk
const vendors = await prisma.$queryRawUnsafe<Vendor[]>(
  `SELECT * FROM "Vendor" WHERE "businessName" ILIKE '%${query}%'`
);
```

### Passwords
- Passwords are **never stored in plain text**
- Always hash with `bcrypt` using a minimum cost factor of 12 before storing
- Never log passwords, even during debugging
- Never return `passwordHash` in any API response — always exclude it from Prisma queries

```typescript
// ✅ Correct — select only what is needed
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    passwordHash: true, // only selected when needed for comparison
    isVerified: true,
  }
});

// ❌ Wrong — returns passwordHash in all contexts
const user = await prisma.user.findUnique({ where: { email } });
```

### Personal Data
- Phone numbers are stored and returned as submitted — never log or expose them beyond what the feature requires
- Email addresses are used for authentication and communication only — never exposed in public-facing API responses (e.g. vendor profiles)
- User display names are the only user identifiers shown publicly on reviews

---

## Authentication

### JWT Rules
- JWTs are signed with `JWT_SECRET` from environment variables — never hardcode the secret
- Token expiry is set via `JWT_EXPIRES_IN` environment variable — validated at server startup in `utils/env.ts`
- Tokens are sent by the client in the `Authorization` header as `Bearer <token>` — never in cookies for this MVP
- On logout, the client discards the token — the server does not maintain a token blocklist at MVP stage
- Never put sensitive user data (e.g. passwordHash, email) inside the JWT payload — only include `userId`, `displayName`, and `role`

```typescript
// ✅ Correct JWT payload
const payload = {
  userId: user.id,
  displayName: user.displayName,
  role: user.role,
};

// ❌ Wrong — too much data in payload
const payload = {
  userId: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
};
```

### Auth Middleware
- All protected routes must pass through `auth.middleware.ts` before reaching the controller
- The middleware verifies the token, extracts `userId`, and attaches it to the request object
- If the token is missing, expired, or invalid, return `401 Unauthorized` immediately — do not proceed

### Email Verification
- Users must verify their email before their account is considered active (`isVerified: true`)
- Send a verification token via email on registration — token expires in 24 hours
- Unverified users may not submit reviews

### Password Reset
- Password reset tokens expire in **1 hour** — never allow indefinite reset windows
- Generate reset tokens using `crypto.randomBytes(32).toString('hex')`
- Invalidate the token after a successful password change
- Never confirm whether an email exists in the system on the forgot-password endpoint — always return 200 to prevent email enumeration

---

## Input Validation

- **All user inputs must be validated at the API layer** before they reach services or Prisma
- Validate on every `POST` and `PUT` request — never trust client-supplied data
- Return `400 Bad Request` with a descriptive error message for invalid inputs
- Required validations for key fields:

| Field | Validation Rules |
|---|---|
| `email` | Valid email format; max 255 characters |
| `password` | Minimum 8 characters; at least 1 uppercase, 1 number |
| `rating` | Integer between 1 and 5 inclusive |
| `reviewText` | Minimum 30 characters; maximum 1000 characters; editable within 48 hours of submission only |
| `phoneNumber` | Valid Nigerian phone format (e.g. 080XXXXXXXX or +234XXXXXXXXXX) |
| `instagramHandle` | Alphanumeric with underscores; strip @ before storing |

---

## API Security

### Rate Limiting
- Maximum **5 review submissions per user per hour** — enforced in `middleware/rateLimit.middleware.ts`
- Maximum **20 search requests per IP per minute** — enforced at the search route
- Return `429 Too Many Requests` when limits are exceeded

### HTTP Headers
Set the following security headers on every response:

```typescript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
// Note: X-XSS-Protection is intentionally omitted — it is deprecated in modern browsers
// and was removed in Chrome 78+.
```

### CORS
- Allow only the deployed frontend URL in the CORS `Access-Control-Allow-Origin` header
- During development, allow `http://localhost:5173` (Vite default)
- Never use a wildcard `*` in production
- In a no-Express setup, set CORS headers manually in a utility or middleware:

```typescript
// server/src/middleware/cors.middleware.ts
import type { IncomingMessage, ServerResponse } from 'node:http';

const allowedOrigins = [
  'http://localhost:5173',
  'https://verifyng.vercel.app', // production frontend URL
];

export function corsMiddleware(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin ?? '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
  }
}
```

### Error Responses
- Never expose raw database errors, stack traces, or internal system details to the client
- All error responses follow this structure:

```json
{
  "error": "A human-readable error message"
}
```

- Map errors to appropriate HTTP status codes:

| Scenario | Status Code |
|---|---|
| Validation failure | 400 |
| Unauthenticated request | 401 |
| Forbidden action | 403 |
| Resource not found | 404 |
| Rate limit exceeded | 429 |
| Server error | 500 |

---

## Environment Variables

- All secrets live in `.env` — never committed to version control
- `.env` is listed in `.gitignore` from day one
- `.env.example` is committed to the repository with all variable names but empty values
- Access environment variables only through `process.env` — never through a third-party config library at MVP scale
- If a required environment variable is missing at startup, the server must throw an error and refuse to start

```typescript
// server/src/utils/env.ts
// Fail at startup if core config is missing.
// AI and email keys are optional — the app degrades gracefully without them.
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

---

## Data Privacy (NDPR Compliance)

VerifyNG collects personal data and is subject to the Nigerian Data Protection Regulation (NDPR).

- A privacy policy must be linked from the app before launch
- Users must explicitly consent to data collection during registration
- Users have the right to request deletion of their account and associated reviews
- Phone numbers used for vendor search are search keys only — they are not linked to user accounts
- Do not share user data with third-party services beyond what is strictly necessary (email provider, AI provider)

---

## What to Never Do

- Never log sensitive data: passwords, tokens, full bank account numbers, or full phone numbers
- Never store secrets in source code, comments, or version control
- Never return `passwordHash` in any API response under any circumstance
- Never disable input validation for "convenience" during development
- Never use `Math.random()` for security-sensitive operations — use `crypto.randomBytes()` for token generation

```typescript
// ✅ Correct — cryptographically secure
import crypto from 'node:crypto';
const token = crypto.randomBytes(32).toString('hex');

// ❌ Wrong — predictable
const token = Math.random().toString(36).slice(2);
```
- Never allow unauthenticated users to submit reviews, reports, or any write operation
