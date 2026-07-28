"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  items,
}: {
  items: Array<{ content: ReactNode; id: string; label: string }>;
}) {
  const baseId = useId();
  const [active, setActive] = useState(items[0]?.id ?? "");

  return (
    <div className="tabs">
      <div className="tabs-list" role="tablist" aria-label="Seções">
        {items.map((item) => (
          <button
            key={item.id}
            id={`${baseId}-tab-${item.id}`}
            className={cn(active === item.id && "active")}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            onClick={() => setActive(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={active !== item.id}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
