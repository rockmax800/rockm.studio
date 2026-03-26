// AI CTO Execution Plan — dependency-aware ordering of TaskSpec drafts.
// Intent Plane artifact — does NOT create Delivery Plane state.
// See docs/delivery/ai-cto-engineering-package.md §5.3

/** A dependency edge between two TaskSpec drafts */
export interface ExecutionEdge {
  fromTaskDraftId: string;
  toTaskDraftId: string;
  reason: string;
}

/** A parallelizable batch of TaskSpec drafts */
export interface ExecutionBatch {
  batchNumber: number;
  taskDraftIds: string[];
  rationale: string;
}

/**
 * The full execution plan: a DAG of TaskSpec drafts ordered into batches.
 * Remains a planning artifact until the launch gate is passed.
 * Founder may reorder, skip, or override any batch.
 */
export interface ExecutionPlanDraft {
  id: string;
  blueprintId: string;
  taskDraftIds: string[];
  edges: ExecutionEdge[];
  batches: ExecutionBatch[];
  criticalPath: string[];
  notes: string[];
}
