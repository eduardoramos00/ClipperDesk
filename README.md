<div align="center"> 
 
# 💈 ClipperDesk  

**The operating system for modern barbershops.**

A multi-tenant SaaS platform where owners, managers, barbers and clients run
100% of their day — scheduling, CRM, inventory, finance & commissions, and
subscription billing.

[![Next.js](https://img.shields.io/badge/Next.js%2014-App%20Router-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-dark%20mode-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

[Features](#-features) · [Quick start](#-quick-start) · [Demo accounts](#-demo-accounts) · [Architecture](#-architecture) · [Security](#-security)

</div>

---

## ✨ Features

| | |
| --- | --- |
| 📅 **Smart scheduling** | Variable service durations, per-shop hours & slot granularity, race-safe overlap checks inside the booking transaction |
| 🌐 **Public booking pages** | Every shop gets `/s/<slug>` — a branded page with a 4-step booking wizard |
| 👤 **Guest bookings** | Clients book with just an email, get a confirmation message, and can upgrade to a full account later |
| 🗂 **Client CRM** | Visit history, spend tracking and barber notes per client |
| 💈 **Team & commissions** | Per-barber commission rates, computed automatically when appointments complete |
| 📦 **Inventory** | Products, SKUs, counter sales, stock movements and low-stock alerts |
| 📊 **Financial dashboard** | Revenue, commissions and product sales at a glance |
| 💳 **Subscription billing** | Three plans with staff-seat limits, 14-day trials, simulated invoices |
| 🏢 **Multi-tenant** | Every row is tenant-scoped; tenant identity comes from the signed session, never from client input |
| 🌗 **Dark mode** | Class-based theming with a manual toggle and a no-flash inline script |

## 🚀 Quick start

```bash
git clone <this repo> && cd clipperdesk
npm install
cp .env.example .env.local   # add your Supabase DATABASE_URL
npm run dev
```

Open <http://localhost:3000>. The schema is created and seeded with a full
demo shop on first run — no migrations to run, no manual setup.

> **Database:** any Postgres works. For Supabase, grab the *Session pooler*
> connection string from **Dashboard → Connect** and set it as `DATABASE_URL`.
>
> **Email (optional):** set `SMTP_*` in `.env.local` to send real guest-booking
> confirmations; without it, emails are printed to the server console.

## 🔑 Demo accounts

All seeded accounts use the password `demo1234` (local seed data only).

| Role | Email | What they see |
| --- | --- | --- |
| 👑 Owner | `owner@demo.dev` | Everything, incl. Billing & Settings |
| 🧭 Manager | `manager@demo.dev` | Operations: schedule, CRM, services, staff, stock |
| ✂️ Barber | `marco@demo.dev` | Own schedule, own commissions, counter sales |
| 🙋 Client | `client@demo.dev` | Booking portal at `/portal` |

The demo shop's public booking page lives at [`/s/fade-district`](http://localhost:3000/s/fade-district).

## 🏗 Architecture

- **Next.js 14 (App Router) + TypeScript end to end.** Server Components read
  the database directly; all mutations go through Server Actions — no separate
  API layer to drift out of sync.
- **Postgres via [postgres.js](https://github.com/porsager/postgres).** Booking
  inserts lock the barber's row (`SELECT … FOR UPDATE`) inside the transaction,
  so the overlap check is race-safe under concurrency.
- **Multi-tenancy:** every table carries `tenant_id` and every query is scoped
  by it; tenant identity comes from the signed session cookie.
- **Auth:** scrypt password hashing with per-user salts + HMAC-signed,
  `httpOnly` session cookies (secret auto-generated, override with
  `SESSION_SECRET`).
- **Roles:** owner / manager / barber / client, enforced server-side in every
  page and action (`src/lib/guard.ts`).
- **Scheduling engine** (`src/lib/scheduling.ts`): availability is computed
  server-side and re-validated inside the booking transaction.
- **Billing:** plan limits enforced at the action layer; cancellation pauses
  online booking for the tenant.

## 📁 Project layout

```
src/
  lib/        db (schema + seed), auth, guards, scheduling, plans, formatting
  actions/    server actions: auth, appointments, services, staff, clients,
              inventory, billing, settings
  components/ Sidebar, ThemeToggle, SubmitButton, shared UI primitives
  app/
    page.tsx            marketing landing page
    login/ register/    global auth
    s/[slug]/           public tenant page, booking wizard, client signup
    portal/             client portal
    dashboard/          staff app: overview, appointments, clients, services,
                        staff, inventory, finance, billing, settings
```

## 🔒 Security

- Parameterized queries everywhere (tagged templates — no string-built SQL).
- Sessions are HMAC-SHA256-signed, `httpOnly`, `SameSite=Lax`, `Secure` in
  production.
- Passwords hashed with scrypt and compared in constant time; guest profiles
  store an empty hash and can never sign in.
- Role checks and tenant scoping happen server-side in every action — never
  trusted from the client.
- Login redirects only follow same-site paths (no open redirects).
- No real credentials in the repo: copy `.env.example` and bring your own.

## 📄 License

MIT — use it, fork it, learn from it.
