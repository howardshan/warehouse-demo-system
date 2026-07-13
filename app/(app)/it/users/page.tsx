import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess, can } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { inviteUserAction, updateUserProfileAction } from "@/app/actions/it";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLES = [
  "admin",
  "it",
  "purchasing",
  "warehouse",
  "sales",
  "sales_manager",
  "account",
  "finance",
  "driver",
];

export default async function ItUsersPage() {
  const access = await getSessionAccess();
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  if (!can(access.permissions, "it.users.manage")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  // emails via auth admin optional — show id if no service
  let emailMap = new Map<string, string>();
  try {
    const { createServiceClient } = await import("@/lib/supabase/admin");
    const service = createServiceClient();
    const listed = await service.auth.admin.listUsers({ perPage: 200 });
    for (const u of listed.data.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  } catch {
    emailMap = new Map();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(messages, "it.usersTitle")}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "it.usersHint")}{" "}
          <Link href="/it/permissions" className="text-teal-800 hover:underline">
            {t(messages, "nav.permissions")}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Invite / create user</h2>
        </CardHeader>
        <CardBody>
          <form action={inviteUserAction} className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div>
              <Label>Password</Label>
              <Input name="password" type="password" minLength={8} required />
            </div>
            <div>
              <Label>Name</Label>
              <Input name="full_name" />
            </div>
            <div>
              <Label>{t(messages, "it.role")}</Label>
              <Select name="role" defaultValue="sales">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit">{t(messages, "common.save")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {(users ?? []).map((u) => (
          <Card key={u.id}>
            <CardBody>
              <form action={updateUserProfileAction} className="grid gap-3 md:grid-cols-5 md:items-end">
                <input type="hidden" name="user_id" value={u.id} />
                <div className="md:col-span-2">
                  <div className="text-sm font-medium">
                    {u.full_name ?? "—"}{" "}
                    <Badge tone={u.is_active ? "ok" : "neutral"}>
                      {u.is_active ? "active" : "off"}
                    </Badge>
                  </div>
                  <div className="font-mono text-xs text-stone-400">
                    {emailMap.get(u.id) ?? u.id}
                  </div>
                  <div className="mt-2">
                    <Label>Name</Label>
                    <Input name="full_name" defaultValue={u.full_name ?? ""} />
                  </div>
                </div>
                <div>
                  <Label>{t(messages, "it.role")}</Label>
                  <Select name="role" defaultValue={u.role}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input
                    id={`active-${u.id}`}
                    type="checkbox"
                    name="is_active"
                    defaultChecked={u.is_active}
                  />
                  <Label htmlFor={`active-${u.id}`} className="mb-0">
                    {t(messages, "it.active")}
                  </Label>
                </div>
                <div>
                  <Button type="submit" size="sm">
                    {t(messages, "it.save")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
