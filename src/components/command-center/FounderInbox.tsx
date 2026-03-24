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

const RISK_BORDER = {
  high: "border-l-status-red",
  normal: "border-l-status-amber",
};

export function FounderInbox({ items }: FounderInboxProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
          Founder Inbox
        </h2>
        <div className="flex items-center gap-1.5">
          {items.length > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-status-red/10 text-status-red border-status-red/30">
              {items.length}
            </Badge>
          )}
          <Link to="/founder">
            <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5 text-muted-foreground px-1.5">
              All <ChevronRight className="h-2.5 w-2.5" />
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
          <div className="h-8 w-8 rounded-full bg-status-green/10 flex items-center justify-center">
            <Check className="h-4 w-4 text-status-green" />
          </div>
          <p className="text-xs font-medium text-status-green">All clear ✓</p>
          <p className="text-[9px] text-muted-foreground">No pending decisions</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-1.5">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  className={`rounded-md border border-border/50 border-l-[3px] ${RISK_BORDER[item.riskLevel]} bg-surface-raised hover:bg-surface-glass transition-colors group`}
                >
                  <div className="p-2.5">
                    <div className="flex items-start gap-2">
                      <div
                        className={`h-6 w-6 rounded flex items-center justify-center shrink-0 ${
                          item.riskLevel === "high"
                            ? "bg-status-red/15 text-status-red"
                            : "bg-status-amber/15 text-status-amber"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {item.projectName && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/40 font-medium">
                              {item.projectName}
                            </Badge>
                          )}
                          <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">
                            {item.category}
                          </span>
                          {item.riskLevel === "high" && (
                            <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3 font-bold">
                              HIGH
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-semibold leading-tight line-clamp-2 text-foreground">
                          {item.title}
                        </p>
                        {item.impactSummary && (
                          <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
                            Impact: {item.impactSummary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[8px] font-mono text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                          </span>
                          {item.evidenceCount !== undefined && item.evidenceCount > 0 && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/50">
                              {item.evidenceCount} evidence
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-2 pl-8">
                      <Link to={item.linkTo}>
                        <Button size="sm" className="h-5 text-[9px] gap-0.5 px-2 bg-status-green/15 text-status-green hover:bg-status-green/25 border-0">
                          <Check className="h-2.5 w-2.5" /> Approve
                        </Button>
                      </Link>
                      <Link to={item.linkTo}>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5 px-2 text-status-red hover:bg-status-red/10">
                          <X className="h-2.5 w-2.5" /> Reject
                        </Button>
                      </Link>
                      <Link to={item.linkTo} className="ml-auto">
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] gap-0.5 px-1.5 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-2.5 w-2.5" /> Open
                        </Button>
                      </Link>
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
