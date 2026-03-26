import type { CtoHandoffContract } from "@/types/cto-handoff";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, FileText, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CtoHandoffCardProps {
  contract: CtoHandoffContract;
  /** Compact mode for embedding in IntakeComposer sidebar */
  compact?: boolean;
}

const CHECK_ITEMS: { key: keyof CtoHandoffContract; label: string }[] = [
  { key: "clarificationComplete", label: "Clarification complete" },
  { key: "modulesPresent", label: "Modules defined" },
  { key: "dependencyGraphPresent", label: "Dependency graph" },
  { key: "mvpReductionComplete", label: "MVP reduction" },
  { key: "approvedByFounder", label: "Blueprint approved" },
  { key: "backlogCardsPresent", label: "CTO backlog cards" },
  { key: "taskDraftsPresent", label: "AI task drafts" },
];

export function CtoHandoffCard({ contract, compact = false }: CtoHandoffCardProps) {
  const blockers = contract.missingItems.filter((m) => m.severity === "blocker");
  const warnings = contract.missingItems.filter((m) => m.severity === "warning");
  const ready = contract.readyForEngineering;

  return (
    <div className={cn(
      "rounded-xl border",
      ready
        ? "border-status-green/30 bg-status-green/[0.03]"
        : blockers.length > 0
          ? "border-destructive/25 bg-destructive/[0.02]"
          : "border-status-amber/25 bg-status-amber/[0.02]",
      compact ? "p-3" : "p-4",
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center shrink-0",
          ready ? "bg-status-green/15" : blockers.length > 0 ? "bg-destructive/10" : "bg-status-amber/10",
        )}>
          {ready
            ? <CheckCircle2 className="h-3.5 w-3.5 text-status-green" />
            : blockers.length > 0
              ? <XCircle className="h-3.5 w-3.5 text-destructive" />
              : <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />}
        </div>
        <span className={cn("font-bold tracking-tight", compact ? "text-[12px]" : "text-[13px]")}>
          CTO Handoff Contract
        </span>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-[9px] font-mono uppercase tracking-wider border-none",
            ready ? "bg-status-green/10 text-status-green" : "bg-muted text-muted-foreground",
          )}
        >
          {ready ? "Ready" : blockers.length > 0 ? `${blockers.length} blocker(s)` : "Warnings"}
        </Badge>
      </div>

      {/* Checklist */}
      <div className={cn("space-y-1", compact ? "mb-2" : "mb-3")}>
        {CHECK_ITEMS.map((item) => {
          const value = contract[item.key];
          const passed = Boolean(value);
          const missing = contract.missingItems.find((m) => m.key === item.key.replace(/Present$|Complete$/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, ""));
          const isBlocker = missing?.severity === "blocker";

          return (
            <div key={item.key} className="flex items-center gap-2">
              {passed ? (
                <CheckCircle2 className="h-3 w-3 text-status-green shrink-0" />
              ) : isBlocker ? (
                <XCircle className="h-3 w-3 text-destructive shrink-0" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-status-amber shrink-0" />
              )}
              <span className={cn(
                "text-[11px]",
                passed ? "text-muted-foreground" : isBlocker ? "text-destructive font-medium" : "text-status-amber",
              )}>
                {item.label}
                {item.key === "modulesPresent" && passed && (
                  <span className="text-muted-foreground/50 ml-1">({contract.moduleCount})</span>
                )}
                {item.key === "backlogCardsPresent" && passed && (
                  <span className="text-muted-foreground/50 ml-1">({contract.backlogCardCount})</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Missing items detail */}
      {!ready && blockers.length > 0 && !compact && (
        <div className="space-y-1.5 pt-2 border-t border-border/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/60">Missing for CTO Engineering</span>
          {blockers.map((item) => (
            <div key={item.key} className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{item.label}:</span> {item.detail}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && !compact && (
        <div className="space-y-1 pt-2 border-t border-border/20 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-status-amber/60">Warnings</span>
          {warnings.map((item) => (
            <div key={item.key} className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{item.label}:</span> {item.detail}
            </div>
          ))}
        </div>
      )}

      {/* Ready state */}
      {ready && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-status-green/15">
          <Cpu className="h-3 w-3 text-status-green" />
          <span className="text-[10px] font-semibold text-status-green">Ready for CTO decomposition</span>
          <ArrowRight className="h-2.5 w-2.5 text-status-green ml-auto" />
        </div>
      )}

      {/* Planning artifact label */}
      <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/10">
        <FileText className="h-2.5 w-2.5 text-muted-foreground/30" />
        <span className="text-[9px] text-muted-foreground/30 font-mono">Planning artifact · Intent Plane</span>
      </div>
    </div>
  );
}
