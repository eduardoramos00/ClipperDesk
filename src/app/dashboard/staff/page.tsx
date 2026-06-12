import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addStaff, toggleStaff, updateCommission } from "@/actions/staff";
import { planOf } from "@/lib/plans";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, Flash, PageHeader } from "@/components/ui";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["owner", "manager"]);
  const sql = await db();
  const tenant = user.tenant;
  const plan = planOf(tenant);

  const staff = await sql<User[]>`
    SELECT * FROM users
    WHERE tenant_id = ${tenant.id} AND role IN ('owner','manager','barber')
    ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, name`;

  const activeSeats = staff.filter((s) => s.active).length;
  const seatLabel = plan.maxStaff >= 999 ? "unlimited" : String(plan.maxStaff);

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle={`${activeSeats} of ${seatLabel} seats used on the ${plan.name} plan.`}
      >
        {user.role === "owner" && (
          <Link href="/dashboard/billing" className="btn-ghost">Manage plan</Link>
        )}
      </PageHeader>

      <Flash searchParams={searchParams} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {staff.length === 0 ? (
            <EmptyState title="No staff yet" />
          ) : (
            staff.map((s) => (
              <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-600 dark:text-amber-400">
                    {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {s.name}
                      {s.id === user.id && <span className="text-zinc-400"> (you)</span>}
                    </p>
                    <p className="text-xs text-zinc-500">{s.email}</p>
                  </div>
                  <Badge tone={s.role === "owner" ? "amber" : s.role === "manager" ? "blue" : "zinc"}>
                    <span className="capitalize">{s.role}</span>
                  </Badge>
                  {!s.active && <Badge tone="red">Deactivated</Badge>}
                </div>

                <div className="flex items-center gap-2">
                  {s.role === "barber" && (
                    <form action={updateCommission} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        name="commission_rate"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={s.commission_rate}
                        className="input w-20"
                        aria-label={`Commission rate for ${s.name}`}
                      />
                      <span className="text-xs text-zinc-500">%</span>
                      <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">Save</SubmitButton>
                    </form>
                  )}
                  {s.role !== "owner" && s.id !== user.id && (user.role === "owner" || s.role === "barber") && (
                    <form action={toggleStaff}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton
                        className={s.active ? "btn-danger btn-sm" : "btn-primary btn-sm"}
                        pendingLabel="…"
                      >
                        {s.active ? "Deactivate" : "Reactivate"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Card title="Add a team member">
          <form action={addStaff} className="space-y-4">
            <div>
              <label className="label" htmlFor="st_name">Name</label>
              <input id="st_name" name="name" required className="input" placeholder="Marco Silva" />
            </div>
            <div>
              <label className="label" htmlFor="st_email">Email</label>
              <input id="st_email" name="email" type="email" required className="input" placeholder="marco@shop.com" />
            </div>
            <div>
              <label className="label" htmlFor="st_password">Temporary password (min. 8 characters)</label>
              <input id="st_password" name="password" type="password" required minLength={8} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="st_role">Role</label>
                <select id="st_role" name="role" className="input" defaultValue="barber">
                  <option value="barber">Barber</option>
                  {user.role === "owner" && <option value="manager">Manager</option>}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="st_comm">Commission %</label>
                <input id="st_comm" name="commission_rate" type="number" min={0} max={100} defaultValue={40} className="input" />
              </div>
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
              Add to the team
            </SubmitButton>
            <p className="text-xs text-zinc-500">
              Barbers see their own schedule and commissions. Managers run day-to-day operations.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
