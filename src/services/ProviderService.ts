// ProviderService — Provider-agnostic execution adapter
// UC-13 Execute Agent Run (Provider Call)
// Skeleton — real API calls will replace mock later.

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
  [key: string]: any;
}

interface ProviderExecuteParams {
  run: any;
  task: any;
  contextPack: any;
}

interface ProviderResult {
  success: true;
  outputText: string;
  providerId: string;
  modelId: string;
}

export class ProviderService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  async execute({ run, task, contextPack }: ProviderExecuteParams): Promise<ProviderResult> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve routing policy by task domain and owner role
      const routingPolicy = await tx.routing_policies.findFirst({
        where: {
          domain: task.domain,
          role_id: task.owner_role_id,
          is_active: true,
        },
      }).catch(() => {
        // routing_policies table may not exist yet — fallback
        return null;
      });

      let providerId: string | null = null;
      let modelId: string | null = null;
      let providerName = "mock-provider";
      let modelName = "mock-model";

      if (routingPolicy) {
        // 2. Load provider model and provider
        const providerModel = await tx.provider_models.findUniqueOrThrow({
          where: { id: routingPolicy.model_id },
        });
        const provider = await tx.providers.findUniqueOrThrow({
          where: { id: providerModel.provider_id },
        });

        // 3. Validate provider is active
        if (provider.status !== "active") {
          throw new Error(`Provider "${provider.name}" is not active (status: "${provider.status}")`);
        }

        // 4. Validate credential exists and is valid
        const credential = await tx.provider_credentials.findFirst({
          where: {
            provider_id: provider.id,
            status: "valid",
          },
        });
        if (!credential) {
          throw new Error(`No valid credential found for provider "${provider.name}"`);
        }

        providerId = provider.id;
        modelId = providerModel.id;
        providerName = provider.name;
        modelName = providerModel.model_code;
      }

      // 5. Simulate provider call (mock — real API integration later)
      const outputText = `Generated output for task "${task.title}" using ${providerName}/${modelName}. Context summary: ${contextPack?.summary ?? "none"}`;

      // 6. Log usage (best-effort — table may not exist yet)
      try {
        await tx.provider_usage_logs.create({
          data: {
            provider_id: providerId,
            model_id: modelId,
            run_id: run.id,
            project_id: run.project_id,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            estimated_cost_usd: 0,
            latency_ms: 0,
            success: true,
            created_at: new Date().toISOString(),
          },
        });
      } catch {
        // Usage logging is best-effort — don't fail the run
      }

      return {
        success: true as const,
        outputText,
        providerId: providerId ?? "mock",
        modelId: modelId ?? "mock",
      };
    });
  }
}
