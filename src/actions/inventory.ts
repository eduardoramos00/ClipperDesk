"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import type { Product } from "@/lib/types";

const BACK = "/dashboard/inventory";

export async function addProduct(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const price = Math.round(Number(formData.get("price")) * 100);
  const cost = Math.round(Number(formData.get("cost")) * 100) || 0;
  const stock = Math.max(0, Number(formData.get("stock")) || 0);
  const lowStock = Math.max(0, Number(formData.get("low_stock")) || 5);
  const sql = await db();

  if (!name || !sku || !Number.isFinite(price) || price < 0) {
    redirect(BACK + "?e=" + encodeURIComponent("Products need a name, SKU and price."));
  }

  await sql.begin(async (tx) => {
    const [{ id: productId }] = await tx<{ id: number }[]>`
      INSERT INTO products (tenant_id, name, sku, price_cents, cost_cents, stock, low_stock)
      VALUES (${user.tenant_id}, ${name}, ${sku}, ${price}, ${cost}, ${stock}, ${lowStock})
      RETURNING id`;
    if (stock > 0) {
      await tx`
        INSERT INTO stock_moves (tenant_id, product_id, delta, reason)
        VALUES (${user.tenant_id}, ${productId}, ${stock}, 'Initial stock')`;
    }
  });

  revalidatePath(BACK);
  redirect(BACK + "?ok=" + encodeURIComponent(`${name} added to inventory.`));
}

export async function adjustStock(formData: FormData) {
  const user = await requireUser(["owner", "manager"]);
  const id = Number(formData.get("id"));
  const delta = Number(formData.get("delta"));
  const reason = String(formData.get("reason") ?? "").trim() || "Manual adjustment";
  const sql = await db();

  const [product] = await sql<Product[]>`
    SELECT * FROM products WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;
  if (!product || !Number.isInteger(delta) || delta === 0) redirect(BACK);
  if (product!.stock + delta < 0) {
    redirect(BACK + "?e=" + encodeURIComponent("Stock can't go below zero."));
  }

  await sql.begin(async (tx) => {
    await tx`UPDATE products SET stock = stock + ${delta} WHERE id = ${id}`;
    await tx`
      INSERT INTO stock_moves (tenant_id, product_id, delta, reason)
      VALUES (${user.tenant_id}, ${id}, ${delta}, ${reason})`;
  });

  revalidatePath(BACK);
  redirect(BACK);
}

export async function sellProduct(formData: FormData) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const id = Number(formData.get("id"));
  const qty = Math.max(1, Number(formData.get("qty")) || 1);
  const sql = await db();

  const [product] = await sql<Product[]>`
    SELECT * FROM products WHERE id = ${id} AND tenant_id = ${user.tenant_id}`;
  if (!product) redirect(BACK);
  if (product!.stock < qty) {
    redirect(BACK + "?e=" + encodeURIComponent(`Only ${product!.stock} × ${product!.name} left in stock.`));
  }

  await sql.begin(async (tx) => {
    await tx`UPDATE products SET stock = stock - ${qty} WHERE id = ${id}`;
    await tx`
      INSERT INTO stock_moves (tenant_id, product_id, delta, reason)
      VALUES (${user.tenant_id}, ${id}, ${-qty}, ${`Sold ${qty} at the counter`})`;
    await tx`
      INSERT INTO payments (tenant_id, kind, ref_id, barber_id, amount_cents, commission_cents, description)
      VALUES (${user.tenant_id}, 'product', ${id}, NULL, ${product!.price_cents * qty}, 0, ${`${product!.name} × ${qty}`})`;
  });

  revalidatePath(BACK);
  revalidatePath("/dashboard/finance");
  redirect(BACK + "?ok=" + encodeURIComponent(`Sold ${qty} × ${product!.name}.`));
}
