// TaskSpec Draft Compiler — converts EngineeringSliceDraft[] into TaskSpecDraft[]
// aligned with the canonical TaskSpec mental model (docs/core/10-role-contracts-and-taskspec.md §3).
// Intent Plane artifact — does NOT create Delivery Plane state.

import type { EngineeringSliceDraft, EngineeringLayer } from "@/types/engineering-slices";
import type { TaskSpecDraft } from "@/types/taskspec-draft";

// ── Role mapping — each engineering layer maps to exactly one owner role ──

const LAYER_OWNER_ROLE: Record<EngineeringLayer, string> = {
  domain_model: "backend_implementer",
  dto_or_contract: "backend_implementer",
  application_service: "backend_implementer",
  api_handler: "backend_implementer",
  ui_component: "frontend_builder",
  test: "reviewer",
  migration: "backend_implementer",
  integration_adapter: "backend_implementer",
};

// ── Allowed / forbidden repo paths by layer ──

const LAYER_PATHS: Record<EngineeringLayer, { allowed: string[]; forbidden: string[] }> = {
  domain_model: {
    allowed: ["src/types/**", "src/lib/**"],
    forbidden: ["src/components/**", "src/pages/**", "app/api/**"],
  },
  dto_or_contract: {
    allowed: ["src/types/**"],
    forbidden: ["src/components/**", "src/pages/**"],
  },
  application_service: {
    allowed: ["src/services/**", "src/lib/**"],
    forbidden: ["src/components/**", "src/pages/**", "prisma/**"],
  },
  api_handler: {
    allowed: ["app/api/**", "supabase/functions/**"],
    forbidden: ["src/components/**", "src/pages/**"],
  },
  ui_component: {
    allowed: ["src/components/**", "src/pages/**", "src/hooks/**"],
    forbidden: ["prisma/**", "supabase/**", "app/api/**"],
  },
  test: {
    allowed: ["src/test/**", "**/*.test.ts", "**/*.test.tsx"],
    forbidden: [],
  },
  migration: {
    allowed: ["prisma/**", "supabase/migrations/**"],
    forbidden: ["src/components/**", "src/pages/**"],
  },
  integration_adapter: {
    allowed: ["src/services/providers/**", "src/lib/execution/adapters/**"],
    forbidden: ["src/components/**", "src/pages/**"],
  },
};

// ── Required artifacts by layer ──

const LAYER_ARTIFACTS: Record<EngineeringLayer, string[]> = {
  domain_model: ["implementation", "spec"],
  dto_or_contract: ["spec", "implementation"],
  application_service: ["implementation", "qa_evidence"],
  api_handler: ["implementation", "qa_evidence"],
  ui_component: ["implementation", "qa_evidence"],
  test: ["qa_evidence"],
  migration: ["implementation", "deployment_receipt"],
  integration_adapter: ["implementation", "qa_evidence"],
};

// ── Acceptance criteria templates ──

function buildAcceptanceCriteria(slice: EngineeringSliceDraft, layer: EngineeringLayer): string[] {
  const criteria: string[] = [
    `Implements ${layer.replace(/_/g, " ")} for ${slice.moduleName}`,
    `Stays within allowed repo areas: ${slice.allowedRepoAreas.join(", ")}`,
  ];

  if (slice.performanceConstraints.length > 0) {
    criteria.push(`Meets performance constraints: ${slice.performanceConstraints.join("; ")}`);
  }
  if (slice.expectedInterfaces.length > 0) {
    criteria.push(`Exposes expected interfaces: ${slice.expectedInterfaces.join("; ")}`);
  }
  criteria.push("All existing tests continue to pass");
  return criteria;
}

// ── Verification plan templates ──

function buildVerificationPlan(layer: EngineeringLayer, slice: EngineeringSliceDraft): string[] {
  const plan: string[] = [];

  if (layer === "migration") {
    plan.push("Run migration up and verify schema state");
    plan.push("Run migration down and verify rollback");
  }
  if (layer === "application_service" || layer === "api_handler") {
    plan.push("Unit tests pass with ≥80% branch coverage on new code");
    plan.push("No N+1 query patterns in new queries");
  }
  if (layer === "ui_component") {
    plan.push("Component renders without console errors");
    plan.push("Responsive layout verified at 375px and 1280px");
  }
  if (layer === "integration_adapter") {
    plan.push("Mock-based adapter tests pass");
    plan.push("Timeout and retry behavior verified");
  }
  if (layer === "test") {
    plan.push("Coverage thresholds met for target module");
  }

  plan.push("Peer review completed");
  plan.push("No forbidden repo path violations");

  for (const ts of slice.testScope) {
    plan.push(ts);
  }

  return plan;
}

// ── Definition of done ──

function buildDefinitionOfDone(layer: EngineeringLayer, slice: EngineeringSliceDraft): string[] {
  return [
    "Implementation complete and compiles without errors",
    "All acceptance criteria verified",
    "Required artifacts produced and attached",
    "No path violations against role contract boundaries",
    ...slice.testScope.map((t) => `Test: ${t}`),
    "Ready for review handoff",
  ];
}

// ── Risk classification ──

