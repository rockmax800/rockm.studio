// Outbox Dispatcher Service
// Polls outbox_events with status=pending and dispatches them.
// DB-first consistency: events are written in-transaction, dispatched asynchronously.
// No external message broker — local dispatch only.

import { logInfo } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

const MAX_RETRY_COUNT = 5;
const BATCH_SIZE = 50;

export class OutboxDispatcherService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Poll pending outbox events and dispatch them.
   * Returns count of successfully dispatched events.
   */
  async dispatchPending(): Promise<number> {
    const pending = await this.prisma.outbox_events?.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: BATCH_SIZE,
    });

    if (!pending || pending.length === 0) return 0;

    let dispatched = 0;

    for (const event of pending) {
      try {
        await this.dispatchEvent(event);

        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            status: "dispatched",
            dispatched_at: new Date().toISOString(),
          },
        });

        dispatched++;
      } catch (error) {
        const newRetryCount = (event.retry_count ?? 0) + 1;
        const newStatus = newRetryCount >= MAX_RETRY_COUNT ? "failed" : "pending";

        await this.prisma.outbox_events.update({
          where: { id: event.id },
          data: {
            retry_count: newRetryCount,
            status: newStatus,
          },
        });

        logInfo("outbox_dispatch_error", {
          eventId: event.id,
          eventType: event.event_type,
          retryCount: newRetryCount,
          failed: newStatus === "failed",
        });
      }
    }

    if (dispatched > 0) {
      logInfo("outbox_dispatched", { count: dispatched, total: pending.length });
    }

    return dispatched;
  }

  /**
   * Dispatch a single outbox event to its consumers.
   * Currently: WebSocket feed, OfficeEvent feed, ActivityEvent feed.
   * No external brokers — all local.
   */
  private async dispatchEvent(event: any): Promise<void> {
    const { event_type, aggregate_type, aggregate_id, payload_json } = event;

    // WebSocket notification (placeholder — no real WS server yet)
    // In production this would push to connected clients
    logInfo("outbox_event_dispatched", {
      eventType: event_type,
      aggregateType: aggregate_type,
      aggregateId: aggregate_id,
      correlationId: event.correlation_id,
    });

    // OfficeEvent feed for task transitions is already written in-transaction
    // This dispatch point is for future WebSocket/SSE push
  }

  /**
   * Get count of pending events (for monitoring).
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.outbox_events?.count({
      where: { status: "pending" },
    }) ?? 0;
  }

  /**
   * Get count of failed events (for alerting).
   */
  async getFailedCount(): Promise<number> {
    return this.prisma.outbox_events?.count({
      where: { status: "failed" },
    }) ?? 0;
  }
}
