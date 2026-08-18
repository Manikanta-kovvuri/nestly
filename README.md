# Nestly

> **Status**: Under active development — Milestone 1 (Foundation) in progress.

Nestly is a full-stack property management SaaS platform for property owners and tenants. Owners can manage properties, units, tenants, leases, payments, and maintenance. Tenants can view their lease, pay rent, and track maintenance requests.

---

## Features (planned for V1)

| Module | Owner | Tenant |
|---|---|---|
| Authentication | ✅ Register / Login | ✅ Register / Login |
| Properties | ✅ CRUD | — |
| Units | ✅ CRUD | 👁 View own unit |
| Tenants | ✅ Manage | 👁 View profile |
| Leases | ✅ Create / Terminate | 👁 View active lease |
| Payments | ✅ Record / History | 👁 View history |
| Maintenance | ✅ View / Update | ✅ Create requests |
| Dashboard | ✅ Analytics | — |

---

## Architecture

```
Nestly/
├── Backend/    ← NestJS (REST API)
└── Frontend/   ← React + Vite (SPA)
```

**Modular monolith** — clean path to future scale without distributed-systems overhead.

```
Controller → Service → PrismaService → PostgreSQL
```

---

## Tech Stack

### Backend
- **NestJS** · TypeScript
- **PostgreSQL** · Prisma ORM
- **Passport** · JWT · bcrypt
- **class-validator** · class-transformer
- **@nestjs/config** · Nodemailer
- **@nestjs/schedule** (cron jobs)

### Frontend
- **React** · TypeScript · Vite
- **React Router** · Zustand · Axios
- **Tailwind CSS** · shadcn/ui

### Infrastructure
- **Railway** (backend + PostgreSQL)
- Frontend: static hosting (Vercel / Railway / Netlify)

---

## Domain Model

```
User (OWNER / TENANT / ADMIN)
  │
  ├─ OWNER
  │    └─ Property
  │         └─ Unit
  │              ├─ Lease ──── Payment
  │              │    └─ Tenant (User)
  │              └─ Maintenance
  │
  └─ TENANT
       └─ Tenant profile
            └─ Lease(s) (historical)
```

**Key rule**: `Tenant ≠ Lease`. A Tenant is a person; a Lease is the rental relationship. A tenant may have multiple historical leases.

---

## Local Setup

### Prerequisites
- Node.js ≥ 20
- PostgreSQL ≥ 15
- npm ≥ 10

### 1. Clone

```bash
git clone <repo-url>
cd Nestly
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### 3. Backend

```bash
cd Backend
npm install
npx prisma migrate dev   # applies migrations
npm run start:dev
```

### 4. Frontend

```bash
cd Frontend
npm install
npm run dev
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs — use a long random value |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `FRONTEND_URL` | Allowed CORS origin |
| `SMTP_*` | Email / SMTP credentials |

---

## API

Base URL: `http://localhost:3000`

Health check:
```
GET /health
→ { "status": "ok", "timestamp": "..." }
```

Full API documentation will be added when business modules are implemented.

---

## Testing

```bash
cd Backend
npm run test          # unit tests
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage report
```

---

## Deployment (Railway)

```bash
# 1. Push code to GitHub
# 2. Connect repo in Railway
# 3. Set environment variables in Railway dashboard
# 4. Railway runs: npm run build && npm run start:prod
# 5. Run migrations in Railway shell:
npx prisma migrate deploy
```

---

## Roadmap

- **V1**: Core property management (current)
- **V2**: Payment gateway integration (Stripe / Razorpay)
- **V3**: Mobile app (React Native)
- **V4**: Multi-region, advanced analytics

---

## Contributing

This is a private project. Internal contribution guidelines will be added as the team grows.

---

## License

Proprietary — All rights reserved.
