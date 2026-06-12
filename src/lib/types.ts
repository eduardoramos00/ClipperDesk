export type Role = "owner" | "manager" | "barber" | "client";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type PlanId = "starter" | "pro" | "elite";

export type PlanStatus = "trialing" | "active" | "canceled";

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan: PlanId;
  plan_status: PlanStatus;
  trial_ends_at: string | null;
  open_hour: number;
  close_hour: number;
  slot_step: number;
  currency: string;
  created_at: string;
}

export interface User {
  id: number;
  tenant_id: number;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  commission_rate: number;
  active: number;
  created_at: string;
}

export interface SessionUser extends User {
  tenant: Tenant;
}

export interface Service {
  id: number;
  tenant_id: number;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  active: number;
}

export interface Appointment {
  id: number;
  tenant_id: number;
  client_id: number;
  barber_id: number;
  service_id: number;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_cents: number;
  commission_cents: number;
  notes: string | null;
  created_at: string;
}

export interface AppointmentRow extends Appointment {
  client_name: string;
  barber_name: string;
  service_name: string;
  duration_min: number;
}

export interface Product {
  id: number;
  tenant_id: number;
  name: string;
  sku: string;
  price_cents: number;
  cost_cents: number;
  stock: number;
  low_stock: number;
}

export interface Payment {
  id: number;
  tenant_id: number;
  kind: "service" | "product";
  ref_id: number;
  barber_id: number | null;
  amount_cents: number;
  commission_cents: number;
  description: string;
  created_at: string;
}

export interface BillingEvent {
  id: number;
  tenant_id: number;
  type: string;
  plan: string;
  amount_cents: number;
  created_at: string;
}

export interface ClientNote {
  id: number;
  tenant_id: number;
  client_id: number;
  author_id: number;
  body: string;
  created_at: string;
}
