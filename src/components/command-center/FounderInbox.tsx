import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Stamp,
  AlertTriangle,
  Shield,
  ChevronRight,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

interface InboxItem {
  id: string;
  type: "approval" | "escalation" | "risk";
  category: string;
  title: string;
  riskLevel: "high" | "normal";
  evidenceCount?: number;
  timestamp: string;
  linkTo: string;
  projectName?: string;
  impactSummary?: string;
}

interface FounderInboxProps {
  items: InboxItem[];
}

const TYPE_ICONS = {
  approval: Stamp,
  escalation: AlertTriangle,
  risk: Shield,
};

const RISK_STRIP: Record<string, string> = {
  high: "bg-status-red",
  normal: "bg-status-amber",
};

export function FounderInbox({ items }: FounderInboxProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-title text-foreground">Decisions</h3>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <span className="ds-badge bg-status-red/10 text-status-red">{items.length}</span>
          )}
          <Link to="/founder">
            <Button variant="ghost" size="sm" className="h-7 text-[13px] gap-1 text-muted-foreground hover:text-foreground">
              All <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-secondary">
          <Check className="h-4 w-4 text-status-green" />
          <span className="text-[14px] font-medium text-foreground">All clear ✓</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div key={item.id} className="flex rounded-[12px] border border-border overflow-hidden hover:shadow-elevated transition-shadow duration-220">
                  {/* Left color strip */}
                  <div className={`w-1 shrink-0 ${RISK_STRIP[item.riskLevel]}`} />

                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start gap-2.5">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.riskLevel === "high"
                          ? "bg-status-red/8 text-status-red"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Meta row */}
                        <div className="flex items-center gap-2 mb-1">
                          {item.projectName && (
                            <span className="text-[12px] font-medium text-muted-foreground">
                              {item.projectName}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground/60">
                            {item.category}
                          </span>
                          {item.riskLevel === "high" && (
                            <span className="ds-badge bg-status-red/10 text-status-red text-[10px]">HIGH</span>
                          )}
                        </div>

                        {/* Title */}
                        <p className="text-card-title text-foreground line-clamp-2">{item.title}</p>

                        {/* Impact */}
                        {item.impactSummary && (
                          <p className="text-[13px] text-muted-foreground mt-1 line-clamp-1">
                            {item.impactSummary}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[12px] font-mono text-muted-foreground tabular-nums">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                          {item.evidenceCount !== undefined && item.evidenceCount > 0 && (
                            <span className="ds-badge bg-muted text-muted-foreground text-[10px]">
                              {item.evidenceCount} evidence
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Link to={item.linkTo}>
                            <Button size="sm" className="h-7 px-3 text-[12px] font-medium bg-status-green/10 text-status-green hover:bg-status-green/15 border-0 rounded-lg">
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          </Link>
                          <Link to={item.linkTo}>
                            <Button size="sm" variant="ghost" className="h-7 px-3 text-[12px] font-medium text-status-red hover:bg-status-red/5 rounded-lg">
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </Link>
                          <div className="flex-1" />
                          <Link to={item.linkTo}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground rounded-lg">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
