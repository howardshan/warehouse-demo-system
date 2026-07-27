import { createClient } from "@/lib/supabase/server";
import { SupplierCreateForm } from "./supplier-form";
import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function SuppliersPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.masterData.suppliers.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.masterData.suppliers.intro")}
        </p>
      </div>
      <SupplierCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.name")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.suppliers.contactHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.suppliers.phoneHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(suppliers ?? []).map((s) => (
              <tr key={s.id} className="border-t border-stone-100">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.contact ?? "—"}</td>
                <td className="px-4 py-3">{s.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.is_active ? "ok" : "neutral"}>
                    {s.is_active ? "active" : "inactive"}
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
