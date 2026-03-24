import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCode,
  FileSearch,
  TestTube,
  GitPullRequest,
  CircleCheck,
  Rocket,
  Globe,
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

const ARTIFACT_ICONS: Record<string, typeof FileCode> = {
  code_patch: FileCode,
  review_report: FileSearch,
  qa_evidence: TestTube,
  pull_request: GitPullRequest,
};

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
    <div className="flex flex-col h-full">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Evidence & Delivery
      </h2>

      <ScrollArea className="flex-1 -mr-1 pr-1">
        <div className="grid grid-cols-2 gap-2">
          {/* Left: Evidence */}
          <div className="space-y-1.5">
            <EvidenceRow icon={FileCode} label="Patches" count={patches.length} hasItems={patches.length > 0} />
            <EvidenceRow icon={FileSearch} label="Reviews" count={reviews.length} hasItems={reviews.length > 0} />
            <EvidenceRow icon={TestTube} label="QA Evidence" count={qaEvidence.length} hasItems={qaEvidence.length > 0} />
            <EvidenceRow icon={GitPullRequest} label="Pull Requests" count={prs.length} hasItems={prs.length > 0} />
          </div>

          {/* Right: Delivery Status */}
          <div className="space-y-1.5">
            {deployments.length > 0 ? (
              deployments.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-card/50 border border-border/20">
                  <Rocket className={`h-3 w-3 ${DEPLOY_STATUS_COLORS[d.status] ?? "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-medium uppercase">{d.environment}</p>
                    <p className={`text-[8px] font-mono ${DEPLOY_STATUS_COLORS[d.status] ?? "text-muted-foreground"}`}>
                      {d.status}{d.version_label ? ` · ${d.version_label}` : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-card/50 border border-border/20">
                <Rocket className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-[8px] text-muted-foreground">No deployments</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-card/50 border border-border/20">
              <Globe className={`h-3 w-3 ${hasDomainBinding ? "text-status-green" : "text-muted-foreground/40"}`} />
              <span className={`text-[8px] ${hasDomainBinding ? "text-status-green" : "text-muted-foreground"}`}>
                Domain {hasDomainBinding ? "bound" : "unbound"}
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>
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
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-card/50 border border-border/20">
      <Icon className={`h-3 w-3 ${hasItems ? "text-status-green" : "text-muted-foreground/40"}`} />
      <span className="text-[9px] flex-1">{label}</span>
      <Badge
        variant="outline"
        className={`text-[7px] px-1 py-0 h-3 border-border/40 ${
          hasItems ? "text-status-green border-status-green/30" : ""
        }`}
      >
        {count}
      </Badge>
    </div>
  );
}
