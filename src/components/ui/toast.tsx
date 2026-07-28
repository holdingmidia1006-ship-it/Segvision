"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Toast({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?: "success" | "error" | "info";
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? CircleAlert : Info;
  return (
    <div
      className={cn("toast", `toast-${tone}`)}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" size={19} />
      <span>{children}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fechar aviso">
        <X aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
