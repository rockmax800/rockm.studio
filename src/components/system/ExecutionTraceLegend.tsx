/* ═══════════════════════════════════════════════════════════
   ExecutionTraceLegend — visual legend + honesty banner for
   the Audit tab explaining execution engine trace states.
   ═══════════════════════════════════════════════════════════ */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Cpu, Zap, Bot, Info, CircleDot } from "lucide-react";

const LEGEND_ITEMS = [
  { icon: Cpu, label: "Native run", desc: "Executed by built-in services", color: "border-border/50 bg-muted/30 text-foreground/70" },
  { icon: Zap, label: "Ruflo run", desc: "Delegated to external engine", color: "border-status-amber/40 bg-status-amber/5 text-status-amber" },
  { icon: Bot, label: "Provider: Claude / OpenAI / Gemini / Local", desc: "Model family used for execution", color: "border-border/50 bg-muted/30 text-foreground/70" },
  { icon: CircleDot, label: "Telemetry available", desc: "Token usage, cost, trace ref present", color: "border-status-green/40 bg-status-green/5 text-status-green" },
  { icon: CircleDot, label: "Telemetry unavailable", desc: "Engine metadata not yet wired", color: "border-border/40 bg-muted/20 text-muted-foreground/50" },
] as const;

export function ExecutionTraceLegend() {
  return (
    <div className="space-y-3">
      {/* Honesty note */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/30">
        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Current branch trace is operational-only; external engine telemetry is not yet fully wired.
          When runs carry execution metadata (engine, provider, model, trace refs), it will render
          inline and become filterable.
        </p>
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-2">
        {LEGEND_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium",
                item.color,
              )}
              title={item.desc}
            >
              <Icon className="h-3 w-3" />
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
