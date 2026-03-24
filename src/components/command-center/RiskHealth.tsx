import {
  AlertTriangle,
  OctagonX,
  XCircle,
  Rocket,
  Clock,
} from "lucide-react";

interface RiskHealthProps {
  blocked: number;
  escalated: number;
  failedRuns: number;
  failedDeploys: number;
  stalledRuns: number;
}

const METRICS = [
  { key: "blocked", icon: AlertTriangle, label: "Blocked", color: "bg-lifecycle-blocked", text: "text-lifecycle-blocked" },
  { key: "escalated", icon: OctagonX, label: "Escalated", color: "bg-lifecycle-escalated", text: "text-lifecycle-escalated" },
  { key: "failedRuns", icon: XCircle, label: "Failed CI", color: "bg-status-red", text: "text-status-red" },
  { key: "failedDeploys", icon: Rocket, label: "Failed Deploy", color: "bg-status-red", text: "text-status-red" },
  { key: "stalledRuns", icon: Clock, label: "Stalled Runs", color: "bg-status-amber", text: "text-status-amber" },
] as const;

export function RiskHealth(props: RiskHealthProps) {
  const hasIssues = Object.values(props).some((v) => v > 0);

  return (
    <div className="ds-card p-4">
      <h3 className="text-[14px] font-bold text-foreground mb-3 tracking-tight">Risk & Health</h3>
      <div className="grid grid-cols-2 gap-2">
        {METRICS.map((m) => {
          const value = props[m.key];
          const Icon = m.icon;
          const isActive = value > 0;
          return (
            <div
              key={m.key}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border transition-colors ${
                isActive
                  ? "border-border-strong bg-card"
                  : "border-transparent bg-secondary/60"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? `${m.color}/10` : "bg-muted/60"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? m.text : "text-muted-foreground/40"}`} />
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[18px] font-bold font-mono tabular-nums leading-none ${
                    isActive ? m.text : "text-muted-foreground/30"
                  }`}
                >
                  {value}
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!hasIssues && (
        <p className="text-[12px] text-muted-foreground/60 mt-2 px-1">All systems nominal.</p>
      )}
    </div>
  );
}
