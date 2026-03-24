import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCode,
  FileSearch,
  TestTube,
  GitPullRequest,
  Rocket,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface EvidenceItem {
  id: string;
  title: string;
  artifact_type: string;
  state: string;
}

interface DeploymentItem {
  id: string;
  environment: string;
  status: string;
  version_label?: string | null;
}

interface EvidencePanelProps {
  artifacts: EvidenceItem[];
  deployments: DeploymentItem[];
  hasDomainBinding: boolean;
}

const DEPLOY_STATUS_COLORS: Record<string, string> = {
  live: "text-status-green",
  deploying: "text-status-cyan",
  failed: "text-status-red",
  pending: "text-muted-foreground",
  rolled_back: "text-status-amber",
};

export function EvidencePanel({ artifacts, deployments, hasDomainBinding }: EvidencePanelProps) {
  const patches = artifacts.filter((a) => a.artifact_type === "code_patch");
  const reviews = artifacts.filter((a) => a.artifact_type === "review_report");
  const qaEvidence = artifacts.filter((a) => ["test_result", "qa_evidence"].includes(a.artifact_type));
  const prs = artifacts.filter((a) => a.artifact_type === "pull_request");

  return (
    <div>
      <h3 className="text-card-title text-foreground mb-3">Evidence & Delivery</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Left side: Evidence items */}
        <EvidenceRow icon={FileCode} label="Patches" count={patches.length} hasItems={patches.length > 0} />
        <EvidenceRow icon={FileSearch} label="Reviews" count={reviews.length} hasItems={reviews.length > 0} />
        <EvidenceRow icon={TestTube} label="QA Evidence" count={qaEvidence.length} hasItems={qaEvidence.length > 0} />
        <EvidenceRow icon={GitPullRequest} label="Pull Requests" count={prs.length} hasItems={prs.length > 0} />
      </div>

      {/* Deployments + Domain row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        {deployments.length > 0 ? (
          deployments.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border">
              <Rocket className={`h-3.5 w-3.5 ${DEPLOY_STATUS_COLORS[d.status] ?? "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground uppercase">{d.environment}</p>
                <p className={`text-[12px] font-mono ${DEPLOY_STATUS_COLORS[d.status] ?? "text-muted-foreground"}`}>
                  {d.status}{d.version_label ? ` · ${d.version_label}` : ""}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border">
            <Rocket className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-[13px] text-muted-foreground">No deployments</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border">
          <Globe className={`h-3.5 w-3.5 ${hasDomainBinding ? "text-status-green" : "text-muted-foreground/40"}`} />
          <span className={`text-[13px] ${hasDomainBinding ? "text-status-green font-medium" : "text-muted-foreground"}`}>
            Domain {hasDomainBinding ? "bound" : "unbound"}
          </span>
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({
  icon: Icon,
  label,
  count,
  hasItems,
}: {
  icon: typeof FileCode;
  label: string;
  count: number;
  hasItems: boolean;
}) {
  const StatusIcon = hasItems ? CheckCircle : XCircle;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-secondary border border-border">
      <Icon className={`h-3.5 w-3.5 ${hasItems ? "text-foreground" : "text-muted-foreground/40"}`} />
      <span className={`text-[13px] flex-1 ${hasItems ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-[13px] font-mono font-bold ${hasItems ? "text-status-green" : "text-muted-foreground/40"}`}>
        {count}
      </span>
      <StatusIcon className={`h-3 w-3 ${hasItems ? "text-status-green" : "text-muted-foreground/30"}`} />
    </div>
  );
}
