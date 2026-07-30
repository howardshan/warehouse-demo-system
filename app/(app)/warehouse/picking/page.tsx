import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { PickLineForm, type PickLine } from "./pick-line-form";

function one<T>(v: unknown): T | null {
  const x = Array.isArray(v) ? v[0] : v;
  return (x ?? null) as T | null;
}

export default async function PickingPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const [{ data: lines }, { data: totes }, { data: picked }] =
    await Promise.all([
      supabase
        .from("pick_list_lines")
        .select(
          "id, requested_units, picked_units, pick_lists!inner(pick_number, status), so_lines!inner(line_no, products(sku, name)), batches(lot_no), locations(code)",
        )
        .in("pick_lists.status", ["created", "picking"])
        .is("picked_units", null) // 只显示尚未拣的行；拣完即从列表消失
        .order("created_at"),
      supabase
        .from("totes")
        .select("id, code")
        .eq("is_active", true)
        .order("code"),
      // 已实拣：本轮仍在流程中的拣货单里已记录实拣的行
      supabase
        .from("pick_list_lines")
        .select(
          "id, picked_units, picked_at, pick_lists!inner(pick_number, status), so_lines!inner(products(sku, name)), totes(code)",
        )
        .in("pick_lists.status", ["created", "picking", "picked_pending_weight"])
        .not("picked_units", "is", null)
        .order("picked_at", { ascending: false }),
    ]);

  const pickedRows = (picked ?? []).map((line) => {
    const pick = one<{ pick_number: string }>(line.pick_lists);
    const product = one<{ sku: string; name: string }>(
      one<{ products: unknown }>(line.so_lines)?.products,
    );
    const tote = one<{ code: string }>(line.totes);
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      name: product?.name ?? "",
      picked_units: line.picked_units,
      tote: tote?.code ?? "—",
      pick_number: pick?.pick_number ?? "—",
    };
  });

  const rows: PickLine[] = (lines ?? []).map((line) => {
    const pick = one<{ pick_number: string; status: string }>(line.pick_lists);
    const soLine = one<{
      line_no: number;
      products: unknown;
    }>(line.so_lines);
    const product = one<{ sku: string; name: string }>(soLine?.products);
    const batch = one<{ lot_no: string }>(line.batches);
    const location = one<{ code: string }>(line.locations);
    return {
      id: line.id,
      sku: product?.sku ?? "—",
      name: product?.name ?? "",
      pick_number: pick?.pick_number ?? "—",
      line_no: soLine?.line_no ?? 0,
      location: location?.code ?? "—",
      lot_no: batch?.lot_no ?? "—",
      requested_units: Number(line.requested_units),
      status: pick?.status ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.warehouse.pickingStep")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.warehouse.pickingSubtitle")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {t(messages, "pg.warehouse.linesToPick")}
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {rows.map((line) => (
            <PickLineForm key={line.id} line={line} totes={totes ?? []} />
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-teal-700">
              {t(messages, "pg.warehouse.allPicked")}
            </p>
          )}
        </CardBody>
      </Card>

      {/* 已实拣列表 */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {t(messages, "pg.warehouse.pickedListTitle")}
            {pickedRows.length > 0 && (
              <span className="ml-2 text-sm font-normal text-stone-400">
                {pickedRows.length}
              </span>
            )}
          </h2>
        </CardHeader>
        <CardBody>
          {pickedRows.length === 0 ? (
            <p className="text-sm text-stone-400">
              {t(messages, "pg.warehouse.noPickedYet")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-2 font-medium" />
                    <th className="px-4 py-2 font-medium">SKU</th>
                    <th className="px-4 py-2 font-medium">
                      {t(messages, "pg.warehouse.pickedUnits")}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t(messages, "pg.warehouse.tote")}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t(messages, "pg.warehouse.colPickNo")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pickedRows.map((r) => (
                    <tr key={r.id} className="border-t border-stone-100">
                      <td className="px-4 py-2 text-teal-600">✓</td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-xs text-stone-500">
                          {r.sku}
                        </span>{" "}
                        · {r.name}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {r.picked_units}
                      </td>
                      <td className="px-4 py-2">{r.tote}</td>
                      <td className="px-4 py-2 font-mono text-xs text-stone-500">
                        {r.pick_number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
