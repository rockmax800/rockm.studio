// State Mutation Protection Wrapper
// Prevents direct state field updates outside OrchestrationService.
// Wraps Prisma client with middleware-like interception.

import { logError } from "@/lib/logger";

interface PrismaTransactionClient {
  [key: string]: any;
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
  [key: string]: any;
}

const STATE_TABLES = new Set([
  "projects",
  "tasks",
  "runs",
  "artifacts",
  "reviews",
  "approvals",
]);

function isCalledFromOrchestration(): boolean {
  const stack = new Error().stack ?? "";
  return (
    stack.includes("OrchestrationService") ||
    stack.includes("orchestrationService") ||
    stack.includes("transitionEntity")
  );
}

function wrapTable(target: any, tableName: string): any {
  if (!STATE_TABLES.has(tableName)) return target;

  const originalUpdate = target.update?.bind(target);
  const originalUpdateMany = target.updateMany?.bind(target);

  if (originalUpdate) {
    target.update = (args: any) => {
      if (args?.data && "state" in args.data && !isCalledFromOrchestration()) {
        const msg = `Direct state mutation forbidden on "${tableName}". Use OrchestrationService.transitionEntity().`;
        logError(msg, { table: tableName, data: args.data });
        throw new Error(msg);
      }
      return originalUpdate(args);
    };
  }

  if (originalUpdateMany) {
    target.updateMany = (args: any) => {
      if (args?.data && "state" in args.data && !isCalledFromOrchestration()) {
        const msg = `Direct state mutation forbidden on "${tableName}" (updateMany). Use OrchestrationService.transitionEntity().`;
        logError(msg, { table: tableName });
        throw new Error(msg);
      }
      return originalUpdateMany(args);
    };
  }

  return target;
}

export function createSafePrisma(prisma: PrismaLike): PrismaLike {
  const handler: ProxyHandler<PrismaLike> = {
    get(target, prop: string) {
      const value = target[prop];

      // Wrap $transaction to also protect inner tx client
      if (prop === "$transaction") {
        return async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
          return target.$transaction(async (tx: any) => {
            const txProxy = new Proxy(tx, {
              get(txTarget: any, txProp: string) {
                const txValue = txTarget[txProp];
                if (typeof txValue === "object" && txValue !== null && STATE_TABLES.has(txProp)) {
                  return wrapTable({ ...txValue }, txProp);
                }
                return txValue;
              },
            });
            return fn(txProxy);
          });
        };
      }

      // Wrap direct table access
      if (typeof value === "object" && value !== null && STATE_TABLES.has(prop)) {
        return wrapTable({ ...value }, prop);
      }

      return value;
    },
  };

  return new Proxy(prisma, handler);
}
