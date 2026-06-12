import type { PlanId, Tenant } from "./types";
import { todayYmd } from "./format";

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  maxStaff: number;
  tagline: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 2900,
    maxStaff: 3,
    tagline: "For solo barbers and small chairs.",
    features: [
      "Up to 3 staff seats",
      "Smart scheduling engine",
      "Client CRM & history",
      "Inventory tracking",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 7900,
    maxStaff: 10,
    tagline: "For busy shops with a full crew.",
    features: [
      "Up to 10 staff seats",
      "Everything in Starter",
      "Financial dashboard & commissions",
      "Low-stock alerts",
      "Priority support",
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    priceCents: 14900,
    maxStaff: 999,
    tagline: "For multi-chair flagship locations.",
    features: [
      "Unlimited staff seats",
      "Everything in Pro",
      "Advanced reporting",
      "Dedicated success manager",
      "99.9% uptime SLA",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "elite"];

export function planOf(tenant: Tenant): Plan {
  return PLANS[tenant.plan] ?? PLANS.starter;
}

export function trialDaysLeft(tenant: Tenant): number {
  if (!tenant.trial_ends_at) return 0;
  const end = new Date(`${tenant.trial_ends_at}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

export function tenantOperational(tenant: Tenant): boolean {
  if (tenant.plan_status === "active") return true;
  if (tenant.plan_status === "trialing") {
    return !tenant.trial_ends_at || tenant.trial_ends_at >= todayYmd();
  }
  return false;
}
