// CTO → Lead/Founder clarification request card.
// Shows open requests with resolution controls.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquareWarning, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  AlertTriangle, Info, Cpu,
} from "lucide-react";
import type { ClarificationRequest, ClarificationRequestStatus } from "@/types/clarification-request";

interface ClarificationRequestCardProps {
  requests: ClarificationRequest[];
  onResolve: (id: string, note: string) => void;
  onDismiss: (id: string) => void;
  /** If true, show "create new" form */
  showCreateForm?: boolean;
  onCreateRequest?: (moduleId: string, moduleName: string, ambiguity: string, requested: string) => void;
  availableModules?: { id: string; name: string }[];
}

const STATUS_CONFIG: Record<ClarificationRequestStatus, {
  label: string;
  badge: string;
}> = {
  open: { label: "Open", badge: "bg-status-amber/10 text-status-amber border-status-amber/20" },
  resolved: { label: "Resolved", badge: "bg-status-green/10 text-status-green border-status-green/20" },
  dismissed: { label: "Dismissed", badge: "bg-muted text-muted-foreground border-border" },
};

export function ClarificationRequestCard({
  requests, onResolve, onDismiss, showCreateForm, onCreateRequest, availableModules,
}: ClarificationRequestCardProps) {
  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      {openCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-status-amber/20 bg-status-amber/5">
          <MessageSquareWarning className="h-3.5 w-3.5 text-status-amber shrink-0" />
          <span className="text-[11px] font-bold text-status-amber">
            {openCount} clarification request{openCount !== 1 ? "s" : ""} from CTO
          </span>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-4">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground/50">No clarification requests</p>
        </div>
      )}

      {/* Request list */}
      {requests.map((req) => (
        <RequestRow key={req.id} request={req} onResolve={onResolve} onDismiss={onDismiss} />
      ))}

      {/* Create form */}
      {showCreateForm && onCreateRequest && availableModules && availableModules.length > 0 && (
        <CreateRequestForm modules={availableModules} onCreate={onCreateRequest} />
      )}

      {/* Honesty note */}
      <div className="flex items-start gap-1.5 pt-1">
        <Info className="h-3 w-3 text-muted-foreground/30 mt-0.5 shrink-0" />
        <span className="text-[10px] text-muted-foreground/40 leading-snug">
          CTO may request clarification but cannot mutate approved scope. Scope changes require a new blueprint version approved by founder.
        </span>
      </div>
    </div>
  );
}

/* ── Request Row ── */

function RequestRow({ request: req, onResolve, onDismiss }: {
  request: ClarificationRequest;
  onResolve: (id: string, note: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(req.status === "open");
  const [resolveNote, setResolveNote] = useState("");
  const config = STATUS_CONFIG[req.status];

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      req.status === "open" ? "border-status-amber/20 bg-status-amber/[0.02]" : "border-border/40 bg-card",
    )}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        {expanded
          ? <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        }
        <Cpu className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
        <span className="text-[11px] font-semibold text-foreground truncate flex-1">
          {req.affectedModuleName}
        </span>
        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", config.badge)}>
          {config.label}
        </Badge>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-border/20 pt-2">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ambiguity</span>
            <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed">{req.ambiguityDescription}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Requested Clarification</span>
            <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed">{req.requestedClarification}</p>
          </div>

          {req.status === "open" && (
            <div className="space-y-2 pt-1">
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Resolution note (what was clarified)…"
                className="w-full text-[11px] rounded-lg border border-border bg-background px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-[10px] gap-1"
                  disabled={!resolveNote.trim()}
                  onClick={() => { onResolve(req.id, resolveNote.trim()); setResolveNote(""); }}
                >
                  <CheckCircle2 className="h-3 w-3" /> Resolve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => onDismiss(req.id)}
                >
                  <XCircle className="h-3 w-3" /> Dismiss
                </Button>
              </div>
            </div>
          )}

          {req.status === "resolved" && req.resolverNote && (
            <div className="rounded-lg bg-status-green/5 border border-status-green/20 px-3 py-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-status-green">Resolution</span>
              <p className="text-[10px] text-foreground/70 mt-0.5">{req.resolverNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Create Request Form ── */

function CreateRequestForm({ modules, onCreate }: {
  modules: { id: string; name: string }[];
  onCreate: (moduleId: string, moduleName: string, ambiguity: string, requested: string) => void;
}) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [ambiguity, setAmbiguity] = useState("");
  const [requested, setRequested] = useState("");

  const selectedModule = modules.find((m) => m.id === moduleId);

  const handleSubmit = () => {
    if (!moduleId || !ambiguity.trim() || !requested.trim()) return;
    onCreate(moduleId, selectedModule?.name ?? moduleId, ambiguity.trim(), requested.trim());
    setAmbiguity("");
    setRequested("");
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-[11px] font-bold text-foreground">Request Clarification from Lead</span>
      </div>
      <select
        value={moduleId}
        onChange={(e) => setModuleId(e.target.value)}
        className="w-full text-[11px] rounded-lg border border-border bg-background px-3 py-1.5"
      >
        {modules.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <textarea
        value={ambiguity}
        onChange={(e) => setAmbiguity(e.target.value)}
        placeholder="What is ambiguous in the approved planning?"
        className="w-full text-[11px] rounded-lg border border-border bg-background px-3 py-2 min-h-[48px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <textarea
        value={requested}
        onChange={(e) => setRequested(e.target.value)}
        placeholder="What specific clarification is needed?"
        className="w-full text-[11px] rounded-lg border border-border bg-background px-3 py-2 min-h-[48px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] gap-1"
        disabled={!ambiguity.trim() || !requested.trim()}
        onClick={handleSubmit}
      >
        <MessageSquareWarning className="h-3 w-3" /> Send Clarification Request
      </Button>
    </div>
  );
}
