// Logger — structured console logging for backend services
// Replace with structured logger (pino, winston) when needed.

type LogLevel = "info" | "warn" | "error" | "guard";

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, message: string, data?: Record<string, unknown>): string {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  return data ? `${base} ${JSON.stringify(data)}` : base;
}

export function logInfo(message: string, data?: Record<string, unknown>) {
  console.log(format("info", message, data));
}

export function logError(message: string, data?: Record<string, unknown>) {
  console.error(format("error", message, data));
}

export function logGuardFailure(
  entityType: string,
  entityId: string,
  fromState: string,
  toState: string,
  reason: string,
) {
  console.error(
    format("guard", `Transition denied: ${entityType} ${fromState} → ${toState}`, {
      entityType,
      entityId,
      fromState,
      toState,
      reason,
    }),
  );
}
