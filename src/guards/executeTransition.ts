import { GuardError } from "./GuardError";
import { transitionRegistry, type EntityType, type TransitionContext } from "./transitionRegistry";

export async function executeTransition({
  entityType,
  entityId,
  fromState,
  toState,
  context = {},
}: {
  entityType: EntityType;
  entityId: string;
  fromState: string;
  toState: string;
  context?: TransitionContext;
}): Promise<{ allowed: true }> {
  const entityMap = transitionRegistry[entityType];
  if (!entityMap) {
    throw new GuardError({
      message: `Unknown entity type: ${entityType}`,
      entityType,
      entityId,
      fromState,
      toState,
    });
  }

  const fromMap = entityMap[fromState];
  const guard = fromMap?.[toState];

  if (!guard) {
    throw new GuardError({
      message: `No transition defined: ${entityType} ${fromState} → ${toState}`,
      entityType,
      entityId,
      fromState,
      toState,
    });
  }

  const result = await guard({ entityId, fromState, toState, context });

  if (!result.allowed) {
    const denied = result as { allowed: false; reason: string };
    throw new GuardError({
      message: denied.reason,
      entityType,
      entityId,
      fromState,
      toState,
    });
  }

  return { allowed: true };
}
