import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormField({
  children,
  className,
  error,
  hint,
  label,
  required,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className={cn("field", className, error && "field-error")}>
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {error ? <small role="alert">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}
