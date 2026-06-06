import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !isSupabaseConfigured();
  let userEmail: string | null = null;

  if (!demo) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!user) redirect("/login");
    userEmail = user.email ?? null;
  }

  return (
    <AppShell demo={demo} userEmail={userEmail}>
      {children}
    </AppShell>
  );
}
