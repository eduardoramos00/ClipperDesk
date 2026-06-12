export const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localISO(d: Date): string {
  return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayYmd(): string {
  return ymd(new Date());
}

export function nowLocalISO(): string {
  return localISO(new Date());
}

export function addMinutesISO(iso: string, mins: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  d.setMinutes(h * 60 + m + mins);
  return localISO(d);
}

export function addDaysYmd(ymdStr: string, days: number): string {
  const d = new Date(`${ymdStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function minutesToHm(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function fmtMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function fmtTime(iso: string): string {
  return iso.slice(11, 16);
}

export function fmtDate(isoOrYmd: string): string {
  const d = new Date(
    isoOrYmd.length > 10 ? isoOrYmd : `${isoOrYmd}T00:00:00`
  );
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateShort(isoOrYmd: string): string {
  const d = new Date(
    isoOrYmd.length > 10 ? isoOrYmd : `${isoOrYmd}T00:00:00`
  );
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDateShort(iso)} · ${fmtTime(iso)}`;
}

export function durationLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
