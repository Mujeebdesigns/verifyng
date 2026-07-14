# VerifyNG

Nigeria's vendor-trust verification platform — search any online vendor by name, Instagram handle, phone number, or bank account before paying, and see a community-driven trust score, reviews, and scam alerts.

## Project Structure

```
verifyng/
├── client/      ← React 18 + Vite frontend (TypeScript)
├── server/      ← Node.js backend (TypeScript, no Express)
└── tokens/      ← Shared design tokens (CSS custom properties)
```

`client/` and `server/` are independent Node packages, each with their own `package.json`. See `agents/rules/architecture.md` for the full architecture rules.

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a connection string to one)

### Setup

1. Copy the env template and fill in real values:
   ```
   cp .env.example .env
   ```
   At minimum you need `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN`. Email (SMTP or Resend) and the AI summary feature degrade gracefully if left unset.

2. Install dependencies and run migrations:
   ```
   cd server && npm install && npx prisma migrate dev
   cd ../client && npm install
   ```

3. Start both dev servers from the repo root:
   ```
   npm run dev
   ```
   This runs `server` (http://localhost:3001) and `client` (http://localhost:5173) together. To run them separately in two terminals instead, use `npm run dev:server` and `npm run dev:client`.

### Verifying both servers are actually running

```
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3001|5173)'
```

You should see both ports listed. A quick API check:

```
curl http://localhost:3001/api/vendors/featured
```

### Troubleshooting: login, search, or Featured Vendors "broken"

This almost always means one or both dev servers stopped running, not that something is actually broken in the code:

- Login pages won't load or hang → the client can't reach the API
- Search returns an error → same cause
- The Featured Vendors section is just *missing* from the Home page, with no visible error → it fetches from the API on mount and silently renders nothing if that fetch fails

Run the `lsof` check above. If either port is missing, restart with `npm run dev` from the repo root.
