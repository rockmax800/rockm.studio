// CTO Backlog Draft — Intent Plane planning artifact
// Generates structured backlog cards from system decomposition modules.
// Does NOT create Delivery Plane tasks.

import type { SystemModule, CTOBacklogCardDraft } from "@/types/front-office-planning";

/** Generate one or more CTOBacklogCardDraft entries per module */
export function generateBacklogCards(modules: SystemModule[]): CTOBacklogCardDraft[] {
  const cards: CTOBacklogCardDraft[] = [];

  for (const mod of modules) {
    // For large/xlarge modules, split into multiple cards per core feature
    const shouldSplit = mod.complexityEstimate === "large" || mod.complexityEstimate === "xlarge";
    const slices = shouldSplit && mod.coreFeatures.length > 1
      ? mod.coreFeatures
      : [mod.coreFeatures.join(", ") || mod.purpose];

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      cards.push({
        id: crypto.randomUUID(),
        moduleName: mod.name,
        featureSlice: slice,
        technicalSpec: deriveTechnicalSpec(mod, slice),
        constraints: deriveConstraints(mod),
        definitionOfDone: deriveDoD(mod, slice),
        testRequirements: deriveTestRequirements(mod),
        forbiddenShortcuts: deriveForbiddenShortcuts(mod),
        performanceConstraints: derivePerformanceConstraints(mod),
      });
    }
  }

  return cards;
}

/** Merge two cards into one */
export function mergeBacklogCards(a: CTOBacklogCardDraft, b: CTOBacklogCardDraft): CTOBacklogCardDraft {
  return {
    id: crypto.randomUUID(),
    moduleName: a.moduleName === b.moduleName ? a.moduleName : `${a.moduleName} + ${b.moduleName}`,
    featureSlice: `${a.featureSlice}; ${b.featureSlice}`,
    technicalSpec: `${a.technicalSpec}\n\n${b.technicalSpec}`,
    constraints: [...new Set([...a.constraints, ...b.constraints])],
    definitionOfDone: `${a.definitionOfDone}\n${b.definitionOfDone}`,
    testRequirements: [...new Set([...a.testRequirements, ...b.testRequirements])],
    forbiddenShortcuts: [...new Set([...a.forbiddenShortcuts, ...b.forbiddenShortcuts])],
    performanceConstraints: [...new Set([...a.performanceConstraints, ...b.performanceConstraints])],
  };
}

/** Split a card into two by feature slice text */
export function splitBacklogCard(card: CTOBacklogCardDraft): [CTOBacklogCardDraft, CTOBacklogCardDraft] {
  const parts = card.featureSlice.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  const mid = Math.ceil(parts.length / 2);
  const sliceA = parts.slice(0, mid).join(", ");
  const sliceB = parts.slice(mid).join(", ") || "Additional scope";

  return [
    { ...card, id: crypto.randomUUID(), featureSlice: sliceA },
    { ...card, id: crypto.randomUUID(), featureSlice: sliceB },
  ];
}

// ── Derivation helpers ──

function deriveTechnicalSpec(mod: SystemModule, slice: string): string {
  const lines: string[] = [];
  lines.push(`Implement ${slice} within the ${mod.name} module.`);
  if (mod.dependencies.length > 0) {
    lines.push(`Integration points: ${mod.dependencies.join(", ")}.`);
  }
  lines.push(`Complexity band: ${mod.complexityEstimate}.`);
  return lines.join(" ");
}

function deriveConstraints(mod: SystemModule): string[] {
  const c: string[] = [];
  if (mod.dependencies.length > 0) {
    c.push(`Must not break interfaces with: ${mod.dependencies.join(", ")}`);
  }
  if (mod.riskLevel === "high" || mod.riskLevel === "critical") {
    c.push("Requires additional review before merge");
  }
  c.push("Must follow existing domain boundaries");
  return c;
}

function deriveDoD(mod: SystemModule, slice: string): string {
  return `${slice} is implemented, tested, reviewed, and does not regress existing functionality in ${mod.name}.`;
}

function deriveTestRequirements(mod: SystemModule): string[] {
  const reqs = ["Unit tests for core logic"];
  if (mod.riskLevel === "high" || mod.riskLevel === "critical") {
    reqs.push("Integration tests required");
  }
  reqs.push("No regressions in dependent modules");
  return reqs;
}

function deriveForbiddenShortcuts(mod: SystemModule): string[] {
  const shortcuts = ["No hardcoded credentials or secrets"];
  if (mod.riskLevel !== "low") {
    shortcuts.push("No skipping code review");
  }
  shortcuts.push("No direct database mutations bypassing service layer");
  return shortcuts;
}

function derivePerformanceConstraints(mod: SystemModule): string[] {
  const constraints: string[] = [];
  if (mod.complexityEstimate === "large" || mod.complexityEstimate === "xlarge") {
    constraints.push("Response time < 500ms for primary operations");
  }
  constraints.push("No N+1 query patterns");
  return constraints;
}
