import {
  AlertTriangle, OctagonX, XCircle, Rocket, Clock, CheckCircle,
} from "lucide-react";

interface RiskHealthProps {
  blocked: number;
  escalated: number;
  failedRuns: number;
  failedDeploys: number;
  stalledRuns: number;
}

const METRICS = [
  { key: "blocked", icon: AlertTriangle, label: "Blocked", color: "text-destructive", bg: "bg-destructive/10" },
  { key: "escalated", icon: OctagonX, label: "Escalated", color: "text-lifecycle-escalated", bg: "bg-lifecycle-escalated/10" },
  { key: "failedRuns", icon: XCircle, label: "Failed CI", color: "text-destructive", bg: "bg-destructive/10" },
  { key: "failedDeploys", icon: Rocket, label: "Failed Deploy", color: "text-destructive", bg: "bg-destructive/10" },
  { key: "stalledRuns", icon: Clock, label: "Stalled", color: "text-status-amber", bg: "bg-status-amber/10" },
] as const;

export function RiskHealth(props: RiskHealthProps) {
  const hasIssues = Object.values(props).some((v) => v > 0);
  const activeMetrics = METRICS.filter((m) => props[m.key] > 0);

  return (
    <div className="rounded-2xl bg-card border border-border px-4 py-4 shadow-sm">
      <h3 className="text-[14px] font-bold text-foreground mb-3 tracking-tight">Risk & Health</h3>

      {!hasIssues ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
          <CheckCircle className="h-4 w-4 text-status-green" />
          <span className="text-[13px] font-medium text-foreground/70">All systems nominal</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {activeMetrics.map((m) => {
            const value = props[m.key];
            const Icon = m.icon;
            return (
              <div key={m.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 ${m.bg}`}>
                <Icon className={`h-4 w-4 ${m.color} shrink-0`} />
                <div className="min-w-0">
                  <span className={`text-[18px] font-bold font-mono tabular-nums leading-none ${m.color}`}>
                    {value}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
