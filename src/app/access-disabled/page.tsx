import { ShieldX } from "lucide-react";
import { signOut } from "@/lib/actions";

export const metadata = { title: "Acesso desativado" };

export default function AccessDisabledPage() {
  return (
    <main className="login-page">
      <section className="login-panel" style={{ margin: "auto" }}>
        <div className="login-card">
          <div className="login-card-icon">
            <ShieldX size={22} />
          </div>
          <h1>Acesso desativado</h1>
          <p>
            Este usuário está inativo. Peça a um administrador para revisar o
            acesso.
          </p>
          <form action={signOut}>
            <button className="button button-primary button-full" type="submit">
              Sair
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
