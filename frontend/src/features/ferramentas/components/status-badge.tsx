import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleCheck, CircleSlash, SearchX, Wrench } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { META_STATUS } from "../status";
import type { StatusFerramenta } from "../types";

// Vocabulário visual de cada status: tom do selo, ícone, cor sólida (barras e pontos) e cor de texto.
export const VISUAL_STATUS: Record<StatusFerramenta, { tone: BadgeTone; icone: LucideIcon; cor: string; texto: string }> = {
  AVAILABLE: { tone: "available", icone: CircleCheck, cor: "bg-status-available", texto: "text-status-available" },
  ON_LOAN: { tone: "loan", icone: ArrowUpRight, cor: "bg-status-loan", texto: "text-status-loan" },
  UNDER_REPAIR: { tone: "repair", icone: Wrench, cor: "bg-status-repair", texto: "text-status-repair" },
  LOST: { tone: "lost", icone: SearchX, cor: "bg-status-lost", texto: "text-status-lost" },
  INACTIVE: { tone: "inactive", icone: CircleSlash, cor: "bg-status-inactive", texto: "text-status-inactive" },
};

export function StatusBadge({ status, className }: { status: StatusFerramenta; className?: string }) {
  const { tone, icone: Icone } = VISUAL_STATUS[status];
  return (
    <Badge tone={tone} className={className}>
      <Icone aria-hidden />
      {META_STATUS[status].rotulo}
    </Badge>
  );
}

export function StatusDot({ status, className }: { status: StatusFerramenta; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", VISUAL_STATUS[status].cor, className)} />;
}
