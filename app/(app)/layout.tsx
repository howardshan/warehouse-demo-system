import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { signOut } from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = data?.role ?? null;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar userEmail={user?.email} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-stone-200/80 bg-white/70 px-6 backdrop-blur">
          <div className="text-sm text-stone-500">Phase 1 · 主数据地基</div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              退出
            </Button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
