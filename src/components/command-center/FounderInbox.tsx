import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Stamp,
  AlertTriangle,
  Shield,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  ExternalLink,
  Inbox,
} from "lucide-react";
import { useState } from "react";

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
      {/* Header — heavyweight */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-bold text-foreground tracking-tight">Decisions</h2>
          {items.length > 0 && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-status-red text-background text-[12px] font-bold tabular-nums">
              {items.length}
            </span>
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
          <div className="space-y-2">
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
  const [open, setOpen] = useState(false);
  const Icon = TYPE_ICONS[item.type];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex rounded-[14px] border border-border overflow-hidden hover:shadow-elevated transition-shadow duration-200">
        {/* Risk strip — 3px, strong visual anchor */}
        <div className={`w-[3px] shrink-0 ${RISK_STRIP[item.riskLevel]}`} />

        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                item.riskLevel === "high"
                  ? "bg-status-red/8 text-status-red"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Meta row */}
              <div className="flex items-center gap-1.5 mb-1">
                {item.projectName && (
                  <span className="text-[12px] font-semibold text-muted-foreground truncate max-w-[140px]">
                    {item.projectName}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground/40">·</span>
                <span className="text-[11px] text-muted-foreground/60">{item.category}</span>
                {item.riskLevel === "high" && (
                  <span className="ml-auto px-1.5 py-0.5 rounded bg-status-red/10 text-status-red text-[10px] font-bold uppercase tracking-wider">
                    High Risk
                  </span>
                )}
              </div>

              {/* Title */}
              <p className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
                {item.title}
              </p>

              {/* Impact preview */}
              {item.impactSummary && (
                <p className="text-[12px] text-muted-foreground mt-1 line-clamp-1">
                  {item.impactSummary}
                </p>
              )}

              {/* Footer: age + evidence + actions */}
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </span>
                {item.evidenceCount !== undefined && item.evidenceCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                    {item.evidenceCount} ev
                  </span>
                )}

                <div className="flex-1" />

                {/* Expand */}
                <CollapsibleTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-muted-foreground hover:text-foreground rounded-md"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>

                {/* Actions */}
                <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[12px] font-semibold bg-foreground text-background hover:bg-foreground/90 border-0 rounded-lg"
                  >
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </Button>
                </Link>
                <Link to={item.linkTo} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-[12px] font-semibold text-status-red hover:bg-status-red/5 rounded-lg"
                  >
                    <X className="h-3 w-3 mr-0.5" /> Reject
                  </Button>
                </Link>
                <Link to={item.linkTo}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Expandable preview */}
          <CollapsibleContent className="mt-3 pt-3 border-t border-border">
            <div className="rounded-lg bg-secondary px-3 py-2.5">
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {item.impactSummary || "No additional context available. Open the detail view for full evidence."}
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </div>
    </Collapsible>
  );
}
