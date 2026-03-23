import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Cpu,
  DollarSign,
  Key,
  LayoutList,
  Route,
  Server,
  ShieldAlert,
  XCircle,
  Zap,
} from "lucide-react";
import {
  mockProviders,
  mockModels,
  mockRoutingPolicies,
  mockUsageSnapshots,
  getProviderModels,
  getProviderCredential,
  getProviderHealth,
  getProviderUsage,
  getProviderPolicies,
  type Provider,
  type ProviderStatus,
  type CredentialStatus,
  type ModelStatus,
} from "@/data/providers-mock";

// ── Status helpers ──

function providerStatusVariant(s: ProviderStatus) {
  switch (s) {
    case "healthy": return "green" as const;
    case "degraded": return "amber" as const;
    case "unavailable": return "red" as const;
    case "misconfigured": return "red" as const;
  }
}

function credentialStatusVariant(s: CredentialStatus) {
  switch (s) {
    case "valid": return "green" as const;
    case "expired": return "amber" as const;
    case "missing": return "red" as const;
    case "error": return "red" as const;
  }
}

function modelStatusVariant(s: ModelStatus) {
  switch (s) {
    case "active": return "green" as const;
    case "deprecated": return "amber" as const;
    case "disabled": return "neutral" as const;
  }
}

