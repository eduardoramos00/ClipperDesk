import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { durationLabel, fmtMoney } from "@/lib/format";
import { tenantOperational } from "@/lib/plans";
import ThemeToggle from "@/components/ThemeToggle";
import { Flash, Logo } from "@/components/ui";
import type { Service, Tenant, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { e?: string; ok?: string };
}) {
  const sql = await db();
  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE slug = ${params.slug}`;
  if (!tenant) notFound();

  const services = await sql<Service[]>`
    SELECT * FROM services WHERE tenant_id = ${tenant.id} AND active = 1 ORDER BY price_cents`;
  const barbers = await sql<User[]>`
    SELECT * FROM users WHERE tenant_id = ${tenant.id} AND role = 'barber' AND active = 1 ORDER BY name`;

  const session = await getSessionUser();
  const operational = tenantOperational(tenant);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <div>
              <p className="font-bold leading-tight">{tenant.name}</p>
              <p className="text-xs text-zinc-500">
                Open {tenant.open_hour}:00 – {tenant.close_hour}:00
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.role === "client" && session.tenant_id === tenant.id ? (
              <Link href="/portal" className="btn-ghost">My bookings</Link>
            ) : (
              <Link href={`/login?next=/s/${tenant.slug}`} className="btn-ghost">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Flash searchParams={searchParams} />

        <section className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Book your next cut at {tenant.name}
          </h1>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Pick a service and a barber — we&apos;ll show you the slots that are
            actually free, in real time.
          </p>
          {operational ? (
            <Link href={`/s/${tenant.slug}/book`} className="btn-primary mt-6 px-7 py-3 text-base">
              Book an appointment
            </Link>
          ) : (
            <p className="mt-6 inline-block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Online booking is currently paused for this shop. Please call to book.
            </p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="card flex items-start justify-between gap-3 p-5">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  {s.description && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{s.description}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-500">{durationLabel(s.duration_min)}</p>
                </div>
                <p className="shrink-0 font-bold text-amber-600 dark:text-amber-400">
                  {fmtMoney(s.price_cents, tenant.currency)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold">The crew</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {barbers.map((b) => (
              <div key={b.id} className="card flex items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 font-bold text-amber-600 dark:text-amber-400">
                  {b.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <p className="font-medium">{b.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Powered by <Link href="/" className="font-medium text-amber-600 hover:underline dark:text-amber-400">ClipperDesk</Link>
      </footer>
    </div>
  );
}
