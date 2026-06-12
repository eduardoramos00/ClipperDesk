import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { planOf, tenantOperational, trialDaysLeft } from "@/lib/plans";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const tenant = user.tenant;
  const plan = planOf(tenant);
  const operational = tenantOperational(tenant);
  const daysLeft = trialDaysLeft(tenant);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={user.role}
        shopName={tenant.name}
        shopSlug={tenant.slug}
        planName={plan.name}
        userName={user.name}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">
        {tenant.plan_status === "trialing" && operational && (
          <div className="border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Free trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left.{" "}
            {user.role === "owner" && (
              <Link href="/dashboard/billing" className="font-semibold underline">
                Choose a plan
              </Link>
            )}
          </div>
        )}
        {!operational && (
          <div className="border-b border-red-300 bg-red-50 px-6 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            Your subscription is inactive — online booking is paused for clients.{" "}
            {user.role === "owner" && (
              <Link href="/dashboard/billing" className="font-semibold underline">
                Reactivate in Billing
              </Link>
            )}
          </div>
        )}
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
