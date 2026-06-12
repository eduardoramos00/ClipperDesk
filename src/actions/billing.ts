"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

const BACK = "/dashboard/billing";

export async function changePlan(formData: FormData) {
  const user = await requireUser(["owner"]);
  const plan = String(formData.get("plan")) as PlanId;
  if (!PLANS[plan]) redirect(BACK);
  const sql = await db();

  await sql.begin(async (tx) => {
    await tx`
      UPDATE tenants SET plan = ${plan}, plan_status = 'active', trial_ends_at = NULL
      WHERE id = ${user.tenant_id}`;
    await tx`
      INSERT INTO billing_events (tenant_id, type, plan, amount_cents)
      VALUES (${user.tenant_id}, 'invoice', ${plan}, ${PLANS[plan].priceCents})`;
  });

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent(`You're now on the ${PLANS[plan].name} plan.`));
}

export async function cancelSubscription() {
  const user = await requireUser(["owner"]);
  const sql = await db();

  await sql.begin(async (tx) => {
    await tx`UPDATE tenants SET plan_status = 'canceled' WHERE id = ${user.tenant_id}`;
    await tx`
      INSERT INTO billing_events (tenant_id, type, plan, amount_cents)
      VALUES (${user.tenant_id}, 'cancellation', ${user.tenant.plan}, 0)`;
  });

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent("Subscription cancelled. Online booking is paused until you resubscribe."));
}
