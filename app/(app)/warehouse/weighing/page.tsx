import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { WeighLineForm, type WeighLine } from "./weigh-line-form";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

type Group = { pick_number: string; customer: string; lines: WeighLine[] };

export default async function WeighingPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: lines } = await supabase
    .from("pick_list_lines")
    .select(
      "id, tote_id, picked_units, actual_weight_lb, pick_lists!inner(pick_number, status, sales_orders(customer_name_snapshot)), so_lines!inner(is_catch_weight_snapshot, products(sku, name)), totes(code)",
    )
    .eq("pick_lists.status", "picked_pending_weight")
    .eq("so_lines.is_catch_weight_snapshot", true)
    .is("actual_weight_lb", null) // 只显示未称重行；称完即消失
    .order("picked_at");

  // 按拣货单分组
  const groupMap = new Map<string, Group>();
  for (const line of lines ?? []) {
    const pick = one<{
      pick_number: string;
      sales_orders: unknown;
    }>(line.pick_lists);
    const order = one<{ customer_name_snapshot: string }>(pick?.sales_orders);
    const soLine = one<{ products: unknown }>(line.so_lines);
    const product = one<{ sku: string; name: string }>(soLine?.products);
    const tote = one<{ code: string }>(line.totes);
    const pickNo = pick?.pick_number ?? "—";
    const g =
      groupMap.get(pickNo) ??
      ({
        pick_number: pickNo,
        customer: order?.customer_name_snapshot ?? "—",
        lines: [],
      } satisfies Group);
    g.lines.push({
      id: line.id,
      sku: product?.sku ?? "—",
      name: product?.name ?? "",
      picked_units: Number(line.picked_units),
      tote_code: tote?.code ?? "",
    });
    groupMap.set(pickNo, g);
  }
  const groups = [...groupMap.values()];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.warehouse.weighingStep")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.warehouse.weighingSubtitle")}
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-teal-700">
              {t(messages, "pg.warehouse.allWeighed")}
            </p>
          </CardBody>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.pick_number}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  <span className="font-mono text-sm text-stone-500">
                    {g.pick_number}
                  </span>{" "}
                  · {g.customer}
                </h2>
              </div>
              <Badge tone="warn">
                {t(messages, "pg.warehouse.toWeighCount").replace(
                  "{n}",
                  String(g.lines.length),
                )}
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {g.lines.map((line) => (
                <WeighLineForm key={line.id} line={line} />
              ))}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
