/**
 * Canonical persistence hook for Front Office planning artifacts.
 * Saves/loads: clarification snapshots, blueprint modules, dependency edges,
 * optimization notes, CTO backlog cards, and AI task drafts.
 *
 * Intent Plane only — does NOT create Delivery Plane state.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  SystemModule,
  DependencyEdge,
  OptimizationNote,
  CTOBacklogCardDraft,
  AITaskDraft,
} from "@/types/front-office-planning";
import type { ClarificationFields } from "@/lib/company-lead-clarification";

/* ── Row types (match DB schema) ── */

interface ClarificationRow {
  id: string;
  intake_request_id: string;
  project_type: string;
  priority_axis: string;
  scope_optimization_preference: string;
  constraints_json: string[];
  integrations_json: string[];
  timeline_notes: string;
  completed: boolean;
  created_at: string;
}

interface BlueprintModuleRow {
  id: string;
  blueprint_contract_id: string;
  name: string;
  purpose: string;
  core_features_json: string[];
  dependencies_json: string[];
  risk_level: string;
  complexity_estimate: string;
  mvp_optional: boolean;
  retained_in_mvp: boolean;
  created_at: string;
}

interface DependencyEdgeRow {
  id: string;
  blueprint_contract_id: string;
  from_module: string;
  to_module: string;
  reason: string;
  created_at: string;
}

/* ── Persistence state ── */

export type PersistenceState = "unsaved" | "saving" | "saved" | "error";

/* ── Hook ── */

