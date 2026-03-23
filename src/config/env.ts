// Environment configuration with validation
// Throws at startup in production if required keys are missing.

interface EnvConfig {
  OPENAI_API_KEY: string | undefined;
  ANTHROPIC_API_KEY: string | undefined;
  NODE_ENV: string;
  isProduction: boolean;
}

function loadEnv(): EnvConfig {
  const NODE_ENV = process.env.NODE_ENV ?? "development";
  const isProduction = NODE_ENV === "production";

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (isProduction) {
    const missing: string[] = [];
    if (!OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
    if (!ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production: ${missing.join(", ")}`,
      );
    }
  }

  return { OPENAI_API_KEY, ANTHROPIC_API_KEY, NODE_ENV, isProduction };
}

export const env = loadEnv();
