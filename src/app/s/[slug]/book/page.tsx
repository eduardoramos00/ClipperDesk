import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { bookAppointmentClient, bookAppointmentGuest } from "@/actions/appointments";
import { availableSlots } from "@/lib/scheduling";
import { addDaysYmd, durationLabel, fmtDateShort, fmtMoney, todayYmd } from "@/lib/format";
import { tenantOperational } from "@/lib/plans";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Flash, Logo } from "@/components/ui";
import type { Service, Tenant, User } from "@/lib/types";

export const dynamic = "force-dynamic";

function Step({ n, label, done }: { n: number; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-amber-500 text-zinc-950"
            : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {n}
      </span>
      <span className={`text-sm ${done ? "font-semibold" : "text-zinc-500"}`}>{label}</span>
    </div>
  );
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { service?: string; barber?: string; date?: string; time?: string; e?: string };
}) {
  const sql = await db();
  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE slug = ${params.slug}`;
  if (!tenant) notFound();
  if (!tenantOperational(tenant)) {
    redirect(`/s/${tenant.slug}?e=` + encodeURIComponent("This shop is not accepting online bookings right now."));
  }

  const services = await sql<Service[]>`
    SELECT * FROM services WHERE tenant_id = ${tenant.id} AND active = 1 ORDER BY price_cents`;
  const barbers = await sql<User[]>`
    SELECT * FROM users WHERE tenant_id = ${tenant.id} AND role = 'barber' AND active = 1 ORDER BY name`;

  const service = services.find((s) => s.id === Number(searchParams.service));
  const barber = barbers.find((b) => b.id === Number(searchParams.barber));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : null;
  const time = /^\d{2}:\d{2}$/.test(searchParams.time ?? "") ? searchParams.time! : null;

  const base = `/s/${tenant.slug}/book`;
  const session = await getSessionUser();
  const isClientHere = session?.role === "client" && session.tenant_id === tenant.id;

  const today = todayYmd();
  const days = Array.from({ length: 7 }, (_, i) => addDaysYmd(today, i));
  const slots =
    service && barber && date
      ? await availableSlots(tenant, barber.id, date, service.duration_min)
      : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href={`/s/${tenant.slug}`} className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="font-bold">{tenant.name}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Step n={1} label={service ? service.name : "Service"} done={!!service} />
          <Step n={2} label={barber ? barber.name : "Barber"} done={!!barber} />
          <Step n={3} label={date && time ? `${fmtDateShort(date)} · ${time}` : "Time"} done={!!(date && time)} />
          <Step n={4} label="Confirm" done={false} />
        </div>

        <Flash searchParams={searchParams} />

        {!service && (
          <section>
            <h1 className="mb-4 text-xl font-bold">Choose a service</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={`${base}?service=${s.id}`}
                  className="card flex items-start justify-between gap-3 p-5 transition hover:border-amber-500"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{durationLabel(s.duration_min)}</p>
                  </div>
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    {fmtMoney(s.price_cents, tenant.currency)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {service && !barber && (
          <section>
            <h1 className="mb-4 text-xl font-bold">Choose your barber</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {barbers.map((b) => (
                <Link
                  key={b.id}
                  href={`${base}?service=${service.id}&barber=${b.id}`}
                  className="card flex items-center gap-3 p-5 transition hover:border-amber-500"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400">
                    {b.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <p className="font-semibold">{b.name}</p>
                </Link>
              ))}
            </div>
            <Link href={base} className="mt-5 inline-block text-sm text-zinc-500 hover:underline">
              ← Change service
            </Link>
          </section>
        )}

        {service && barber && !time && (
          <section>
            <h1 className="mb-4 text-xl font-bold">Pick a day and time</h1>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <Link
                  key={d}
                  href={`${base}?service=${service.id}&barber=${barber.id}&date=${d}`}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                    d === date
                      ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "border-zinc-300 hover:border-amber-500 dark:border-zinc-700"
                  }`}
                >
                  {d === today ? "Today" : fmtDateShort(d)}
                </Link>
              ))}
            </div>

            {date && (
              <div className="mt-6">
                {slots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    {barber.name} is fully booked on {fmtDateShort(date)}. Try another day.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {slots.map((t) => (
                      <Link
                        key={t}
                        href={`${base}?service=${service.id}&barber=${barber.id}&date=${date}&time=${t}`}
                        className="rounded-lg border border-zinc-300 px-2 py-2 text-center text-sm font-medium transition hover:border-amber-500 hover:bg-amber-500/10 dark:border-zinc-700"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link
              href={`${base}?service=${service.id}`}
              className="mt-5 inline-block text-sm text-zinc-500 hover:underline"
            >
              ← Change barber
            </Link>
          </section>
        )}

        {service && barber && date && time && (
          <section className="card mx-auto max-w-md p-7">
            <h1 className="text-xl font-bold">Confirm your booking</h1>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Service</dt>
                <dd className="font-medium">{service.name} · {durationLabel(service.duration_min)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Barber</dt>
                <dd className="font-medium">{barber.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">When</dt>
                <dd className="font-medium">{fmtDateShort(date)} at {time}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <dt className="text-zinc-500">Price</dt>
                <dd className="font-bold text-amber-600 dark:text-amber-400">
                  {fmtMoney(service.price_cents, tenant.currency)}
                </dd>
              </div>
            </dl>

            {isClientHere ? (
              <form action={bookAppointmentClient} className="mt-6">
                <input type="hidden" name="service_id" value={service.id} />
                <input type="hidden" name="barber_id" value={barber.id} />
                <input type="hidden" name="date" value={date} />
                <input type="hidden" name="time" value={time} />
                <SubmitButton className="btn-primary w-full" pendingLabel="Booking…">
                  Confirm booking
                </SubmitButton>
              </form>
            ) : (
              <div className="mt-6 space-y-4">
                <form action={bookAppointmentGuest} className="space-y-3">
                  <input type="hidden" name="slug" value={tenant.slug} />
                  <input type="hidden" name="service_id" value={service.id} />
                  <input type="hidden" name="barber_id" value={barber.id} />
                  <input type="hidden" name="date" value={date} />
                  <input type="hidden" name="time" value={time} />
                  <div>
                    <label className="label" htmlFor="guest-email">Email</label>
                    <input
                      id="guest-email"
                      name="email"
                      type="email"
                      required
                      className="input"
                      placeholder="you@email.com"
                    />
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      No account needed — we&apos;ll email you the booking confirmation.
                    </p>
                  </div>
                  <SubmitButton className="btn-primary w-full" pendingLabel="Booking…">
                    Book as guest
                  </SubmitButton>
                </form>

                <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-zinc-400">
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                  or
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                </div>

                <div className="space-y-2">
                  <Link
                    href={`/s/${tenant.slug}/join?next=${encodeURIComponent(
                      `${base}?service=${service.id}&barber=${barber.id}&date=${date}&time=${time}`
                    )}`}
                    className="btn-ghost w-full"
                  >
                    Create an account to book
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(
                      `${base}?service=${service.id}&barber=${barber.id}&date=${date}&time=${time}`
                    )}`}
                    className="btn-ghost w-full"
                  >
                    I already have an account
                  </Link>
                </div>
              </div>
            )}

            <Link
              href={`${base}?service=${service.id}&barber=${barber.id}&date=${date}`}
              className="mt-4 inline-block text-sm text-zinc-500 hover:underline"
            >
              ← Pick a different time
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
