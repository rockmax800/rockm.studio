// Front Office Planning Package v2.1 — Type Definitions
// These types define Intent Plane planning artifacts.
// They do NOT create Delivery Plane state.
// All drafts remain planning artifacts until the LaunchDecision gate is passed.

/** Risk classification for modules and tasks */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** Complexity band for effort estimation */
export type ComplexityEstimate = "trivial" | "small" | "medium" | "large" | "xlarge";

/** Delivery approach for the project */
export type DeliveryMode = "mvp_first" | "full_scope" | "phased_rollout";

/** Layer classification for atomic AI task drafts */
export type LayerType =
  | "dto"
  | "entity"
  | "service"
  | "api"
  | "ui"
  | "test"
  | "migration"
  | "integration";

// ---------------------------------------------------------------------------
// System Decomposition
// ---------------------------------------------------------------------------

export interface SystemModule {
  name: string;
  purpose: string;
  coreFeatures: string[];
  dependencies: string[]; // module names this module depends on
  riskLevel: RiskLevel;
  complexityEstimate: ComplexityEstimate;
  mvpOptional: boolean; // true = can be deferred from MVP
}

export interface DependencyEdge {
  from: string; // source module name
  to: string; // target module name
  reason: string;
}

// ---------------------------------------------------------------------------
// Optimization & Planning Notes
// ---------------------------------------------------------------------------

export interface OptimizationNote {
  area: string;
  observation: string;
  recommendation: string;
  impact: "low" | "medium" | "high";
  source: "system" | "founder"; // who authored this note
}

// ---------------------------------------------------------------------------
// CTO Backlog Draft (Intent Plane artifact — not a Delivery task)
// ---------------------------------------------------------------------------

export interface CTOBacklogCardDraft {
  id: string;
  moduleName: string;
  featureSlice: string;
  technicalSpec: string;
  constraints: string[];
  definitionOfDone: string;
  testRequirements: string[];
  forbiddenShortcuts: string[];
  performanceConstraints: string[];
}

// ---------------------------------------------------------------------------
// Atomic AI Task Draft (Intent Plane artifact — not a Delivery task)
// ---------------------------------------------------------------------------

export interface AITaskDraft {
  id: string;
  title: string;
  layerType: LayerType;
  ownerRole: string;
  definitionOfDone: string;
  allowedArea: string;
  forbiddenArea: string;
  complexityScore: number; // 1–10
  sourceBacklogCardId: string; // references CTOBacklogCardDraft.id
}

// ---------------------------------------------------------------------------
// Planning Package Draft (aggregates all planning artifacts)
// ---------------------------------------------------------------------------

export interface PlanningPackageDraft {
  /** Clarification loop status */
  clarificationComplete: boolean;
  clarificationNotes: string[];

  /** System decomposition outputs */
  modules: SystemModule[];
  dependencyGraph: DependencyEdge[];

  /** MVP reduction pass */
  mvpModules: string[]; // module names included in MVP
  deferredModules: string[]; // module names deferred
  mvpConfirmedByFounder: boolean;

  /** Delivery approach */
  deliveryMode: DeliveryMode;

  /** Optimization observations */
  optimizationNotes: OptimizationNote[];

  /** CTO backlog drafts — Intent artifacts, NOT Delivery tasks */
  backlogCards: CTOBacklogCardDraft[];

  /** Atomic AI task drafts — Intent artifacts, NOT Delivery tasks */
  taskDrafts: AITaskDraft[];

  /** Planning state label — honest about persistence */
  persistenceState: "local_draft" | "founder_snapshot" | "persisted";
}
