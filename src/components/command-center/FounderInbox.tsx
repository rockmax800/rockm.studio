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
  Inbox,
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
      {/* Header — heavier than siblings */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-section-title text-foreground">Decisions</h3>
          {items.length > 0 && (
            <span className="ds-badge bg-status-red/10 text-status-red">{items.length}</span>
          )}
        </div>
        <Link to="/founder">
          <Button variant="ghost" size="sm" className="h-7 text-[13px] gap-1 text-muted-foreground hover:text-foreground">
            All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-[13px] text-muted-foreground">
          <Inbox className="h-3.5 w-3.5" />
          <span>No pending decisions</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-1.5">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className="flex rounded-[12px] border border-border overflow-hidden hover:shadow-elevated transition-shadow duration-180"
                >
                  {/* Left risk strip — strong visual anchor */}
                  <div className={`w-1 shrink-0 ${RISK_STRIP[item.riskLevel]}`} />

                  <div className="flex-1 px-3 py-2.5 min-w-0">
                    <div className="flex items-start gap-2">
                      <div
                        className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          item.riskLevel === "high"
                            ? "bg-status-red/8 text-status-red"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Meta */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {item.projectName && (
                            <span className="text-[12px] font-medium text-muted-foreground truncate max-w-[120px]">
                              {item.projectName}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground/50">·</span>
                          <span className="text-[11px] text-muted-foreground/60">{item.category}</span>
                          {item.riskLevel === "high" && (
                            <span className="ds-badge bg-status-red/10 text-status-red text-[10px] ml-auto">
                              HIGH
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <p className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">
                          {item.title}
                        </p>

                        {/* Impact */}
                        {item.impactSummary && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                            {item.impactSummary}
                          </p>
                        )}

                        {/* Footer row: age + evidence + actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                          {item.evidenceCount !== undefined && item.evidenceCount > 0 && (
                            <span className="ds-badge bg-muted text-muted-foreground text-[10px]">
                              {item.evidenceCount} ev
                            </span>
                          )}

                          <div className="flex-1" />

                          {/* Inline actions */}
                          <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="h-6 px-2 text-[11px] font-medium bg-status-green/10 text-status-green hover:bg-status-green/15 border-0 rounded-md"
                            >
                              <Check className="h-3 w-3 mr-0.5" /> Approve
                            </Button>
                          </Link>
                          <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px] font-medium text-status-red hover:bg-status-red/5 rounded-md"
                            >
                              <X className="h-3 w-3 mr-0.5" /> Reject
                            </Button>
                          </Link>
                          <Link to={item.linkTo}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-md"
                            >
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
