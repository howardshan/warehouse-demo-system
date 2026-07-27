"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "@/app/actions/it";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 管理员为某用户重置密码（IT 用户管理页详情面板）。 */
export function ResetPasswordForm({
  userId,
  labels,
}: {
  userId: string;
  labels: { newPassword: string; reset: string; done: string };
}) {
  const { notify } = useToast();
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[200px]">
        <Label>{labels.newPassword}</Label>
        <Input
          type="password"
          value={pw}
          minLength={8}
          autoComplete="new-password"
          onChange={(e) => setPw(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        disabled={pending || pw.length < 8}
        onClick={() => {
          start(async () => {
            const res = await resetUserPassword(userId, pw);
            if (res.ok) {
              notify(labels.done, "success");
              setPw("");
            } else {
              notify(res.error, "error");
            }
          });
        }}
      >
        {pending ? "…" : labels.reset}
      </Button>
    </div>
  );
}
