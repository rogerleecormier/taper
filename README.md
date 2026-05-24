# Taper — Zero-Based Budget Tracker

> **Funnel your income with absolute precision.** Take your raw monthly income and taper it into targeted, balanced category buckets. No waste. Complete alignment. Funnel every dollar to a clean, precise point.

**Live app:** [taper.rcormier.dev](https://taper.rcormier.dev)

---

## What is Taper?

Taper is a zero-based budgeting app built on the premise that every dollar of income should be allocated to a specific purpose — until the balance reaches exactly **$0.00**. It is not an expense tracker after the fact; it is a forward-looking allocation engine.

The core flow:
1. **Enter income** — add every source (jobs, benefits, side income) with their pay schedules
2. **Taper your income** — add bills and expenses until your unallocated balance hits $0.00
3. **Funnel allocations** — open the Budget Tracker, mark occurrences paid or received, and watch every dollar distribute cleanly

---

## Features

### Dashboard
- Real-time income vs. expense summary with "Left to Taper" balance
- Upcoming bills panel with configurable 7/14/30-day windows
- Overdue bills list and carried-forward unpaid occurrences
- Recent payments feed
- Category breakdown and goal progress

### Budget Tracker
- **Calendar view** — monthly grid with draggable occurrences to reschedule dates
- **Timeline flow view** — split chronological ledger with category budget bars on the right
- Filter by bill/income/credit and show/hide paid occurrences

### Bills & Expenses
- Weekly, biweekly, monthly, and one-time recurring bills
- Each bill linked to a vendor and category
- Edit once and all future occurrences regenerate automatically
- Mark individual occurrences paid with a date stamp

### Income Sources
- Multiple income sources (paycheck, disability, freelance, etc.)
- Flexible pay schedules including bi-weekly pay periods
- Paystub entry with line-item deductions (tax, insurance, 401k, etc.)
- Each paycheck generates a separate trackable occurrence

### Credits
- Track credit account balances and purchases
- Receipt upload and PDF viewer (stored in Cloudflare R2)
- Per-occurrence credit usage logging

### Goals
- Create savings goals with target amounts and deadlines
- Fund transfers from income directly to goals
- Progress tracking on the dashboard

### Categories & Vendors
- Custom category labels with color coding
- Vendor management for bill grouping and filtering

### Admin
- User creation and management (signups are disabled by default)
- Demo account seeding and occurrence regeneration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 fullstack) |
| Routing | [TanStack Router](https://tanstack.com/router) (file-based) |
| Data fetching | [TanStack Query](https://tanstack.com/query) |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com/) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Better Auth](https://www.better-auth.com/) |
| Storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) (receipts) |
| Cache | [Cloudflare KV](https://developers.cloudflare.com/kv/) (dashboard invalidation) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Build | [Vite](https://vite.dev/) + [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Wrangler CLI authenticated: `npx wrangler login`

### 1. Install dependencies

```bash
npm install
```

### 2. Create a D1 database

```bash
npx wrangler d1 create budget-db
```

Copy the database ID into `wrangler.toml` under `[[d1_databases]]`.

### 3. Generate Cloudflare Worker types

```bash
npm run cf-typegen
```

### 4. Run migrations

```bash
npm run db:generate       # generate migration files from schema
npm run db:migrate:local  # apply to local D1
```

### 5. Set secrets

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

### 6. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | Wrangler secret | Random secret for auth token signing |
| `BETTER_AUTH_URL` | `wrangler.toml [vars]` | Base URL of your deployment |
| `CLOUDFLARE_ACCOUNT_ID` | `.env` (local only) | For Drizzle Studio / remote migrations |
| `CLOUDFLARE_D1_DATABASE_ID` | `.env` (local only) | D1 database ID |
| `CLOUDFLARE_D1_TOKEN` | `.env` (local only) | D1 API token for migrations |

---

## Scripts

```bash
npm run dev                 # Start dev server (Vite + Wrangler)
npm run build               # Production build
npm run deploy              # Deploy to Cloudflare Workers
npm run typecheck           # TypeScript type check

npm run db:generate         # Generate Drizzle migrations from schema changes
npm run db:migrate:local    # Apply migrations to local D1
npm run db:migrate:prod     # Apply migrations to production D1
npm run db:studio           # Open Drizzle Studio (visual DB browser)

npm run cf-typegen          # Regenerate Cloudflare Worker env types
```

---

## Project Structure

```
app/
├── components/
│   ├── dashboard/          # Summary cards, upcoming/overdue panels, charts
│   ├── tracker/            # Calendar view, timeline view, occurrence rows
│   ├── bills/              # Bill list, form, form dialog
│   ├── income/             # Income source list, form
│   ├── credits/            # Credit list, receipt gallery
│   ├── goals/              # Goals list, transfer dialog
│   ├── layout/             # Sidebar, logo, navigation
│   └── ui/                 # Radix-based primitive components
├── hooks/                  # Data hooks (use-bills, use-dashboard, etc.)
├── routes/
│   ├── index.tsx           # Landing page
│   ├── _auth/              # Login / register
│   └── _app/               # Protected app routes
│       ├── dashboard.tsx
│       ├── tracker/
│       ├── bills/
│       ├── income/
│       ├── credits/
│       ├── goals/
│       ├── payments/
│       └── admin/
├── server/
│   └── fn/                 # TanStack Start server functions (RPC layer)
└── lib/                    # Utilities, currency formatting, date helpers

drizzle/
├── schema/                 # Drizzle table definitions (17 tables)
└── migrations/             # Auto-generated SQL migrations
```

---

## Deployment

```bash
npm run build
npm run deploy
```

This deploys to Cloudflare Workers with D1, KV, and R2 bindings as configured in `wrangler.toml`. A daily cron (`0 5 * * *`) runs to regenerate forward occurrences.

To apply production migrations after a schema change:

```bash
npm run db:migrate:prod
```

---

## Auth & Access

User registration is disabled by default. New accounts are created through the `/admin` panel by an existing admin user. A demo account can be seeded with example data via the admin interface.

---

## License

MIT
