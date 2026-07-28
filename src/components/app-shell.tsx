"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  ReceiptText,
  Settings,
  Users,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/actions";
import { cn, initials } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const primaryNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/visits", label: "Agenda", icon: CalendarDays },
  { href: "/services", label: "Orçamentos", icon: BriefcaseBusiness },
];

const secondaryNavigation: NavigationItem[] = [
  { href: "/board", label: "Quadro de execução", icon: ClipboardList },
  { href: "/documents", label: "Documentos", icon: FileText },
  { href: "/invoices", label: "Notas fiscais", icon: ReceiptText },
  { href: "/team", label: "Equipe", icon: Wrench, adminOnly: true },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
    adminOnly: true,
  },
];

export function AppShell({
  children,
  demo,
  userEmail,
  role,
}: {
  children: React.ReactNode;
  demo: boolean;
  userEmail?: string | null;
  role?: "ADMIN" | "OPERADOR";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = userEmail?.split("@")[0] || "Administrador";
  const visibleSecondaryNavigation = secondaryNavigation.filter(
    (item) => !item.adminOnly || demo || role === "ADMIN",
  );
  const secondaryActive = visibleSecondaryNavigation.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  function navigationLink(item: NavigationItem) {
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
        <Icon aria-hidden="true" size={19} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className="app-shell">
      <aside
        className={cn("sidebar", open && "sidebar-open")}
        id="main-navigation"
      >
        <div className="brand">
          <Link
            className="brand-home"
            href="/dashboard"
            onClick={() => setOpen(false)}
          >
            <BrandLogo
              className="brand-logo-sidebar"
              decorative
              priority
              variant="symbol"
            />
            <div>
              <strong>SEG VISIOM</strong>
              <span>Operações de campo</span>
            </div>
          </Link>
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
          <p>FLUXO PRINCIPAL</p>
          {primaryNavigation.map(navigationLink)}

          <details className="secondary-nav" open={secondaryActive}>
            <summary>
              <MoreHorizontal aria-hidden="true" size={19} />
              <span>Mais opções</span>
            </summary>
            <div>{visibleSecondaryNavigation.map(navigationLink)}</div>
          </details>
        </nav>

        <div className="sidebar-help">
          <strong>Por onde começar?</strong>
          <span>Cadastre o cliente, agende a visita e crie o orçamento.</span>
        </div>

        <ThemeToggle />

        <div className="user-card">
          <div className="avatar">{initials(displayName)}</div>
          <div>
            <strong>{displayName}</strong>
            <span>
              {demo
                ? "Modo demonstração"
                : role === "ADMIN"
                  ? "Administrador"
                  : "Operador"}
            </span>
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
            aria-controls="main-navigation"
            aria-expanded={open}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <Link className="mobile-brand" href="/dashboard">
            <BrandLogo decorative variant="symbol" />
            <strong>SEG VISIOM</strong>
          </Link>
          <ThemeToggle iconOnly />
        </div>
        {demo ? (
          <div className="demo-banner">
            <span>Visualização com dados de exemplo.</span>
            <span>Cadastros serão liberados após conectar o Supabase.</span>
          </div>
        ) : null}
        <main className="main-content">{children}</main>
        <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
          {primaryNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(active && "active")}
              >
                <Icon aria-hidden="true" size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
