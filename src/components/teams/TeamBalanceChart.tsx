import { ROLE_OPTIONS, type TeamDistribution } from "@/lib/employeeConfig";

interface Props {
  distribution: TeamDistribution;
  total: number;
}

export function TeamBalanceChart({ distribution, total }: Props) {
  if (total === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Seniority */}
      <DistCard title="Seniority" data={distribution.seniority} total={total}
        colorMap={{ Junior: "bg-status-blue/60", Middle: "bg-status-blue", Senior: "bg-status-amber", Lead: "bg-destructive/80" }} />

      {/* Risk Tolerance */}
      <DistCard title="Risk Tolerance" data={distribution.riskTolerance} total={total}
        colorMap={{ low: "bg-status-green", medium: "bg-status-amber", high: "bg-destructive" }} />

      {/* Speed vs Quality */}
      <DistCard title="Speed ↔ Quality" data={distribution.speedVsQuality} total={total}
        colorMap={{ speed: "bg-status-amber", balanced: "bg-status-blue", quality: "bg-status-green" }} />

      {/* Roles */}
      <div className="rounded-xl bg-secondary/20 px-3 py-3">
        <p className="text-[10px] font-bold text-muted-foreground mb-2">Roles</p>
        <div className="space-y-1.5">
          {Object.entries(distribution.roles).map(([code, count]) => {
            const label = ROLE_OPTIONS.find(r => r.code === code)?.label ?? code;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={code} className="flex items-center gap-2">
                <span className="text-[10px] text-foreground font-bold truncate flex-1">{label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
                <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary/40" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DistCard({ title, data, total, colorMap }: {
  title: string;
  data: Record<string, number>;
  total: number;
  colorMap: Record<string, string>;
}) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  return (
    <div className="rounded-xl bg-secondary/20 px-3 py-3">
      <p className="text-[10px] font-bold text-muted-foreground mb-2">{title}</p>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-border mb-2">
        {entries.map(([key, count]) => (
          <div key={key} className={`h-full ${colorMap[key] ?? "bg-primary/30"}`}
            style={{ width: `${(count / total) * 100}%` }} />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${colorMap[key] ?? "bg-primary/30"}`} />
            <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
            <span className="text-[9px] font-mono font-bold text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
