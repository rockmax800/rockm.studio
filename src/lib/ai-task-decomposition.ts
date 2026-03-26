// AI Task Decomposition — deterministic breakdown of CTO Backlog cards into atomic AI task drafts
// Intent Plane planning artifact — does NOT create Delivery Plane tasks.

import type { CTOBacklogCardDraft, AITaskDraft, LayerType } from "@/types/front-office-planning";

/** Complexity threshold — tasks above this score get split further */
const COMPLEXITY_SPLIT_THRESHOLD = 7;

/** Layer inference from feature slice and technical spec text */
const LAYER_SIGNALS: { pattern: RegExp; layer: LayerType }[] = [
  { pattern: /migrat|schema|column|table|index/i, layer: "migration" },
  { pattern: /dto|data.?transfer|payload|request.?body|response.?body/i, layer: "dto" },
  { pattern: /entity|model|domain.?object/i, layer: "entity" },
  { pattern: /service|business.?logic|orchestrat|workflow|handler/i, layer: "service" },
  { pattern: /api|endpoint|route|controller|rest|graphql/i, layer: "api" },
  { pattern: /ui|component|page|view|dashboard|form|button|modal/i, layer: "ui" },
  { pattern: /test|spec|assertion|coverage|e2e|unit/i, layer: "test" },
  { pattern: /integrat|webhook|third.?party|external|sdk|adapter/i, layer: "integration" },
];

function inferLayer(text: string): LayerType {
  for (const { pattern, layer } of LAYER_SIGNALS) {
    if (pattern.test(text)) return layer;
  }
  return "service"; // default
}

const LAYER_LABELS: Record<LayerType, string> = {
  dto: "Data Transfer Object",
  entity: "Domain Entity",
  service: "Service Logic",
  api: "API Endpoint",
  ui: "UI Component",
  test: "Test Suite",
  migration: "Database Migration",
  integration: "External Integration",
};

export { LAYER_LABELS };

/** Decompose a single CTO Backlog card into atomic AI task drafts */
function decomposeCard(card: CTOBacklogCardDraft): AITaskDraft[] {
  const drafts: AITaskDraft[] = [];
  const combinedText = `${card.featureSlice} ${card.technicalSpec}`;

  // Determine layers this card touches
  const detectedLayers = new Set<LayerType>();
  for (const { pattern, layer } of LAYER_SIGNALS) {
    if (pattern.test(combinedText)) detectedLayers.add(layer);
  }

  // If no layers detected, infer from overall text
  if (detectedLayers.size === 0) {
    detectedLayers.add(inferLayer(combinedText));
  }

  // Always include test layer for non-trivial cards
  if (card.testRequirements.length > 0 && !detectedLayers.has("test")) {
    detectedLayers.add("test");
  }

  for (const layer of detectedLayers) {
    const complexity = computeComplexity(card, layer);
    const draft = buildTaskDraft(card, layer, complexity);

    if (complexity > COMPLEXITY_SPLIT_THRESHOLD) {
      // Split into sub-tasks
      const splits = splitHighComplexity(draft, card);
      drafts.push(...splits);
    } else {
      drafts.push(draft);
    }
  }

  return drafts;
}

function buildTaskDraft(
  card: CTOBacklogCardDraft,
  layer: LayerType,
  complexity: number,
): AITaskDraft {
  return {
    id: crypto.randomUUID(),
    title: `[${layer.toUpperCase()}] ${card.featureSlice}`,
    layerType: layer,
    ownerRole: inferOwnerRole(layer),
    definitionOfDone: deriveLayerDoD(card, layer),
    allowedArea: deriveAllowedArea(card, layer),
    forbiddenArea: deriveForbiddenArea(card, layer),
    complexityScore: Math.min(complexity, 10),
    sourceBacklogCardId: card.id,
  };
}

function computeComplexity(card: CTOBacklogCardDraft, layer: LayerType): number {
  let score = 3; // base

  // Constraints add complexity
  score += Math.min(card.constraints.length, 3);

  // Performance constraints add complexity for service/api layers
  if ((layer === "service" || layer === "api") && card.performanceConstraints.length > 0) {
    score += 1;
  }

  // Integration layer is inherently more complex
  if (layer === "integration") score += 2;

  // Test requirements add complexity to test layer
  if (layer === "test") score += Math.min(card.testRequirements.length - 1, 2);

  // Forbidden shortcuts signal higher rigor = higher complexity
  if (card.forbiddenShortcuts.length > 2) score += 1;

  return Math.min(score, 10);
}

