import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export function Pagination({
  basePath,
  currentPage,
  totalPages,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Paginação">
      <Link
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        href={`${basePath}${basePath.includes("?") ? "&" : "?"}page=${Math.max(1, currentPage - 1)}`}
      >
        <ChevronLeft aria-hidden="true" size={16} /> Anterior
      </Link>
      <span>
        Página {currentPage} de {totalPages}
      </span>
      <Link
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        href={`${basePath}${basePath.includes("?") ? "&" : "?"}page=${Math.min(totalPages, currentPage + 1)}`}
      >
        Próxima <ChevronRight aria-hidden="true" size={16} />
      </Link>
    </nav>
  );
}
