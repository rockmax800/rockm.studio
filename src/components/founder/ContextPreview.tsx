import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileText, TestTube, GitPullRequest, Rocket, Globe,
  FileSearch, ShieldCheck, AlertTriangle, CheckCircle, XCircle,
} from "lucide-react";
import type { DecisionItem } from "./DecisionCard";

interface ContextPreviewProps {
  selectedItem: DecisionItem | null;
}

export function ContextPreview({ selectedItem }: ContextPreviewProps) {
  if (!selectedItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-6">
        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-muted-foreground/30" />
        </div>
        <p className="text-[12px] text-muted-foreground">Select a decision to preview context</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border">
              {selectedItem.entityType}
            </Badge>
            {selectedItem.projectName && (
              <span className="text-[11px] font-mono text-muted-foreground">{selectedItem.projectName}</span>
            )}
          </div>
          <h3 className="text-[14px] font-bold leading-tight text-foreground">{selectedItem.title}</h3>
          <p className="text-[12px] text-muted-foreground mt-1">{selectedItem.explanation}</p>
        </div>

        {/* Impact */}
        {selectedItem.impactSummary && (
          <ContextSection icon={AlertTriangle} label="Impact if Approved" color="text-status-amber">
            <p className="text-[12px] text-foreground/80">{selectedItem.impactSummary}</p>
          </ContextSection>
        )}

        {/* Evidence */}
        <ContextSection icon={FileSearch} label="Evidence" color="text-primary">
          <div className="space-y-1.5">
            <EvidenceRow icon={FileText} label="Spec / Blueprint" available={selectedItem.category === "blueprint_approval"} />
            <EvidenceRow icon={GitPullRequest} label="Pull Request" available={selectedItem.evidenceCount > 0} />
            <EvidenceRow icon={TestTube} label="QA Evidence" available={selectedItem.evidenceCount > 1} />
            <EvidenceRow icon={Rocket} label="Deploy Preview" available={selectedItem.category === "deploy_production"} />
            <EvidenceRow icon={Globe} label="Domain Binding" available={selectedItem.category === "domain_binding"} />
          </div>
        </ContextSection>

        {/* Risk assessment */}
        <ContextSection icon={AlertTriangle} label="Risk Level" color={
          selectedItem.riskLevel === "critical" ? "text-status-red" :
          selectedItem.riskLevel === "high" ? "text-status-amber" : "text-status-green"
        }>
          <div className="flex items-center gap-2">
            <Badge variant={selectedItem.riskLevel === "critical" ? "destructive" : "outline"} className="text-[10px] px-2 py-0.5 h-5">
              {selectedItem.riskLevel.toUpperCase()}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {selectedItem.riskLevel === "critical" ? "Requires immediate attention" :
               selectedItem.riskLevel === "high" ? "Review carefully before deciding" :
               "Standard review flow"}
            </span>
          </div>
        </ContextSection>

        {/* Readiness checklist */}
        <ContextSection icon={CheckCircle} label="Readiness" color="text-status-green">
          <div className="space-y-1">
            <ReadinessRow label="CI Passing" ready={selectedItem.evidenceCount > 0} />
            <ReadinessRow label="QA Complete" ready={selectedItem.evidenceCount > 1} />
            <ReadinessRow label="Deploy Preview" ready={selectedItem.category === "deploy_production"} />
            <ReadinessRow label="Domain Bound" ready={selectedItem.category === "domain_binding"} />
          </div>
        </ContextSection>
      </div>
    </ScrollArea>
  );
}

function ContextSection({ icon: Icon, label, color, children }: {
  icon: typeof FileText; label: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] bg-secondary/50 border border-border p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

function EvidenceRow({ icon: Icon, label, available }: { icon: typeof FileText; label: string; available: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${available ? "text-status-green" : "text-muted-foreground/20"}`} />
      <span className={`text-[12px] ${available ? "text-foreground" : "text-muted-foreground/30"}`}>{label}</span>
      {available && <CheckCircle className="h-3 w-3 text-status-green ml-auto" />}
    </div>
  );
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ready ? (
        <CheckCircle className="h-3 w-3 text-status-green" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground/20" />
      )}
      <span className={`text-[11px] ${ready ? "text-foreground" : "text-muted-foreground/30"}`}>{label}</span>
    </div>
  );
}