function splitHighComplexity(draft: AITaskDraft, card: CTOBacklogCardDraft): AITaskDraft[] {
  // Split into "core implementation" and "edge cases / validation"
  return [
    {
      ...draft,
      id: crypto.randomUUID(),
      title: `${draft.title} — core`,
      complexityScore: Math.ceil(draft.complexityScore * 0.6),
      definitionOfDone: `Core path: ${draft.definitionOfDone}`,
    },
    {
      ...draft,
      id: crypto.randomUUID(),
      title: `${draft.title} — edge cases & validation`,
      complexityScore: Math.ceil(draft.complexityScore * 0.4),
      definitionOfDone: `Edge cases, error handling, and validation for: ${card.featureSlice}`,
      allowedArea: draft.allowedArea,
    },
  ];
}

function inferOwnerRole(layer: LayerType): string {
  switch (layer) {
    case "dto":
    case "entity":
    case "migration":
      return "architect";
    case "service":
      return "backend-engineer";
    case "api":
      return "backend-engineer";
    case "ui":
      return "frontend-engineer";
    case "test":
      return "qa-engineer";
    case "integration":
      return "integration-engineer";
    default:
      return "engineer";
  }
}

function deriveLayerDoD(card: CTOBacklogCardDraft, layer: LayerType): string {
  const base = card.definitionOfDone;
  switch (layer) {
    case "dto":
      return `DTO types defined and validated for: ${card.featureSlice}. ${base}`;
    case "entity":
      return `Domain entity implemented with invariants for: ${card.featureSlice}. ${base}`;
    case "service":
      return `Service logic implemented and unit-tested for: ${card.featureSlice}. ${base}`;
    case "api":
      return `API endpoint exposed with proper error handling for: ${card.featureSlice}. ${base}`;
    case "ui":
      return `UI component renders correctly with loading/error states for: ${card.featureSlice}. ${base}`;
    case "test":
      return `Test suite covers: ${card.testRequirements.join("; ")}. ${base}`;
    case "migration":
      return `Database migration applied and reversible for: ${card.featureSlice}. ${base}`;
    case "integration":
      return `Integration adapter implemented with retry/fallback for: ${card.featureSlice}. ${base}`;
    default:
      return base;
  }
}

function deriveAllowedArea(card: CTOBacklogCardDraft, layer: LayerType): string {
  const mod = card.moduleName;
  switch (layer) {
    case "dto":
      return `${mod}/types, ${mod}/dto`;
    case "entity":
      return `${mod}/entities, ${mod}/models`;
    case "service":
      return `${mod}/services, ${mod}/lib`;
    case "api":
      return `${mod}/api, ${mod}/routes`;
    case "ui":
      return `${mod}/components, ${mod}/pages`;
    case "test":
      return `${mod}/test, ${mod}/__tests__`;
    case "migration":
      return `migrations/, ${mod}/schema`;
    case "integration":
      return `${mod}/adapters, ${mod}/integrations`;
    default:
      return `${mod}/`;
  }
}

function deriveForbiddenArea(card: CTOBacklogCardDraft, layer: LayerType): string {
  const forbidden: string[] = [];
  // Layer isolation: each layer must not touch other layers
  const otherLayers: LayerType[] = ["dto", "entity", "service", "api", "ui", "test", "migration", "integration"]
    .filter((l) => l !== layer) as LayerType[];

  forbidden.push(`Must not modify ${otherLayers.slice(0, 3).join(", ")} layer files`);

  if (card.forbiddenShortcuts.length > 0) {
    forbidden.push(card.forbiddenShortcuts[0]);
  }

  return forbidden.join(". ");
}

/** Decompose all CTO Backlog cards into atomic AI task drafts */
export function decomposeBacklogToTasks(cards: CTOBacklogCardDraft[]): AITaskDraft[] {
  const allDrafts: AITaskDraft[] = [];
  for (const card of cards) {
    allDrafts.push(...decomposeCard(card));
  }
  return allDrafts;
}

/** Get summary stats for a set of task drafts */
export function getTaskDraftStats(drafts: AITaskDraft[]) {
  const byLayer: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  let totalComplexity = 0;
  let highComplexityCount = 0;

  for (const d of drafts) {
    byLayer[d.layerType] = (byLayer[d.layerType] || 0) + 1;
    byRole[d.ownerRole] = (byRole[d.ownerRole] || 0) + 1;
    totalComplexity += d.complexityScore;
    if (d.complexityScore >= COMPLEXITY_SPLIT_THRESHOLD) highComplexityCount++;
  }

  return {
    total: drafts.length,
    byLayer,
    byRole,
    avgComplexity: drafts.length > 0 ? Math.round((totalComplexity / drafts.length) * 10) / 10 : 0,
    highComplexityCount,
  };
}