function costHintColor(hint: string) {
  switch (hint) {
    case "low": return "text-status-green";
    case "medium": return "text-status-amber";
    case "high": return "text-status-red";
    default: return "text-muted-foreground";
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Components ──

function ProviderCard({ provider, onSelect }: { provider: Provider; onSelect: () => void }) {
  const health = getProviderHealth(provider.id);
  const cred = getProviderCredential(provider.id);
  const usage = getProviderUsage(provider.id);
  const models = getProviderModels(provider.id);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{provider.code}</CardDescription>
            </div>
          </div>
          <Badge variant={providerStatusVariant(provider.status)}>{provider.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Models</p>
            <p className="font-medium">{models.length} active</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Credential</p>
            <Badge variant={credentialStatusVariant(cred?.status ?? "missing")} className="text-xs">
              {cred?.status ?? "missing"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Error Rate</p>
            <p className="font-medium">{health ? `${health.recentErrorRate}%` : "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Last OK</p>
            <p className="font-medium">{timeAgo(health?.lastSuccessAt ?? null)}</p>
          </div>
        </div>
        {usage && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{usage.period} est. cost</span>
            <span className="font-semibold font-mono">${usage.estimatedCostUsd.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderDetailPanel({ provider }: { provider: Provider }) {
  const health = getProviderHealth(provider.id);
  const cred = getProviderCredential(provider.id);
  const usage = getProviderUsage(provider.id);
  const models = getProviderModels(provider.id);
  const policies = getProviderPolicies(provider.id);

  return (
    <div className="space-y-6">
      {/* Health card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Health & Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant={providerStatusVariant(provider.status)}>{provider.status}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Reachable</p>
              <p className="font-medium flex items-center gap-1">
                {health?.reachable
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-status-green" /> Yes</>
                  : <><XCircle className="h-3.5 w-3.5 text-status-red" /> No</>}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Error Rate</p>
              <p className="font-medium">{health?.recentErrorRate ?? 0}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Rate Limit Warning</p>
              <p className="font-medium">
                {health?.rateLimitWarning
                  ? <span className="text-status-amber flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Active</span>
                  : "None"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Success</p>
              <p className="font-medium">{timeAgo(health?.lastSuccessAt ?? null)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Failure</p>
              <p className="font-medium">{timeAgo(health?.lastFailureAt ?? null)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credential card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4" /> Credential
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cred ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Label</p>
                <p className="font-medium">{cred.credentialLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant={credentialStatusVariant(cred.status)}>{cred.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last Validated</p>
                <p className="font-medium">{timeAgo(cred.lastValidatedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Last Error</p>
                <p className="font-medium">{cred.lastError ?? "—"}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-status-red text-sm">
              <ShieldAlert className="h-4 w-4" />
              No credential configured
            </div>
          )}
        </CardContent>
      </Card>

      {/* Models table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" /> Models ({models.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Intended Use</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{m.displayName}</p>
                      <p className="text-xs font-mono text-muted-foreground">{m.modelCode}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={modelStatusVariant(m.status)}>{m.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.intendedUse}</TableCell>
                  <TableCell className="font-mono text-sm">{m.maxContext ? `${(m.maxContext / 1000).toFixed(0)}k` : "—"}</TableCell>
                  <TableCell><span className={costHintColor(m.costProfileHint)}>{m.costProfileHint}</span></TableCell>
                  <TableCell className="text-sm">{m.latencyProfileHint}</TableCell>
                  <TableCell className="text-sm">{m.qualityProfileHint}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Routing policies for this provider */}
      {policies.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" /> Routing Policies ({policies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Fallback</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => {
                  const model = mockModels.find((m) => m.id === p.preferredModelId);
                  const fbModel = p.fallbackModelId ? mockModels.find((m) => m.id === p.fallbackModelId) : null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.policyName}</TableCell>
                      <TableCell><Badge variant="blue" className="text-xs">{p.taskDomain}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.roleCode}</TableCell>
                      <TableCell className="text-sm">{model?.displayName ?? p.preferredModelId}</TableCell>
                      <TableCell>
                        {p.allowFallback && fbModel
                          ? <span className="text-sm flex items-center gap-1"><ArrowRight className="h-3 w-3 text-muted-foreground" /> {fbModel.displayName}</span>
                          : <span className="text-xs text-muted-foreground">disabled</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{p.notes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Usage */}
      {usage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Usage — {usage.period}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Requests</p>
                <p className="font-semibold font-mono">{usage.requestCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Input Tokens</p>
                <p className="font-semibold font-mono">{(usage.inputTokens / 1_000_000).toFixed(2)}M</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Output Tokens</p>
                <p className="font-semibold font-mono">{(usage.outputTokens / 1_000_000).toFixed(2)}M</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Est. Cost</p>
                <p className="font-semibold font-mono text-primary">${usage.estimatedCostUsd.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Internal estimate — not billing truth
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──

export default function ProvidersPage() {
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const selectedProvider = selectedProviderId
    ? mockProviders.find((p) => p.id === selectedProviderId) ?? null
    : null;

  const totalCost = mockUsageSnapshots.reduce((s, u) => s + u.estimatedCostUsd, 0);
  const totalRequests = mockUsageSnapshots.reduce((s, u) => s + u.requestCount, 0);

  return (
    <AppLayout title="Provider Control">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Providers</p>
                <p className="text-xl font-semibold">{mockProviders.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-status-green/10 flex items-center justify-center">
                <Cpu className="h-4 w-4 text-status-green" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Models</p>
                <p className="text-xl font-semibold">{mockModels.filter((m) => m.status === "active").length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-status-blue/10 flex items-center justify-center">
                <Route className="h-4 w-4 text-status-blue" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Routing Policies</p>
                <p className="text-xl font-semibold">{mockRoutingPolicies.filter((p) => p.status === "active").length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-status-amber/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-status-amber" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">March Est. Cost</p>
                <p className="text-xl font-semibold font-mono">${totalCost.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="providers" className="gap-1.5"><Server className="h-3.5 w-3.5" /> Providers</TabsTrigger>
            <TabsTrigger value="routing" className="gap-1.5"><Route className="h-3.5 w-3.5" /> Routing Policies</TabsTrigger>
            <TabsTrigger value="cost" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Cost Overview</TabsTrigger>
          </TabsList>

          {/* ── Providers Tab ── */}
          <TabsContent value="providers" className="space-y-6">
            {selectedProvider ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedProviderId(null)}>
                  ← Back to providers
                </Button>
                <ProviderDetailPanel provider={selectedProvider} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockProviders.map((p) => (
                  <ProviderCard key={p.id} provider={p} onSelect={() => setSelectedProviderId(p.id)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Routing Policies Tab ── */}
          <TabsContent value="routing">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Routing Policies</CardTitle>
                <CardDescription>Task domain → provider/model mapping with fallback rules</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Fallback</TableHead>
                      <TableHead>Cross-Provider Retry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockRoutingPolicies.map((p) => {
                      const prov = mockProviders.find((pr) => pr.id === p.preferredProviderId);
                      const model = mockModels.find((m) => m.id === p.preferredModelId);
                      const fbProv = p.fallbackProviderId ? mockProviders.find((pr) => pr.id === p.fallbackProviderId) : null;
                      const fbModel = p.fallbackModelId ? mockModels.find((m) => m.id === p.fallbackModelId) : null;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.policyName}</TableCell>
                          <TableCell><Badge variant="blue" className="text-xs">{p.taskDomain}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{p.roleCode}</TableCell>
                          <TableCell>{prov?.name ?? "—"}</TableCell>
                          <TableCell>{model?.displayName ?? "—"}</TableCell>
                          <TableCell>
                            {p.allowFallback && fbProv && fbModel
                              ? <span className="text-sm">{fbProv.name} / {fbModel.displayName}</span>
                              : <Badge variant="muted" className="text-xs">disabled</Badge>}
                          </TableCell>
                          <TableCell>
                            {p.allowCrossProviderRetry
                              ? <Badge variant="cyan" className="text-xs">yes</Badge>
                              : <Badge variant="muted" className="text-xs">no</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "green" : "neutral"} className="text-xs">{p.status}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Cost Tab ── */}
          <TabsContent value="cost" className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-status-amber/10 border border-status-amber/20">
              <AlertTriangle className="h-4 w-4 text-status-amber shrink-0" />
              <p className="text-sm text-foreground">
                Cost figures are internal estimates based on logged token usage. They are not billing truth. Reconcile with provider consoles for accurate billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockUsageSnapshots.map((u) => {
                const prov = mockProviders.find((p) => p.id === u.providerId);
                return (
                  <Card key={u.providerId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{prov?.name ?? u.providerId}</CardTitle>
                      <CardDescription>Period: {u.period}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Requests</p>
                          <p className="text-2xl font-bold font-mono">{u.requestCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Est. Cost</p>
                          <p className="text-2xl font-bold font-mono text-primary">${u.estimatedCostUsd.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Input Tokens</p>
                          <p className="font-semibold font-mono">{(u.inputTokens / 1_000_000).toFixed(2)}M</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Output Tokens</p>
                          <p className="font-semibold font-mono">{(u.outputTokens / 1_000_000).toFixed(2)}M</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <span className="font-medium">Total Estimated Spend (March 2026)</span>
                <span className="text-2xl font-bold font-mono text-primary">${totalCost.toFixed(2)}</span>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
