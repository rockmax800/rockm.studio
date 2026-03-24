import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileText, HelpCircle, AlertTriangle, Clock } from "lucide-react";
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
    <Card className="border-border/30 bg-card/50">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blueprint
            </span>
            {currentPhase && (
              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-border/40">
                {currentPhase}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        <p className="text-[10px] leading-relaxed text-foreground/90 line-clamp-2">{purpose}</p>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <FileText className="h-2.5 w-2.5" />
            <span>{acceptanceCriteriaCount} criteria</span>
          </div>
          {openQuestionsCount > 0 && (
            <div className="flex items-center gap-1 text-[8px] text-status-amber">
              <HelpCircle className="h-2.5 w-2.5" />
              <span>{openQuestionsCount} open</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
          </div>
          {riskLevel !== "low" && (
            <div className="flex items-center gap-1 text-[8px] text-status-red">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>{riskLevel} risk</span>
            </div>
          )}
        </div>

        {expanded && founderNotes && (
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground mb-0.5">Founder Notes</p>
            <p className="text-[10px] text-foreground/80">{founderNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
