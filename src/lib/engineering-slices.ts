// Engineering Slice Generator — deterministic normalization of planning modules
// into bounded engineering slices for AI CTO decomposition.
// Intent Plane artifact — does NOT create Delivery Plane state.

import type { SystemModule, DependencyEdge, DeliveryMode, OptimizationNote } from "@/types/front-office-planning";
import type { EngineeringSliceDraft, EngineeringLayer } from "@/types/engineering-slices";

// ── Layer inference from module characteristics ──

interface LayerSpec {
  layer: EngineeringLayer;
  goalSuffix: string;
  repoArea: string;
  touchPoints: string[];
  testScope: string[];
}

const LAYER_SPECS: LayerSpec[] = [
  {
    layer: "migration",
    goalSuffix: "database schema and migrations",
    repoArea: "migrations/, prisma/",
    touchPoints: ["schema.prisma", "migrations/"],
    testScope: ["Migration up/down reversibility"],
  },
  {
    layer: "domain_model",
    goalSuffix: "domain entities and business rules",
    repoArea: "src/types/, src/lib/",
    touchPoints: ["types/", "lib/"],
    testScope: ["Unit tests for domain invariants"],
  },
  {
    layer: "dto_or_contract",
    goalSuffix: "data transfer types and API contracts",
    repoArea: "src/types/",
    touchPoints: ["types/", "validators/"],
    testScope: ["Schema validation tests"],
  },
  {
    layer: "application_service",
    goalSuffix: "service layer business logic",
    repoArea: "src/services/",
    touchPoints: ["services/"],
    testScope: ["Unit tests for service logic", "Integration tests for service composition"],
  },
  {
    layer: "api_handler",
    goalSuffix: "API endpoint handlers",
    repoArea: "app/api/, supabase/functions/",
    touchPoints: ["api/", "functions/"],
    testScope: ["Endpoint response validation", "Error handling tests"],
  },
  {
    layer: "ui_component",
    goalSuffix: "UI components and pages",
    repoArea: "src/components/, src/pages/",
    touchPoints: ["components/", "pages/", "hooks/"],
    testScope: ["Component render tests", "User interaction tests"],
  },
  {
    layer: "test",
    goalSuffix: "test coverage and quality assurance",
    repoArea: "src/test/",
    touchPoints: ["test/", "__tests__/"],
    testScope: ["Coverage thresholds", "E2E critical paths"],
  },
  {
    layer: "integration_adapter",
    goalSuffix: "external service adapters and connectors",
    repoArea: "src/services/providers/, src/lib/execution/adapters/",
    touchPoints: ["adapters/", "providers/"],
    testScope: ["Mock-based adapter tests", "Retry/fallback tests"],
  },
];

// ── Complexity scoring ──

const COMPLEXITY_BASE: Record<string, number> = {
  trivial: 2, small: 3, medium: 5, large: 7, xlarge: 9,
};

const RISK_MODIFIER: Record<string, number> = {
  low: 0, medium: 1, high: 2, critical: 3,
};

function computeSliceComplexity(mod: SystemModule, layer: EngineeringLayer): number {
  const base = COMPLEXITY_BASE[mod.complexityEstimate] ?? 5;
  const risk = RISK_MODIFIER[mod.riskLevel] ?? 1;
  // Service and integration layers are inherently more complex
  const layerBonus = (layer === "application_service" || layer === "integration_adapter") ? 1 : 0;
  return Math.min(base + risk + layerBonus, 10);
}

// ── Layer selection per module ──

function selectLayers(mod: SystemModule): EngineeringLayer[] {
  const layers: EngineeringLayer[] = [];
  const features = mod.coreFeatures.join(" ").toLowerCase();
  const name = mod.name.toLowerCase();

  // Every module gets domain model + service
  layers.push("domain_model");
  layers.push("application_service");

  // Check for specific layer signals
  if (/schema|database|table|migration|column/.test(features) || /persist|storage|data model/.test(features)) {
    layers.push("migration");
  }
  if (/api|endpoint|rest|graphql|route/.test(features) || name.includes("api")) {
    layers.push("api_handler");
  }
  if (/ui|dashboard|page|form|component|interface|view/.test(features) || /dashboard|panel|portal/.test(name)) {
    layers.push("ui_component");
  }
  if (/integrat|webhook|third.party|external|adapter|sdk/.test(features) || name.includes("integration")) {
    layers.push("integration_adapter");
  }
  if (/dto|contract|payload|schema|validation/.test(features)) {
    layers.push("dto_or_contract");
  }

  // Always add test layer for non-trivial modules
  if (mod.complexityEstimate !== "trivial") {
    layers.push("test");
  }

  return [...new Set(layers)];
}

