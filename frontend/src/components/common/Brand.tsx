import * as React from "react";
import { SquareGanttChart } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = { compact?: boolean; className?: string };

export function Brand({ compact, className }: Props) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SquareGanttChart className="h-5 w-5" />
      {!compact && <span className="font-semibold tracking-tight">SISGEMEC</span>}
    </div>
  );
}
