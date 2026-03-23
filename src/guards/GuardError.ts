export class GuardError extends Error {
  public readonly errorCode = "TRANSITION_DENIED";
  public readonly entityType: string;
  public readonly entityId: string;
  public readonly fromState: string;
  public readonly toState: string;

  constructor({
    message,
    entityType,
    entityId,
    fromState,
    toState,
  }: {
    message: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
  }) {
    super(message);
    this.name = "GuardError";
    this.entityType = entityType;
    this.entityId = entityId;
    this.fromState = fromState;
    this.toState = toState;
  }
}
