"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="error-state" role="alert">
      <span>
        <CircleAlert aria-hidden="true" size={28} />
      </span>
      <h1>Não foi possível carregar esta página</h1>
      <p>
        Seus dados não foram alterados. Tente novamente e, se o problema
        continuar, volte ao início.
      </p>
      <button className="button button-primary" type="button" onClick={reset}>
        <RotateCcw aria-hidden="true" size={17} />
        Tentar novamente
      </button>
    </section>
  );
}
