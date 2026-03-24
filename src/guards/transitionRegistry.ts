export type TransitionContext = Record<string, unknown>;

export type TransitionGuard<TState extends string = string> = (params: {
  entityId: string;
  fromState: TState;
  toState: TState;
  context: TransitionContext;
}) => Promise<{ allowed: true } | { allowed: false; reason: string }>;

export type StateTransitionMap<TState extends string = string> = Partial<
  Record<TState, Partial<Record<TState, TransitionGuard<TState>>>>
>;

export type EntityType = "project" | "task" | "run" | "artifact" | "review" | "approval";

// --- Guard helpers ---

const alwaysAllow: TransitionGuard = async () => ({ allowed: true });

const requireContext = (key: string, reason: string): TransitionGuard => async ({ context }) => {
  return context[key] ? { allowed: true } : { allowed: false, reason };
};

const requireActor = (actor: string, reason: string): TransitionGuard => async ({ context }) => {
  return context.actorType === actor ? { allowed: true } : { allowed: false, reason };
};

// --- Review guards (lifecycle only — verdict is a separate field) ---
const reviewTransitions: StateTransitionMap = {
  created: {
    in_progress: requireContext("artifactId", "Target artifact must exist"),
  },
  in_progress: {
    needs_clarification: requireContext("issue", "Issue must be recorded"),
    resolved: requireContext("verdict", "Verdict must be set when resolving"),
  },
  needs_clarification: {
    in_progress: requireContext("clarification", "Clarification must be linked"),
  },
  resolved: {
    closed: alwaysAllow,
  },
};

// --- Approval guards (lifecycle only — decision is a separate field) ---
const approvalTransitions: StateTransitionMap = {
  pending: {
    decided: requireContext("decision", "Decision must be set (approved/rejected/deferred)"),
    expired: requireContext("expirationReason", "Expiration reason required"),
  },
  decided: {
    closed: requireContext("linkedAction", "Linked action must exist"),
  },
  expired: {
    closed: alwaysAllow,
  },
};

// --- Task guards (validated replaces approved) ---
const taskTransitions: StateTransitionMap = {
  draft: {
    ready: requireContext("acceptanceCriteria", "Acceptance criteria must exist"),
  },
  ready: {
    assigned: requireContext("ownerRoleId", "Eligible active role required"),
  },
  assigned: {
    in_progress: requireContext("contextPackId", "ContextPack must exist"),
  },
  in_progress: {
    waiting_review: requireContext("artifactId", "Artifact must be submitted"),
    blocked: requireContext("blockerReason", "Blocker reason required"),
    escalated: requireContext("escalationReason", "Escalation reason required"),
  },
  waiting_review: {
    validated: requireContext("reviewVerdict", "Review verdict must be approved"),
    rework_required: requireContext("rejectionReason", "Rejection reason required"),
  },
  rework_required: {
    assigned: requireContext("reworkNotes", "Rework notes required"),
  },
  blocked: {
    assigned: requireContext("blockerCleared", "Blocker must be cleared"),
  },
  escalated: {
    assigned: requireContext("founderDecision", "Founder decision required"),
  },
  validated: {
    done: requireContext("downstreamComplete", "All downstream must be complete"),
    assigned: requireContext("nextStage", "Next stage must be defined"),
  },
};

// --- Project guards ---
const projectTransitions: StateTransitionMap = {
  draft: {
    scoped: requireContext("briefExists", "Brief must exist"),
  },
  scoped: {
    active: requireContext("founderApproval", "Founder approval required"),
  },
  active: {
    blocked: requireContext("blockerReason", "Blocker reason required"),
    in_review: requireContext("milestoneArtifacts", "Milestone artifacts required"),
    paused: requireActor("founder", "Only founder can pause"),
  },
  blocked: {
    active: requireContext("blockerCleared", "Blocker must be cleared"),
  },
  in_review: {
    active: requireContext("reworkDecision", "Founder rework decision required"),
    completed: requireContext("founderApproval", "Founder approval required; all tasks terminal"),
  },
  paused: {
    active: requireActor("founder", "Only founder can resume"),
    archived: requireActor("founder", "Only founder can archive"),
  },
  completed: {
    archived: requireActor("founder", "Only founder can archive"),
  },
};

// --- Run guards ---
const runTransitions: StateTransitionMap = {
  created: {
    preparing: requireContext("taskExists", "Task and agent must exist"),
    superseded: requireContext("replacementRunId", "Replacement run required"),
  },
  preparing: {
    running: requireContext("contextPackAvailable", "Context pack required"),
    failed: requireContext("failureReason", "Failure reason required"),
    superseded: requireContext("replacementRunId", "Replacement run required"),
  },
  running: {
    produced_output: requireContext("artifactExists", "At least one artifact required"),
    failed: requireContext("failureReason", "Failure reason required"),
    timed_out: requireContext("timeoutRecorded", "Timeout must be recorded"),
    cancelled: requireContext("cancellationReason", "Cancellation reason required"),
  },
  produced_output: {
    finalized: requireContext("artifactLinkageComplete", "Artifact linkage must be complete"),
  },
  failed: {
    finalized: requireContext("classificationExists", "Classification required"),
    superseded: requireContext("replacementRunId", "Replacement run required"),
  },
  timed_out: {
    finalized: requireContext("classificationExists", "Classification required"),
  },
  cancelled: {
    finalized: alwaysAllow,
  },
};

// --- Artifact guards ---
const artifactTransitions: StateTransitionMap = {
  created: {
    classified: requireContext("sourceExists", "Source task/run must exist"),
  },
  classified: {
    submitted: requireContext("targetExists", "Target review/consumer must exist"),
  },
  submitted: {
    under_review: requireContext("reviewRecordExists", "Review record must exist"),
  },
  under_review: {
    accepted: requireContext("reviewApproved", "Review must be approved (terminal)"),
    rejected: requireContext("rejectionReason", "Rejection reason required"),
  },
  accepted: {
    frozen: requireContext("freezeReason", "Freeze reason required"),
    superseded: requireContext("replacementArtifactId", "Replacement artifact required"),
    archived: requireContext("archivalReason", "Archival reason required"),
  },
  rejected: {
    superseded: requireContext("replacementArtifactId", "Replacement artifact required"),
  },
  frozen: {
    archived: requireContext("archivalReason", "Archival reason required"),
  },
};

export const transitionRegistry: Record<EntityType, StateTransitionMap> = {
  project: projectTransitions,
  task: taskTransitions,
  run: runTransitions,
  artifact: artifactTransitions,
  review: reviewTransitions,
  approval: approvalTransitions,
};
