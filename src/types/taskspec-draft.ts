// AI CTO TaskSpec Drafts — compiled from engineering slices into canonical TaskSpec format.
// Intent Plane artifact — does NOT create Delivery Plane state.
// See docs/delivery/ai-cto-engineering-package.md §5.2
// See docs/core/10-role-contracts-and-taskspec.md §3

import type { EngineeringLayer } from "./engineering-slices";

/**
 * A draft TaskSpec compiled from an EngineeringSliceDraft.
 * Maps directly to the canonical TaskSpec entity fields.
 * Remains a planning artifact until the launch gate is passed.
 */
export interface TaskSpecDraft {
  id: string;
  sourceSliceId: string;
  moduleId: string;
  title: string;
  engineeringLayer: EngineeringLayer;
  ownerRole: string;
  goal: string;
  allowedRepoPaths: string[];
  forbiddenRepoPaths: string[];
  acceptanceCriteria: string[];
  verificationPlan: string[];
  definitionOfDone: string[];
  requiredArtifacts: string[];
  riskClass: "low" | "medium" | "high";
  complexityScore: number;
}
