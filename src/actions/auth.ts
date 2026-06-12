"use server";

import { redirect } from "next/navigation";
import { db, type Queryable } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { addDaysYmd, todayYmd } from "@/lib/format";
import type { Tenant, User } from "@/lib/types";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function slugify(sql: Queryable, name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "shop";
  let slug = base;
  for (let i = 2; ; i++) {
    const [exists] = await sql`SELECT 1 FROM tenants WHERE slug = ${slug}`;
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
}

function homeFor(role: string): string {
  return role === "client" ? "/portal" : "/dashboard";
}

// Only allow same-site paths: "//evil.com" is a protocol-relative URL, not a path.
function safePath(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

export async function registerShop(formData: FormData) {
  const shopName = str(formData, "shop_name");
  const ownerName = str(formData, "owner_name");
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const sql = await db();

  if (!shopName || !ownerName || !email.includes("@") || password.length < 8) {
    redirect("/register?e=" + encodeURIComponent("Fill in every field. Passwords need at least 8 characters."));
  }
  const [taken] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (taken) {
    redirect("/register?e=" + encodeURIComponent("That email is already registered. Try signing in instead."));
  }

  const ownerId = await sql.begin(async (tx) => {
    const slug = await slugify(tx, shopName);
    const [{ id: tenantId }] = await tx<{ id: number }[]>`
      INSERT INTO tenants (name, slug, plan, plan_status, trial_ends_at)
      VALUES (${shopName}, ${slug}, 'starter', 'trialing', ${addDaysYmd(todayYmd(), 14)})
      RETURNING id`;
    const [{ id }] = await tx<{ id: number }[]>`
      INSERT INTO users (tenant_id, role, name, email, password_hash, commission_rate)
      VALUES (${tenantId}, 'owner', ${ownerName}, ${email}, ${hashPassword(password)}, 100)
      RETURNING id`;
    await tx`
      INSERT INTO services (tenant_id, name, description, duration_min, price_cents) VALUES
      (${tenantId}, 'Classic Cut', 'Scissor & clipper cut with hot towel finish.', 30, 1800),
      (${tenantId}, 'Beard Trim', 'Shape, line-up and conditioning oil.', 20, 1200)`;
    return id;
  });

  createSession(ownerId as number);
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = str(formData, "next");
  const sql = await db();

  const [user] = await sql<User[]>`
    SELECT * FROM users WHERE email = ${email} AND active = 1`;

  if (!user || !verifyPassword(password, user.password_hash)) {
    const q = next ? `&next=${encodeURIComponent(next)}` : "";
    redirect("/login?e=" + encodeURIComponent("Invalid email or password.") + q);
  }

  createSession(user!.id);
  redirect(next && safePath(next) ? next : homeFor(user!.role));
}

export async function logout() {
  destroySession();
  redirect("/login");
}

export async function registerClient(formData: FormData) {
  const slug = str(formData, "slug");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const phone = str(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const next = str(formData, "next");
  const back = `/s/${slug}/join${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const sql = await db();

  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE slug = ${slug}`;
  if (!tenant) redirect("/");

  if (!name || !email.includes("@") || password.length < 8) {
    redirect(back + (next ? "&" : "?") + "e=" + encodeURIComponent("Fill in every field. Passwords need at least 8 characters."));
  }
  const [taken] = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`;
  const isGuestHere =
    taken && taken.tenant_id === tenant!.id && taken.role === "client" && !taken.password_hash;
  if (taken && !isGuestHere) {
    redirect(back + (next ? "&" : "?") + "e=" + encodeURIComponent("That email is already registered. Sign in instead."));
  }

  let clientId: number;
  if (taken) {
    // Upgrade a guest booking profile into a full account; their past
    // appointments show up in the portal automatically.
    await sql`
      UPDATE users SET name = ${name}, phone = ${phone || null}, password_hash = ${hashPassword(password)}
      WHERE id = ${taken.id}`;
    clientId = taken.id;
  } else {
    const [{ id }] = await sql<{ id: number }[]>`
      INSERT INTO users (tenant_id, role, name, email, phone, password_hash, commission_rate)
      VALUES (${tenant!.id}, 'client', ${name}, ${email}, ${phone || null}, ${hashPassword(password)}, 0)
      RETURNING id`;
    clientId = id;
  }

  createSession(clientId);
  redirect(next && safePath(next) ? next : `/s/${slug}`);
}
