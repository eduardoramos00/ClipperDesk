import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addClient } from "@/actions/clients";
import { fmtDateShort, fmtMoney } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Card, EmptyState, Flash, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

interface ClientRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  visits: number;
  spent: number;
  last_visit: string | null;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string; q?: string };
}) {
  const user = await requireUser(["owner", "manager"]);
  const sql = await db();
  const tenant = user.tenant;
  const q = (searchParams.q ?? "").trim();

  const clients = await sql<ClientRow[]>`
    SELECT u.id, u.name, u.email, u.phone,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::int AS visits,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_cents END), 0)::int AS spent,
           MAX(CASE WHEN a.status = 'completed' THEN a.starts_at END) AS last_visit
    FROM users u
    LEFT JOIN appointments a ON a.client_id = u.id AND a.tenant_id = u.tenant_id
    WHERE u.tenant_id = ${tenant.id} AND u.role = 'client'
      AND (${q} = '' OR u.name ILIKE '%' || ${q} || '%' OR u.email ILIKE '%' || ${q} || '%')
    GROUP BY u.id
    ORDER BY u.name`;

  return (
    <>
      <PageHeader title="Clients" subtitle="Your client book — history, spend and contact details." />

      <Flash searchParams={searchParams} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form method="get" className="mb-4 flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name or email…"
              className="input max-w-xs"
            />
            <button type="submit" className="btn-ghost">Search</button>
          </form>

          {clients.length === 0 ? (
            <EmptyState
              title={q ? `No clients matching “${q}”` : "No clients yet"}
              hint="Add walk-in clients with the form on the right — online bookers appear automatically."
            />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Client</th>
                    <th className="th">Visits</th>
                    <th className="th">Total spent</th>
                    <th className="th">Last visit</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="td">
                        <Link href={`/dashboard/clients/${c.id}`} className="block">
                          <p className="font-medium text-amber-600 hover:underline dark:text-amber-400">
                            {c.name}
                          </p>
                          <p className="text-xs text-zinc-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                        </Link>
                      </td>
                      <td className="td">{c.visits}</td>
                      <td className="td">{fmtMoney(c.spent, tenant.currency)}</td>
                      <td className="td">{c.last_visit ? fmtDateShort(c.last_visit) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Card title="Add a client">
          <form action={addClient} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required className="input" placeholder="João Ferreira" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="input" placeholder="client@email.com" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone (optional)</label>
              <input id="phone" name="phone" className="input" placeholder="+351 910 000 000" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password (optional — lets them book online)</label>
              <input id="password" name="password" type="password" minLength={8} className="input" placeholder="Min. 8 characters" />
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
              Add client
            </SubmitButton>
          </form>
        </Card>
      </div>
    </>
  );
}
