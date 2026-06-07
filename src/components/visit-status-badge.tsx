import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { VisitStatus } from "@/lib/types";

const config = {
  AGENDADA: ["Agendada", CalendarClock, "visit-status-scheduled"],
  CONFIRMADA: ["Confirmada", ShieldCheck, "visit-status-confirmed"],
  CONCLUIDA: ["Concluída", CheckCircle2, "visit-status-completed"],
  CONVERTIDA_ORCAMENTO: [
    "Convertida",
    CircleDollarSign,
    "visit-status-converted",
  ],
  CANCELADA: ["Cancelada", XCircle, "visit-status-cancelled"],
} satisfies Record<VisitStatus, [string, typeof CalendarClock, string]>;

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const [label, Icon, className] = config[status];
  return (
    <span className={`status-badge ${className}`}>
      <Icon aria-hidden="true" size={14} />
      {label}
    </span>
  );
}

export function visitStatusLabel(status: VisitStatus) {
  return config[status][0];
}
