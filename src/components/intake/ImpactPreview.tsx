import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Layers, Gauge } from "lucide-react";

interface ImpactPreviewProps {
  scopeCount: number;
  constraintsCount: number;
  criteriaCount: number;
  riskClass: string;
}

const RISK_COLOR: Record<string, string> = {
  low: "text-status-green",
  medium: "text-status-amber",
  high: "text-status-red",
};

export function ImpactPreview({ scopeCount, constraintsCount, criteriaCount, riskClass }: ImpactPreviewProps) {
  const complexityScore = Math.min(10, scopeCount + constraintsCount + Math.ceil(criteriaCount * 0.5));
  const roleEstimate = complexityScore <= 3 ? 2 : complexityScore <= 6 ? 3 : 5;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <MetricCard
        icon={<Gauge className="h-3.5 w-3.5 text-primary" />}
        label="Complexity"
        value={`${complexityScore}/10`}
      />
      <MetricCard
        icon={<Users className="h-3.5 w-3.5 text-status-cyan" />}
        label="Est. Roles"
        value={String(roleEstimate)}
      />
      <MetricCard
        icon={<Layers className="h-3.5 w-3.5 text-lifecycle-review" />}
        label="Scope Items"
        value={String(scopeCount)}
      />
      <MetricCard
        icon={<AlertTriangle className={`h-3.5 w-3.5 ${RISK_COLOR[riskClass] ?? "text-muted-foreground"}`} />}
        label="Risk Class"
        value={
          <Badge
            variant="outline"
            className={`text-[7px] px-1 py-0 h-3 ${
              riskClass === "high" ? "border-status-red/40 text-status-red" :
              riskClass === "medium" ? "border-status-amber/40 text-status-amber" :
              "border-status-green/40 text-status-green"
            }`}
          >
            {riskClass.toUpperCase()}
          </Badge>
        }
      />
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="border border-border/20 rounded-lg bg-surface-sunken p-2 flex flex-col items-center gap-1">
      {icon}
      <span className="text-xs font-bold font-mono leading-none">{value}</span>
      <span className="text-[7px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}
