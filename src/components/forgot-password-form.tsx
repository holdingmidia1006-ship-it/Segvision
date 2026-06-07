"use client";

import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { getAppUrl } from "@/lib/site-url";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("A recuperação está indisponível neste ambiente.");
      setLoading(false);
      return;
    }
    const redirectTo = `${getAppUrl(window.location.origin)}/auth/confirm?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setMessage(
      error
        ? error.message
        : "Enviamos o link. Confira também a caixa de spam.",
    );
    setLoading(false);
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="login-card-icon"><MailCheck size={22} /></div>
      <h2>Recuperar conta</h2>
      <p>Informe o e-mail usado no sistema para receber o link de redefinição.</p>
      <label>
        E-mail
        <input type="email" name="email" required placeholder="voce@empresa.com" />
      </label>
      {message ? <div className="form-message form-message-info">{message}</div> : null}
      <button className="button button-primary button-full" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={17} /> : null}
        {loading ? "Enviando..." : "Enviar link"}
      </button>
      <Link className="button-link login-back-link" href="/login">
        <ArrowLeft size={14} /> Voltar ao login
      </Link>
    </form>
  );
}
