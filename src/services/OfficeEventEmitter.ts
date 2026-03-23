// Office Event Emitter — utility for autonomy layer events (PART 7)
// Emits events for: adaptive_route, dual_validation_failed, auto_retry

import { logError } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

export class OfficeEventEmitter {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async emitOfficeEvent({
    projectId,
    entityType,
    entityId,
    eventType,
    actorRoleId,
    fromZone,
    toZone,
  }: {
    projectId: string;
    entityType: string;
    entityId: string;
    eventType: string;
    actorRoleId?: string | null;
    fromZone?: string;
    toZone?: string;
  }): Promise<void> {
    try {
      await this.prisma.office_events.create({
        data: {
          project_id: projectId,
          entity_type: entityType,
          entity_id: entityId,
          event_type: eventType,
          actor_role_id: actorRoleId ?? null,
          from_zone: fromZone ?? null,
          to_zone: toZone ?? null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logError("office_event_emit_failed", { eventType, entityId, error: error instanceof Error ? error.message : "unknown" });
    }
  }
}
