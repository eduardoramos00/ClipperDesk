import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Logo } from "@/components/ui";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { fmtMoney } from "@/lib/format";

const FEATURES = [
  {
    title: "Collision-proof scheduling",
    body: "Variable service durations, per-barber calendars and transactional double-booking prevention — slots that are gone, stay gone.",
  },
  {
    title: "Client CRM & history",
    body: "Every visit, every note, every euro spent. Your barbers know each client's preferences before they sit down.",
  },
  {
    title: "Commissions, automated",
    body: "Set a rate per barber. Every completed appointment computes their cut instantly — no spreadsheets at the end of the month.",
  },
  {
    title: "Inventory that warns you",
    body: "Track pomades, oils and blades. Counter sales decrement stock and flow straight into your revenue dashboard.",
  },
  {
    title: "Financial dashboard",
    body: "Daily revenue trends, services vs retail split, and commissions owed per barber — all live, all in one screen.",
  },
  {
    title: "Online booking page",
    body: "Each shop gets a polished public page where clients pick a service, a barber and a real-time available slot.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">ClipperDesk</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Start free trial
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mb-4 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
          Built for barbershops, not generic salons
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
          Run your whole shop from{" "}
          <span className="text-amber-500">one desk</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Scheduling, client history, inventory, barber commissions and revenue —
          ClipperDesk is the operating system your barbershop has been cutting
          corners without.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">
            Open your shop — 14 days free
          </Link>
          <Link href="/s/fade-district" className="btn-ghost px-6 py-3 text-base">
            See a live demo shop
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          No credit card required. Demo login: owner@demo.dev / demo1234
        </p>
      </section>

      <section className="border-y border-zinc-200 bg-white py-16 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Simple pricing that scales with your chairs
        </h2>
        <p className="mt-2 text-center text-zinc-600 dark:text-zinc-400">
          Every plan starts with a 14-day free trial.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const highlight = id === "pro";
            return (
              <div
                key={id}
                className={`card flex flex-col p-7 ${
                  highlight ? "ring-2 ring-amber-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {highlight && (
                    <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-zinc-950">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {plan.tagline}
                </p>
                <p className="mt-5">
                  <span className="text-4xl font-extrabold">
                    {fmtMoney(plan.priceCents)}
                  </span>
                  <span className="text-sm text-zinc-500"> /month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-amber-500">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-7 ${highlight ? "btn-primary" : "btn-ghost"}`}
                >
                  Start free trial
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        © {new Date().getFullYear()} ClipperDesk — the operating system for modern barbershops.
      </footer>
    </div>
  );
}
