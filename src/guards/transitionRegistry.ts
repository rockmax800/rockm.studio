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

export const transitionRegistry: Record<EntityType, StateTransitionMap> = {
  project: {},
  task: {},
  run: {},
  artifact: {},
  review: {},
  approval: {},
};
