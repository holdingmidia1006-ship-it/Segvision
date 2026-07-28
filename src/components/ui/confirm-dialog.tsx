"use client";

import { AlertTriangle, X } from "lucide-react";
import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export function ConfirmSubmitButton({
  children,
  className,
  confirmLabel = "Confirmar",
  description,
  disabled,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  confirmLabel?: string;
  description: string;
  disabled?: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  function confirm() {
    const form = triggerRef.current?.closest("form");
    dialogRef.current?.close();
    form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={cn("button button-danger button-small", className)}
        type="button"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="confirm-dialog-card">
          <button
            className="confirm-dialog-close"
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar confirmação"
          >
            <X aria-hidden="true" size={19} />
          </button>
          <span className="confirm-dialog-icon">
            <AlertTriangle aria-hidden="true" size={22} />
          </span>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
          <div className="confirm-dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              Voltar
            </button>
            <button className="button button-danger" type="button" onClick={confirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
