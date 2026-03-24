import { CheckCircle, XCircle, Minus, Rocket, Globe, TestTube, Shield, Server } from "lucide-react";

interface ReleaseReadinessProps {
  ciStatus: "passed" | "failed" | "pending";
  qaStatus: "passed" | "failed" | "pending";
  domainBound: boolean;
  deployEligible: boolean;
  hasStagingLive: boolean;
  hasProductionLive: boolean;
}

const STATUS_ICON = {
  passed: { icon: CheckCircle, color: "text-status-green" },
  failed: { icon: XCircle, color: "text-status-red" },
  pending: { icon: Minus, color: "text-muted-foreground/40" },
};

export function ReleaseReadiness({
  ciStatus,
  qaStatus,
  domainBound,
  deployEligible,
  hasStagingLive,
  hasProductionLive,
}: ReleaseReadinessProps) {
  const checks = [
    { label: "CI Pipeline", status: ciStatus, icon: Server },
    { label: "QA Evidence", status: qaStatus, icon: TestTube },
    { label: "Domain Binding", status: domainBound ? "passed" as const : "pending" as const, icon: Globe },
    { label: "Staging Live", status: hasStagingLive ? "passed" as const : "pending" as const, icon: Rocket },
    { label: "Deploy Eligible", status: deployEligible ? "passed" as const : "pending" as const, icon: Shield },
    { label: "Production Live", status: hasProductionLive ? "passed" as const : "pending" as const, icon: Rocket },
  ];

  const passedCount = checks.filter((c) => c.status === "passed").length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-foreground tracking-tight">Release Readiness</h3>
        <span className="text-[12px] font-mono font-bold text-muted-foreground">
          {passedCount}/{checks.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {checks.map((check) => {
          const cfg = STATUS_ICON[check.status];
          const StatusIcon = cfg.icon;
          const ItemIcon = check.icon;
          return (
            <div
              key={check.label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] transition-colors ${
                check.status === "passed"
                  ? "bg-status-green/5"
                  : check.status === "failed"
                    ? "bg-status-red/5"
                    : "bg-card"
              }`}
            >
              <ItemIcon className={`h-3.5 w-3.5 ${check.status === "passed" ? "text-foreground" : "text-muted-foreground/40"}`} />
              <span className={`text-[13px] flex-1 ${
                check.status === "passed" ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>
                {check.label}
              </span>
              <StatusIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
