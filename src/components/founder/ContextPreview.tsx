import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  TestTube,
  GitPullRequest,
  Rocket,
  Globe,
  FileSearch,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { DecisionItem } from "./DecisionCard";

interface ContextPreviewProps {
  selectedItem: DecisionItem | null;
}

export function ContextPreview({ selectedItem }: ContextPreviewProps) {
  if (!selectedItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-4">
        <ShieldCheck className="h-6 w-6 text-muted-foreground/20" />
        <p className="text-[10px] text-muted-foreground">Select a decision to preview context</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-1">
        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/30">
              {selectedItem.entityType}
            </Badge>
            {selectedItem.projectName && (
              <span className="text-[8px] font-mono text-muted-foreground">{selectedItem.projectName}</span>
            )}
          </div>
          <h3 className="text-xs font-semibold leading-tight">{selectedItem.title}</h3>
          <p className="text-[9px] text-muted-foreground mt-1">{selectedItem.explanation}</p>
        </div>

        {/* Impact */}
        {selectedItem.impactSummary && (
          <ContextSection icon={AlertTriangle} label="Impact if Approved" color="text-status-amber">
            <p className="text-[9px] text-foreground/80">{selectedItem.impactSummary}</p>
          </ContextSection>
        )}

        {/* Evidence summary */}
        <ContextSection icon={FileSearch} label="Evidence" color="text-primary">
          <div className="space-y-1">
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
            <Badge variant={selectedItem.riskLevel === "critical" ? "destructive" : "outline"} className="text-[8px] px-1.5 py-0 h-4">
              {selectedItem.riskLevel.toUpperCase()}
            </Badge>
            <span className="text-[8px] text-muted-foreground">
              {selectedItem.riskLevel === "critical" ? "Requires immediate attention" :
               selectedItem.riskLevel === "high" ? "Review carefully before deciding" :
               "Standard review flow"}
            </span>
          </div>
        </ContextSection>
      </div>
    </ScrollArea>
  );
}

function ContextSection({ icon: Icon, label, color, children }: {
  icon: typeof FileText;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/20 rounded-lg bg-card/30 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

function EvidenceRow({ icon: Icon, label, available }: { icon: typeof FileText; label: string; available: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${available ? "text-status-green" : "text-muted-foreground/30"}`} />
      <span className={`text-[9px] ${available ? "text-foreground" : "text-muted-foreground/40"}`}>{label}</span>
      {available && <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 border-status-green/30 text-status-green">✓</Badge>}
    </div>
  );
}
