import { signShippingList } from "@/app/actions/warehouse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

export default async function DeliveryPodPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: shipping } = await supabase.from("shipping_lists")
    .select("id, sl_number, status, released_at, signed_at, signed_by_name, proof_url, sales_orders(so_number, customer_name_snapshot)")
    .in("status", ["released", "in_transit", "signed"]).order("created_at", { ascending: false });
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.delivery.podTitle")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.delivery.podHint")}</p></div>
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.delivery.shippingList")}</th><th className="px-4 py-3">{t(messages, "pg.delivery.orderCustomer")}</th><th className="px-4 py-3">{t(messages, "pg.delivery.releasedAt")}</th><th className="px-4 py-3">{t(messages, "pg.delivery.podStatus")}</th><th className="px-4 py-3">{t(messages, "pg.delivery.enterProof")}</th></tr></thead>
      <tbody>{(shipping ?? []).map((item) => {
        const order = Array.isArray(item.sales_orders) ? item.sales_orders[0] : item.sales_orders;
        const signed = item.status === "signed";
        return <tr key={item.id} className="border-t border-stone-100 align-top"><td className="px-4 py-3 font-mono text-teal-800">{item.sl_number}</td><td className="px-4 py-3">{order?.so_number}<div className="text-stone-500">{order?.customer_name_snapshot}</div></td><td className="px-4 py-3">{item.released_at ? new Date(item.released_at).toLocaleString("zh-CN") : "—"}</td><td className="px-4 py-3"><Badge tone={signed ? "ok" : "warn"}>{signed ? t(messages, "pg.delivery.signedByName").replace("{x}", String(item.signed_by_name)) : t(messages, "pg.delivery.pendingPod")}</Badge></td><td className="px-4 py-3">{signed ? <span className="text-stone-500">{item.signed_at?.slice(0, 10)}{item.proof_url ? ` · ${t(messages, "pg.delivery.hasPhoto")}` : ""}</span> : <form action={signShippingList.bind(null, item.id)} className="grid min-w-64 gap-2"><Input name="signed_by_name" required placeholder={t(messages, "pg.delivery.signedByPlaceholder")} /><Input name="proof_url" type="url" placeholder={t(messages, "pg.delivery.proofPhotoUrl")} /><Button type="submit" size="sm">{t(messages, "pg.delivery.confirmSign")}</Button></form>}</td></tr>;
      })}{!shipping?.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.delivery.noShipments")}</td></tr>}</tbody>
    </table></div>
  </div>;
}
