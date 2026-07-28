"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(callback: () => void) {
  window.addEventListener("segvisiom-theme-change", callback);
  return () => window.removeEventListener("segvisiom-theme-change", callback);
}

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "dark");

  function toggleTheme() {
    const nextTheme: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("segvisiom-theme", nextTheme);
    window.dispatchEvent(new Event("segvisiom-theme-change"));
  }

  const dark = theme === "dark";
  const label = dark ? "Usar modo claro" : "Usar modo escuro";
  const Icon = dark ? Sun : Moon;

  return (
    <button
      className={`theme-toggle${iconOnly ? " theme-toggle-icon" : ""}`}
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Icon aria-hidden="true" size={18} />
      {!iconOnly ? <span>{dark ? "Modo claro" : "Modo escuro"}</span> : null}
    </button>
  );
}
