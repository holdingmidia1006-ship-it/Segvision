"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setMessage("As senhas não coincidem.");
      setLoading(false);
      return;
    }
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setMessage("A redefinição está indisponível.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <div className="login-card-icon"><LockKeyhole size={22} /></div>
      <h2>Definir nova senha</h2>
      <p>Crie uma senha forte com pelo menos oito caracteres.</p>
      <label>
        Nova senha
        <input type="password" name="password" required minLength={8} />
      </label>
      <label>
        Confirmar senha
        <input type="password" name="confirmation" required minLength={8} />
      </label>
      {message ? <div className="form-message">{message}</div> : null}
      <button className="button button-primary button-full" disabled={loading}>
        {loading ? <LoaderCircle className="spin" size={17} /> : null}
        {loading ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
