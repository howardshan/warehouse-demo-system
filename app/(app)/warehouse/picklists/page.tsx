import { generatePickList } from "@/app/actions/warehouse";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { PickListsBrowser, type PickRow } from "./picklists-browser";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

export default async function PickListsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: orders }, { data: picks }] = await Promise.all([
    supabase
      .from("sales_orders")
      .select("id, so_number, customer_name_snapshot")
      .eq("status", "confirmed")
      .order("created_at"),
    supabase
      .from("pick_lists")
      .select(
        "id, pick_number, status, created_at, sales_orders(so_number, customer_name_snapshot, requested_delivery_date)",
      )
      .order("created_at", { ascending: false }),
  ]);

  const rows: PickRow[] = (picks ?? []).map((pick) => {
    const order = one<{
      so_number: string;
      customer_name_snapshot: string;
      requested_delivery_date: string | null;
    }>(pick.sales_orders);
    return {
      id: pick.id,
      pick_number: pick.pick_number,
      status: pick.status,
      created_at: pick.created_at,
      so_number: order?.so_number ?? "—",
      customer_name: order?.customer_name_snapshot ?? "—",
      delivery_date: order?.requested_delivery_date ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.warehouse.picklistsTitle")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.warehouse.picklistsSubtitle")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {t(messages, "pg.warehouse.ordersToGenerate")}
          </h2>
        </CardHeader>
        <CardBody className="flex flex-wrap gap-2">
          {(orders ?? []).map((order) => (
            <form key={order.id} action={generatePickList.bind(null, order.id)}>
              <Button variant="secondary" size="sm">
                {order.so_number} · {order.customer_name_snapshot}
              </Button>
            </form>
          ))}
          {!orders?.length && (
            <span className="text-sm text-stone-400">
              {t(messages, "pg.warehouse.noOrdersToGenerate")}
            </span>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t(messages, "pg.warehouse.pickList")}</h2>
        </CardHeader>
        <CardBody>
          <PickListsBrowser picks={rows} />
        </CardBody>
      </Card>
    </div>
  );
}
