import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { addProduct, adjustStock, sellProduct } from "@/actions/inventory";
import { fmtMoney } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { Badge, Card, EmptyState, Flash, PageHeader, StatCard } from "@/components/ui";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MoveRow {
  id: number;
  delta: number;
  reason: string;
  created_at: string;
  product_name: string;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { e?: string; ok?: string };
}) {
  const user = await requireUser(["owner", "manager", "barber"]);
  const sql = await db();
  const tenant = user.tenant;
  const canManage = user.role !== "barber";

  const products = await sql<Product[]>`
    SELECT * FROM products WHERE tenant_id = ${tenant.id} ORDER BY name`;

  const moves = await sql<MoveRow[]>`
    SELECT m.id, m.delta, m.reason, m.created_at, p.name AS product_name
    FROM stock_moves m
    JOIN products p ON p.id = m.product_id
    WHERE m.tenant_id = ${tenant.id}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 8`;

  const lowCount = products.filter((p) => p.stock <= p.low_stock).length;
  const stockValue = products.reduce((sum, p) => sum + p.stock * p.cost_cents, 0);

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Retail and back-bar stock. Counter sales flow straight into your revenue."
      />

      <Flash searchParams={searchParams} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Products tracked" value={String(products.length)} />
        <StatCard
          label="Low stock alerts"
          value={String(lowCount)}
          sub={lowCount > 0 ? "Restock soon" : "All healthy"}
        />
        <StatCard label="Stock value (at cost)" value={fmtMoney(stockValue, tenant.currency)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {products.length === 0 ? (
            <EmptyState title="No products yet" hint="Add your retail shelf with the form on the right." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Product</th>
                    <th className="th">Price</th>
                    <th className="th">Stock</th>
                    <th className="th">Sell</th>
                    {canManage && <th className="th">Adjust</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="td">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-zinc-500">{p.sku}</p>
                      </td>
                      <td className="td whitespace-nowrap">{fmtMoney(p.price_cents, tenant.currency)}</td>
                      <td className="td">
                        <Badge tone={p.stock === 0 ? "red" : p.stock <= p.low_stock ? "amber" : "green"}>
                          {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                        </Badge>
                      </td>
                      <td className="td">
                        <form action={sellProduct} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={p.id} />
                          <input
                            name="qty"
                            type="number"
                            min={1}
                            max={Math.max(1, p.stock)}
                            defaultValue={1}
                            className="input w-16"
                            aria-label={`Quantity of ${p.name} to sell`}
                          />
                          <SubmitButton className="btn-primary btn-sm" pendingLabel="…">Sell</SubmitButton>
                        </form>
                      </td>
                      {canManage && (
                        <td className="td">
                          <form action={adjustStock} className="flex items-center gap-1.5">
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="reason" value="Restock" />
                            <input
                              name="delta"
                              type="number"
                              step={1}
                              defaultValue={10}
                              className="input w-16"
                              aria-label={`Stock adjustment for ${p.name}`}
                            />
                            <SubmitButton className="btn-ghost btn-sm" pendingLabel="…">Apply</SubmitButton>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {moves.length > 0 && (
            <Card title="Recent stock movements" className="mt-6">
              <ul className="space-y-2.5">
                {moves.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className={`font-mono font-semibold ${m.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </span>{" "}
                      {m.product_name}
                      <span className="text-zinc-500"> — {m.reason}</span>
                    </span>
                    <span className="text-xs text-zinc-500">{m.created_at.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {canManage && (
          <Card title="Add a product">
            <form action={addProduct} className="space-y-4">
              <div>
                <label className="label" htmlFor="p_name">Name</label>
                <input id="p_name" name="name" required className="input" placeholder="Matte Pomade" />
              </div>
              <div>
                <label className="label" htmlFor="p_sku">SKU</label>
                <input id="p_sku" name="sku" required className="input" placeholder="POM-001" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="p_price">Sell price ({tenant.currency})</label>
                  <input id="p_price" name="price" type="number" min={0} step="0.01" required className="input" placeholder="15.00" />
                </div>
                <div>
                  <label className="label" htmlFor="p_cost">Cost ({tenant.currency})</label>
                  <input id="p_cost" name="cost" type="number" min={0} step="0.01" className="input" placeholder="7.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="p_stock">Initial stock</label>
                  <input id="p_stock" name="stock" type="number" min={0} defaultValue={0} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="p_low">Low-stock alert at</label>
                  <input id="p_low" name="low_stock" type="number" min={0} defaultValue={5} className="input" />
                </div>
              </div>
              <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
                Add product
              </SubmitButton>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
