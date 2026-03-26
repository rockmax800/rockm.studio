// MVP Reduction Pass — deterministic scope reduction logic
// Intent Plane planning artifact — does not create Delivery state.

import type { SystemModule, OptimizationNote } from "@/types/front-office-planning";

export type MvpDecision = "keep" | "defer" | "replace_saas" | "remove_risk";

export interface MvpReductionEntry {
  moduleName: string;
  decision: MvpDecision;
  canSimplify: boolean;
  canDefer: boolean;
  canReplaceSaas: boolean;
  isHighRiskExclude: boolean;
  founderNote: string;
}

export interface MvpReductionResult {
  entries: MvpReductionEntry[];
  keptModules: string[];
  deferredModules: string[];
  replacedModules: string[];
  removedModules: string[];
  optimizationNotes: OptimizationNote[];
}

const MVP_DECISION_LABELS: Record<MvpDecision, string> = {
  keep: "Keep in MVP",
  defer: "Defer to post-MVP",
  replace_saas: "Replace with SaaS",
  remove_risk: "Remove (high risk)",
};

export { MVP_DECISION_LABELS };

/** Generate initial reduction entries with system suggestions */
export function generateInitialReduction(modules: SystemModule[]): MvpReductionEntry[] {
  return modules.map((mod) => {
    const canSimplify = mod.complexityEstimate === "large" || mod.complexityEstimate === "xlarge";
    const canDefer = mod.mvpOptional;
    const canReplaceSaas = [
      "Authentication", "Payments", "Email System", "Notifications",
      "Search Engine", "Analytics", "File Management",
    ].includes(mod.name);
    const isHighRiskExclude = mod.riskLevel === "high" || mod.riskLevel === "critical";

    // System suggestion: if optional + has SaaS replacement, suggest SaaS
    // if optional + high risk, suggest remove
    // if just optional, suggest defer
    let decision: MvpDecision = "keep";
    if (canDefer && isHighRiskExclude) decision = "remove_risk";
    else if (canDefer && canReplaceSaas) decision = "replace_saas";
    else if (canDefer) decision = "defer";

    return {
      moduleName: mod.name,
      decision,
      canSimplify,
      canDefer,
      canReplaceSaas,
      isHighRiskExclude,
      founderNote: "",
    };
  });
}

/** Compute reduction result from entries */
export function computeReductionResult(entries: MvpReductionEntry[]): MvpReductionResult {
  const kept = entries.filter((e) => e.decision === "keep").map((e) => e.moduleName);
  const deferred = entries.filter((e) => e.decision === "defer").map((e) => e.moduleName);
  const replaced = entries.filter((e) => e.decision === "replace_saas").map((e) => e.moduleName);
  const removed = entries.filter((e) => e.decision === "remove_risk").map((e) => e.moduleName);

  const notes: OptimizationNote[] = [];
  for (const e of entries) {
    if (e.decision === "defer") {
      notes.push({
        area: e.moduleName,
        observation: "Module deferred from MVP scope",
        recommendation: `Build ${e.moduleName} in post-MVP iteration`,
        impact: "medium",
        source: "system",
      });
    }
    if (e.decision === "replace_saas") {
      notes.push({
        area: e.moduleName,
        observation: "Module can be replaced with SaaS solution",
        recommendation: `Use third-party SaaS for ${e.moduleName} in MVP — build custom later if needed`,
        impact: "high",
        source: "system",
      });
    }
    if (e.decision === "remove_risk") {
      notes.push({
        area: e.moduleName,
        observation: "High-risk module excluded from MVP",
        recommendation: `Remove ${e.moduleName} to reduce delivery risk in MVP`,
        impact: "high",
        source: "system",
      });
    }
    if (e.founderNote) {
      notes.push({
        area: e.moduleName,
        observation: e.founderNote,
        recommendation: "",
        impact: "medium",
        source: "founder",
      });
    }
  }

  return {
    entries,
    keptModules: kept,
    deferredModules: deferred,
    replacedModules: replaced,
    removedModules: removed,
    optimizationNotes: notes,
  };
}

/** Get only the modules that survive MVP reduction */
export function getMvpScopeModules(
  allModules: SystemModule[],
  result: MvpReductionResult,
): SystemModule[] {
  const keptSet = new Set(result.keptModules);
  return allModules.filter((m) => keptSet.has(m.name));
}
