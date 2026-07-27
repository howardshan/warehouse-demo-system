import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SettingRow } from "./setting-row";

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
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
          {t(messages, "pg.settings.hint")}
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
