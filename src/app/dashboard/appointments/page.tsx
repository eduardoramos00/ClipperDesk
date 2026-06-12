import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { createAppointmentStaff, setAppointmentStatus } from "@/actions/appointments";
import { addDaysYmd, durationLabel, fmtDate, fmtMoney, fmtTime, todayYmd } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, Flash, PageHeader, STATUS_LABEL, STATUS_TONE } from "@/components/ui";
import type { AppointmentRow, Service, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string; barber?: string; e?: string; ok?: string };
}) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const sql = await db();
  const tenant = user.tenant;
  const isBarber = user.role === "barber";

  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "")
    ? searchParams.date!
    : todayYmd();
  const barberParam = Number(searchParams.barber) || 0;
  const filterBarberId = isBarber ? user.id : barberParam;

  const barbers = await sql<User[]>`
    SELECT * FROM users WHERE tenant_id = ${tenant.id} AND role = 'barber' AND active = 1 ORDER BY name`;
  const services = await sql<Service[]>`
    SELECT * FROM services WHERE tenant_id = ${tenant.id} AND active = 1 ORDER BY name`;
  const clients = await sql<Pick<User, "id" | "name">[]>`
    SELECT id, name FROM users WHERE tenant_id = ${tenant.id} AND role = 'client' ORDER BY name`;

  const appointments = await sql<AppointmentRow[]>`
    SELECT a.*, c.name AS client_name, b.name AS barber_name, s.name AS service_name, s.duration_min
    FROM appointments a
    JOIN users c ON c.id = a.client_id
    JOIN users b ON b.id = a.barber_id
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ${tenant.id} AND substr(a.starts_at, 1, 10) = ${date}
      ${filterBarberId ? sql`AND a.barber_id = ${filterBarberId}` : sql``}
    ORDER BY a.starts_at`;

  const back = `/dashboard/appointments?date=${date}${barberParam ? `&barber=${barberParam}` : ""}`;
  const dayLink = (d: string) =>
    `/dashboard/appointments?date=${d}${barberParam ? `&barber=${barberParam}` : ""}`;

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={isBarber ? "Your personal schedule." : "The whole shop's schedule, day by day."}
      />

      <Flash searchParams={searchParams} />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={dayLink(addDaysYmd(date, -1))} className="btn-ghost btn-sm">← Prev</Link>
        <span className="rounded-lg border border-amber-500 bg-amber-500/10 px-3.5 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {date === todayYmd() ? `Today · ${fmtDate(date)}` : fmtDate(date)}
        </span>
        <Link href={dayLink(addDaysYmd(date, 1))} className="btn-ghost btn-sm">Next →</Link>
        {date !== todayYmd() && (
          <Link href={dayLink(todayYmd())} className="btn-ghost btn-sm">Jump to today</Link>
        )}

        {!isBarber && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Link
              href={`/dashboard/appointments?date=${date}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !barberParam
                  ? "bg-amber-500 text-zinc-950"
                  : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              All barbers
            </Link>
            {barbers.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/appointments?date=${date}&barber=${b.id}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  barberParam === b.id
                    ? "bg-amber-500 text-zinc-950"
                    : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {b.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {appointments.length === 0 ? (
            <EmptyState
              title="No appointments on this day"
              hint="Book a walk-in with the form on the right."
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center">
                      <p className="font-mono text-sm font-bold">{fmtTime(a.starts_at)}</p>
                      <p className="text-[11px] text-zinc-500">{durationLabel(a.duration_min)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{a.client_name}</p>
                      <p className="text-xs text-zinc-500">
                        {a.service_name} · {a.barber_name} · {fmtMoney(a.price_cents, tenant.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                    {a.status === "scheduled" && (!isBarber || a.barber_id === user.id) && (
                      <div className="flex gap-1.5">
                        <form action={setAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="completed" />
                          <input type="hidden" name="back" value={back} />
                          <SubmitButton className="btn-primary btn-sm" pendingLabel="…">
                            Complete
                          </SubmitButton>
                        </form>
                        <form action={setAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="no_show" />
                          <input type="hidden" name="back" value={back} />
                          <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">
                            No-show
                          </SubmitButton>
                        </form>
                        <form action={setAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="cancelled" />
                          <input type="hidden" name="back" value={back} />
                          <SubmitButton className="btn-danger btn-sm" pendingLabel="…">
                            Cancel
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Card title="Book a walk-in">
          <form action={createAppointmentStaff} className="space-y-4">
            <div>
              <label className="label" htmlFor="client_id">Client</label>
              <select id="client_id" name="client_id" required className="input">
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="service_id">Service</label>
              <select id="service_id" name="service_id" required className="input">
                <option value="">Select a service…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({durationLabel(s.duration_min)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="barber_id">Barber</label>
              {isBarber ? (
                <>
                  <input type="hidden" name="barber_id" value={user.id} />
                  <p className="input bg-zinc-100 dark:bg-zinc-800">{user.name} (you)</p>
                </>
              ) : (
                <select id="barber_id" name="barber_id" required className="input">
                  <option value="">Select a barber…</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="date">Date</label>
                <input id="date" name="date" type="date" required defaultValue={date} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="time">Time</label>
                <input id="time" name="time" type="time" required step={tenant.slot_step * 60} className="input" />
              </div>
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Booking…">
              Book appointment
            </SubmitButton>
            <p className="text-xs text-zinc-500">
              Double-bookings are rejected automatically — the engine checks the barber&apos;s calendar before confirming.
            </p>
          </form>
        </Card>
      </div>
    </>
  );
}
