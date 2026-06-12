"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hashPassword } from "@/lib/password";
import { planOf } from "@/lib/plans";

const BACK = "/dashboard/staff";

export async function addStaff(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role"));
  const commission = Math.min(100, Math.max(0, Number(formData.get("commission_rate")) || 40));
  const sql = await db();

  if (!["barber", "manager"].includes(role)) redirect(BACK);
  if (role === "manager" && user.role !== "owner") {
    redirect(BACK + "?e=" + encodeURIComponent("Only the owner can add managers."));
  }
  if (!name || !email.includes("@") || password.length < 8) {
    redirect(BACK + "?e=" + encodeURIComponent("Fill in every field. Passwords need at least 8 characters."));
  }
  const [taken] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (taken) {
    redirect(BACK + "?e=" + encodeURIComponent("That email is already in use."));
  }

  const plan = planOf(user.tenant);
  const [{ c }] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM users
    WHERE tenant_id = ${user.tenant_id} AND active = 1 AND role IN ('owner','manager','barber')`;
  if (c >= plan.maxStaff) {
    redirect(
      BACK + "?e=" + encodeURIComponent(
        `Your ${plan.name} plan is limited to ${plan.maxStaff} staff seats. Upgrade in Billing to add more.`
      )
    );
  }

  await sql`
    INSERT INTO users (tenant_id, role, name, email, password_hash, commission_rate)
    VALUES (${user.tenant_id}, ${role}, ${name}, ${email}, ${hashPassword(password)},
            ${role === "barber" ? commission : 0})`;

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent(`${name} added to the team.`));
}

export async function toggleStaff(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const id = Number(formData.get("id"));
  const sql = await db();

  const [target] = await sql<{ role: string }[]>`
    SELECT role FROM users WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;
  if (!target || target.role === "owner" || id === user.id) redirect(BACK);
  if (target!.role === "manager" && user.role !== "owner") redirect(BACK);

  await sql`
    UPDATE users SET active = 1 - active WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;

  revalidatePath(BACK);
  redirect(BACK);
}

export async function updateCommission(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const id = Number(formData.get("id"));
  const rate = Math.min(100, Math.max(0, Number(formData.get("commission_rate")) || 0));
  const sql = await db();

  await sql`
    UPDATE users SET commission_rate = ${rate}
    WHERE id = ${id} AND tenant_id = ${user.tenant_id} AND role = 'barber'`;

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent("Commission updated."));
}
