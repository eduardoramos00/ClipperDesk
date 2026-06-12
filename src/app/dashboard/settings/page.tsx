import { requireUser } from "@/lib/guard";
import { updateSettings } from "@/actions/settings";
import SubmitButton from "@/components/SubmitButton";
import { Card, Flash, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["owner"]);
  const tenant = user.tenant;

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Shop identity and the hours your booking engine offers to clients."
      />

      <Flash searchParams={searchParams} />

      <div className="max-w-xl">
        <Card title="Shop settings">
          <form action={updateSettings} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Shop name</label>
              <input id="name" name="name" required defaultValue={tenant.name} className="input" />
            </div>
            <div>
              <label className="label">Public booking page</label>
              <p className="input bg-zinc-100 font-mono text-xs dark:bg-zinc-800">
                /s/{tenant.slug}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="open_hour">Opens at</label>
                <select id="open_hour" name="open_hour" defaultValue={tenant.open_hour} className="input">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="close_hour">Closes at</label>
                <select id="close_hour" name="close_hour" defaultValue={tenant.close_hour} className="input">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="slot_step">Booking slot interval</label>
                <select id="slot_step" name="slot_step" defaultValue={tenant.slot_step} className="input">
                  {[10, 15, 20, 30, 60].map((s) => (
                    <option key={s} value={s}>{s} minutes</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="currency">Currency (ISO code)</label>
                <select id="currency" name="currency" defaultValue={tenant.currency} className="input">
                  {["EUR", "USD", "GBP", "BRL", "CHF"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <SubmitButton className="btn-primary" pendingLabel="Saving…">
              Save settings
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
