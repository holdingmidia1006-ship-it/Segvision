import { CheckCircle2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import {
  createServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const configured = isSupabaseConfigured();
  const supabase = await createServerSupabase();

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
          <div className="brand-mark">
            <ShieldCheck size={23} />
          </div>
          <strong>Eupresa Gestão</strong>
        </div>
        <div className="login-copy">
          <h1>Do orçamento ao resultado real.</h1>
          <p>
            Um sistema simples para organizar clientes, equipe, serviços,
            custos, documentos e decisões sem depender da memória.
          </p>
        </div>
        <div className="login-points">
          <span>
            <CheckCircle2 size={15} /> Controle operacional
          </span>
          <span>
            <CheckCircle2 size={15} /> Margem por serviço
          </span>
          <span>
            <CheckCircle2 size={15} /> Dados protegidos
          </span>
        </div>
      </section>
      <section className="login-panel">
        <LoginForm configured={configured} />
      </section>
    </main>
  );
}
