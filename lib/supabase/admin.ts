import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** 仅服务端使用。绕过 RLS — 绝不可导入到客户端组件。 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("缺少 SUPABASE_SERVICE_ROLE_KEY 或 URL");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