function classifyRisk(complexity: number, layer: EngineeringLayer): "low" | "medium" | "high" {
  if (complexity >= 8 || layer === "migration") return "high";
  if (complexity >= 5 || layer === "integration_adapter") return "medium";
  return "low";
}

// ── Max complexity threshold for auto-split ──

const MAX_COMPLEXITY = 8;

/**
 * Compile engineering slices into TaskSpec drafts.
 * Deterministic — same input always produces same output.
 * Splits any draft exceeding MAX_COMPLEXITY.
 */
export function compileTaskSpecDrafts(slices: EngineeringSliceDraft[]): TaskSpecDraft[] {
  const drafts: TaskSpecDraft[] = [];

  for (const slice of slices) {
    // Infer engineering layer from slice ID suffix
    const layerKey = inferLayer(slice);
    const paths = LAYER_PATHS[layerKey];
    const complexity = Math.min(slice.maxComplexityScore, 10);

    const baseDraft: TaskSpecDraft = {
      id: `tsd-${slice.id}`,
      sourceSliceId: slice.id,
      moduleId: slice.moduleId,
      title: `${slice.moduleName} — ${layerKey.replace(/_/g, " ")}`,
      engineeringLayer: layerKey,
      ownerRole: LAYER_OWNER_ROLE[layerKey],
      goal: slice.businessGoal,
      allowedRepoPaths: [...paths.allowed, ...slice.allowedRepoAreas.map((a) => `${a}**`)],
      forbiddenRepoPaths: paths.forbidden,
      acceptanceCriteria: buildAcceptanceCriteria(slice, layerKey),
      verificationPlan: buildVerificationPlan(layerKey, slice),
      definitionOfDone: buildDefinitionOfDone(layerKey, slice),
      requiredArtifacts: LAYER_ARTIFACTS[layerKey],
      riskClass: classifyRisk(complexity, layerKey),
      complexityScore: complexity,
    };

    if (complexity > MAX_COMPLEXITY) {
      // Auto-split into core + edge
      drafts.push(
        {
          ...baseDraft,
          id: `${baseDraft.id}-core`,
          title: `${baseDraft.title} (core)`,
          goal: `Core path: ${baseDraft.goal}`,
          complexityScore: Math.ceil(complexity * 0.55),
          riskClass: classifyRisk(Math.ceil(complexity * 0.55), layerKey),
        },
        {
          ...baseDraft,
          id: `${baseDraft.id}-edge`,
          title: `${baseDraft.title} (edge cases)`,
          goal: `Edge cases & validation: ${baseDraft.goal}`,
          complexityScore: Math.ceil(complexity * 0.5),
          riskClass: classifyRisk(Math.ceil(complexity * 0.5), layerKey),
        },
      );
    } else {
      drafts.push(baseDraft);
    }
  }

  return drafts;
}

/** Infer the EngineeringLayer from a slice's ID pattern */
function inferLayer(slice: EngineeringSliceDraft): EngineeringLayer {
  const id = slice.id;
  const layers: EngineeringLayer[] = [
    "domain_model", "dto_or_contract", "application_service",
    "api_handler", "ui_component", "test",
    "migration", "integration_adapter",
  ];
  for (const l of layers) {
    if (id.endsWith(`-${l}`)) return l;
  }
  // Fallback: infer from allowed repo areas
  const areas = slice.allowedRepoAreas.join(" ").toLowerCase();
  if (areas.includes("migration") || areas.includes("prisma")) return "migration";
  if (areas.includes("components") || areas.includes("pages")) return "ui_component";
  if (areas.includes("api") || areas.includes("functions")) return "api_handler";
  if (areas.includes("services")) return "application_service";
  if (areas.includes("test")) return "test";
  if (areas.includes("adapters") || areas.includes("providers")) return "integration_adapter";
  if (areas.includes("types")) return "domain_model";
  return "application_service";
}

/** Get summary stats for a set of TaskSpec drafts */
export function getTaskSpecDraftStats(drafts: TaskSpecDraft[]) {
  const byModule = new Map<string, number>();
  const byLayer = new Map<string, number>();
  const byRole = new Map<string, number>();
  const byRisk = { low: 0, medium: 0, high: 0 };
  let totalComplexity = 0;

  for (const d of drafts) {
    byModule.set(d.moduleId, (byModule.get(d.moduleId) ?? 0) + 1);
    byLayer.set(d.engineeringLayer, (byLayer.get(d.engineeringLayer) ?? 0) + 1);
    byRole.set(d.ownerRole, (byRole.get(d.ownerRole) ?? 0) + 1);
    byRisk[d.riskClass]++;
    totalComplexity += d.complexityScore;
  }

  return {
    total: drafts.length,
    avgComplexity: drafts.length > 0 ? Math.round((totalComplexity / drafts.length) * 10) / 10 : 0,
    byModule: Object.fromEntries(byModule),
    byLayer: Object.fromEntries(byLayer),
    byRole: Object.fromEntries(byRole),
    byRisk,
    autoSplitCount: drafts.filter((d) => d.id.endsWith("-core") || d.id.endsWith("-edge")).length / 2,
  };
}
