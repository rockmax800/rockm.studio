import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stamp, AlertTriangle, Rocket, ShieldAlert, BookOpen, Globe, GraduationCap,
  FileSearch, CheckCircle, XCircle, ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface DecisionItem {
  id: string;
  category: "blueprint_approval" | "estimate_approval" | "review_escalation" | "deploy_production" | "risk_acknowledgement" | "learning_promotion" | "domain_binding" | "approval" | "escalation" | "risk";
  projectName?: string;
  entityType: string;
  title: string;
  explanation: string;
  riskLevel: "critical" | "high" | "normal";
  evidenceCount: number;
  impactSummary?: string;
  timestamp: string;
  linkTo: string;
}

interface DecisionCardProps {
  item: DecisionItem;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Stamp; label: string; color: string }> = {
  blueprint_approval: { icon: BookOpen, label: "Blueprint", color: "text-primary" },
  estimate_approval: { icon: FileSearch, label: "Estimate", color: "text-status-cyan" },
  review_escalation: { icon: AlertTriangle, label: "Escalation", color: "text-status-red" },
  deploy_production: { icon: Rocket, label: "Deploy", color: "text-status-cyan" },
  risk_acknowledgement: { icon: ShieldAlert, label: "Risk", color: "text-status-red" },
  learning_promotion: { icon: GraduationCap, label: "Promotion", color: "text-lifecycle-review" },
  domain_binding: { icon: Globe, label: "Domain", color: "text-status-green" },
  approval: { icon: Stamp, label: "Approval", color: "text-status-amber" },
  escalation: { icon: AlertTriangle, label: "Escalation", color: "text-status-red" },
  risk: { icon: ShieldAlert, label: "Risk", color: "text-status-red" },
};

const SEVERITY_STRIP: Record<string, string> = {
  critical: "border-l-[4px] border-l-status-red",
  high: "border-l-[4px] border-l-status-amber",
  normal: "border-l-[4px] border-l-border",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-status-red/[0.03]",
  high: "bg-status-amber/[0.02]",
  normal: "bg-card",
};

export function DecisionCard({ item, isSelected, onSelect, onNavigate }: DecisionCardProps) {
  const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.approval;
  const Icon = config.icon;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative cursor-pointer transition-all duration-150
        rounded-[12px] border border-border
        hover:shadow-elevated hover:-translate-y-px
        ${SEVERITY_STRIP[item.riskLevel]}
        ${isSelected ? "ring-1 ring-primary/40 bg-primary/[0.03]" : SEVERITY_BG[item.riskLevel]}
      `}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Icon block */}
        <div className={`h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 ${
          item.riskLevel === "critical" ? "bg-status-red/10" :
          item.riskLevel === "high" ? "bg-status-amber/10" : "bg-secondary"
        }`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top meta row */}
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border font-semibold">
              {config.label}
            </Badge>
            {item.projectName && (
              <span className="text-[11px] font-mono text-muted-foreground truncate">{item.projectName}</span>
            )}
            {item.riskLevel === "critical" && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold">CRITICAL</Badge>
            )}
            {item.riskLevel === "high" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-status-amber/40 text-status-amber font-bold">HIGH</Badge>
            )}
          </div>

          {/* Title */}
          <p className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2">{item.title}</p>

          {/* Explanation */}
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{item.explanation}</p>

          {/* Impact summary */}
          {item.impactSummary && (
            <div className="flex items-start gap-1 mt-1.5 px-2 py-1 rounded-lg bg-secondary/60 border border-border/50">
              <AlertTriangle className="h-3 w-3 text-status-amber shrink-0 mt-0.5" />
              <span className="text-[11px] text-foreground/80 leading-snug">{item.impactSummary}</span>
            </div>
          )}

          {/* Bottom row */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
            {item.evidenceCount > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <FileSearch className="h-3 w-3" />
                <span className="font-mono">{item.evidenceCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-bold"
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          >
            <CheckCircle className="h-3 w-3" /> Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-3 gap-1 rounded-lg"
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          >
            <XCircle className="h-3 w-3" /> Reject
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 gap-1 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          >
            <ExternalLink className="h-2.5 w-2.5" /> Open
          </Button>
        </div>
      </div>
    </div>
  );
}
