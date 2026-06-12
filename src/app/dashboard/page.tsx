import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { fmtMoney, fmtTime, nowLocalISO, todayYmd } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, StatCard, STATUS_LABEL, STATUS_TONE } from "@/components/ui";
import type { AppointmentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const user = await requireUser(["owner", "manager", "barber"]);
  const sql = await db();
  const tenant = user.tenant;
  const today = todayYmd();
  const monthPrefix = today.slice(0, 7);
  const isBarber = user.role === "barber";
  const barberFilter = isBarber ? sql`AND a.barber_id = ${user.id}` : sql``;

  const todayAppts = await sql<AppointmentRow[]>`
    SELECT a.*, c.name AS client_name, b.name AS barber_name, s.name AS service_name, s.duration_min
    FROM appointments a
    JOIN users c ON c.id = a.client_id
    JOIN users b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ${tenant.id} AND substr(a.starts_at, 1, 10) = ${today} ${barberFilter}
    ORDER BY a.starts_at`;

  const [{ v: revenueToday }] = await sql<{ v: number }[]>`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS v FROM payments
    WHERE tenant_id = ${tenant.id} AND substr(created_at, 1, 10) = ${today}`;

  const [{ v: revenueMonth }] = await sql<{ v: number }[]>`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS v FROM payments
    WHERE tenant_id = ${tenant.id} AND substr(created_at, 1, 7) = ${monthPrefix}`;

  const [{ v: myCommissionMonth }] = await sql<{ v: number }[]>`
    SELECT COALESCE(SUM(commission_cents), 0)::int AS v FROM payments
    WHERE tenant_id = ${tenant.id} AND barber_id = ${user.id} AND substr(created_at, 1, 7) = ${monthPrefix}`;

  const [{ v: clientCount }] = await sql<{ v: number }[]>`
    SELECT COUNT(*)::int AS v FROM users WHERE tenant_id = ${tenant.id} AND role = 'client'`;

  const [{ v: lowStock }] = await sql<{ v: number }[]>`
    SELECT COUNT(*)::int AS v FROM products WHERE tenant_id = ${tenant.id} AND stock <= low_stock`;

  const upcoming = await sql<AppointmentRow[]>`
    SELECT a.*, c.name AS client_name, b.name AS barber_name, s.name AS service_name, s.duration_min
    FROM appointments a
    JOIN users c ON c.id = a.client_id
    JOIN users b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ${tenant.id} AND a.status = 'scheduled' AND a.starts_at > ${nowLocalISO()} ${barberFilter}
    ORDER BY a.starts_at
    LIMIT 6`;

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        subtitle={isBarber ? "Here's your day at a glance." : "Here's how the shop is doing."}
      >
        <Link href="/dashboard/appointments" className="btn-primary">
          Go to appointments
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isBarber ? "My appointments today" : "Appointments today"}
          value={String(todayAppts.length)}
          sub={`${todayAppts.filter((a) => a.status === "scheduled").length} still scheduled`}
        />
        {isBarber ? (
          <StatCard
            label="My commission this month"
            value={fmtMoney(myCommissionMonth, tenant.currency)}
            sub={`${user.commission_rate}% per completed cut`}
          />
        ) : (
          <StatCard label="Revenue today" value={fmtMoney(revenueToday, tenant.currency)} />
        )}
        <StatCard label="Revenue this month" value={fmtMoney(revenueMonth, tenant.currency)} sub="Services + retail" />
        {isBarber ? (
          <StatCard label="Shop clients" value={String(clientCount)} />
        ) : (
          <StatCard
            label="Clients / low stock"
            value={String(clientCount)}
            sub={lowStock > 0 ? `⚠ ${lowStock} product${lowStock === 1 ? "" : "s"} low on stock` : "Stock levels healthy"}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Today's schedule (${todayAppts.length})`}>
          {todayAppts.length === 0 ? (
            <EmptyState title="Nothing booked today" hint="Enjoy the quiet — or book a walk-in." />
          ) : (
            <ul className="space-y-3">
              {todayAppts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 shrink-0 font-mono text-sm font-semibold">
                      {fmtTime(a.starts_at)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{a.client_name}</p>
                      <p className="text-xs text-zinc-500">
                        {a.service_name}
                        {!isBarber && ` · ${a.barber_name}`}
                      </p>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Next up">
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming appointments" />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {a.client_name} · {a.service_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {a.starts_at.slice(0, 10) === today ? "Today" : a.starts_at.slice(0, 10)} at{" "}
                      {fmtTime(a.starts_at)}
                      {!isBarber && ` · ${a.barber_name}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {fmtMoney(a.price_cents, tenant.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
