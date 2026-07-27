import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SettingRow } from "./setting-row";

export default async function SettingsPage() {
<<<<<<< HEAD
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
=======
  const access = await getSessionAccess();
  if (!can(access.permissions, "master.settings.write")) {
    redirect("/dashboard");
  }

>>>>>>> 81fe284f9fcafb093982c6de6b8a33316a2e38cc
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .order("key");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t(messages, "pg.settings.title")}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
<<<<<<< HEAD
          {t(messages, "pg.settings.hint")}
=======
          需要「系统设置」权限（master.settings.write）。阈值改动会影响毛利护栏、成本提醒、信用预警。
>>>>>>> 81fe284f9fcafb093982c6de6b8a33316a2e38cc
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {t(messages, "pg.settings.guardrailThresholds")}
          </h2>
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
              {t(messages, "pg.settings.empty")}
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
