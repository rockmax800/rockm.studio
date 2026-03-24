import { ChevronDown, ChevronUp, Target, FileText, HelpCircle, Shield, Clock } from "lucide-react";
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
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-foreground tracking-tight">Blueprint</h3>
          {currentPhase && (
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {currentPhase}
            </span>
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
          <Target className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Goal</span>
        </div>
        <p className="text-[14px] leading-relaxed text-foreground line-clamp-3">{purpose}</p>
      </div>

      {/* Compact metric strip */}
      <div className="flex items-center gap-5 py-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-muted-foreground" />
          <span className="text-[14px] font-bold font-mono text-foreground">{acceptanceCriteriaCount}</span>
          <span className="text-[11px] text-muted-foreground">criteria</span>
        </div>
        {openQuestionsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3 w-3 text-status-amber" />
            <span className="text-[14px] font-bold font-mono text-status-amber">{openQuestionsCount}</span>
            <span className="text-[11px] text-status-amber">open</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Shield className={`h-3 w-3 ${RISK_COLORS[riskLevel]}`} />
          <span className={`text-[12px] font-semibold ${RISK_COLORS[riskLevel]}`}>{riskLevel}</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px] font-mono text-muted-foreground">
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expanded */}
      {expanded && founderNotes && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Founder Notes
          </span>
          <p className="text-[13px] text-foreground leading-relaxed">{founderNotes}</p>
        </div>
      )}
    </div>
  );
}
