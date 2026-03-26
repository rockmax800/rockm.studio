// CTO Handoff Contract — formal interface between Company Lead planning and AI CTO engineering.
// This is an Intent Plane planning artifact only.

export interface CtoHandoffContract {
  /** Source blueprint ID */
  blueprintId: string | null;
  /** Clarification loop completed and confirmed */
  clarificationComplete: boolean;
  /** At least one SystemModule exists */
  modulesPresent: boolean;
  /** Module count */
  moduleCount: number;
  /** Dependency graph edges exist (or independence acknowledged) */
  dependencyGraphPresent: boolean;
  /** Delivery mode selected */
  deliveryMode: string | null;
  /** MVP reduction pass completed (if applicable) */
  mvpReductionComplete: boolean;
  /** Blueprint approved by founder via Approval entity */
  approvedByFounder: boolean;
  /** CTO backlog cards exist */
  backlogCardsPresent: boolean;
  /** Backlog card count */
  backlogCardCount: number;
  /** AI task drafts exist */
  taskDraftsPresent: boolean;
  /** Items preventing CTO engineering from starting */
  missingItems: HandoffMissingItem[];
  /** All prerequisites met — CTO engineering may begin */
  readyForEngineering: boolean;
}

export interface HandoffMissingItem {
  key: string;
  label: string;
  detail: string;
  severity: "blocker" | "warning";
}

export interface HandoffBuildInput {
  blueprintId: string | null;
  clarificationComplete: boolean;
  modules: { name: string }[];
  dependencyEdgeCount: number;
  independenceAcknowledged: boolean;
  deliveryMode: string | null;
  mvpReductionComplete: boolean;
  isMvpProject: boolean;
  approvedByFounder: boolean;
  backlogCardCount: number;
  taskDraftCount: number;
}
