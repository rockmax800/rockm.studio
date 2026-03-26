/**
 * Planning Package Summary — compact, founder-readable audit view
 * of upstream planning quality for a project.
 *
 * Queries canonical planning tables (blueprint_modules, dependency_edges,
 * clarification_snapshots, cto_backlog_cards, ai_task_drafts).
 * When data is unavailable, shows an honest "not yet persisted" state.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, AlertTriangle, Layers, GitBranch,
  ClipboardList, Cpu, Target, Shield, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanningPackageSummaryProps {
  blueprintContractId: string | null;
  intakeRequestId: string | null;
}

interface PlanningData {
  clarification: { completed: boolean; projectType: string } | null;
  moduleCount: number;
  retainedInMvp: number;
  deferredCount: number;
  edgeCount: number;
  noteCount: number;
  backlogCardCount: number;
  taskDraftCount: number;
}

function usePlanningData(blueprintContractId: string | null, intakeRequestId: string | null) {
  return useQuery<PlanningData>({
    queryKey: ["planning-package", blueprintContractId, intakeRequestId],
    enabled: !!(blueprintContractId || intakeRequestId),
    queryFn: async () => {
      const result: PlanningData = {
        clarification: null,
        moduleCount: 0,
        retainedInMvp: 0,
        deferredCount: 0,
        edgeCount: 0,
        noteCount: 0,
        backlogCardCount: 0,
        taskDraftCount: 0,
      };

      // Clarification
      if (intakeRequestId) {
        const { data } = await (supabase as any)
          .from("clarification_snapshots")
          .select("completed, project_type")
          .eq("intake_request_id", intakeRequestId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          result.clarification = { completed: data.completed, projectType: data.project_type };
        }
      }

      if (blueprintContractId) {
        // Modules
        const { data: modules } = await (supabase as any)
          .from("blueprint_modules")
          .select("id, retained_in_mvp")
          .eq("blueprint_contract_id", blueprintContractId);
        result.moduleCount = modules?.length ?? 0;
        result.retainedInMvp = modules?.filter((m: any) => m.retained_in_mvp).length ?? 0;
        result.deferredCount = result.moduleCount - result.retainedInMvp;

        // Edges
        const { count: edgeCount } = await (supabase as any)
          .from("blueprint_dependency_edges")
          .select("id", { count: "exact", head: true })
          .eq("blueprint_contract_id", blueprintContractId);
        result.edgeCount = edgeCount ?? 0;

        // Notes
        const { count: noteCount } = await (supabase as any)
          .from("blueprint_optimization_notes")
          .select("id", { count: "exact", head: true })
          .eq("blueprint_contract_id", blueprintContractId);
        result.noteCount = noteCount ?? 0;

        // Backlog cards
        const { data: cards } = await (supabase as any)
          .from("cto_backlog_cards")
          .select("id")
          .eq("blueprint_contract_id", blueprintContractId);
        result.backlogCardCount = cards?.length ?? 0;

        // Task drafts (via backlog cards)
        if (cards && cards.length > 0) {
          const cardIds = cards.map((c: any) => c.id);
          const { count: taskCount } = await (supabase as any)
            .from("ai_task_drafts")
            .select("id", { count: "exact", head: true })
            .in("backlog_card_id", cardIds);
          result.taskDraftCount = taskCount ?? 0;
        }
      }

      return result;
    },
  });
}

export function PlanningPackageSummary({ blueprintContractId, intakeRequestId }: PlanningPackageSummaryProps) {
  const { data, isLoading } = usePlanningData(blueprintContractId, intakeRequestId);

  const hasAnyData = data && (
    data.clarification !== null ||
    data.moduleCount > 0 ||
    data.backlogCardCount > 0 ||
    data.taskDraftCount > 0
  );

  return (
    <div className="space-y-3">
      {/* Honest state label */}
      {!hasAnyData && !isLoading && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
          <Info className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground">
              Not yet persisted on this branch
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Planning artifacts (clarification, decomposition, backlog) are generated during the Company Lead session.
              Once canonical persistence is connected, planning quality data will appear here automatically.
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="h-16 flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {hasAnyData && data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {/* Clarification */}
          <GateCell
            icon={Target}
            label="Clarification"
            value={data.clarification?.completed ? "Complete" : data.clarification ? "Incomplete" : "—"}
            status={data.clarification?.completed ? "pass" : data.clarification ? "warn" : "none"}
            detail={data.clarification?.projectType ? `Type: ${data.clarification.projectType}` : undefined}
          />

          {/* Module Map */}
          <GateCell
            icon={Layers}
            label="Module Map"
            value={data.moduleCount > 0 ? `${data.moduleCount} modules` : "—"}
            status={data.moduleCount > 0 ? "pass" : "none"}
            detail={data.deferredCount > 0 ? `${data.retainedInMvp} in MVP · ${data.deferredCount} deferred` : undefined}
          />

          {/* Dependency Graph */}
          <GateCell
            icon={GitBranch}
            label="Dependencies"
            value={data.edgeCount > 0 ? `${data.edgeCount} edges` : data.moduleCount <= 1 ? "N/A" : "—"}
            status={data.edgeCount > 0 ? "pass" : data.moduleCount <= 1 ? "pass" : "none"}
          />

          {/* MVP Reduction */}
          <GateCell
            icon={Shield}
            label="MVP Reduction"
            value={data.deferredCount > 0 ? `${data.deferredCount} deferred` : data.moduleCount > 0 ? "Full scope" : "—"}
            status={data.moduleCount > 0 ? "pass" : "none"}
            detail={data.noteCount > 0 ? `${data.noteCount} optimization notes` : undefined}
          />

          {/* CTO Backlog */}
          <GateCell
            icon={ClipboardList}
            label="CTO Backlog"
            value={data.backlogCardCount > 0 ? `${data.backlogCardCount} cards` : "—"}
            status={data.backlogCardCount > 0 ? "pass" : "none"}
          />

          {/* AI Task Drafts */}
          <GateCell
            icon={Cpu}
            label="Task Drafts"
            value={data.taskDraftCount > 0 ? `${data.taskDraftCount} tasks` : "—"}
            status={data.taskDraftCount > 0 ? "pass" : "none"}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[9px] text-muted-foreground/40">
          Intent Plane artifact · planning quality audit · does not affect Delivery state
        </span>
      </div>
    </div>
  );
}

/* ── Gate Cell ── */

type GateStatus = "pass" | "warn" | "none";

function GateCell({
  icon: Icon,
  label,
  value,
  status,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  status: GateStatus;
  detail?: string;
}) {
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2.5",
      status === "pass" && "border-status-green/20 bg-status-green/[0.03]",
      status === "warn" && "border-status-amber/20 bg-status-amber/[0.03]",
      status === "none" && "border-border bg-muted/20",
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {status === "pass" ? (
          <CheckCircle2 className="h-3 w-3 text-status-green" />
        ) : status === "warn" ? (
          <AlertTriangle className="h-3 w-3 text-status-amber" />
        ) : (
          <Icon className="h-3 w-3 text-muted-foreground/40" />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <span className={cn(
        "text-[12px] font-bold font-mono",
        status === "pass" ? "text-foreground" : status === "warn" ? "text-status-amber" : "text-muted-foreground/50",
      )}>
        {value}
      </span>
      {detail && (
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{detail}</p>
      )}
    </div>
  );
}
