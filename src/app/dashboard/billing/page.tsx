import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { cancelSubscription, changePlan } from "@/actions/billing";
import { PLANS, PLAN_ORDER, planOf, trialDaysLeft } from "@/lib/plans";
import { fmtDateShort, fmtMoney } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, Flash, PageHeader } from "@/components/ui";
import type { BillingEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["owner"]);
  const sql = await db();
  const tenant = user.tenant;
  const current = planOf(tenant);

  const events = await sql<BillingEvent[]>`
    SELECT * FROM billing_events WHERE tenant_id = ${tenant.id}
    ORDER BY created_at DESC, id DESC LIMIT 12`;

  const statusBadge =
    tenant.plan_status === "active" ? (
      <Badge tone="green">Active</Badge>
    ) : tenant.plan_status === "trialing" ? (
      <Badge tone="amber">Trial — {trialDaysLeft(tenant)} days left</Badge>
    ) : (
      <Badge tone="red">Cancelled</Badge>
    );

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Your ClipperDesk subscription. Changing plans takes effect immediately."
      />

      <Flash searchParams={searchParams} />

      <Card title="Current subscription">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold">
              {current.name} — {fmtMoney(current.priceCents)} / month
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {current.maxStaff >= 999 ? "Unlimited" : `Up to ${current.maxStaff}`} staff seats · {current.tagline}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {statusBadge}
            {tenant.plan_status === "active" && (
              <form action={cancelSubscription}>
                <SubmitButton className="btn-danger btn-sm" pendingLabel="Cancelling…">
                  Cancel subscription
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = tenant.plan === id && tenant.plan_status === "active";
          return (
            <div
              key={id}
              className={`card flex flex-col p-6 ${isCurrent ? "ring-2 ring-amber-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{plan.name}</h3>
                {isCurrent && <Badge tone="amber">Current</Badge>}
              </div>
              <p className="mt-3">
                <span className="text-3xl font-extrabold">{fmtMoney(plan.priceCents)}</span>
                <span className="text-sm text-zinc-500"> /month</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <form action={changePlan} className="mt-6">
                <input type="hidden" name="plan" value={id} />
                <SubmitButton
                  className={isCurrent ? "btn-ghost w-full" : "btn-primary w-full"}
                  pendingLabel="Updating…"
                >
                  {isCurrent ? "Renew now" : tenant.plan_status === "active" ? `Switch to ${plan.name}` : `Subscribe to ${plan.name}`}
                </SubmitButton>
              </form>
            </div>
          );
        })}
      </div>

      <Card title="Billing history" className="mt-6">
        {events.length === 0 ? (
          <EmptyState title="No invoices yet" hint="Your first invoice appears when the trial converts." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Event</th>
                  <th className="th">Plan</th>
                  <th className="th">Amount</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="td">{fmtDateShort(e.created_at.slice(0, 10))}</td>
                    <td className="td capitalize">{e.type}</td>
                    <td className="td capitalize">{e.plan}</td>
                    <td className="td">{e.amount_cents ? fmtMoney(e.amount_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
