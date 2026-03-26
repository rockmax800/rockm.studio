// AI CTO Engineering Slices — typed planning artifacts for engineering normalization.
// Intent Plane artifact — does NOT create Delivery Plane state.
// See docs/delivery/ai-cto-engineering-package.md §5.1

/** Engineering layer classification — maps to Role Contract selection */
export type EngineeringLayer =
  | "domain_model"
  | "dto_or_contract"
  | "application_service"
  | "api_handler"
  | "ui_component"
  | "test"
  | "migration"
  | "integration_adapter";

/**
 * A bounded, implementable unit derived from one or more AI Task Drafts.
 * Carries `draft` status until the launch/project creation gate is passed.
 */
export interface EngineeringSliceDraft {
  id: string;
  moduleId: string;
  moduleName: string;
  businessGoal: string;
  technicalBoundary: string;
  allowedRepoAreas: string[];
  expectedTouchPoints: string[];
  expectedInterfaces: string[];
  dataContracts: string[];
  performanceConstraints: string[];
  testScope: string[];
  forbiddenShortcuts: string[];
  maxComplexityScore: number;
  executionBatch?: number | null;
}
