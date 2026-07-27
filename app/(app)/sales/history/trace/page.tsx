import Link from "next/link";
import { traceByBatch } from "@/app/actions/repack";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function BatchTracePage({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const { batch = "" } = await searchParams;
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const rows = batch ? await traceByBatch(batch) : [];
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold">{t(messages, "pg.sales.history.batchTrace")}</h1><p className="mt-1 text-sm text-stone-500">{t(messages, "pg.sales.history.traceSubtitle")}</p></div>
    <Card><CardHeader><h2 className="font-semibold">{t(messages, "pg.sales.history.traceQueryTitle")}</h2></CardHeader><CardBody><form className="flex flex-wrap gap-3"><Input name="batch" defaultValue={batch} required placeholder={t(messages, "pg.sales.history.tracePlaceholder")} className="max-w-lg" /><Button type="submit">{t(messages, "pg.sales.history.traceBtn")}</Button><Link href="/sales/history" className="inline-flex h-10 items-center text-sm text-teal-800 hover:underline">{t(messages, "pg.sales.history.backToHistory")}</Link></form></CardBody></Card>
    {!!batch && <div className="overflow-hidden rounded-lg border border-stone-200 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone-50 text-stone-500"><tr><th className="px-4 py-3">{t(messages, "pg.sales.history.colLevel")}</th><th className="px-4 py-3">{t(messages, "pg.sales.history.colCurLot")}</th><th className="px-4 py-3">{t(messages, "pg.sales.history.colCurOrigin")}</th><th className="px-4 py-3">{t(messages, "pg.sales.history.colAncLot")}</th><th className="px-4 py-3">{t(messages, "pg.sales.history.colAncOrigin")}</th><th className="px-4 py-3">{t(messages, "pg.sales.history.colAncId")}</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={`${row.batch_id}-${row.ancestor_batch_id}`} className="border-t border-stone-100"><td className="px-4 py-3">{row.depth === 0 ? t(messages, "pg.sales.history.thisBatch") : t(messages, "pg.sales.history.ancestorLevel").replace("{n}", String(row.depth))}</td><td className="px-4 py-3 font-mono">{row.lot_no}</td><td className="px-4 py-3">{row.origin}</td><td className="px-4 py-3 font-mono">{row.ancestor_lot_no}</td><td className="px-4 py-3">{row.ancestor_origin}</td><td className="px-4 py-3 font-mono text-xs text-stone-500">{row.ancestor_batch_id}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">{t(messages, "pg.sales.history.traceEmpty")}</td></tr>}</tbody>
    </table></div>}
  </div>;
}
