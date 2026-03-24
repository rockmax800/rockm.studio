import {
  FileCode, FileSearch, TestTube, GitPullRequest, Rocket, Globe,
  CheckCircle, XCircle,
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

const DEPLOY_STATUS: Record<string, string> = {
  live: "text-status-green", deploying: "text-status-cyan",
  failed: "text-status-red", pending: "text-muted-foreground",
  rolled_back: "text-status-amber",
};

export function EvidencePanel({ artifacts, deployments, hasDomainBinding }: EvidencePanelProps) {
  const patches = artifacts.filter((a) => a.artifact_type === "code_patch");
  const reviews = artifacts.filter((a) => a.artifact_type === "review_report");
  const qaEvidence = artifacts.filter((a) => ["test_result", "qa_evidence"].includes(a.artifact_type));
  const prs = artifacts.filter((a) => a.artifact_type === "pull_request");

  return (
    <div>
      <h3 className="text-[15px] font-bold text-foreground tracking-tight mb-3">Evidence & Logs</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left — Implementation evidence */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Implementation</span>
          <EvidenceRow icon={FileCode} label="Code Patches" count={patches.length} />
          <EvidenceRow icon={FileSearch} label="Review Reports" count={reviews.length} />
          <EvidenceRow icon={TestTube} label="QA Evidence" count={qaEvidence.length} />
          <EvidenceRow icon={GitPullRequest} label="Pull Requests" count={prs.length} />
        </div>

        {/* Right — Deployment & infra */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">Infrastructure</span>
          {deployments.length > 0 ? (
            deployments.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-secondary">
                <Rocket className={`h-3.5 w-3.5 ${DEPLOY_STATUS[d.status] ?? "text-muted-foreground"}`} />
                <span className="text-[13px] font-medium text-foreground uppercase flex-1">{d.environment}</span>
                <span className={`text-[11px] font-mono ${DEPLOY_STATUS[d.status] ?? "text-muted-foreground"}`}>
                  {d.status}{d.version_label ? ` · ${d.version_label}` : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-secondary">
              <Rocket className="h-3.5 w-3.5 text-muted-foreground/30" />
              <span className="text-[13px] text-muted-foreground">No deployments</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-secondary">
            <Globe className={`h-3.5 w-3.5 ${hasDomainBinding ? "text-status-green" : "text-muted-foreground/30"}`} />
            <span className={`text-[13px] flex-1 ${hasDomainBinding ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Domain {hasDomainBinding ? "bound" : "unbound"}
            </span>
            {hasDomainBinding ? (
              <CheckCircle className="h-3 w-3 text-status-green" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground/30" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({ icon: Icon, label, count }: { icon: typeof FileCode; label: string; count: number }) {
  const active = count > 0;
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] ${active ? "bg-secondary" : "bg-secondary/50"}`}>
      <Icon className={`h-3.5 w-3.5 ${active ? "text-foreground" : "text-muted-foreground/30"}`} />
      <span className={`text-[13px] flex-1 ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-[13px] font-mono font-bold ${active ? "text-foreground" : "text-muted-foreground/30"}`}>{count}</span>
      {active ? (
        <CheckCircle className="h-3 w-3 text-status-green" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground/20" />
      )}
    </div>
  );
}
