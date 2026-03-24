import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Stamp,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  BookOpen,
  Globe,
  GraduationCap,
  FileSearch,
  ChevronRight,
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

export function DecisionCard({ item, isSelected, onSelect, onNavigate }: DecisionCardProps) {
  const config = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.approval;
  const Icon = config.icon;

  return (
    <Card
      onClick={onSelect}
      className={`
        cursor-pointer transition-all duration-200
        border-border/30 hover:border-primary/30
        ${isSelected ? "border-primary/50 bg-surface-glass" : "bg-card/40"}
        ${item.riskLevel === "critical" ? "border-l-2 border-l-status-red" : ""}
        ${item.riskLevel === "high" ? "border-l-2 border-l-status-amber" : ""}
      `}
    >
      <CardContent className="p-2.5">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${
            item.riskLevel === "critical" ? "bg-status-red/10" :
            item.riskLevel === "high" ? "bg-status-amber/10" : "bg-muted/50"
          }`}>
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/30">
                {config.label}
              </Badge>
              {item.projectName && (
                <span className="text-[7px] font-mono text-muted-foreground truncate">{item.projectName}</span>
              )}
              {item.riskLevel === "critical" && (
                <Badge variant="destructive" className="text-[6px] px-1 py-0 h-3">CRITICAL</Badge>
              )}
              {item.riskLevel === "high" && (
                <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 border-status-amber/30 text-status-amber">HIGH</Badge>
              )}
            </div>

            <p className="text-[10px] font-medium leading-tight line-clamp-2">{item.title}</p>
            <p className="text-[8px] text-muted-foreground mt-0.5 line-clamp-1">{item.explanation}</p>

            {/* Bottom row */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[7px] font-mono text-muted-foreground">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </span>
              {item.evidenceCount > 0 && (
                <Badge variant="outline" className="text-[6px] px-1 py-0 h-3 border-border/30">
                  {item.evidenceCount} evidence
                </Badge>
              )}
              {item.impactSummary && (
                <span className="text-[7px] text-muted-foreground/70 truncate flex-1">{item.impactSummary}</span>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              size="sm"
              className="h-5 text-[8px] px-2"
              onClick={(e) => { e.stopPropagation(); onNavigate(); }}
            >
              Open
            </Button>
            <ChevronRight className="h-3 w-3 text-muted-foreground/20 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
