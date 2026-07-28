import { cn, initials } from "@/lib/utils";

export function Avatar({
  className,
  name,
}: {
  className?: string;
  name: string;
}) {
  return (
    <span className={cn("avatar", className)} aria-label={name} title={name}>
      {initials(name)}
    </span>
  );
}
