import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ServiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  ServiceStatus,
  { label: string; icon: typeof Clock3; className: string }
> = {
  ORCAMENTO: {
    label: "Orçamento",
    icon: CircleDollarSign,
    className: "status-budget",
  },
  EM_EXECUCAO: {
    label: "Em execução",
    icon: Clock3,
    className: "status-running",
  },
  GARANTIA: {
    label: "Garantia",
    icon: ShieldCheck,
    className: "status-warranty",
  },
  FINALIZADO: {
    label: "Finalizado",
    icon: CheckCircle2,
    className: "status-finished",
  },
  CANCELADO: {
    label: "Cancelado",
    icon: XCircle,
    className: "status-cancelled",
  },
};

export function StatusBadge({
  status,
  pulse = false,
}: {
  status: ServiceStatus;
  pulse?: boolean;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "status-badge",
        config.className,
        pulse && status === "EM_EXECUCAO" && "status-pulse",
      )}
    >
      <Icon aria-hidden="true" size={14} />
      {config.label}
    </span>
  );
}

export function statusLabel(status: ServiceStatus) {
  return statusConfig[status].label;
}
