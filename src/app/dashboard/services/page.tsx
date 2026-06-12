import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addService, toggleService, updateService } from "@/actions/services";
import { durationLabel } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, Flash, PageHeader } from "@/components/ui";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["owner", "manager"]);
  const sql = await db();
  const tenant = user.tenant;

  const services = await sql<Service[]>`
    SELECT * FROM services WHERE tenant_id = ${tenant.id} ORDER BY active DESC, name`;

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Each service has its own duration — the scheduler blocks exactly that much time."
      />

      <Flash searchParams={searchParams} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {services.length === 0 ? (
            <EmptyState title="No services yet" hint="Add your menu with the form on the right." />
          ) : (
            services.map((s) => (
              <div key={s.id} className="card p-4">
                <form action={updateService} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <div className="min-w-40 flex-1">
                    <label className="label">Name</label>
                    <input name="name" defaultValue={s.name} required className="input" />
                  </div>
                  <div className="w-28">
                    <label className="label">Minutes</label>
                    <input name="duration_min" type="number" min={5} step={5} defaultValue={s.duration_min} required className="input" />
                  </div>
                  <div className="w-28">
                    <label className="label">Price ({tenant.currency})</label>
                    <input name="price" type="number" min={0} step="0.01" defaultValue={(s.price_cents / 100).toFixed(2)} required className="input" />
                  </div>
                  <SubmitButton className="btn-ghost" pendingLabel="Saving…">Save</SubmitButton>
                </form>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Badge tone={s.active ? "green" : "zinc"}>{s.active ? "Bookable" : "Hidden"}</Badge>
                    {durationLabel(s.duration_min)}
                    {s.description && <span>· {s.description}</span>}
                  </div>
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <SubmitButton className={s.active ? "btn-danger btn-sm" : "btn-primary btn-sm"} pendingLabel="…">
                      {s.active ? "Hide from booking" : "Make bookable"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>

        <Card title="Add a service">
          <form action={addService} className="space-y-4">
            <div>
              <label className="label" htmlFor="svc_name">Name</label>
              <input id="svc_name" name="name" required className="input" placeholder="Skin Fade" />
            </div>
            <div>
              <label className="label" htmlFor="svc_desc">Description (optional)</label>
              <input id="svc_desc" name="description" className="input" placeholder="Precision fade down to the skin." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="svc_dur">Duration (min)</label>
                <input id="svc_dur" name="duration_min" type="number" min={5} step={5} defaultValue={30} required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="svc_price">Price ({tenant.currency})</label>
                <input id="svc_price" name="price" type="number" min={0} step="0.01" placeholder="24.00" required className="input" />
              </div>
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
              Add service
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
