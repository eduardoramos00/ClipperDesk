import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import type { Role, SessionUser } from "./types";

const STAFF_ROLES: Role[] = ["owner", "manager", "barber"];

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) {
    redirect(user.role === "client" ? "/portal" : "/dashboard");
  }
  return user;
}

export async function requireStaff(roles: Role[] = STAFF_ROLES): Promise<SessionUser> {
  return requireUser(roles);
}
