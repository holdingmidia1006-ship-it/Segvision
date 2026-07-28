"use client";

import { X } from "lucide-react";
import { useId, useRef } from "react";
import type { ReactNode } from "react";

export function Modal({
  children,
  description,
  title,
  trigger,
}: {
  children: ReactNode;
  description?: string;
  title: string;
  trigger: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        className="button button-secondary"
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog
        className="ui-modal"
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="ui-modal-card">
          <header>
            <div>
              <h2 id={titleId}>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar janela"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>
          {children}
        </div>
      </dialog>
    </>
  );
}
