"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { hasCollision, availableSlots } from "@/lib/scheduling";
import { addMinutesISO, durationLabel, fmtDateShort, fmtMoney, nowLocalISO } from "@/lib/format";
import { tenantOperational } from "@/lib/plans";
import { sendMail } from "@/lib/mailer";
import type { Appointment, Service, Tenant, User } from "@/lib/types";

class Conflict extends Error {}

async function insertAppointment(
  tenantId: number,
  clientId: number,
  barberId: number,
  service: Service,
  startsAt: string
) {
  const endsAt = addMinutesISO(startsAt, service.duration_min);
  const sql = await db();
  await sql.begin(async (tx) => {
    // Lock the barber's row so concurrent bookings for the same barber
    // serialize and the collision check below stays race-safe.
    await tx`SELECT id FROM users WHERE id = ${barberId} FOR UPDATE`;
    if (await hasCollision(tx, tenantId, barberId, startsAt, endsAt)) throw new Conflict();
    await tx`
      INSERT INTO appointments
        (tenant_id, client_id, barber_id, service_id, starts_at, ends_at, status, price_cents)
      VALUES (${tenantId}, ${clientId}, ${barberId}, ${service.id}, ${startsAt}, ${endsAt}, 'scheduled', ${service.price_cents})`;
  });
}

export async function createAppointmentStaff(formData: FormData) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const tenantId = user.tenant_id;
  const sql = await db();

  const clientId = Number(formData.get("client_id"));
  const serviceId = Number(formData.get("service_id"));
  const barberId =
    user.role === "barber" ? user.id : Number(formData.get("barber_id"));
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const back = `/dashboard/appointments?date=${date}`;

  const [service] = await sql<Service[]>`
    SELECT * FROM services WHERE id = ${serviceId} AND tenant_id = ${tenantId} AND active = 1`;
  const [client] = await sql`
    SELECT id FROM users WHERE id = ${clientId} AND tenant_id = ${tenantId} AND role = 'client'`;
  const [barber] = await sql`
    SELECT id FROM users WHERE id = ${barberId} AND tenant_id = ${tenantId} AND role = 'barber' AND active = 1`;

  if (!service || !client || !barber || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(back + "&e=" + encodeURIComponent("Pick a client, service, barber, date and time."));
  }

  const startsAt = `${date}T${time}`;
  if (startsAt <= nowLocalISO()) {
    redirect(back + "&e=" + encodeURIComponent("That time is in the past."));
  }

  try {
    await insertAppointment(tenantId, clientId, barberId, service!, startsAt);
  } catch (err) {
    if (err instanceof Conflict) {
      redirect(back + "&e=" + encodeURIComponent("That slot overlaps an existing appointment for this barber."));
    }
    throw err;
  }

  revalidatePath("/dashboard/appointments");
  redirect(back + "&ok=" + encodeURIComponent("Appointment booked."));
}

export async function bookAppointmentClient(formData: FormData) {
  const user = await requireUser(["client"]);
  const tenant = user.tenant as Tenant;
  const sql = await db();

  const serviceId = Number(formData.get("service_id"));
  const barberId = Number(formData.get("barber_id"));
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const back = `/s/${tenant.slug}/book?service=${serviceId}&barber=${barberId}&date=${date}`;

  if (!tenantOperational(tenant)) {
    redirect(`/s/${tenant.slug}?e=` + encodeURIComponent("This shop is not accepting online bookings right now."));
  }

  const [service] = await sql<Service[]>`
    SELECT * FROM services WHERE id = ${serviceId} AND tenant_id = ${tenant.id} AND active = 1`;
  const [barber] = await sql<User[]>`
    SELECT * FROM users WHERE id = ${barberId} AND tenant_id = ${tenant.id} AND role = 'barber' AND active = 1`;

  if (!service || !barber || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(`/s/${tenant.slug}/book`);
  }
  const slots = await availableSlots(tenant, barberId, date, service!.duration_min);
  if (!slots.includes(time)) {
    redirect(back + "&e=" + encodeURIComponent("That slot was just taken — pick another time."));
  }

  try {
    await insertAppointment(tenant.id, user.id, barberId, service!, `${date}T${time}`);
  } catch (err) {
    if (err instanceof Conflict) {
      redirect(back + "&e=" + encodeURIComponent("That slot was just taken — pick another time."));
    }
    throw err;
  }

  revalidatePath("/portal");
  redirect("/portal?ok=" + encodeURIComponent("Your appointment is booked. See you soon!"));
}

