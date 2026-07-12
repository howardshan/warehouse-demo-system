"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-xs uppercase tracking-[0.2em] text-teal-800">
            Food Distribution
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-stone-900">
            登录仓配系统
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            使用 Supabase Auth 账号进入
          </p>
        </CardHeader>
        <CardBody>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await signIn(email, password);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                router.push(next);
                router.refresh();
              });
            }}
          >
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "登录中…" : "登录"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
