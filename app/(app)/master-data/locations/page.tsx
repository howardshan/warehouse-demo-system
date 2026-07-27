import { createClient } from "@/lib/supabase/server";
import { LocationCreateForm } from "./location-form";
import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function LocationsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.masterData.locations.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.masterData.locations.intro")}
        </p>
      </div>
      <LocationCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.code")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.locations.typeHeader")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.tempZone")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t(messages, "pg.masterData.common.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(locations ?? []).map((l) => (
              <tr key={l.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-mono text-xs">{l.code}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={l.type === "pick_face" ? "ok" : "neutral"}
                  >
                    {l.type}
                  </Badge>
                </td>
                <td className="px-4 py-3">{l.temp_zone}</td>
                <td className="px-4 py-3">
                  <Badge tone={l.is_active ? "ok" : "neutral"}>
                    {l.is_active ? "active" : "inactive"}
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
