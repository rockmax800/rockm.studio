// Persistence hook for AI CTO planning artifacts.
// Reads/writes to canonical Supabase tables: engineering_slice_drafts, taskspec_drafts,
// execution_plan_drafts, cto_conformance_reports.
// Intent Plane — does NOT interact with live Delivery tasks.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EngineeringSliceDraft } from "@/types/engineering-slices";
import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { ExecutionPlanDraft, ExecutionEdge, ExecutionBatch } from "@/types/execution-plan";

// ── Key factories ──

const keys = {
  slices: (blueprintId: string) => ["cto-slices", blueprintId] as const,
  taskspecs: (blueprintId: string) => ["cto-taskspecs", blueprintId] as const,
  plan: (blueprintId: string) => ["cto-plan", blueprintId] as const,
  conformance: (projectId: string) => ["cto-conformance", projectId] as const,
};

// ── Row ↔ Domain mappers ──

function rowToSlice(row: any): EngineeringSliceDraft {
  return {
    id: row.id,
    moduleId: row.module_id,
    moduleName: row.module_name,
    businessGoal: row.business_goal,
    technicalBoundary: row.technical_boundary,
    allowedRepoAreas: row.allowed_repo_areas_json ?? [],
    expectedTouchPoints: row.expected_touch_points_json ?? [],
    expectedInterfaces: row.expected_interfaces_json ?? [],
    performanceConstraints: row.performance_constraints_json ?? [],
    testScope: row.test_scope_json ?? [],
    maxComplexityScore: row.max_complexity_score,
    executionBatch: row.execution_batch,
  };
}

function sliceToRow(s: EngineeringSliceDraft, blueprintContractId: string) {
  return {
    id: s.id,
    blueprint_contract_id: blueprintContractId,
    module_id: s.moduleId,
    module_name: s.moduleName,
    business_goal: s.businessGoal,
    technical_boundary: s.technicalBoundary,
    allowed_repo_areas_json: s.allowedRepoAreas,
    expected_touch_points_json: s.expectedTouchPoints,
    expected_interfaces_json: s.expectedInterfaces,
    performance_constraints_json: s.performanceConstraints,
    test_scope_json: s.testScope,
    max_complexity_score: s.maxComplexityScore,
    execution_batch: s.executionBatch ?? 0,
    status: "draft",
  };
}

function rowToTaskSpec(row: any): TaskSpecDraft {
  return {
    id: row.id,
    sourceSliceId: row.engineering_slice_id,
    moduleId: row.module_id,
    title: row.title,
    engineeringLayer: row.engineering_layer,
    ownerRole: row.owner_role,
    goal: row.goal,
    allowedRepoPaths: row.allowed_repo_paths_json ?? [],
    forbiddenRepoPaths: row.forbidden_repo_paths_json ?? [],
    acceptanceCriteria: row.acceptance_criteria_json ?? [],
    verificationPlan: row.verification_plan_json ?? [],
    definitionOfDone: row.definition_of_done_json ?? [],
    requiredArtifacts: row.required_artifacts_json ?? [],
    riskClass: row.risk_class,
    complexityScore: row.complexity_score,
  };
}

function taskSpecToRow(d: TaskSpecDraft) {
  return {
    id: d.id,
    engineering_slice_id: d.sourceSliceId,
    module_id: d.moduleId,
    title: d.title,
    engineering_layer: d.engineeringLayer,
    owner_role: d.ownerRole,
    goal: d.goal,
    allowed_repo_paths_json: d.allowedRepoPaths,
    forbidden_repo_paths_json: d.forbiddenRepoPaths,
    acceptance_criteria_json: d.acceptanceCriteria,
    verification_plan_json: d.verificationPlan,
    definition_of_done_json: d.definitionOfDone,
    required_artifacts_json: d.requiredArtifacts,
    risk_class: d.riskClass,
    complexity_score: d.complexityScore,
    status: "draft",
  };
}

function rowToPlan(row: any): ExecutionPlanDraft {
  return {
    id: row.id,
    blueprintId: row.blueprint_contract_id,
    taskDraftIds: row.taskspec_draft_ids_json ?? [],
    edges: row.edges_json ?? [],
    batches: row.batches_json ?? [],
    criticalPath: row.critical_path_json ?? [],
    notes: row.notes_json ?? [],
  };
}

// ── Hooks ──

