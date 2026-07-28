import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function Breadcrumb({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav className="breadcrumb" aria-label="Caminho da página">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index ? <ChevronRight aria-hidden="true" size={14} /> : null}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