export async function bookAppointmentGuest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const serviceId = Number(formData.get("service_id"));
  const barberId = Number(formData.get("barber_id"));
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sql = await db();

  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE slug = ${slug}`;
  if (!tenant) redirect("/");

  const base = `/s/${tenant!.slug}/book?service=${serviceId}&barber=${barberId}&date=${date}`;
  const confirm = `${base}&time=${time}`;

  if (!tenantOperational(tenant!)) {
    redirect(`/s/${tenant!.slug}?e=` + encodeURIComponent("This shop is not accepting online bookings right now."));
  }
  if (!email.includes("@")) {
    redirect(confirm + "&e=" + encodeURIComponent("Enter a valid email address."));
  }

  const [service] = await sql<Service[]>`
    SELECT * FROM services WHERE id = ${serviceId} AND tenant_id = ${tenant!.id} AND active = 1`;
  const [barber] = await sql<User[]>`
    SELECT * FROM users WHERE id = ${barberId} AND tenant_id = ${tenant!.id} AND role = 'barber' AND active = 1`;

  if (!service || !barber || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(`/s/${tenant!.slug}/book`);
  }
  const slots = await availableSlots(tenant!, barberId, date, service!.duration_min);
  if (!slots.includes(time)) {
    redirect(base + "&e=" + encodeURIComponent("That slot was just taken — pick another time."));
  }

  // Guests are stored as client users with an empty password hash, so they can
  // never sign in; staff dashboards see them as any other client.
  const [existing] = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`;
  let clientId: number;
  if (existing) {
    if (existing.tenant_id !== tenant!.id || existing.role !== "client") {
      redirect(confirm + "&e=" + encodeURIComponent("That email can't be used for a guest booking here. Use a different email."));
    }
    if (existing.password_hash) {
      redirect(confirm + "&e=" + encodeURIComponent("That email already has an account — sign in to book."));
    }
    clientId = existing.id;
  } else {
    const [{ id }] = await sql<{ id: number }[]>`
      INSERT INTO users (tenant_id, role, name, email, commission_rate)
      VALUES (${tenant!.id}, 'client', ${email.split("@")[0]}, ${email}, 0)
      RETURNING id`;
    clientId = id;
  }

  try {
    await insertAppointment(tenant!.id, clientId, barberId, service!, `${date}T${time}`);
  } catch (err) {
    if (err instanceof Conflict) {
      redirect(base + "&e=" + encodeURIComponent("That slot was just taken — pick another time."));
    }
    throw err;
  }

  try {
    await sendMail({
      to: email,
      subject: `Booking confirmed — ${tenant!.name}, ${fmtDateShort(date)} at ${time}`,
      text:
        `Your booking at ${tenant!.name} is confirmed.\n\n` +
        `Service: ${service!.name} (${durationLabel(service!.duration_min)})\n` +
        `Barber: ${barber!.name}\n` +
        `When: ${fmtDateShort(date)} at ${time}\n` +
        `Price: ${fmtMoney(service!.price_cents, tenant!.currency)}\n\n` +
        `If you need to change or cancel, contact the shop. See you soon!`,
    });
  } catch (err) {
    // The appointment is already saved — a failed email must not undo it.
    console.error("[mail] guest confirmation failed:", err);
  }

  revalidatePath("/dashboard/appointments");
  redirect(
    `/s/${tenant!.slug}?ok=` +
      encodeURIComponent(`Your appointment is booked! A confirmation was sent to ${email}.`)
  );
}

export async function setAppointmentStatus(formData: FormData) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  const back = String(formData.get("back") || "/dashboard/appointments");
  const sql = await db();

  if (!["completed", "cancelled", "no_show"].includes(status)) redirect(back);

  const [appt] = await sql<Appointment[]>`
    SELECT * FROM appointments WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;
  if (!appt || appt.status !== "scheduled") redirect(back);
  if (user.role === "barber" && appt!.barber_id !== user.id) redirect(back);

  await sql.begin(async (tx) => {
    if (status === "completed") {
      const [barber] = await tx<{ commission_rate: number; name: string }[]>`
        SELECT commission_rate, name FROM users WHERE id = ${appt!.barber_id}`;
      const commission = Math.round((appt!.price_cents * barber.commission_rate) / 100);
      await tx`
        UPDATE appointments SET status = 'completed', commission_cents = ${commission} WHERE id = ${id}`;
      const [service] = await tx<{ name: string }[]>`
        SELECT name FROM services WHERE id = ${appt!.service_id}`;
      await tx`
        INSERT INTO payments (tenant_id, kind, ref_id, barber_id, amount_cents, commission_cents, description)
        VALUES (${user.tenant_id}, 'service', ${id}, ${appt!.barber_id}, ${appt!.price_cents}, ${commission}, ${service.name})`;
    } else {
      await tx`UPDATE appointments SET status = ${status} WHERE id = ${id}`;
    }
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/finance");
  redirect(back);
}

export async function cancelOwnAppointment(formData: FormData) {
  const user = await requireUser(["client"]);
  const id = Number(formData.get("id"));
  const sql = await db();

  const [appt] = await sql<Appointment[]>`
    SELECT * FROM appointments
    WHERE id = ${id} AND tenant_id = ${user.tenant_id} AND client_id = ${user.id} AND status = 'scheduled'`;

  if (appt && appt.starts_at > nowLocalISO()) {
    await sql`UPDATE appointments SET status = 'cancelled' WHERE id = ${id}`;
  }

  revalidatePath("/portal");
  redirect("/portal?ok=" + encodeURIComponent("Appointment cancelled."));
}
