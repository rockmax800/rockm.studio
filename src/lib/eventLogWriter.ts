/**
 * Canonical event_log writer utility.
 * Ensures all domain events are recorded in the append-only event_log.
 * Best-effort: failures do not break the calling transaction.
 */

interface PrismaTransactionClient {
  [key: string]: {
    create: (args: any) => Promise<any>;
  };
}

export interface EventLogEntry {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  actorType: string;
  actorRef?: string | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
}

/**
 * Write a canonical event_log entry inside an existing transaction.
 * Best-effort — catches errors so the parent transaction is not broken
 * if event_log table doesn't exist yet.
 */
export async function writeEventLog(
  tx: PrismaTransactionClient,
  entry: EventLogEntry,
): Promise<void> {
  try {
    await (tx as any).event_log.create({
      data: {
        event_type: entry.eventType,
        aggregate_type: entry.aggregateType,
        aggregate_id: entry.aggregateId,
        payload_json: entry.payload,
        actor_type: entry.actorType,
        actor_ref: entry.actorRef ?? null,
        correlation_id: entry.correlationId ?? null,
        causation_id: entry.causationId ?? null,
        idempotency_key: entry.idempotencyKey ?? null,
      },
    });
  } catch {
    // Best-effort — event_log table may not exist yet
  }
}