// ── Performance constraint inference ──

function inferPerformanceConstraints(mod: SystemModule, layer: EngineeringLayer): string[] {
  const constraints: string[] = [];
  if (layer === "api_handler" || layer === "application_service") {
    if (mod.complexityEstimate === "large" || mod.complexityEstimate === "xlarge") {
      constraints.push("Response time < 500ms for primary operations");
    }
    constraints.push("No N+1 query patterns");
  }
  if (layer === "ui_component") {
    constraints.push("First contentful paint < 1.5s");
    if (mod.coreFeatures.length > 3) {
      constraints.push("Lazy load secondary components");
    }
  }
  if (layer === "integration_adapter") {
    constraints.push("Timeout: 10s max per external call");
    constraints.push("Retry with exponential backoff");
  }
  return constraints;
}

// ── Interface inference ──

function inferInterfaces(mod: SystemModule, layer: EngineeringLayer, allModules: SystemModule[]): string[] {
  const interfaces: string[] = [];

  if (layer === "application_service") {
    interfaces.push(`${mod.name}Service — public API for ${mod.purpose}`);
  }
  if (layer === "api_handler") {
    interfaces.push(`/api/${mod.name.toLowerCase().replace(/\s+/g, "-")} — REST endpoint group`);
  }
  if (layer === "domain_model") {
    interfaces.push(`${mod.name}Entity — domain type definitions`);
  }

  // Add interfaces for module dependencies
  for (const depName of mod.dependencies) {
    const dep = allModules.find((m) => m.name === depName);
    if (dep) {
      interfaces.push(`Depends on ${depName}Service`);
    }
  }

  return interfaces;
}

// ── Public API ──

export interface GenerateSlicesInput {
  modules: SystemModule[];
  dependencyGraph: DependencyEdge[];
  deliveryMode: DeliveryMode;
  optimizationNotes: OptimizationNote[];
}

/**
 * Generate engineering slices from the planning package.
 * Deterministic — same input always produces same output.
 */
export function generateEngineeringSlices(input: GenerateSlicesInput): EngineeringSliceDraft[] {
  const { modules, dependencyGraph, deliveryMode, optimizationNotes } = input;
  const slices: EngineeringSliceDraft[] = [];

  // Compute execution batches from dependency graph
  const batchMap = computeBatches(modules, dependencyGraph);

  for (const mod of modules) {
    const layers = selectLayers(mod);
    const batch = batchMap.get(mod.name) ?? null;

    for (const layer of layers) {
      const spec = LAYER_SPECS.find((s) => s.layer === layer)!;
      const complexity = computeSliceComplexity(mod, layer);

      // Check if any optimization note applies
      const relevantNotes = optimizationNotes.filter(
        (n) => n.area === mod.name || n.area.toLowerCase().includes(mod.name.toLowerCase()),
      );

      const businessGoal = buildBusinessGoal(mod, spec, deliveryMode, relevantNotes);

      slices.push({
        id: `${mod.name.toLowerCase().replace(/\s+/g, "-")}-${layer}`,
        moduleId: mod.name, // module names serve as stable IDs in planning
        moduleName: mod.name,
        businessGoal,
        technicalBoundary: `${mod.name} / ${spec.goalSuffix}. Must not modify unrelated module boundaries.`,
        allowedRepoAreas: spec.repoArea.split(", "),
        expectedTouchPoints: spec.touchPoints.map((tp) =>
          `${mod.name.toLowerCase().replace(/\s+/g, "-")}/${tp}`,
        ),
        expectedInterfaces: inferInterfaces(mod, layer, modules),
        performanceConstraints: inferPerformanceConstraints(mod, layer),
        testScope: spec.testScope,
        maxComplexityScore: complexity,
        executionBatch: batch,
      });
    }
  }

  return slices;
}

