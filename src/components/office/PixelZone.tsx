import { type ReactNode } from "react";

interface PixelZoneProps {
  label: string;
  zoneKey: string;
  icon: string;
  count: number;
  children: ReactNode;
}

const ZONE_STYLES: Record<string, { border: string; bg: string; glow: string }> = {
  ready: { border: "border-blue-500/40", bg: "bg-blue-500/5", glow: "" },
  in_progress: { border: "border-yellow-500/40", bg: "bg-yellow-500/5", glow: "" },
  waiting_review: { border: "border-purple-500/40", bg: "bg-purple-500/5", glow: "shadow-[0_0_12px_hsl(270,60%,50%,0.15)]" },
  rework: { border: "border-orange-500/40", bg: "bg-orange-500/5", glow: "" },
  escalated: { border: "border-red-500/40", bg: "bg-red-500/5", glow: "" },
  blocked: { border: "border-red-600/50", bg: "bg-red-500/5", glow: "" },
  approved: { border: "border-green-500/40", bg: "bg-green-500/5", glow: "" },
  done: { border: "border-emerald-500/40", bg: "bg-emerald-500/5", glow: "" },
};

export function PixelZone({ label, zoneKey, icon, count, children }: PixelZoneProps) {
  const style = ZONE_STYLES[zoneKey] ?? ZONE_STYLES.ready;

  return (
    <div
      className={`relative rounded-lg border-2 ${style.border} ${style.bg} ${style.glow} p-2 min-h-[140px] flex flex-col`}
      style={{ imageRendering: "pixelated" }}
    >
      {/* Zone header */}
      <div className="flex items-center gap-1.5 mb-2">
        <img src={icon} alt="" className="w-5 h-5" style={{ imageRendering: "pixelated" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/70">{count}</span>
      </div>
      {/* Pixel grid floor pattern */}
      <div
        className="absolute inset-0 rounded-lg opacity-[0.03] pointer-events-none"
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
