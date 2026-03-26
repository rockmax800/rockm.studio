// CTO → Lead/Founder clarification request artifact.
// Intent Plane artifact — CTO may request clarification but never mutate approved scope.

export type ClarificationRequestStatus = "open" | "resolved" | "dismissed";

export interface ClarificationRequest {
  id: string;
  source: "cto";
  projectId: string;
  blueprintId: string | null;
  affectedModuleId: string;
  affectedModuleName: string;
  ambiguityDescription: string;
  requestedClarification: string;
  status: ClarificationRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolverNote: string | null;
}

/**
 * Create a new clarification request draft (local, not persisted).
 */
export function createClarificationRequest(opts: {
  projectId: string;
  blueprintId: string | null;
  affectedModuleId: string;
  affectedModuleName: string;
  ambiguityDescription: string;
  requestedClarification: string;
}): ClarificationRequest {
  return {
    id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: "cto",
    projectId: opts.projectId,
    blueprintId: opts.blueprintId,
    affectedModuleId: opts.affectedModuleId,
    affectedModuleName: opts.affectedModuleName,
    ambiguityDescription: opts.ambiguityDescription,
    requestedClarification: opts.requestedClarification,
    status: "open",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolverNote: null,
  };
}
