/**
 * CTO Readiness Gate — founder-visible component showing whether
 * planning is mature enough for AI CTO engineering decomposition.
 *
 * Queries canonical planning tables and renders a checklist.
 * When blocked, engineering actions are visually disabled.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, Shield, Cpu, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateCtoReadiness, type CtoReadinessResult } from "@/lib/cto-readiness";

interface CtoReadinessGateProps {
  blueprintContractId: string | null;
  intakeRequestId: string | null;
  /** If true, show a compact inline version */
  compact?: boolean;
}

function useCtoReadiness(blueprintContractId: string | null, intakeRequestId: string | null) {
  return useQuery<CtoReadinessResult>({
    queryKey: ["cto-readiness", blueprintContractId, intakeRequestId],
    enabled: !!(blueprintContractId || intakeRequestId),
    queryFn: async () => {
      let clarificationComplete = false;
      let isMvpProject = false;

      if (intakeRequestId) {
        const { data } = await (supabase as any)
          .from("clarification_snapshots")
          .select("completed, project_type")
          .eq("intake_request_id", intakeRequestId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          clarificationComplete = data.completed;
          isMvpProject = data.project_type === "mvp";
        }
      }

      let moduleCount = 0;
      let edgeCount = 0;
      let deliveryMode: string | null = null;
      let blueprintApproved = false;
      let mvpReductionComplete = false;

      if (blueprintContractId) {
        const { data: modules } = await (supabase as any)
          .from("blueprint_modules")
          .select("id, retained_in_mvp, mvp_optional")
          .eq("blueprint_contract_id", blueprintContractId);
        moduleCount = modules?.length ?? 0;

        // MVP reduction is complete if all mvp_optional modules have a retained_in_mvp decision
        if (isMvpProject && modules) {
          const optionalModules = modules.filter((m: any) => m.mvp_optional);
          mvpReductionComplete = optionalModules.length === 0 ||
            optionalModules.every((m: any) => m.retained_in_mvp !== null);
        } else {
          mvpReductionComplete = true;
        }

        const { count } = await (supabase as any)
          .from("blueprint_dependency_edges")
          .select("id", { count: "exact", head: true })
          .eq("blueprint_contract_id", blueprintContractId);
        edgeCount = count ?? 0;

        // Check blueprint contract for delivery_mode
        const { data: bc } = await (supabase as any)
          .from("blueprint_contracts")
          .select("effort_band")
          .eq("id", blueprintContractId)
          .maybeSingle();
        // delivery_mode may be stored; effort_band exists as fallback indicator
        deliveryMode = bc?.delivery_mode ?? bc?.effort_band ?? null;

        // Check approval
        const { data: approval } = await (supabase as any)
          .from("approvals")
          .select("decision, state")
          .eq("target_id", blueprintContractId)
          .eq("target_type", "blueprint_contract")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        blueprintApproved = approval?.decision === "approved" &&
          (approval?.state === "decided" || approval?.state === "closed");
      }

      return validateCtoReadiness({
        clarificationComplete,
        moduleCount,
        dependencyEdgeCount: edgeCount,
        deliveryMode,
        blueprintApproved,
        mvpReductionComplete,
        isMvpProject,
      });
    },
  });
}

export function CtoReadinessGate({ blueprintContractId, intakeRequestId, compact }: CtoReadinessGateProps) {
  const { data, isLoading } = useCtoReadiness(blueprintContractId, intakeRequestId);

  if (!blueprintContractId && !intakeRequestId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-3.5 w-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] text-muted-foreground">Checking CTO readiness…</span>
      </div>
    );
  }

  if (!data) return null;

  const isReady = data.status === "ready";

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2 border",
        isReady
          ? "border-status-green/20 bg-status-green/[0.04]"
          : "border-status-amber/20 bg-status-amber/[0.04]",
      )}>
        {isReady ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0" />
        )}
        <span className={cn(
          "text-[10px] font-semibold",
          isReady ? "text-status-green" : "text-status-amber",
        )}>
          CTO Readiness: {data.passedCount}/{data.totalCount} checks passed
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 rounded-xl px-3 py-2.5 border",
        isReady
          ? "border-status-green/20 bg-status-green/[0.04]"
          : "border-status-amber/20 bg-status-amber/[0.04]",
      )}>
        <Cpu className={cn(
          "h-4 w-4 shrink-0",
          isReady ? "text-status-green" : "text-status-amber",
        )} />
        <div className="flex-1">
          <span className={cn(
            "text-[11px] font-bold",
            isReady ? "text-status-green" : "text-status-amber",
          )}>
            {isReady ? "Engineering Ready" : "Engineering Blocked"}
          </span>
          <p className="text-[9px] text-muted-foreground/60">
            {isReady
              ? "All planning prerequisites met — AI CTO can begin engineering decomposition."
              : `${data.totalCount - data.passedCount} prerequisite${data.totalCount - data.passedCount !== 1 ? "s" : ""} missing — resolve before engineering decomposition.`}
          </p>
        </div>
        <span className={cn(
          "text-[12px] font-bold font-mono",
          isReady ? "text-status-green" : "text-status-amber",
        )}>
          {data.passedCount}/{data.totalCount}
        </span>
      </div>

      {/* Checklist */}
      <div className="space-y-1">
        {data.checks.map((check) => (
          <div key={check.key} className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 border",
            check.passed
              ? "border-border/30 bg-transparent"
              : "border-destructive/15 bg-destructive/[0.03]",
          )}>
            {check.passed ? (
              <CheckCircle2 className="h-3 w-3 text-status-green shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-[10px] font-bold",
                check.passed ? "text-foreground" : "text-destructive",
              )}>
                {check.label}
              </span>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-relaxed">
                {check.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 px-1">
        <Shield className="h-3 w-3 text-muted-foreground/30" />
        <span className="text-[8px] text-muted-foreground/40">
          Intent Plane gate · AI CTO validates but does not fix · founder arbitrates
        </span>
      </div>
    </div>
  );
}
