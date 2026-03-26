import { Brain, BookOpen, FileCode, Lightbulb, AlertTriangle, Pencil, Clock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface MemoryCategory {
  key: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  items: MemoryEntry[];
}

export interface MemoryEntry {
  text: string;
  desc: string;
  updated: string;
  source: "contract" | "manual" | "learning" | "correction";
  priority?: "high" | "normal" | "low";
}

interface MemorySummaryPanelProps {
  categories: MemoryCategory[];
  lastTrainingUpdate: string | null;
  hasActiveGuidance: boolean;
}

export function MemorySummaryPanel({ categories, lastTrainingUpdate, hasActiveGuidance }: MemorySummaryPanelProps) {
  const totalEntries = categories.reduce((sum, c) => sum + c.items.length, 0);
  const highPriority = categories.reduce((sum, c) => sum + c.items.filter((i) => i.priority === "high").length, 0);
  const correctionCount = categories.find((c) => c.key === "failure_corrections")?.items.length ?? 0;
  const overrideCount = categories.find((c) => c.key === "manual_overrides")?.items.length ?? 0;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-4 w-4 text-muted-foreground/50" />
        <h3 className="text-[13px] font-bold text-foreground">Memory Summary</h3>
        <Badge variant="outline" className="text-[9px] ml-auto font-mono">
          Local Draft
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCell
          label="Total Entries"
          value={totalEntries}
          icon={<Brain className="h-3 w-3" />}
        />
        <SummaryCell
          label="Last Training"
          value={lastTrainingUpdate ?? "Never"}
          icon={<Clock className="h-3 w-3" />}
          isText
        />
        <SummaryCell
          label="Guidance"
          value={hasActiveGuidance ? "Active" : "None"}
          icon={<BookOpen className="h-3 w-3" />}
          isText
          accent={hasActiveGuidance ? "text-status-green" : "text-muted-foreground/50"}
        />
        <SummaryCell
          label="Corrections"
          value={correctionCount}
          icon={<AlertTriangle className="h-3 w-3" />}
          accent={correctionCount > 0 ? "text-status-amber" : undefined}
        />
      </div>

      {/* Category breakdown */}
      <div className="mt-3 pt-3 border-t border-border/20">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground/40">{cat.icon}</span>
              <span className="text-muted-foreground/60">{cat.title}</span>
              <span className="font-mono font-bold text-foreground/80">{cat.items.length}</span>
              {cat.items.length > 0 && (
                <span className="text-[9px] text-muted-foreground/30">
                  · {cat.items[0].updated}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {(highPriority > 0 || overrideCount > 0) && (
        <div className="mt-2.5 flex items-center gap-2 text-[10px]">
          {highPriority > 0 && (
            <span className="flex items-center gap-1 text-status-amber font-medium">
              <AlertTriangle className="h-3 w-3" /> {highPriority} high-priority
            </span>
          )}
          {overrideCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground/50">
              <Pencil className="h-3 w-3" /> {overrideCount} manual override{overrideCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCell({ label, value, icon, isText, accent }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isText?: boolean;
  accent?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`font-mono font-bold text-[13px] ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
