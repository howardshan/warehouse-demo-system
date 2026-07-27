import { createClient } from "@/lib/supabase/server";
import { ToteCreateForm } from "./tote-form";
import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function TotesPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: totes } = await supabase.from("totes").select("*").order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.masterData.totes.title")}
        </h1>
      </div>
      <ToteCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.totes.codeHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(totes ?? []).map((tote) => (
              <tr key={tote.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-mono">{tote.code}</td>
                <td className="px-4 py-3">
                  <Badge tone={tote.is_active ? "ok" : "neutral"}>
                    {tote.is_active ? "active" : "inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
