import { createClient } from "@/lib/supabase/server";
import { LocationCreateForm } from "./location-form";
import { Badge } from "@/components/ui/badge";

export default async function LocationsPage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">储位</h1>
        <p className="mt-1 text-sm text-stone-500">
          两级储位：拣货位固定、存储位动态按批号分开（ADR-0002）。
        </p>
      </div>
      <LocationCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">编码</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">温区</th>
              <th className="px-4 py-3 font-medium">状态</th>
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
