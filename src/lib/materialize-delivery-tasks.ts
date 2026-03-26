// Controlled materialization: TaskSpecDraft[] → live Delivery tasks.
// Only callable after launch gate, planning approval, and sanity pass.
// Founder-only, explicit, irreversible action.

import type { TaskSpecDraft } from "@/types/taskspec-draft";
import type { SanityReport } from "@/lib/taskspec-sanity";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TaskDomain = Database["public"]["Enums"]["task_domain"];
type TaskOutputType = Database["public"]["Enums"]["task_output_type"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

// ── Gate checks ──

export interface MaterializationGate {
  canMaterialize: boolean;
  blockers: string[];
}

export function checkMaterializationGate(opts: {
  projectExists: boolean;
  projectState: string;
  planningApproved: boolean;
  sanityReport: SanityReport;
  draftsCount: number;
}): MaterializationGate {
  const blockers: string[] = [];

  if (!opts.projectExists) {
    blockers.push("Project does not exist — create the project first.");
  }

  if (!["active", "in_progress", "scoped"].includes(opts.projectState)) {
    blockers.push(`Project state "${opts.projectState}" does not allow task materialization. Expected: active or in_progress.`);
  }

  if (!opts.planningApproved) {
    blockers.push("Blueprint / planning package not yet approved by founder.");
  }

  if (opts.sanityReport.overallStatus === "blocked") {
    blockers.push("CTO sanity check has blocked drafts — resolve before materializing.");
  }

  if (opts.draftsCount === 0) {
    blockers.push("No TaskSpec drafts available to materialize.");
  }

  return {
    canMaterialize: blockers.length === 0,
    blockers,
  };
}

// ── Layer mapping ──

const LAYER_TO_DOMAIN: Record<string, TaskDomain> = {
  ui_component: "frontend",
  api_handler: "backend",
  domain_model: "backend",
  migration: "backend",
  integration: "backend",
  test_suite: "qa",
};

const LAYER_TO_OUTPUT: Record<string, TaskOutputType> = {
  ui_component: "frontend",
  api_handler: "backend",
  domain_model: "backend",
  migration: "schema",
  integration: "backend",
  test_suite: "test",
};

const RISK_TO_PRIORITY: Record<string, TaskPriority> = {
  low: "medium",
  medium: "high",
  high: "critical",
};

// ── Materializer ──

export interface MaterializationResult {
  success: boolean;
  createdCount: number;
  errors: string[];
}

/**
 * Convert TaskSpecDrafts into live Delivery tasks via Supabase insert.
 * Each draft becomes one task in "draft" state (Delivery Plane entry point).
 */
export async function materializeDeliveryTasks(
  projectId: string,
  drafts: TaskSpecDraft[],
): Promise<MaterializationResult> {
  const errors: string[] = [];
  let createdCount = 0;

  // Build insert rows
  const rows = drafts.map((d) => ({
    project_id: projectId,
    title: d.title,
    purpose: d.goal,
    domain: LAYER_TO_DOMAIN[d.engineeringLayer] ?? ("backend" as TaskDomain),
    expected_output_type: LAYER_TO_OUTPUT[d.engineeringLayer] ?? ("backend" as TaskOutputType),
    priority: RISK_TO_PRIORITY[d.riskClass] ?? ("medium" as TaskPriority),
    state: "draft" as const,
    acceptance_criteria: d.acceptanceCriteria,
    constraints: {
      allowedRepoPaths: d.allowedRepoPaths,
      forbiddenRepoPaths: d.forbiddenRepoPaths,
      verificationPlan: d.verificationPlan,
      definitionOfDone: d.definitionOfDone,
      requiredArtifacts: d.requiredArtifacts,
      engineeringLayer: d.engineeringLayer,
      ownerRole: d.ownerRole,
      sourceSliceId: d.sourceSliceId,
      complexityScore: d.complexityScore,
      riskClass: d.riskClass,
    },
  }));

  const { data, error } = await supabase.from("tasks").insert(rows).select("id");

  if (error) {
    errors.push(`Database insert failed: ${error.message}`);
  } else {
    createdCount = data?.length ?? 0;
  }

  return {
    success: errors.length === 0,
    createdCount,
    errors,
  };
}
