import { createClient } from "@/lib/supabase/server";
import { ToteCreateForm } from "./tote-form";
import { Badge } from "@/components/ui/badge";

export default async function TotesPage() {
  const supabase = await createClient();
  const { data: totes } = await supabase.from("totes").select("*").order("code");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">周转筐</h1>
      </div>
      <ToteCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">筐号</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {(totes ?? []).map((t) => (
              <tr key={t.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-mono">{t.code}</td>
                <td className="px-4 py-3">
                  <Badge tone={t.is_active ? "ok" : "neutral"}>
                    {t.is_active ? "active" : "inactive"}
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
