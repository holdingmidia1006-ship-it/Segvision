import { CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import {
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const supabase = await createServerSupabase();
  const { confirmation } = await searchParams;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-brand">
          <BrandLogo variant="horizontal" priority />
        </div>
        <div className="login-copy">
          <h1>Tecnologia em movimento, do orçamento ao campo.</h1>
          <p>
            Centralize clientes, equipe, visitas, serviços, custos e documentos
            em uma operação SEG VISIOM conectada.
          </p>
        </div>
        <div className="login-points">
          <span>
            <CheckCircle2 size={15} /> Segurança em campo
          </span>
          <span>
            <CheckCircle2 size={15} /> Gestão operacional
          </span>
          <span>
            <CheckCircle2 size={15} /> Equipe conectada
          </span>
        </div>
      </section>
      <section className="login-panel">
        <LoginForm
          configured={configured}
          initialMessage={
            confirmation === "failed"
              ? "O link de confirmação é inválido ou expirou."
              : confirmation === "unavailable"
                ? "A confirmação de acesso está temporariamente indisponível."
                : undefined
          }
        />
      </section>
    </main>
  );
}
