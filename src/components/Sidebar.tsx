"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import ThemeToggle from "./ThemeToggle";
import { Logo } from "./ui";
import type { Role } from "@/lib/types";

const ICONS: Record<string, string> = {
  overview: "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z",
  appointments:
    "M8 2v3M16 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  clients:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  services:
    "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.12 8.12 20 20M8.12 15.88 20 4",
  staff:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6",
  inventory:
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8zM3.3 7l8.7 5 8.7-5M12 22V12",
  finance: "M3 3v18h18M7 16l4-6 4 3 5-8",
  billing:
    "M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.07-.4.1-.8.1-1.2z",
};

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview", roles: ["owner", "manager", "barber"] },
  { href: "/dashboard/appointments", label: "Appointments", icon: "appointments", roles: ["owner", "manager", "barber"] },
  { href: "/dashboard/clients", label: "Clients", icon: "clients", roles: ["owner", "manager"] },
  { href: "/dashboard/services", label: "Services", icon: "services", roles: ["owner", "manager"] },
  { href: "/dashboard/staff", label: "Staff", icon: "staff", roles: ["owner", "manager"] },
  { href: "/dashboard/inventory", label: "Inventory", icon: "inventory", roles: ["owner", "manager", "barber"] },
  { href: "/dashboard/finance", label: "Finance", icon: "finance", roles: ["owner", "manager", "barber"] },
  { href: "/dashboard/billing", label: "Billing", icon: "billing", roles: ["owner"] },
  { href: "/dashboard/settings", label: "Settings", icon: "settings", roles: ["owner"] },
];

export default function Sidebar({
  role,
  shopName,
  shopSlug,
  planName,
  userName,
}: {
  role: Role;
  shopName: string;
  shopSlug: string;
  planName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{shopName}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {planName} plan
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Icon d={ICONS[item.icon]} />
              {item.label}
            </Link>
          );
        })}
        <Link
          href={`/s/${shopSlug}`}
          target="_blank"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
          Booking page
        </Link>
      </nav>

      <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">{role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
