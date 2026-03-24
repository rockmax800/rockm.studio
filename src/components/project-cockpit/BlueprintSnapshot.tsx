import { ChevronDown, ChevronUp, FileText, HelpCircle, AlertTriangle, Clock, Target, Shield } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface BlueprintSnapshotProps {
  purpose: string;
  founderNotes?: string | null;
  currentPhase?: string | null;
  updatedAt: string;
  acceptanceCriteriaCount: number;
  openQuestionsCount: number;
  riskLevel: "low" | "medium" | "high";
}

const RISK_COLORS = {
  low: "text-status-green",
  medium: "text-status-amber",
  high: "text-status-red",
};

export function BlueprintSnapshot({
  purpose,
  founderNotes,
  currentPhase,
  updatedAt,
  acceptanceCriteriaCount,
  openQuestionsCount,
  riskLevel,
}: BlueprintSnapshotProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-card-title text-foreground">Blueprint</h3>
          {currentPhase && (
            <span className="ds-badge bg-muted text-muted-foreground">{currentPhase}</span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Goal */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium text-muted-foreground">Goal</span>
        </div>
        <p className="text-[14px] leading-relaxed text-foreground line-clamp-3">{purpose}</p>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 py-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[13px] font-mono font-bold text-foreground">{acceptanceCriteriaCount}</span>
          <span className="text-[12px] text-muted-foreground">criteria</span>
        </div>
        {openQuestionsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-status-amber" />
            <span className="text-[13px] font-mono font-bold text-status-amber">{openQuestionsCount}</span>
            <span className="text-[12px] text-status-amber">open</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Shield className={`h-3.5 w-3.5 ${RISK_COLORS[riskLevel]}`} />
          <span className={`text-[13px] font-medium ${RISK_COLORS[riskLevel]}`}>{riskLevel} risk</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expanded: Founder Notes */}
      {expanded && founderNotes && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[12px] font-medium text-muted-foreground block mb-1">Founder Notes</span>
          <p className="text-[13px] text-foreground leading-relaxed">{founderNotes}</p>
        </div>
      )}
    </div>
  );
}
