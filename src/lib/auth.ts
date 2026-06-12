import { createHmac, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { db } from "./db";
import type { SessionUser, Tenant, User } from "./types";

const COOKIE = "cd_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

let cachedSecret: string | null = null;

function secret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET) return (cachedSecret = process.env.SESSION_SECRET);
  const file = path.join(process.cwd(), "data", ".session-secret");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return (cachedSecret = fs.readFileSync(file, "utf8").trim());
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSession(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: Math.floor(Date.now() / 1000) + THIRTY_DAYS })
  ).toString("base64url");
  cookies().set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  if (sign(payload) !== token.slice(dot + 1)) return null;

  let parsed: { u: number; e: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed.u || parsed.e < Date.now() / 1000) return null;

  const sql = await db();
  const [user] = await sql<User[]>`SELECT * FROM users WHERE id = ${parsed.u} AND active = 1`;
  if (!user) return null;

  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE id = ${user.tenant_id}`;
  if (!tenant) return null;

  return { ...user, tenant };
}
