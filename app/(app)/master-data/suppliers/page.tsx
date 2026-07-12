import { createClient } from "@/lib/supabase/server";
import { SupplierCreateForm } from "./supplier-form";
import { Badge } from "@/components/ui/badge";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">供应商</h1>
        <p className="mt-1 text-sm text-stone-500">采购与批次成本的上游主数据。</p>
      </div>
      <SupplierCreateForm />
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">联系人</th>
              <th className="px-4 py-3 font-medium">电话</th>
              <th className="px-4 py-3 font-medium">状态</th>
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
