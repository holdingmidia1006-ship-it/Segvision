import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { AccessProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !isSupabaseConfigured();
  let userEmail: string | null = null;
  let profile: AccessProfile | null = null;

  if (!demo) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
    if (!user) redirect("/login");
    userEmail = user.email ?? null;

    const { data } = await supabase!
      .from("profiles")
      .select("id,role,active,full_name")
      .eq("id", user.id)
      .single();
    profile = (data as AccessProfile | null) ?? null;
    if (!profile?.active) redirect("/access-disabled");
  }

  return (
    <AppShell demo={demo} userEmail={userEmail} role={profile?.role}>
      {children}
    </AppShell>
  );
}
