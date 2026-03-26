// Company Lead Clarification Loop — v2.1 Planning Package
// Defines mandatory clarification fields that must be resolved
// before Blueprint/planning outputs can be created.
// This is local draft state — not persisted canonically.

export type ProjectType = "mvp" | "production" | "experimental";
export type PriorityAxis = "speed" | "scalability" | "budget";

export interface ClarificationFields {
  projectGoal: string;
  projectType: ProjectType | null;
  priorityAxis: PriorityAxis | null;
  scopeOptimizationPreference: boolean | null;
  constraints: string;
  integrationsOrStack: string;
  timelineExpectation: string;
}

export const EMPTY_CLARIFICATION: ClarificationFields = {
  projectGoal: "",
  projectType: null,
  priorityAxis: null,
  scopeOptimizationPreference: null,
  constraints: "",
  integrationsOrStack: "",
  timelineExpectation: "",
};

export interface ClarificationFieldMeta {
  key: keyof ClarificationFields;
  label: string;
  description: string;
  required: true;
}

export const CLARIFICATION_FIELD_META: ClarificationFieldMeta[] = [
  {
    key: "projectGoal",
    label: "Project Goal",
    description: "Primary business objective the project must achieve",
    required: true,
  },
  {
    key: "projectType",
    label: "Project Type",
    description: "MVP, production system, or experimental prototype",
    required: true,
  },
  {
    key: "priorityAxis",
    label: "Priority Axis",
    description: "What matters most — speed, scalability, or budget",
    required: true,
  },
  {
    key: "scopeOptimizationPreference",
    label: "Scope Optimization",
    description: "Whether the founder wants scope reduction suggestions",
    required: true,
  },
  {
    key: "constraints",
    label: "Constraints",
    description: "Budget, timeline, compliance, or technical constraints",
    required: true,
  },
  {
    key: "integrationsOrStack",
    label: "Integrations / Stack",
    description: "Required technologies, APIs, or third-party services",
    required: true,
  },
  {
    key: "timelineExpectation",
    label: "Timeline Expectation",
    description: "Expected delivery timeframe or deadline",
    required: true,
  },
];

/** Check if a single field is complete */
export function isFieldComplete(fields: ClarificationFields, key: keyof ClarificationFields): boolean {
  const val = fields[key];
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "boolean") return true; // explicit true or false both count
  return true;
}

/** Get completion status for all fields */
export function getClarificationStatus(fields: ClarificationFields): {
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  missingFields: ClarificationFieldMeta[];
} {
  const total = CLARIFICATION_FIELD_META.length;
  const missing = CLARIFICATION_FIELD_META.filter((m) => !isFieldComplete(fields, m.key));
  const completed = total - missing.length;
  return {
    completedCount: completed,
    totalCount: total,
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

/** Attempt to infer clarification fields from conversation text */
export function inferClarificationFromText(
  allUserText: string,
  existing: ClarificationFields,
): Partial<ClarificationFields> {
  const inferred: Partial<ClarificationFields> = {};
  const lower = allUserText.toLowerCase();

  // Project type inference
  if (!existing.projectType) {
    if (lower.includes("mvp") || lower.includes("proof of concept") || lower.includes("prototype"))
      inferred.projectType = "mvp";
    else if (lower.includes("production") || lower.includes("enterprise") || lower.includes("saas"))
      inferred.projectType = "production";
    else if (lower.includes("experiment") || lower.includes("research") || lower.includes("explore"))
      inferred.projectType = "experimental";
  }

  // Priority axis inference
  if (!existing.priorityAxis) {
    if (lower.includes("fast") || lower.includes("urgent") || lower.includes("asap") || lower.includes("deadline"))
      inferred.priorityAxis = "speed";
    else if (lower.includes("scale") || lower.includes("performance") || lower.includes("growth"))
      inferred.priorityAxis = "scalability";
    else if (lower.includes("budget") || lower.includes("cost") || lower.includes("cheap") || lower.includes("affordable"))
      inferred.priorityAxis = "budget";
  }

  // Timeline inference
  if (!existing.timelineExpectation && (lower.includes("week") || lower.includes("month") || lower.includes("day") || lower.includes("quarter"))) {
    const match = allUserText.match(/\d+\s*(weeks?|months?|days?|quarters?)/i);
    if (match) inferred.timelineExpectation = match[0];
  }

  return inferred;
}
