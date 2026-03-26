import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { ClarificationFields, ProjectType, PriorityAxis } from "@/lib/company-lead-clarification";
import {
  CLARIFICATION_FIELD_META,
  isFieldComplete,
  getClarificationStatus,
} from "@/lib/company-lead-clarification";

interface ClarificationChecklistProps {
  fields: ClarificationFields;
  onFieldChange: (key: keyof ClarificationFields, value: any) => void;
  onMarkComplete: () => void;
  isLocked: boolean; // true once founder marks clarification complete
}

export function ClarificationChecklist({
  fields,
  onFieldChange,
  onMarkComplete,
  isLocked,
}: ClarificationChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const status = getClarificationStatus(fields);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] animate-slide-up">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {status.isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-status-amber" />
          )}
          <span className="text-[12px] font-bold tracking-tight text-foreground">
            Clarification Loop
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
            {status.completedCount}/{status.totalCount}
          </span>
          {isLocked && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
              COMPLETE
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Gate notice */}
          {!status.isComplete && !isLocked && (
            <div className="rounded-xl px-3 py-2 text-[11px] bg-status-amber/8 border border-status-amber/20 text-status-amber">
              <strong>Blueprint cannot be created before clarification is complete.</strong>
              <br />
              {status.missingFields.length} field{status.missingFields.length > 1 ? "s" : ""} remaining.
            </div>
          )}

          {/* Field checklist */}
          <div className="space-y-2">
            {CLARIFICATION_FIELD_META.map((meta) => {
              const complete = isFieldComplete(fields, meta.key);
              return (
                <FieldRow
                  key={meta.key}
                  meta={meta}
                  value={fields[meta.key]}
                  complete={complete}
                  locked={isLocked}
                  onChange={(val) => onFieldChange(meta.key, val)}
                />
              );
            })}
          </div>

          {/* Inferred values notice */}
          {!isLocked && (
            <p className="text-[10px] text-muted-foreground/60 italic px-1">
              Values may be inferred from conversation. Review and correct before confirming.
            </p>
          )}

          {/* Mark complete button */}
          {!isLocked && (
            <button
              onClick={onMarkComplete}
              disabled={!status.isComplete}
              className={cn(
                "w-full h-9 rounded-xl text-[12px] font-bold transition-all",
                status.isComplete
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              )}
            >
              {status.isComplete
                ? "Confirm Clarification Complete"
                : `${status.missingFields.length} field${status.missingFields.length > 1 ? "s" : ""} missing`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual field row ── */

function FieldRow({
  meta,
  value,
  complete,
  locked,
  onChange,
}: {
  meta: (typeof CLARIFICATION_FIELD_META)[number];
  value: any;
  complete: boolean;
  locked: boolean;
  onChange: (val: any) => void;
}) {
  const { key, label, description } = meta;

  return (
    <div className="rounded-xl px-3 py-2.5 border border-border bg-muted/30">
      <div className="flex items-start gap-2">
        {complete ? (
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        ) : (
          <Circle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
            {complete && value !== null && value !== undefined && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                Suggested by system
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mb-1.5">{description}</p>

          {/* Input based on field type */}
          {locked ? (
            <LockedValue value={value} fieldKey={key} />
          ) : (
            <EditableField fieldKey={key} value={value} onChange={onChange} />
          )}
        </div>
      </div>
    </div>
  );
}

function EditableField({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: keyof ClarificationFields;
  value: any;
  onChange: (val: any) => void;
}) {
  if (fieldKey === "projectType") {
    return (
      <div className="flex gap-1.5">
        {(["mvp", "production", "experimental"] as ProjectType[]).map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
              value === opt
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {opt.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (fieldKey === "priorityAxis") {
    return (
      <div className="flex gap-1.5">
        {(["speed", "scalability", "budget"] as PriorityAxis[]).map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
              value === opt
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>
    );
  }

  if (fieldKey === "scopeOptimizationPreference") {
    return (
      <div className="flex gap-1.5">
        {[
          { val: true, label: "Yes — suggest reductions" },
          { val: false, label: "No — keep full scope" },
        ].map((opt) => (
          <button
            key={String(opt.val)}
            onClick={() => onChange(opt.val)}
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
              value === opt.val
                ? "bg-primary/10 border-primary text-primary"
                : "bg-muted border-border text-muted-foreground hover:border-primary/30"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // Text fields
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Enter ${fieldKey === "projectGoal" ? "project goal" : fieldKey === "constraints" ? "constraints" : fieldKey === "integrationsOrStack" ? "integrations or stack" : "timeline"}...`}
      className="w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
    />
  );
}

function LockedValue({ value, fieldKey }: { value: any; fieldKey: keyof ClarificationFields }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[11px] text-muted-foreground/40 italic">Not set</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className="text-[11px] font-medium text-foreground/80">
        {value ? "Yes — suggest reductions" : "No — keep full scope"}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-foreground/80">
      {typeof value === "string" && ["mvp", "production", "experimental"].includes(value)
        ? value.toUpperCase()
        : String(value)}
    </span>
  );
}
