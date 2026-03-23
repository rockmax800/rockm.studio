export class ConcurrencyError extends Error {
  public readonly errorCode = "CONCURRENCY_CONFLICT";
  public readonly entityType: string;
  public readonly entityId: string;

  constructor({
    message,
    entityType,
    entityId,
  }: {
    message: string;
    entityType: string;
    entityId: string;
  }) {
    super(message);
    this.name = "ConcurrencyError";
    this.entityType = entityType;
    this.entityId = entityId;
  }
}
