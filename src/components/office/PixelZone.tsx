import { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface PixelZoneProps {
  label: string;
  zoneKey: string;
  icon: string;
  count: number;
  children: ReactNode;
}

const ZONE_STYLES: Record<string, { border: string; bg: string; glow: string; dot: string }> = {
  ready: { border: "border-status-blue/40", bg: "bg-status-blue/5", glow: "", dot: "bg-status-blue" },
  in_progress: { border: "border-status-amber/40", bg: "bg-status-amber/5", glow: "", dot: "bg-status-amber" },
  waiting_review: { border: "border-lifecycle-review/40", bg: "bg-lifecycle-review/5", glow: "shadow-[0_0_12px_hsl(270,60%,50%,0.1)]", dot: "bg-lifecycle-review" },
  rework: { border: "border-lifecycle-escalated/40", bg: "bg-lifecycle-escalated/5", glow: "", dot: "bg-lifecycle-escalated" },
  escalated: { border: "border-status-red/40", bg: "bg-status-red/5", glow: "", dot: "bg-status-red" },
  blocked: { border: "border-status-red/50", bg: "bg-status-red/5", glow: "", dot: "bg-status-red" },
  approved: { border: "border-status-green/40", bg: "bg-status-green/5", glow: "", dot: "bg-status-green" },
  validated: { border: "border-status-green/40", bg: "bg-status-green/5", glow: "", dot: "bg-status-green" },
  done: { border: "border-lifecycle-done/40", bg: "bg-lifecycle-done/5", glow: "", dot: "bg-lifecycle-done" },
  qa: { border: "border-status-cyan/40", bg: "bg-status-cyan/5", glow: "", dot: "bg-status-cyan" },
  release: { border: "border-primary/40", bg: "bg-primary/5", glow: "shadow-[0_0_10px_hsl(230,60%,50%,0.08)]", dot: "bg-primary" },
};

export function PixelZone({ label, zoneKey, icon, count, children }: PixelZoneProps) {
  const style = ZONE_STYLES[zoneKey] ?? ZONE_STYLES.ready;

  return (
    <div
      className={`relative rounded-lg border ${style.border} ${style.bg} ${style.glow} p-2 min-h-[130px] flex flex-col transition-all duration-300`}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Zone header */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`h-2 w-2 rounded-full ${style.dot} ${count > 0 ? "animate-pulse" : "opacity-30"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Badge
          variant="outline"
          className={`ml-auto text-[9px] font-mono px-1 py-0 h-4 border-border/50 ${
            count > 0 ? "text-foreground" : "text-muted-foreground/50"
          }`}
        >
          {count}
        </Badge>
      </div>
      {/* Pixel grid floor pattern */}
      <div
        className="absolute inset-0 rounded-lg opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 15px, hsl(var(--foreground)) 15px, hsl(var(--foreground)) 16px),
                            repeating-linear-gradient(90deg, transparent, transparent 15px, hsl(var(--foreground)) 15px, hsl(var(--foreground)) 16px)`,
        }}
      />
      {/* Agent area */}
      <div className="flex-1 relative flex flex-wrap gap-1 content-start">
        {children}
      </div>
    </div>
  );
}
