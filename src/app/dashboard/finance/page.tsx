import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addDaysYmd, fmtDateShort, fmtMoney, todayYmd } from "@/lib/format";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

interface BarberTotals {
  barber_id: number;
  barber_name: string;
  commission_rate: number;
  cuts: number;
  revenue: number;
  commission: number;
}

interface PaymentRow {
  id: number;
  kind: string;
  description: string;
  amount_cents: number;
  commission_cents: number;
  created_at: string;
  barber_name: string | null;
}

export default async function FinancePage() {
  const user = await requireUser(["owner", "manager", "barber"]);
  const sql = await db();
  const tenant = user.tenant;
  const isBarber = user.role === "barber";
  const today = todayYmd();
  const monthPrefix = today.slice(0, 7);

  const [monthTotals] = await sql<
    { revenue: number; commissions: number; services: number; retail: number }[]
  >`
    SELECT
      COALESCE(SUM(amount_cents), 0)::int AS revenue,
      COALESCE(SUM(commission_cents), 0)::int AS commissions,
      COALESCE(SUM(CASE WHEN kind = 'service' THEN amount_cents ELSE 0 END), 0)::int AS services,
      COALESCE(SUM(CASE WHEN kind = 'product' THEN amount_cents ELSE 0 END), 0)::int AS retail
    FROM payments
    WHERE tenant_id = ${tenant.id} AND substr(created_at, 1, 7) = ${monthPrefix}
      ${isBarber ? sql`AND barber_id = ${user.id}` : sql``}`;

  const perBarber = await sql<BarberTotals[]>`
    SELECT u.id AS barber_id, u.name AS barber_name, u.commission_rate,
           COUNT(p.id)::int AS cuts,
           COALESCE(SUM(p.amount_cents), 0)::int AS revenue,
           COALESCE(SUM(p.commission_cents), 0)::int AS commission
    FROM users u
    LEFT JOIN payments p
      ON p.barber_id = u.id AND p.tenant_id = u.tenant_id
     AND substr(p.created_at, 1, 7) = ${monthPrefix}
    WHERE u.tenant_id = ${tenant.id} AND u.role = 'barber'
      ${isBarber ? sql`AND u.id = ${user.id}` : sql``}
    GROUP BY u.id
    ORDER BY revenue DESC`;

  const days = Array.from({ length: 14 }, (_, i) => addDaysYmd(today, i - 13));
  const dailyRows = await sql<{ day: string; v: number }[]>`
    SELECT substr(created_at, 1, 10) AS day,
           COALESCE(SUM(${isBarber ? sql`commission_cents` : sql`amount_cents`}), 0)::int AS v
    FROM payments
    WHERE tenant_id = ${tenant.id} AND substr(created_at, 1, 10) >= ${days[0]}
      ${isBarber ? sql`AND barber_id = ${user.id}` : sql``}
    GROUP BY day`;
  const dailyMap = new Map(dailyRows.map((r) => [r.day, r.v]));
  const series = days.map((d) => ({ day: d, v: dailyMap.get(d) ?? 0 }));
  const maxDaily = Math.max(1, ...series.map((s) => s.v));

  const recent = await sql<PaymentRow[]>`
    SELECT p.id, p.kind, p.description, p.amount_cents, p.commission_cents, p.created_at,
           u.name AS barber_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.barber_id
    WHERE p.tenant_id = ${tenant.id}
      ${isBarber ? sql`AND p.barber_id = ${user.id}` : sql``}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 10`;

  return (
    <>
      <PageHeader
        title={isBarber ? "My earnings" : "Finance"}
        subtitle={
          isBarber
            ? `Your completed work and commission (${user.commission_rate}% per service) this month.`
            : "Revenue, commissions and the shape of your month."
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isBarber ? (
          <>
            <StatCard label="My commission (month)" value={fmtMoney(monthTotals.commissions, tenant.currency)} />
            <StatCard label="Revenue I generated" value={fmtMoney(monthTotals.revenue, tenant.currency)} />
            <StatCard label="Completed services" value={String(perBarber[0]?.cuts ?? 0)} />
            <StatCard label="My rate" value={`${user.commission_rate}%`} />
          </>
        ) : (
          <>
            <StatCard label="Revenue (month)" value={fmtMoney(monthTotals.revenue, tenant.currency)} />
            <StatCard label="Services" value={fmtMoney(monthTotals.services, tenant.currency)} />
            <StatCard label="Retail" value={fmtMoney(monthTotals.retail, tenant.currency)} />
            <StatCard
              label="Commissions owed"
              value={fmtMoney(monthTotals.commissions, tenant.currency)}
              sub={`Net to shop: ${fmtMoney(monthTotals.revenue - monthTotals.commissions, tenant.currency)}`}
            />
          </>
        )}
      </div>

      <Card title={isBarber ? "My commission — last 14 days" : "Revenue — last 14 days"} className="mt-6">
        <div className="flex h-40 items-end gap-1.5">
          {series.map((s) => (
            <div key={s.day} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-amber-500/80 transition group-hover:bg-amber-400"
                style={{ height: `${Math.max(2, Math.round((s.v / maxDaily) * 152))}px` }}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-700">
                {fmtDateShort(s.day)}: {fmtMoney(s.v, tenant.currency)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>{fmtDateShort(series[0].day)}</span>
          <span>Today</span>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={isBarber ? "My month in numbers" : "Commissions by barber (month)"}>
          {perBarber.length === 0 ? (
            <EmptyState title="No barbers yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Barber</th>
                    <th className="th">Rate</th>
                    <th className="th">Services</th>
                    <th className="th">Revenue</th>
                    <th className="th">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {perBarber.map((b) => (
                    <tr key={b.barber_id}>
                      <td className="td font-medium">{b.barber_name}</td>
                      <td className="td">{b.commission_rate}%</td>
                      <td className="td">{b.cuts}</td>
                      <td className="td">{fmtMoney(b.revenue, tenant.currency)}</td>
                      <td className="td font-semibold">{fmtMoney(b.commission, tenant.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Recent payments">
          {recent.length === 0 ? (
            <EmptyState title="No payments yet" hint="Complete an appointment or sell a product." />
          ) : (
            <ul className="space-y-3">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{p.description}</p>
                    <p className="text-xs text-zinc-500">
                      {p.created_at.slice(0, 10)}
                      {p.barber_name ? ` · ${p.barber_name}` : " · Counter sale"}
                      {p.kind === "product" ? " · Retail" : ""}
                    </p>
                  </div>
                  <span className="font-semibold">
                    {fmtMoney(isBarber ? p.commission_cents : p.amount_cents, tenant.currency)}
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
