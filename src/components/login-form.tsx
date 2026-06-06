"use client";

import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const supabase = createBrowserSupabase();

    if (!supabase) {
      setMessage("O Supabase ainda não está configurado.");
      setLoading(false);
      return;
    }

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Confira seu e-mail para confirmar o acesso.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  if (!configured) {
    return (
      <div className="login-card">
        <div className="login-card-icon">
          <LockKeyhole size={22} />
        </div>
        <h2>Ambiente de demonstração</h2>
        <p>
          Navegue pelo sistema com dados de exemplo enquanto a infraestrutura é
          conectada.
        </p>
        <Link className="button button-primary button-full" href="/dashboard">
          Entrar na demonstração
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="login-card-icon">
        <LockKeyhole size={22} />
      </div>
      <h2>{mode === "login" ? "Entrar no sistema" : "Criar primeiro acesso"}</h2>
      <p>
        {mode === "login"
          ? "Use seu e-mail e senha para continuar."
          : "Crie um acesso interno. A confirmação por e-mail pode ser necessária."}
      </p>
      <label>
        E-mail
        <input type="email" name="email" required placeholder="voce@empresa.com" />
      </label>
      <label>
        Senha
        <input type="password" name="password" required minLength={6} />
      </label>
      {message ? <div className="form-message">{message}</div> : null}
      <button className="button button-primary button-full" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={17} /> : null}
        {loading
          ? "Aguarde..."
          : mode === "login"
            ? "Entrar"
            : "Criar acesso"}
      </button>
      <button
        type="button"
        className="button-link"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login"
          ? "É o primeiro acesso? Criar conta"
          : "Já tenho conta"}
      </button>
    </form>
  );
}
