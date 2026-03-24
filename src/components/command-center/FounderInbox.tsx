import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Stamp, AlertTriangle, Shield, ChevronRight,
  Check, X, ExternalLink, CheckCircle,
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

export function FounderInbox({ items }: FounderInboxProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-bold text-foreground tracking-tight">
            Founder Decisions
          </h2>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-full bg-destructive text-destructive-foreground text-[13px] font-bold tabular-nums">
              {items.length}
            </span>
          )}
        </div>
        <Link to="/founder">
          <Button variant="ghost" size="sm" className="h-7 text-[13px] gap-1 text-muted-foreground hover:text-foreground">
            View All <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/60 border border-border/40">
          <CheckCircle className="h-5 w-5 text-status-green" />
          <span className="text-[14px] font-medium text-foreground">All clear — no pending decisions.</span>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-2 pr-2">
          <div className="space-y-2.5">
            {items.map((item) => (
              <InboxCard key={item.id} item={item} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function InboxCard({ item }: { item: InboxItem }) {
  const Icon = TYPE_ICONS[item.type];
  const isHigh = item.riskLevel === "high";

  return (
    <div className={`
      group flex rounded-xl border overflow-hidden transition-all duration-150
      hover:shadow-md hover:-translate-y-px
      ${isHigh
        ? "border-l-[3px] border-l-destructive border-t-destructive/20 border-r-destructive/20 border-b-destructive/20 bg-destructive/[0.02]"
        : "border-l-[3px] border-l-status-amber border-t-border border-r-border border-b-border bg-card"
      }
    `}>
      <div className="flex-1 px-4 py-3.5 min-w-0">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isHigh ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
          }`}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Meta */}
            <div className="flex items-center gap-1.5 mb-1">
              {item.projectName && (
                <span className="text-[12px] font-bold text-primary/70 truncate max-w-[120px]">
                  {item.projectName}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/30">·</span>
              <span className="text-[11px] font-medium text-muted-foreground/60 capitalize">{item.category}</span>
              {isHigh && (
                <span className="ml-auto px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-wider">
                  High Risk
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">{item.title}</p>

            {/* Impact */}
            {item.impactSummary && (
              <p className="text-[12px] text-muted-foreground mt-1 line-clamp-1 leading-relaxed">{item.impactSummary}</p>
            )}

            {/* Bottom row */}
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </span>
              {item.evidenceCount !== undefined && item.evidenceCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-semibold">
                  {item.evidenceCount} evidence
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-center">
            <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" className="h-8 px-3.5 text-[12px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-lg gap-1.5">
                <Check className="h-3 w-3" /> Approve
              </Button>
            </Link>
            <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" className="h-8 px-2.5 text-[12px] font-bold text-destructive hover:bg-destructive/5 rounded-lg gap-1">
                <X className="h-3 w-3" /> Reject
              </Button>
            </Link>
            <Link to={item.linkTo}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
