"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hashPassword } from "@/lib/password";

const BACK = "/dashboard/clients";

export async function addClient(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const sql = await db();

  if (!name || !email.includes("@")) {
    redirect(BACK + "?e=" + encodeURIComponent("Clients need at least a name and a valid email."));
  }
  const [taken] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (taken) {
    redirect(BACK + "?e=" + encodeURIComponent("That email is already registered."));
  }

  await sql`
    INSERT INTO users (tenant_id, role, name, email, phone, password_hash, commission_rate)
    VALUES (${user.tenant_id}, 'client', ${name}, ${email}, ${phone || null},
            ${password.length >= 8 ? hashPassword(password) : ""}, 0)`;

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent(`${name} added to your client book.`));
}

export async function addClientNote(formData: FormData) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const clientId = Number(formData.get("client_id"));
  const body = String(formData.get("body") ?? "").trim();
  const back = `${BACK}/${clientId}`;
  const sql = await db();

  const [client] = await sql`
    SELECT 1 FROM users WHERE id = ${clientId} AND tenant_id = ${user.tenant_id} AND role = 'client'`;
  if (!client || !body) redirect(back);

  await sql`
    INSERT INTO client_notes (tenant_id, client_id, author_id, body)
    VALUES (${user.tenant_id}, ${clientId}, ${user.id}, ${body})`;

  revalidatePath(back);
  redirect(back);
}
