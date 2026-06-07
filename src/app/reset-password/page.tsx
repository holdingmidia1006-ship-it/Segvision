import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Redefinir senha" };

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!user) redirect("/login?confirmation=failed");
  return (
    <main className="auth-simple-page">
      <ResetPasswordForm />
    </main>
  );
}
