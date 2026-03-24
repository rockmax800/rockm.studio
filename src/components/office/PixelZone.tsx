import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface PixelZoneProps {
  label: string;
  zoneKey: string;
  icon: string;
  count: number;
  children: ReactNode;
}

const ZONE_DOT: Record<string, string> = {
  ready: "bg-status-blue",
  in_progress: "bg-status-amber",
  waiting_review: "bg-lifecycle-review",
  rework: "bg-status-amber",
  escalated: "bg-destructive",
  blocked: "bg-destructive",
  approved: "bg-status-green",
  validated: "bg-status-green",
  done: "bg-status-green",
  qa: "bg-status-cyan",
  release: "bg-primary",
};

export function PixelZone({ label, zoneKey, icon, count, children }: PixelZoneProps) {
  const dot = ZONE_DOT[zoneKey] ?? "bg-muted-foreground/30";

  return (
    <div className="relative rounded-xl border border-border/40 bg-card p-3 min-h-[130px] flex flex-col transition-colors">
      {/* Zone header */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`h-2 w-2 rounded-full ${dot} ${count > 0 ? "animate-pulse" : "opacity-20"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </span>
        <Badge
          variant="outline"
          className={`ml-auto text-[9px] font-mono px-1 py-0 h-4 border-border/30 ${
            count > 0 ? "text-foreground" : "text-muted-foreground/30"
          }`}
        >
          {count}
        </Badge>
      </div>
      {/* Agent area */}
      <div className="flex-1 relative flex flex-wrap gap-1 content-start">
        {children}
      </div>
    </div>
  );
}
