import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProviderDetail } from "@/hooks/use-provider-data";

function statusVariant(s: string) {
  if (s === "active" || s === "healthy" || s === "valid") return "green" as const;
  if (s === "degraded" || s === "expired" || s === "deprecated") return "amber" as const;
  if (s === "inactive" || s === "unavailable" || s === "missing" || s === "error" || s === "disabled") return "red" as const;
  return "neutral" as const;
}

export default function ControlProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useProviderDetail(id!);

  if (!id) return null;

  return (
    <AppLayout title="Provider Detail">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* Provider Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{data.provider.name}</CardTitle>
                <Badge variant={statusVariant(data.provider.status)}>{data.provider.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Code</p>
                  <p className="font-mono font-medium">{data.provider.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Base URL</p>
                  <p className="font-mono text-xs">{data.provider.base_url ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Credential</p>
                  {data.credential ? (
                    <div>
                      <Badge variant={statusVariant(data.credential.status)}>{data.credential.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{data.credential.credential_label}</p>
                    </div>
                  ) : (
                    <Badge variant="red">missing</Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Capabilities</p>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {data.provider.supports_text && <Badge variant="neutral" className="text-xs">Text</Badge>}
                    {data.provider.supports_streaming && <Badge variant="neutral" className="text-xs">Streaming</Badge>}
                    {data.provider.supports_tools && <Badge variant="neutral" className="text-xs">Tools</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Models */}
          <Card>
            <CardHeader><CardTitle>Models ({data.models.length})</CardTitle></CardHeader>
            <CardContent>
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
                  {data.models.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{m.display_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{m.model_code}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(m.status)}>{m.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.intended_use ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{m.max_context ? `${(m.max_context / 1000).toFixed(0)}k` : "—"}</TableCell>
                      <TableCell className="text-sm">{m.cost_profile_hint ?? "—"}</TableCell>
                      <TableCell className="text-sm">{m.latency_profile_hint ?? "—"}</TableCell>
                      <TableCell className="text-sm">{m.quality_profile_hint ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {data.models.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No models</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Routing Policies */}
          <Card>
            <CardHeader><CardTitle>Routing Policies ({data.routingPolicies.length})</CardTitle></CardHeader>
            <CardContent>
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
                  {data.routingPolicies.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.policy_name}</TableCell>
                      <TableCell><Badge variant="blue" className="text-xs">{p.task_domain}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.role_code}</TableCell>
                      <TableCell className="text-sm">{data.modelMap[p.preferred_model_id] ?? p.preferred_model_id?.slice(0, 8)}</TableCell>
                      <TableCell>
                        {p.allow_fallback && p.fallback_model_id ? (
                          <span className="text-sm">→ {data.modelMap[p.fallback_model_id] ?? p.fallback_model_id?.slice(0, 8)}</span>
                        ) : (
                          <Badge variant="neutral" className="text-xs">disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{p.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {data.routingPolicies.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No policies</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Usage */}
          <Card>
            <CardHeader><CardTitle>Recent Usage ({data.recentUsage.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentUsage.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.run_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="text-sm">{u.model_id ? (data.modelMap[u.model_id] ?? u.model_id.slice(0, 8)) : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{u.total_tokens ?? 0}</TableCell>
                      <TableCell className="font-mono text-sm">${Number(u.estimated_cost_usd ?? 0).toFixed(4)}</TableCell>
                      <TableCell><Badge variant={u.success ? "green" : "red"}>{u.success ? "yes" : "no"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {data.recentUsage.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No usage data</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
