// PART 7 — Team Zone component for Office visualization
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
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/5",
    badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    label: "Balanced",
  },
  high: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/5",
    badge: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    label: "High Load",
  },
  overloaded: {
    border: "border-destructive/40",
    bg: "bg-destructive/5",
    badge: "bg-destructive/20 text-destructive",
    label: "Overloaded",
  },
};

export function TeamZone({ teamName, focusDomain, loadStatus, activeTasks, maxCapacity, children }: TeamZoneProps) {
  const style = LOAD_STYLES[loadStatus];

  return (
    <div className={`rounded-lg border-2 ${style.border} ${style.bg} p-3 min-h-[100px]`}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-bold">{teamName}</span>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-3.5">{focusDomain}</Badge>
        <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">
          {activeTasks}/{maxCapacity || "∞"}
        </span>
      </div>
      {/* Load bar */}
      {maxCapacity > 0 && (
        <div className="h-1 rounded-full bg-muted mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              loadStatus === "overloaded" ? "bg-destructive" : loadStatus === "high" ? "bg-amber-500" : "bg-emerald-500"
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