export function useCompanyLeadPlanning(intakeRequestId: string | null) {
  const [persistenceState, setPersistenceState] = useState<PersistenceState>("unsaved");

  // ── Save Clarification Snapshot ──
  const saveClarification = useCallback(
    async (fields: ClarificationFields, completed: boolean) => {
      if (!intakeRequestId) return null;
      setPersistenceState("saving");
      try {
        // Upsert: delete existing then insert
        await (supabase as any)
          .from("clarification_snapshots")
          .delete()
          .eq("intake_request_id", intakeRequestId);

        const { data, error } = await (supabase as any)
          .from("clarification_snapshots")
          .insert({
            intake_request_id: intakeRequestId,
            project_type: fields.projectType || "",
            priority_axis: fields.priorityAxis || "",
            scope_optimization_preference: fields.scopeOptimization || "",
            constraints_json: fields.constraints || [],
            integrations_json: fields.integrations || [],
            timeline_notes: fields.timeline || "",
            completed,
          })
          .select()
          .single();

        if (error) throw error;
        setPersistenceState("saved");
        return data as ClarificationRow;
      } catch (err) {
        console.error("Failed to save clarification:", err);
        setPersistenceState("error");
        toast.error("Failed to save clarification snapshot");
        return null;
      }
    },
    [intakeRequestId],
  );

  // ── Load Clarification ──
  const loadClarification = useCallback(async () => {
    if (!intakeRequestId) return null;
    try {
      const { data, error } = await (supabase as any)
        .from("clarification_snapshots")
        .select("*")
        .eq("intake_request_id", intakeRequestId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ClarificationRow | null;
    } catch (err) {
      console.error("Failed to load clarification:", err);
      return null;
    }
  }, [intakeRequestId]);

  // ── Save Blueprint Modules + Edges ──
  const saveBlueprintDecomposition = useCallback(
    async (
      blueprintContractId: string,
      modules: SystemModule[],
      edges: DependencyEdge[],
      notes: OptimizationNote[],
    ) => {
      setPersistenceState("saving");
      try {
        // Clear existing
        await Promise.all([
          (supabase as any).from("blueprint_modules").delete().eq("blueprint_contract_id", blueprintContractId),
          (supabase as any).from("blueprint_dependency_edges").delete().eq("blueprint_contract_id", blueprintContractId),
          (supabase as any).from("blueprint_optimization_notes").delete().eq("blueprint_contract_id", blueprintContractId),
        ]);

        // Insert modules
        if (modules.length > 0) {
          const moduleRows = modules.map((m) => ({
            blueprint_contract_id: blueprintContractId,
            name: m.name,
            purpose: m.purpose,
            core_features_json: m.coreFeatures,
            dependencies_json: m.dependencies,
            risk_level: m.riskLevel,
            complexity_estimate: m.complexityEstimate,
            mvp_optional: m.mvpOptional,
            retained_in_mvp: !m.mvpOptional, // default: non-optional = retained
          }));
          const { error: mErr } = await (supabase as any).from("blueprint_modules").insert(moduleRows);
          if (mErr) throw mErr;
        }

        // Insert edges
        if (edges.length > 0) {
          const edgeRows = edges.map((e) => ({
            blueprint_contract_id: blueprintContractId,
            from_module: e.from,
            to_module: e.to,
            reason: e.reason,
          }));
          const { error: eErr } = await (supabase as any).from("blueprint_dependency_edges").insert(edgeRows);
          if (eErr) throw eErr;
        }

        // Insert optimization notes
        if (notes.length > 0) {
          const noteRows = notes.map((n) => ({
            blueprint_contract_id: blueprintContractId,
            note_type: n.source,
            content: `[${n.area}] ${n.observation} — ${n.recommendation} (impact: ${n.impact})`,
          }));
          const { error: nErr } = await (supabase as any).from("blueprint_optimization_notes").insert(noteRows);
          if (nErr) throw nErr;
        }

        setPersistenceState("saved");
        toast.success("Planning decomposition saved");
      } catch (err) {
        console.error("Failed to save decomposition:", err);
        setPersistenceState("error");
        toast.error("Failed to save decomposition");
      }
    },
    [],
  );

  // ── Load Blueprint Modules ──
  const loadBlueprintModules = useCallback(async (blueprintContractId: string) => {
    try {
      const [modulesRes, edgesRes, notesRes] = await Promise.all([
        (supabase as any).from("blueprint_modules").select("*").eq("blueprint_contract_id", blueprintContractId).order("created_at"),
        (supabase as any).from("blueprint_dependency_edges").select("*").eq("blueprint_contract_id", blueprintContractId).order("created_at"),
        (supabase as any).from("blueprint_optimization_notes").select("*").eq("blueprint_contract_id", blueprintContractId).order("created_at"),
      ]);

      const modules: SystemModule[] = (modulesRes.data ?? []).map((r: BlueprintModuleRow) => ({
        name: r.name,
        purpose: r.purpose,
        coreFeatures: r.core_features_json as string[],
        dependencies: r.dependencies_json as string[],
        riskLevel: r.risk_level as SystemModule["riskLevel"],
        complexityEstimate: r.complexity_estimate as SystemModule["complexityEstimate"],
        mvpOptional: r.mvp_optional,
      }));

      const edges: DependencyEdge[] = (edgesRes.data ?? []).map((r: DependencyEdgeRow) => ({
        from: r.from_module,
        to: r.to_module,
        reason: r.reason,
      }));

      return { modules, edges, notesCount: (notesRes.data ?? []).length };
    } catch (err) {
      console.error("Failed to load blueprint modules:", err);
      return { modules: [], edges: [], notesCount: 0 };
    }
  }, []);

  // ── Save CTO Backlog Cards ──
  const saveBacklogCards = useCallback(
    async (blueprintContractId: string, cards: CTOBacklogCardDraft[]) => {
      setPersistenceState("saving");
      try {
        await (supabase as any).from("cto_backlog_cards").delete().eq("blueprint_contract_id", blueprintContractId);

        if (cards.length > 0) {
          const rows = cards.map((c) => ({
            id: c.id,
            blueprint_contract_id: blueprintContractId,
            module_name: c.moduleName,
            feature_slice: c.featureSlice,
            technical_spec: c.technicalSpec,
            constraints_json: c.constraints,
            definition_of_done: c.definitionOfDone,
            test_requirements_json: c.testRequirements,
            forbidden_shortcuts_json: c.forbiddenShortcuts,
            performance_constraints_json: c.performanceConstraints,
            status: "draft",
          }));
          const { error } = await (supabase as any).from("cto_backlog_cards").insert(rows);
          if (error) throw error;
        }

        setPersistenceState("saved");
      } catch (err) {
        console.error("Failed to save backlog cards:", err);
        setPersistenceState("error");
        toast.error("Failed to save CTO backlog");
      }
    },
    [],
  );

  // ── Save AI Task Drafts ──
  const saveTaskDrafts = useCallback(
    async (drafts: AITaskDraft[]) => {
      if (drafts.length === 0) return;
      setPersistenceState("saving");
      try {
        // Delete existing for these backlog cards
        const cardIds = [...new Set(drafts.map((d) => d.sourceBacklogCardId))];
        for (const cardId of cardIds) {
          await (supabase as any).from("ai_task_drafts").delete().eq("backlog_card_id", cardId);
        }

        const rows = drafts.map((d) => ({
          id: d.id,
          backlog_card_id: d.sourceBacklogCardId,
          title: d.title,
          layer_type: d.layerType,
          owner_role: d.ownerRole,
          definition_of_done: d.definitionOfDone,
          allowed_area: d.allowedArea,
          forbidden_area: d.forbiddenArea,
          complexity_score: d.complexityScore,
          status: "draft",
        }));
        const { error } = await (supabase as any).from("ai_task_drafts").insert(rows);
        if (error) throw error;

        setPersistenceState("saved");
      } catch (err) {
        console.error("Failed to save task drafts:", err);
        setPersistenceState("error");
        toast.error("Failed to save AI task drafts");
      }
    },
    [],
  );

  // ── Load CTO Backlog Cards ──
  const loadBacklogCards = useCallback(async (blueprintContractId: string): Promise<CTOBacklogCardDraft[]> => {
    try {
      const { data, error } = await (supabase as any)
        .from("cto_backlog_cards")
        .select("*")
        .eq("blueprint_contract_id", blueprintContractId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        moduleName: r.module_name,
        featureSlice: r.feature_slice,
        technicalSpec: r.technical_spec,
        constraints: r.constraints_json as string[],
        definitionOfDone: r.definition_of_done,
        testRequirements: r.test_requirements_json as string[],
        forbiddenShortcuts: r.forbidden_shortcuts_json as string[],
        performanceConstraints: r.performance_constraints_json as string[],
      }));
    } catch (err) {
      console.error("Failed to load backlog cards:", err);
      return [];
    }
  }, []);

  return {
    persistenceState,
    saveClarification,
    loadClarification,
    saveBlueprintDecomposition,
    loadBlueprintModules,
    saveBacklogCards,
    saveTaskDrafts,
    loadBacklogCards,
  };
}
