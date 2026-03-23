// Health Check — validates database connectivity and minimum data requirements

import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  [key: string]: any;
}

interface HealthResult {
  healthy: boolean;
  checks: {
    dbConnection: boolean;
    agentRolesExist: boolean;
    tablesAccessible: boolean;
  };
  errors: string[];
  timestamp: string;
}

export async function healthCheck(prisma: PrismaLike): Promise<HealthResult> {
  const result: HealthResult = {
    healthy: true,
    checks: {
      dbConnection: false,
      agentRolesExist: false,
      tablesAccessible: false,
    },
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // 1. DB connection
  try {
    await prisma.$transaction(async (tx: any) => {
      await tx.projects.count({});
    });
    result.checks.dbConnection = true;
    logInfo("Health: DB connection OK");
  } catch (err) {
    result.healthy = false;
    result.errors.push(`DB connection failed: ${err instanceof Error ? err.message : String(err)}`);
    logError("Health: DB connection FAILED");
    return result;
  }

  // 2. Agent roles exist
  try {
    const count = await prisma.$transaction(async (tx: any) => {
      return tx.agent_roles.count({ where: { status: "active" } });
    });
    result.checks.agentRolesExist = count > 0;
    if (count === 0) {
      result.healthy = false;
      result.errors.push("No active agent roles found");
      logError("Health: No active agent roles");
    } else {
      logInfo("Health: Agent roles OK", { count });
    }
  } catch (err) {
    result.healthy = false;
    result.errors.push(`Agent roles check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Core tables accessible
  const coreTables = ["projects", "tasks", "runs", "artifacts", "reviews", "approvals", "documents", "context_packs", "activity_events"];
  try {
    await prisma.$transaction(async (tx: any) => {
      for (const table of coreTables) {
        await tx[table].count({});
      }
    });
    result.checks.tablesAccessible = true;
    logInfo("Health: All core tables accessible");
  } catch (err) {
    result.healthy = false;
    result.errors.push(`Table access failed: ${err instanceof Error ? err.message : String(err)}`);
    logError("Health: Table access FAILED");
  }

  return result;
}
