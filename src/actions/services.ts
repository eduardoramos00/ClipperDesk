"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

const BACK = "/dashboard/services";

export async function addService(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const duration = Number(formData.get("duration_min"));
  const price = Math.round(Number(formData.get("price")) * 100);
  const sql = await db();

  if (!name || !Number.isFinite(duration) || duration < 5 || !Number.isFinite(price) || price < 0) {
    redirect(BACK + "?e=" + encodeURIComponent("Service needs a name, a duration of at least 5 minutes and a price."));
  }

  await sql`
    INSERT INTO services (tenant_id, name, description, duration_min, price_cents)
    VALUES (${user.tenant_id}, ${name}, ${description || null}, ${duration}, ${price})`;

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent("Service added."));
}

export async function updateService(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const duration = Number(formData.get("duration_min"));
  const price = Math.round(Number(formData.get("price")) * 100);
  const sql = await db();

  if (!name || !Number.isFinite(duration) || duration < 5 || !Number.isFinite(price) || price < 0) {
    redirect(BACK + "?e=" + encodeURIComponent("Invalid service values."));
  }

  await sql`
    UPDATE services SET name = ${name}, duration_min = ${duration}, price_cents = ${price}
    WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent("Service updated."));
}

export async function toggleService(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const id = Number(formData.get("id"));
  const sql = await db();

  await sql`
    UPDATE services SET active = 1 - active WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;

  revalidatePath(BACK);
  redirect(BACK);
}
