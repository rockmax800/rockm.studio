import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TeamZoneProps {
  teamName: string;
  focusDomain: string;
  loadStatus: "balanced" | "high" | "overloaded";
  activeTasks: number;
  maxCapacity: number;
  children: ReactNode;
}

const LOAD_STYLES = {
  balanced: {
    dot: "bg-status-green",
    label: "Balanced",
    chipCls: "text-status-green",
  },
  high: {
    dot: "bg-status-amber",
    label: "High Load",
    chipCls: "text-status-amber",
  },
  overloaded: {
    dot: "bg-destructive",
    label: "Overloaded",
    chipCls: "text-destructive",
  },
};

export function TeamZone({ teamName, focusDomain, loadStatus, activeTasks, maxCapacity, children }: TeamZoneProps) {
  const style = LOAD_STYLES[loadStatus];

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 min-h-[100px]">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-xs font-bold text-foreground">{teamName}</span>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-3.5 border-border/30">{focusDomain}</Badge>
        <span className={`ml-auto text-[9px] font-bold ${style.chipCls}`}>
          {style.label}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground/40">
          {activeTasks}/{maxCapacity || "∞"}
        </span>
      </div>
      {/* Load bar */}
      {maxCapacity > 0 && (
        <div className="h-1 rounded-full bg-muted/30 mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              loadStatus === "overloaded" ? "bg-destructive" : loadStatus === "high" ? "bg-status-amber" : "bg-status-green"
            }`}
            style={{ width: `${Math.min(100, (activeTasks / maxCapacity) * 100)}%` }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 content-start">
        {children}
      </div>
    </div>
  );
}