/** Load persisted engineering slices for a blueprint */
export function usePersistedSlices(blueprintContractId: string | null) {
  return useQuery({
    queryKey: keys.slices(blueprintContractId ?? "__none__"),
    enabled: !!blueprintContractId,
    queryFn: async (): Promise<EngineeringSliceDraft[]> => {
      const { data, error } = await (supabase as any)
        .from("engineering_slice_drafts")
        .select("*")
        .eq("blueprint_contract_id", blueprintContractId!)
        .order("execution_batch", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(rowToSlice);
    },
  });
}

/** Load persisted TaskSpec drafts for all slices under a blueprint */
export function usePersistedTaskSpecs(blueprintContractId: string | null) {
  return useQuery({
    queryKey: keys.taskspecs(blueprintContractId ?? "__none__"),
    enabled: !!blueprintContractId,
    queryFn: async (): Promise<TaskSpecDraft[]> => {
      // Get slice IDs first
      const { data: slices } = await (supabase as any)
        .from("engineering_slice_drafts")
        .select("id")
        .eq("blueprint_contract_id", blueprintContractId!);
      const sliceIds = (slices ?? []).map((s: any) => s.id);
      if (sliceIds.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("taskspec_drafts")
        .select("*")
        .in("engineering_slice_id", sliceIds)
        .order("complexity_score", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToTaskSpec);
    },
  });
}

/** Load latest execution plan for a blueprint */
export function usePersistedPlan(blueprintContractId: string | null) {
  return useQuery({
    queryKey: keys.plan(blueprintContractId ?? "__none__"),
    enabled: !!blueprintContractId,
    queryFn: async (): Promise<ExecutionPlanDraft | null> => {
      const { data, error } = await (supabase as any)
        .from("execution_plan_drafts")
        .select("*")
        .eq("blueprint_contract_id", blueprintContractId!)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length > 0 ? rowToPlan(data[0]) : null;
    },
  });
}

/** Load conformance reports for a project */
export function usePersistedConformance(projectId: string | null) {
  return useQuery({
    queryKey: keys.conformance(projectId ?? "__none__"),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cto_conformance_reports")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Mutations ──

/** Save engineering slices (upsert) */
export function useSaveSlices(blueprintContractId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slices: EngineeringSliceDraft[]) => {
      if (!blueprintContractId) throw new Error("No blueprint contract ID");
      const rows = slices.map((s) => sliceToRow(s, blueprintContractId));
      const { error } = await (supabase as any)
        .from("engineering_slice_drafts")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.slices(blueprintContractId!) });
    },
  });
}

/** Save TaskSpec drafts (upsert) */
export function useSaveTaskSpecs(blueprintContractId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: TaskSpecDraft[]) => {
      const rows = drafts.map(taskSpecToRow);
      const { error } = await (supabase as any)
        .from("taskspec_drafts")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.taskspecs(blueprintContractId!) });
    },
  });
}

/** Save execution plan (insert new version) */
export function useSaveExecutionPlan(blueprintContractId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: ExecutionPlanDraft) => {
      if (!blueprintContractId) throw new Error("No blueprint contract ID");
      const row = {
        blueprint_contract_id: blueprintContractId,
        taskspec_draft_ids_json: plan.taskDraftIds,
        edges_json: plan.edges,
        batches_json: plan.batches,
        critical_path_json: plan.criticalPath,
        notes_json: plan.notes,
        status: "draft",
      };
      const { error } = await (supabase as any)
        .from("execution_plan_drafts")
        .insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.plan(blueprintContractId!) });
    },
  });
}

/** Save conformance report */
export function useSaveConformanceReport(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: {
      taskId?: string;
      taskspecDraftId?: string;
      dodMet: boolean;
      boundaryRespected: boolean;
      forbiddenChangesDetected: boolean;
      artifactsComplete: boolean;
      summary: string;
    }) => {
      if (!projectId) throw new Error("No project ID");
      const { error } = await (supabase as any)
        .from("cto_conformance_reports")
        .insert({
          project_id: projectId,
          task_id: report.taskId ?? null,
          taskspec_draft_id: report.taskspecDraftId ?? null,
          dod_met: report.dodMet,
          boundary_respected: report.boundaryRespected,
          forbidden_changes_detected: report.forbiddenChangesDetected,
          artifacts_complete: report.artifactsComplete,
          summary: report.summary,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.conformance(projectId!) });
    },
  });
}
