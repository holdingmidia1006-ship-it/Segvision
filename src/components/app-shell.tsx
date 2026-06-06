"use client";

import {
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/actions";
import { cn, initials } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/team", label: "Equipe", icon: Wrench },
  { href: "/services", label: "Serviços", icon: BriefcaseBusiness },
  { href: "/board", label: "Quadro", icon: ClipboardList },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/invoices", label: "Notas", icon: ReceiptText },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppShell({
  children,
  demo,
  userEmail,
}: {
  children: React.ReactNode;
  demo: boolean;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = userEmail?.split("@")[0] || "Administrador";

  return (
    <div className="app-shell">
      <aside className={cn("sidebar", open && "sidebar-open")}>
        <div className="brand">
          <div className="brand-mark">
            <BarChart3 aria-hidden="true" size={22} />
          </div>
          <div>
            <strong>Eupresa</strong>
            <span>Gestão de serviços</span>
          </div>
          <button
            className="mobile-close"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="main-nav" aria-label="Menu principal">
          <p>OPERAÇÃO</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-link", active && "nav-link-active")}
                onClick={() => setOpen(false)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-help">
          <BookOpenText aria-hidden="true" size={20} />
          <strong>Fluxo simples</strong>
          <span>Orçamento, execução, garantia e finalização no mesmo lugar.</span>
        </div>

        <div className="user-card">
          <div className="avatar">{initials(displayName)}</div>
          <div>
            <strong>{displayName}</strong>
            <span>{demo ? "Modo demonstração" : "Acesso interno"}</span>
          </div>
          {!demo ? (
            <form action={signOut}>
              <button type="submit" aria-label="Sair">
                <LogOut size={17} />
              </button>
            </form>
          ) : null}
        </div>
      </aside>

      {open ? (
        <button
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="main-column">
        <div className="mobile-topbar">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <strong>Eupresa Gestão</strong>
        </div>
        {demo ? (
          <div className="demo-banner">
            <span>Visualização com dados de exemplo.</span>
            <span>Cadastros serão liberados após conectar o Supabase.</span>
          </div>
        ) : null}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
