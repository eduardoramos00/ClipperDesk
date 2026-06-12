# 📖 ClipperDesk — User Manual

Complete guide to installing, configuring and using the platform.

---

## Table of contents

1. [Requirements](#1-requirements)
2. [Installation](#2-installation)
3. [Configuration (.env.local)](#3-configuration-envlocal)
4. [First run and demo data](#4-first-run-and-demo-data)
5. [Concepts: tenants, roles and permissions](#5-concepts-tenants-roles-and-permissions)
6. [Creating your barbershop](#6-creating-your-barbershop)
7. [The dashboard (staff)](#7-the-dashboard-staff)
8. [The public page and bookings](#8-the-public-page-and-bookings)
9. [The client portal](#9-the-client-portal)
10. [Billing and plans](#10-billing-and-plans)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Requirements

- **Node.js 18+** and npm
- A **Postgres** database (recommended: [Supabase](https://supabase.com), free tier available)
- Optional: SMTP credentials for sending real confirmation emails

## 2. Installation

```bash
git clone <repo> && cd clipperdesk
npm install
cp .env.example .env.local
npm run dev
```

The app is available at `http://localhost:3000`.

For production: `npm run build` followed by `npm start`.

## 3. Configuration (.env.local)

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string. On Supabase: **Dashboard → Connect → Session pooler** |
| `SESSION_SECRET` | — | HMAC secret for sessions. If omitted, one is auto-generated into `data/.session-secret` |
| `SMTP_HOST` | — | SMTP server. Without it, emails are printed to the server console |
| `SMTP_PORT` | — | SMTP port (587 by default; 465 enables implicit TLS) |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials. For Gmail, use an *app password*, never your account password |
| `MAIL_FROM` | — | Email sender, e.g. `"Your Barbershop <bookings@domain.com>"` |

> ⚠️ `.env.local` is gitignored — never commit it or share the credentials
> you put in it.

## 4. First run and demo data

On the app's first request, the database schema is created and, if the
database is empty, a complete demo barbershop (**Fade District**) is seeded
with 14 days of history, a team, clients, services, stock and upcoming
appointments.

Demo accounts (password `demo1234`):

| Role | Email |
| --- | --- |
| Owner | `owner@demo.dev` |
| Manager | `manager@demo.dev` |
| Barber | `marco@demo.dev` / `rui@demo.dev` |
| Client | `client@demo.dev` |

The demo shop's public page is `/s/fade-district`.

> To start from scratch without demo data, use an empty database and register
> your own shop at `/register` — the seed only runs when no tenants exist.

## 5. Concepts: tenants, roles and permissions

Each barbershop is an isolated **tenant**: all data (users, services,
appointments, stock, payments) belongs to one tenant and is never visible to
another. Each tenant gets a public page at `/s/<slug>`.

There are 4 roles, with permissions enforced server-side:

| Capability | Owner | Manager | Barber | Client |
| --- | :-: | :-: | :-: | :-: |
| View full schedule / create appointments | ✅ | ✅ | own only | — |
| Manage clients and notes | ✅ | ✅ | notes | — |
| Manage services | ✅ | ✅ | — | — |
| Manage staff and commissions | ✅ | ✅* | — | — |
| Inventory and counter sales | ✅ | ✅ | sales | — |
| Financial dashboard | ✅ | ✅ | own only | — |
| Billing (plans) and settings | ✅ | — | — | — |
| Book online / portal | — | — | — | ✅ |

\* Managers cannot add/deactivate other managers — only the owner can.

## 6. Creating your barbershop

1. Go to `/register` and fill in the shop name, your name, email and password
   (minimum 8 characters).
2. The tenant is created with a **14-day trial**, two sample services and
   your owner account.
3. The public slug is generated from the name (e.g. "Joe's Barbershop" →
   `/s/joe-s-barbershop`).

Recommended next steps:

1. **Settings** — opening/closing hours, slot granularity
   (10/15/20/30/60 min) and currency.
2. **Services** — real names, durations and prices.
3. **Staff** — add barbers with each one's commission rate.
4. **Inventory** — products you sell at the counter.
5. Share the `/s/<your-slug>` page with your clients.

## 7. The dashboard (staff)

Available at `/dashboard` after signing in with a staff account.

- **Overview** — today's metrics: appointments, revenue, low-stock alerts.
- **Appointments** — schedule by day and by barber. Create appointments for
  clients, mark them **completed** (generates payment + automatic commission),
  **cancelled** or **no-show**. Barbers can only update their own appointments.
- **Clients** — each client's record with visit history, total spend and team
  notes (e.g. "number 2 on the sides"). You can add clients manually, with or
  without a password (no password = internal-only profile; they cannot sign in).
- **Services** — create, edit and activate/deactivate services. Inactive
  services disappear from online booking but keep their history.
- **Staff** — add barbers/managers, adjust commissions, activate/deactivate
  accounts. Seat limits depend on the plan.
- **Inventory** — products, stock adjustments with a reason (audited in
  `stock_moves`) and counter sales.
- **Finance** — service and product revenue, commissions per barber.
  Barbers only see their own numbers.
- **Billing** (owner only) — current plan, trial, simulated invoices,
  upgrade/downgrade and cancellation.
- **Settings** (owner only) — shop name, hours, slots and currency.

## 8. The public page and bookings

Each shop has a public page at `/s/<slug>` with its services, team and the
4-step booking wizard: **service → barber → date → time**.
Only genuinely free slots are shown (filtered by shop hours, service
duration, already-booked slots and past times).

There are three ways to book:

1. **With an account** — the client signs in and the booking shows up in
   their portal.
2. **As a guest** — with just an email. They get a confirmation email (or it
   prints to the server console in development). Guest profiles have no
   password and **cannot sign in**.
3. **Registering on the spot** — create an account during booking. If the
   email already has guest bookings, the profile is **upgraded to a full
   account** and the history shows up in the portal automatically.

Concurrent bookings for the same barber are serialized in the database
(transactional lock), so overbooking never happens — the second client gets
"That slot was just taken".

## 9. The client portal

At `/portal`, clients see their upcoming appointments and history, can book
again and **cancel future appointments**. Past appointments cannot be
cancelled.

## 10. Billing and plans

| Plan | Price | Staff seats |
| --- | --- | --- |
| Starter | €29/mo | 3 |
| Pro | €79/mo | 10 |
| Elite | €149/mo | Unlimited |

- New shops start with a **14-day trial** of the Starter plan.
- The seat limit is checked when adding staff — to grow, upgrade in
  **Billing**.
- **Cancelling the subscription pauses online booking** (the public page
  shows the shop isn't accepting bookings); data is never deleted and the
  dashboard stays accessible. Reactivate by picking a plan.
- Billing is **simulated** (no payment gateway) — every plan change creates
  an invoice in `billing_events`.

## 11. Troubleshooting

**"DATABASE_URL is not set"**
`.env.local` or the variable is missing. Copy `.env.example` and fill it in.

**Database connection error (ENOTFOUND / timeout)**
Make sure you're using Supabase's **Session pooler** connection string
(the direct `db.<ref>.supabase.co` connection is IPv6-only and fails on many
networks).

**Emails not arriving**
Without `SMTP_HOST`, emails are printed to the server console — that's the
expected behavior in development. With Gmail, use an *app password*.

**"This shop is not accepting online bookings right now"**
The trial expired or the subscription was cancelled. The owner fixes this in
**Dashboard → Billing**.

**I want to start over**
Drop the tables in the database (or use a fresh project/schema) and restart
the server — the schema and seed run again on the first request.
