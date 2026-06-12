import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { cancelOwnAppointment } from "@/actions/appointments";
import { logout } from "@/actions/auth";
import { fmtDateTime, fmtMoney, nowLocalISO } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge, EmptyState, Flash, Logo, STATUS_LABEL, STATUS_TONE } from "@/components/ui";
import type { AppointmentRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["client"]);
  const sql = await db();
  const tenant = user.tenant;
  const now = nowLocalISO();

  const appointments = await sql<AppointmentRow[]>`
    SELECT a.*, b.name AS barber_name, s.name AS service_name, s.duration_min,
           c.name AS client_name
    FROM appointments a
    JOIN users b ON b.id = a.barber_id
    JOIN users c ON c.id = a.client_id
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ${tenant.id} AND a.client_id = ${user.id}
    ORDER BY a.starts_at DESC`;

  const upcoming = appointments
    .filter((a) => a.status === "scheduled" && a.starts_at > now)
    .reverse();
  const past = appointments.filter((a) => !(a.status === "scheduled" && a.starts_at > now));

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href={`/s/${tenant.slug}`} className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-bold">{tenant.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className="btn-ghost">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hey, {user.name.split(" ")[0]} 👋</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Your appointments at {tenant.name}.
            </p>
          </div>
          <Link href={`/s/${tenant.slug}/book`} className="btn-primary">
            Book a new appointment
          </Link>
        </div>

        <Flash searchParams={searchParams} />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming appointments"
              hint="Book your next cut and it will show up here."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="font-semibold">{a.service_name}</p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {fmtDateTime(a.starts_at)} · with {a.barber_name} ·{" "}
                      {fmtMoney(a.price_cents, tenant.currency)}
                    </p>
                  </div>
                  <form action={cancelOwnAppointment}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="btn-danger btn-sm" pendingLabel="Cancelling…">
                      Cancel
                    </SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            History
          </h2>
          {past.length === 0 ? (
            <EmptyState title="No past visits yet" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">When</th>
                    <th className="th">Service</th>
                    <th className="th">Barber</th>
                    <th className="th">Price</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((a) => (
                    <tr key={a.id}>
                      <td className="td whitespace-nowrap">{fmtDateTime(a.starts_at)}</td>
                      <td className="td">{a.service_name}</td>
                      <td className="td">{a.barber_name}</td>
                      <td className="td">{fmtMoney(a.price_cents, tenant.currency)}</td>
                      <td className="td">
                        <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
