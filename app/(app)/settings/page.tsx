import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SettingRow } from "./setting-row";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .order("key");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">系统设置</h1>
        <p className="mt-1 text-sm text-stone-500">
          只有 admin 可写（RLS）。阈值改动会影响毛利护栏、成本提醒、信用预警。
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">护栏阈值</h2>
        </CardHeader>
        <CardBody>
          {(settings ?? []).map((s) => (
            <SettingRow
              key={s.key}
              settingKey={s.key}
              value={s.value}
              description={s.description}
            />
          ))}
          {(settings ?? []).length === 0 && (
            <p className="text-sm text-stone-400">
              尚无设置。请先执行 supabase migrations（含 0006_settings）。
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
