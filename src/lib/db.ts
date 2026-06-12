import postgres from "postgres";
import { hashPassword } from "./password";
import { addDaysYmd, addMinutesISO, minutesToHm, todayYmd } from "./format";

export type Sql = postgres.Sql;
// Accepted by query helpers so they run both standalone and inside sql.begin().
export type Queryable = postgres.Sql | postgres.TransactionSql;

declare global {
  // eslint-disable-next-line no-var
  var __clipperdesk_sql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __clipperdesk_ready: Promise<void> | undefined;
}

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase connection string to .env.local."
    );
  }
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    // Required for Supabase's transaction-mode pooler; harmless elsewhere.
    prepare: false,
    ssl: local ? undefined : "require",
    onnotice: () => {},
  });
}

const sql: postgres.Sql =
  globalThis.__clipperdesk_sql ?? (globalThis.__clipperdesk_sql = connect());

// Timestamps are stored as text ("YYYY-MM-DD HH:MM:SS" / "YYYY-MM-DDTHH:MM"),
// matching the string-comparison scheduling logic throughout the app.
const SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS citext;

  CREATE TABLE IF NOT EXISTS tenants (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    plan text NOT NULL DEFAULT 'starter',
    plan_status text NOT NULL DEFAULT 'trialing',
    trial_ends_at text,
    open_hour integer NOT NULL DEFAULT 9,
    close_hour integer NOT NULL DEFAULT 19,
    slot_step integer NOT NULL DEFAULT 15,
    currency text NOT NULL DEFAULT 'EUR',
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    role text NOT NULL CHECK (role IN ('owner','manager','barber','client')),
    name text NOT NULL,
    email citext NOT NULL UNIQUE,
    phone text,
    password_hash text NOT NULL DEFAULT '',
    commission_rate integer NOT NULL DEFAULT 40,
    active integer NOT NULL DEFAULT 1,
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id, role);

  CREATE TABLE IF NOT EXISTS services (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    description text,
    duration_min integer NOT NULL,
    price_cents integer NOT NULL,
    active integer NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);

  CREATE TABLE IF NOT EXISTS appointments (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    client_id integer NOT NULL REFERENCES users(id),
    barber_id integer NOT NULL REFERENCES users(id),
    service_id integer NOT NULL REFERENCES services(id),
    starts_at text NOT NULL,
    ends_at text NOT NULL,
    status text NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled','completed','cancelled','no_show')),
    price_cents integer NOT NULL,
    commission_cents integer NOT NULL DEFAULT 0,
    notes text,
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_appts_barber_time
    ON appointments(tenant_id, barber_id, starts_at);
  CREATE INDEX IF NOT EXISTS idx_appts_client
    ON appointments(tenant_id, client_id);

  CREATE TABLE IF NOT EXISTS client_notes (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    client_id integer NOT NULL REFERENCES users(id),
    author_id integer NOT NULL REFERENCES users(id),
    body text NOT NULL,
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_notes_client ON client_notes(tenant_id, client_id);

  CREATE TABLE IF NOT EXISTS products (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    name text NOT NULL,
    sku text NOT NULL,
    price_cents integer NOT NULL,
    cost_cents integer NOT NULL DEFAULT 0,
    stock integer NOT NULL DEFAULT 0,
    low_stock integer NOT NULL DEFAULT 5
  );
  CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);

  CREATE TABLE IF NOT EXISTS stock_moves (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    product_id integer NOT NULL REFERENCES products(id),
    delta integer NOT NULL,
    reason text NOT NULL,
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS payments (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    kind text NOT NULL CHECK (kind IN ('service','product')),
    ref_id integer NOT NULL,
    barber_id integer REFERENCES users(id),
    amount_cents integer NOT NULL,
    commission_cents integer NOT NULL DEFAULT 0,
    description text NOT NULL DEFAULT '',
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id, created_at);

  CREATE TABLE IF NOT EXISTS billing_events (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id integer NOT NULL REFERENCES tenants(id),
    type text NOT NULL,
    plan text NOT NULL,
    amount_cents integer NOT NULL DEFAULT 0,
    created_at text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
`;

const INIT_LOCK = 727274_001;

async function seed(tx: postgres.TransactionSql) {
  const demoHash = hashPassword("demo1234");
  const today = todayYmd();

  const [{ c }] = await tx<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM tenants`;
  if (c > 0) return;

  const [{ id: tenantId }] = await tx<{ id: number }[]>`
    INSERT INTO tenants (name, slug, plan, plan_status, trial_ends_at, open_hour, close_hour, slot_step, currency)
    VALUES ('Fade District', 'fade-district', 'pro', 'active', NULL, 9, 19, 15, 'EUR')
    RETURNING id`;

  const uid = async (
    role: string,
    name: string,
    email: string,
    phone: string | null,
    rate = 40
  ) => {
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO users (tenant_id, role, name, email, phone, password_hash, commission_rate)
      VALUES (${tenantId}, ${role}, ${name}, ${email}, ${phone}, ${demoHash}, ${rate})
      RETURNING id`;
    return id;
  };

  await uid("owner", "Eduardo Ramos", "owner@demo.dev", "+351 910 000 001");
  await uid("manager", "Sofia Martins", "manager@demo.dev", "+351 910 000 002");
  const barber1 = await uid("barber", "Marco Silva", "marco@demo.dev", "+351 910 000 003", 45);
  const barber2 = await uid("barber", "Rui Costa", "rui@demo.dev", "+351 910 000 004", 40);
  const barbers = [barber1, barber2];

  const clientNames: [string, string][] = [
    ["João Ferreira", "client@demo.dev"],
    ["Pedro Almeida", "pedro@demo.dev"],
    ["Tiago Moreira", "tiago@demo.dev"],
    ["André Sousa", "andre@demo.dev"],
    ["Miguel Rocha", "miguel@demo.dev"],
    ["Bruno Carvalho", "bruno@demo.dev"],
  ];
  const clients: number[] = [];
  for (let i = 0; i < clientNames.length; i++) {
    const [name, email] = clientNames[i];
    clients.push(await uid("client", name, email, `+351 920 000 00${i + 1}`));
  }

  const serviceDefs = [
    { name: "Classic Cut", desc: "Scissor & clipper cut with hot towel finish.", dur: 30, price: 1800 },
    { name: "Skin Fade", desc: "Precision fade down to the skin, styled to finish.", dur: 45, price: 2400 },
    { name: "Beard Trim", desc: "Shape, line-up and conditioning oil.", dur: 20, price: 1200 },
    { name: "Cut + Beard", desc: "The full service: cut, fade and beard sculpt.", dur: 60, price: 3200 },
  ];
  const services: { id: number; dur: number; price: number; name: string }[] = [];
  for (const s of serviceDefs) {
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO services (tenant_id, name, description, duration_min, price_cents)
      VALUES (${tenantId}, ${s.name}, ${s.desc}, ${s.dur}, ${s.price})
      RETURNING id`;
    services.push({ id, dur: s.dur, price: s.price, name: s.name });
  }

  const products: [string, string, number, number, number, number][] = [
    ["Matte Pomade", "POM-001", 1500, 700, 14, 5],
    ["Beard Oil", "OIL-002", 1800, 800, 3, 5],
    ["Sea Salt Spray", "SPR-003", 1400, 600, 9, 4],
    ["Aftershave Balm", "BLM-004", 1600, 750, 11, 4],
    ["Razor Blades (10pk)", "RZR-005", 900, 350, 28, 10],
  ];
  for (const [name, sku, price, cost, stock, low] of products) {
    await tx`
      INSERT INTO products (tenant_id, name, sku, price_cents, cost_cents, stock, low_stock)
      VALUES (${tenantId}, ${name}, ${sku}, ${price}, ${cost}, ${stock}, ${low})`;
  }

  const rates: Record<number, number> = { [barber1]: 45, [barber2]: 40 };

  // 14 days of completed history feeding the CRM and the financial dashboard.
  for (let back = 14; back >= 1; back--) {
    const date = addDaysYmd(today, -back);
    const count = 2 + ((back * 7) % 3);
    for (let i = 0; i < count; i++) {
      const svc = services[(back + i) % services.length];
      const barber = barbers[(back + i) % barbers.length];
      const client = clients[(back * 3 + i) % clients.length];
      const startMin = (10 + i * 2) * 60 + ((back + i) % 2) * 30;
      const starts = `${date}T${minutesToHm(startMin)}`;
      const ends = addMinutesISO(starts, svc.dur);
      const commission = Math.round((svc.price * rates[barber]) / 100);
      const [{ id: apptId }] = await tx<{ id: number }[]>`
        INSERT INTO appointments
          (tenant_id, client_id, barber_id, service_id, starts_at, ends_at, status, price_cents, commission_cents, created_at)
        VALUES (${tenantId}, ${client}, ${barber}, ${svc.id}, ${starts}, ${ends},
                'completed', ${svc.price}, ${commission}, ${`${date} 08:00:00`})
        RETURNING id`;
      await tx`
        INSERT INTO payments (tenant_id, kind, ref_id, barber_id, amount_cents, commission_cents, description, created_at)
        VALUES (${tenantId}, 'service', ${apptId}, ${barber}, ${svc.price}, ${commission},
                ${svc.name}, ${`${date} ${minutesToHm(startMin)}:00`})`;
    }
  }

  // Upcoming bookings for today and tomorrow.
  const upcoming: [string, number, number, number][] = [
    [`${today}T10:00`, 0, 0, 0],
    [`${today}T11:30`, 1, 1, 1],
    [`${today}T15:00`, 3, 0, 2],
    [`${today}T16:30`, 2, 1, 3],
    [`${addDaysYmd(today, 1)}T09:30`, 1, 0, 4],
    [`${addDaysYmd(today, 1)}T14:00`, 3, 1, 0],
  ];
  for (const [starts, svcIdx, barberIdx, clientIdx] of upcoming) {
    const svc = services[svcIdx];
    await tx`
      INSERT INTO appointments
        (tenant_id, client_id, barber_id, service_id, starts_at, ends_at, status, price_cents, commission_cents, created_at)
      VALUES (${tenantId}, ${clients[clientIdx]}, ${barbers[barberIdx]}, ${svc.id},
              ${starts}, ${addMinutesISO(starts, svc.dur)}, 'scheduled', ${svc.price}, 0,
              ${`${today} 08:00:00`})`;
  }

  await tx`
    INSERT INTO client_notes (tenant_id, client_id, author_id, body, created_at)
    VALUES (${tenantId}, ${clients[0]}, ${barber1},
            ${"Prefers a #2 on the sides, scissor work on top. Sensitive skin — skip the alcohol-based aftershave."},
            ${`${addDaysYmd(today, -7)} 12:00:00`})`;

  await tx`
    INSERT INTO billing_events (tenant_id, type, plan, amount_cents, created_at)
    VALUES (${tenantId}, 'invoice', 'pro', 7900, ${`${addDaysYmd(today, -10)} 09:00:00`})`;
}

async function init(): Promise<void> {
  await sql.begin(async (tx) => {
    // Serializes schema creation + seeding across concurrent server starts.
    await tx`SELECT pg_advisory_xact_lock(${INIT_LOCK})`;
    await tx.unsafe(SCHEMA);
    await seed(tx);
  });
}

export async function db(): Promise<postgres.Sql> {
  if (!globalThis.__clipperdesk_ready) {
    globalThis.__clipperdesk_ready = init().catch((err) => {
      globalThis.__clipperdesk_ready = undefined;
      throw err;
    });
  }
  await globalThis.__clipperdesk_ready;
  return sql;
}
