import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProviderList } from "@/hooks/use-provider-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useWorkerNodes, useStalledEntities, useResourceMetrics } from "@/hooks/use-diagnostics-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Unplug, Settings, Activity, Shield, BookOpen, Server, AlertTriangle, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";

const TraceExplorer = lazy(() => import("@/components/system/TraceExplorer"));

function WorkerStatusBadge({ status }: { status: string }) {
  const variant = status === "online" ? "default"
    : status === "degraded" ? "secondary"
    : "destructive";
  return <Badge variant={variant} className="text-[10px]">{status}</Badge>;
}

function PressureBadge({ level }: { level: string }) {
  const variant = level === "normal" ? "default"
    : level === "elevated" ? "secondary"
    : "destructive";
  return <Badge variant={variant} className="text-[10px]">{level}</Badge>;
}

export default function SystemPage() {
  const { data: providers = [] } = useProviderList();
  const { data: modeData } = useSystemMode();
  const { data: workers = [] } = useWorkerNodes();
  const { data: stalled } = useStalledEntities();
  const { data: resources } = useResourceMetrics();

  const onlineWorkers = workers.filter((w: any) => w.derived_status === "online").length;
  const stalledCount = stalled?.total_issues ?? 0;

  return (
    <AppLayout title="System">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">System Administration</h1>

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList>
            <TabsTrigger value="health" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Health
              {stalledCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[9px] px-1.5 py-0">{stalledCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="providers" className="gap-1.5">
              <Unplug className="h-3.5 w-3.5" /> Providers
            </TabsTrigger>
            <TabsTrigger value="mode" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Mode
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Audit
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Documentation
            </TabsTrigger>
          </TabsList>

          {/* HEALTH — Operational Diagnostics Dashboard */}
          <TabsContent value="health" className="space-y-4">
            {/* Resource Pressure */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> Resource Pressure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <PressureBadge level={resources?.pressure_level ?? "normal"} />
                  {resources?.warnings && resources.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {resources.warnings.map((w: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] text-destructive border-destructive/30">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Workers</p>
                    <p className="font-mono font-medium">{resources?.worker_count ?? 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Avg CPU</p>
                    <p className="font-mono font-medium">{resources?.avg_cpu_pct ?? "—"}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Avg Memory</p>
                    <p className="font-mono font-medium">{resources?.avg_memory_pct ?? "—"}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Active Runs</p>
                    <p className="font-mono font-medium">{resources?.active_runs ?? 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Outbox Pending</p>
                    <p className="font-mono font-medium">{resources?.pending_outbox ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workers */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4" /> Workers
                  <Badge variant="outline" className="text-[10px] ml-auto">{onlineWorkers}/{workers.length} online</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No workers registered.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Hostname</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Runs</TableHead>
                        <TableHead className="text-xs">CPU</TableHead>
                        <TableHead className="text-xs">Memory</TableHead>
                        <TableHead className="text-xs">Containers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workers.map((w: any) => (
                        <TableRow key={w.id}>
                          <TableCell className="text-xs font-mono">{w.hostname}</TableCell>
                          <TableCell><WorkerStatusBadge status={w.derived_status} /></TableCell>
                          <TableCell className="text-xs font-mono">{w.active_runs_count}</TableCell>
                          <TableCell className="text-xs font-mono">{w.cpu_usage_pct != null ? `${w.cpu_usage_pct}%` : "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{w.memory_usage_pct != null ? `${w.memory_usage_pct}%` : "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{w.docker_container_count ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Stalled Entities */}
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Stalled Entities
                  {stalledCount > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{stalledCount} issues</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stalledCount === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No stalled entities detected.</p>
                ) : (
                  <div className="space-y-3">
                    {(stalled?.stalled_runs ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5">Stalled Runs ({stalled?.stalled_runs.length})</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Run ID</TableHead>
                              <TableHead className="text-xs">State</TableHead>
                              <TableHead className="text-xs">Lease Owner</TableHead>
                              <TableHead className="text-xs">Last Update</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(stalled?.stalled_runs ?? []).slice(0, 10).map((r: any) => (
                              <TableRow key={r.id}>
                                <TableCell className="text-xs font-mono">{r.id.slice(0, 8)}</TableCell>
                                <TableCell><Badge variant="secondary" className="text-[10px]">{r.state}</Badge></TableCell>
                                <TableCell className="text-xs font-mono">{r.lease_owner ?? "—"}</TableCell>
                                <TableCell className="text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {(stalled?.stuck_deploys ?? []).length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1.5">Stuck Deployments ({stalled?.stuck_deploys.length})</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Deploy ID</TableHead>
                              <TableHead className="text-xs">Environment</TableHead>
                              <TableHead className="text-xs">Version</TableHead>
                              <TableHead className="text-xs">Started</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(stalled?.stuck_deploys ?? []).slice(0, 10).map((d: any) => (
                              <TableRow key={d.id}>
                                <TableCell className="text-xs font-mono">{d.id.slice(0, 8)}</TableCell>
                                <TableCell><Badge variant="outline" className="text-[10px]">{d.environment}</Badge></TableCell>
                                <TableCell className="text-xs font-mono">{d.version_label ?? "—"}</TableCell>
                                <TableCell className="text-xs">{d.started_at ? new Date(d.started_at).toLocaleString() : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROVIDERS */}
          <TabsContent value="providers">
            {providers.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Unplug className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No providers configured.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Provider</TableHead>
                        <TableHead className="text-xs">Code</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Models</TableHead>
                        <TableHead className="text-xs">24h Calls</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providers.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs font-mono">{p.code}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.modelCount ?? 0}</TableCell>
                          <TableCell className="text-xs">{p.recentUsageCount ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MODE */}
          <TabsContent value="mode">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">System Mode</h3>
                <Badge className="text-xs px-3 py-1 font-mono">
                  {modeData?.mode === "production" ? "🛡 PRODUCTION MODE" : "🧪 EXPERIMENTAL MODE"}
                </Badge>
                {modeData?.experimental_features && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground">Feature Flags:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(modeData.experimental_features).map(([key, enabled]) => (
                        <Badge
                          key={key}
                          variant={enabled ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {key.replace("enable_", "")}: {enabled ? "ON" : "OFF"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIT — Operational Trace Explorer */}
          <TabsContent value="audit">
            <Suspense fallback={<div className="text-xs text-muted-foreground text-center py-8">Loading trace explorer…</div>}>
              <TraceExplorer />
            </Suspense>
          </TabsContent>

          {/* DOCS */}
          <TabsContent value="docs">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3">Documentation</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  System documentation workspace for managing specs, briefs, and architecture documents.
                </p>
                <Link to="/docs">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <BookOpen className="h-3.5 w-3.5" /> Open Docs Workspace
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