function buildBusinessGoal(
  mod: SystemModule,
  spec: LayerSpec,
  deliveryMode: DeliveryMode,
  notes: OptimizationNote[],
): string {
  let goal = `Implement ${spec.goalSuffix} for ${mod.name}: ${mod.purpose}.`;
  if (deliveryMode === "mvp_first") {
    goal += " MVP scope — implement core path only, defer edge cases.";
  }
  if (notes.length > 0) {
    const topNote = notes[0];
    goal += ` Note: ${topNote.observation}`;
  }
  return goal;
}

/**
 * Topological sort into execution batches.
 * Modules with no dependencies go first; dependents follow.
 */
function computeBatches(
  modules: SystemModule[],
  graph: DependencyEdge[],
): Map<string, number> {
  const result = new Map<string, number>();
  const names = new Set(modules.map((m) => m.name));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const name of names) {
    inDegree.set(name, 0);
    adj.set(name, []);
  }

  for (const edge of graph) {
    if (names.has(edge.from) && names.has(edge.to)) {
      adj.get(edge.to)!.push(edge.from);
      inDegree.set(edge.from, (inDegree.get(edge.from) ?? 0) + 1);
    }
  }

  let batch = 1;
  const visited = new Set<string>();

  while (visited.size < names.size) {
    const ready = [...names].filter(
      (n) => !visited.has(n) && (inDegree.get(n) ?? 0) === 0,
    );

    if (ready.length === 0) {
      // Cycle — assign remaining to current batch
      for (const n of names) {
        if (!visited.has(n)) result.set(n, batch);
      }
      break;
    }

    for (const n of ready) {
      result.set(n, batch);
      visited.add(n);
      for (const dep of adj.get(n) ?? []) {
        inDegree.set(dep, Math.max((inDegree.get(dep) ?? 1) - 1, 0));
      }
    }

    batch++;
  }

  return result;
}

/** Split a slice into two halves by business goal */
export function splitSlice(slice: EngineeringSliceDraft): [EngineeringSliceDraft, EngineeringSliceDraft] {
  return [
    {
      ...slice,
      id: `${slice.id}-core`,
      businessGoal: `Core path: ${slice.businessGoal}`,
      maxComplexityScore: Math.ceil(slice.maxComplexityScore * 0.6),
    },
    {
      ...slice,
      id: `${slice.id}-edge`,
      businessGoal: `Edge cases & validation: ${slice.businessGoal}`,
      maxComplexityScore: Math.ceil(slice.maxComplexityScore * 0.5),
    },
  ];
}

/** Merge two slices into one */
export function mergeSlices(a: EngineeringSliceDraft, b: EngineeringSliceDraft): EngineeringSliceDraft {
  return {
    id: `${a.id}+${b.id}`,
    moduleId: a.moduleId === b.moduleId ? a.moduleId : `${a.moduleId}+${b.moduleId}`,
    moduleName: a.moduleName === b.moduleName ? a.moduleName : `${a.moduleName} + ${b.moduleName}`,
    businessGoal: `${a.businessGoal}; ${b.businessGoal}`,
    technicalBoundary: `${a.technicalBoundary}; ${b.technicalBoundary}`,
    allowedRepoAreas: [...new Set([...a.allowedRepoAreas, ...b.allowedRepoAreas])],
    expectedTouchPoints: [...new Set([...a.expectedTouchPoints, ...b.expectedTouchPoints])],
    expectedInterfaces: [...new Set([...a.expectedInterfaces, ...b.expectedInterfaces])],
    performanceConstraints: [...new Set([...a.performanceConstraints, ...b.performanceConstraints])],
    testScope: [...new Set([...a.testScope, ...b.testScope])],
    maxComplexityScore: Math.max(a.maxComplexityScore, b.maxComplexityScore),
    executionBatch: Math.min(a.executionBatch ?? 999, b.executionBatch ?? 999),
  };
}
