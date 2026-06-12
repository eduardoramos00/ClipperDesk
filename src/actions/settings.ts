"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";

const BACK = "/dashboard/settings";

export async function updateSettings(formData: FormData) {
  const user = await requireUser(["owner"]);
  const name = String(formData.get("name") ?? "").trim();
  const openHour = Number(formData.get("open_hour"));
  const closeHour = Number(formData.get("close_hour"));
  const slotStep = Number(formData.get("slot_step"));
  const currency = String(formData.get("currency") ?? "EUR").toUpperCase();
  const sql = await db();

  if (
    !name ||
    !Number.isInteger(openHour) || openHour < 0 || openHour > 23 ||
    !Number.isInteger(closeHour) || closeHour < 1 || closeHour > 24 ||
    closeHour <= openHour ||
    ![10, 15, 20, 30, 60].includes(slotStep) ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    redirect(BACK + "?e=" + encodeURIComponent("Check your values — closing time must be after opening time."));
  }

  await sql`
    UPDATE tenants SET name = ${name}, open_hour = ${openHour}, close_hour = ${closeHour},
                       slot_step = ${slotStep}, currency = ${currency}
    WHERE id = ${user.tenant_id}`;

  revalidatePath("/dashboard");
  redirect(BACK + "?ok=" + encodeURIComponent("Settings saved."));
}
