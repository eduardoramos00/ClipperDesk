import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addClientNote } from "@/actions/clients";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, PageHeader, StatCard, STATUS_LABEL, STATUS_TONE } from "@/components/ui";
import type { AppointmentRow, User } from "@/lib/types";

export const dynamic = "force-dynamic";

interface NoteRow {
  id: number;
  body: string;
  created_at: string;
  author_name: string;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const sql = await db();
  const tenant = user.tenant;

  const [client] = await sql<User[]>`
    SELECT * FROM users WHERE id = ${Number(params.id) || 0} AND tenant_id = ${tenant.id} AND role = 'client'`;
  if (!client) notFound();

  const appointments = await sql<AppointmentRow[]>`
    SELECT a.*, b.name AS barber_name, s.name AS service_name, s.duration_min,
           c.name AS client_name
    FROM appointments a
    JOIN users b ON b.id = a.barber_id
    JOIN users c ON c.id = a.client_id
    JOIN services s ON s.id = a.service_id
    WHERE a.tenant_id = ${tenant.id} AND a.client_id = ${client.id}
    ORDER BY a.starts_at DESC`;

  const notes = await sql<NoteRow[]>`
    SELECT n.id, n.body, n.created_at, u.name AS author_name
    FROM client_notes n
    JOIN users u ON u.id = n.author_id
    WHERE n.tenant_id = ${tenant.id} AND n.client_id = ${client.id}
    ORDER BY n.created_at DESC`;

  const completed = appointments.filter((a) => a.status === "completed");
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const spent = completed.reduce((sum, a) => sum + a.price_cents, 0);

  return (
    <>
      <PageHeader title={client.name} subtitle={`${client.email}${client.phone ? ` · ${client.phone}` : ""}`}>
        <Link href="/dashboard/clients" className="btn-ghost">← All clients</Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completed visits" value={String(completed.length)} />
        <StatCard label="Lifetime spend" value={fmtMoney(spent, tenant.currency)} />
        <StatCard label="No-shows" value={String(noShows)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Visit history">
            {appointments.length === 0 ? (
              <EmptyState title="No appointments yet" />
            ) : (
              <div className="overflow-x-auto">
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
                    {appointments.map((a) => (
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
          </Card>
        </div>

        <Card title="Notes">
          <form action={addClientNote} className="mb-5 space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <textarea
              name="body"
              required
              rows={3}
              className="input resize-none"
              placeholder="Preferences, allergies, the usual order…"
            />
            <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
              Add note
            </SubmitButton>
          </form>

          {notes.length === 0 ? (
            <EmptyState title="No notes yet" hint="Notes are visible to the whole team." />
          ) : (
            <ul className="space-y-4">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-zinc-50 p-3.5 dark:bg-zinc-800/60">
                  <p className="text-sm leading-relaxed">{n.body}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {n.author_name} · {n.created_at.slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
