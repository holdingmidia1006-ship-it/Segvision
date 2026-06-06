"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={cn("button button-primary", className)}
      disabled={disabled || pending}
    >
      {pending ? (
        <LoaderCircle className="spin" aria-hidden="true" size={16} />
      ) : null}
      {pending ? "Salvando..." : children}
    </button>
  );
}
