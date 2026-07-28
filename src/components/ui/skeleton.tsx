import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return <span className={cn("skeleton", className)} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Carregando página">
      <Skeleton className="skeleton-eyebrow" />
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-copy" />
      <div className="skeleton-grid">
        <Skeleton className="skeleton-card" />
        <Skeleton className="skeleton-card" />
        <Skeleton className="skeleton-card" />
      </div>
    </div>
  );
}
