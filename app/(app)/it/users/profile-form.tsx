"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserProfile } from "@/app/actions/it";
import { APP_ROLES } from "@/lib/auth/roles";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/components/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/** 用户资料/角色/启停编辑（保存成功弹 toast）。 */
export function ProfileForm({
  user,
  labels,
}: {
  user: { id: string; full_name: string | null; role: string; is_active: boolean };
  labels: { role: string; active: string; save: string; saved: string };
}) {
  const router = useRouter();
  const { notify } = useToast();
  const { t } = useI18n();
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 md:grid-cols-4 md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await updateUserProfile(fd);
          if (res.ok) {
            notify(labels.saved, "success");
            router.refresh();
          } else {
            notify(res.error, "error");
          }
        });
      }}
    >
      <input type="hidden" name="user_id" value={user.id} />
      <div className="md:col-span-2">
        <Label>Name</Label>
        <Input name="full_name" defaultValue={user.full_name ?? ""} />
      </div>
      <div>
        <Label>{labels.role}</Label>
        <Select name="role" defaultValue={user.role}>
          {APP_ROLES.map((r) => (
            <option key={r} value={r}>
              {t("roles." + r)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          id={`active-${user.id}`}
          type="checkbox"
          name="is_active"
          defaultChecked={user.is_active}
        />
        <Label htmlFor={`active-${user.id}`} className="mb-0">
          {labels.active}
        </Label>
      </div>
      <div className="md:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : labels.save}
        </Button>
      </div>
    </form>
  );
}
