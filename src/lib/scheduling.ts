import { db, type Queryable } from "./db";
import { addMinutesISO, minutesToHm, nowLocalISO, todayYmd } from "./format";
import type { Tenant } from "./types";

export async function hasCollision(
  sql: Queryable,
  tenantId: number,
  barberId: number,
  startsAt: string,
  endsAt: string,
  excludeId = 0
): Promise<boolean> {
  const [{ c }] = await sql<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM appointments
    WHERE tenant_id = ${tenantId} AND barber_id = ${barberId} AND status = 'scheduled'
      AND starts_at < ${endsAt} AND ends_at > ${startsAt} AND id != ${excludeId}`;
  return c > 0;
}

export async function availableSlots(
  tenant: Tenant,
  barberId: number,
  date: string,
  durationMin: number
): Promise<string[]> {
  const sql = await db();
  const booked = await sql<{ starts_at: string; ends_at: string }[]>`
    SELECT starts_at, ends_at FROM appointments
    WHERE tenant_id = ${tenant.id} AND barber_id = ${barberId} AND status = 'scheduled'
      AND substr(starts_at, 1, 10) = ${date}
    ORDER BY starts_at`;

  const slots: string[] = [];
  const open = tenant.open_hour * 60;
  const close = tenant.close_hour * 60;
  const step = Math.max(5, tenant.slot_step);
  const now = nowLocalISO();
  const isToday = date === todayYmd();

  for (let m = open; m + durationMin <= close; m += step) {
    const time = minutesToHm(m);
    const starts = `${date}T${time}`;
    if (isToday && starts <= now) continue;
    const ends = addMinutesISO(starts, durationMin);
    if (booked.some((b) => b.starts_at < ends && b.ends_at > starts)) continue;
    slots.push(time);
  }
  return slots;
}
