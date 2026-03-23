import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useBottlenecks, useAgentPerformance, useCostAnalytics, useRiskAnalytics, useFounderInbox } from "@/hooks/use-founder-data";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, TrendingDown, DollarSign, ShieldAlert, Inbox, Clock, Ban, Zap, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function FounderDashboard() {
  const bottlenecks = useBottlenecks();
  const agents = useAgentPerformance();
  const costs = useCostAnalytics();
  const risk = useRiskAnalytics();
  const inbox = useFounderInbox();
  const navigate = useNavigate();

  const totalBottlenecks = bottlenecks.data
    ? bottlenecks.data.tasksStuckInProgress.length +
      bottlenecks.data.tasksWaitingReviewTooLong.length +
      bottlenecks.data.escalationsUnresolved.length +
      bottlenecks.data.blockedTasks.length
    : 0;

  return (
    <AppLayout title="Founder Pro Dashboard">
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Bottlenecks" value={totalBottlenecks} variant="destructive" />
          <KpiCard icon={<Activity className="h-4 w-4" />} label="Active Agents" value={(agents.data ?? []).filter(a => a.status === "active").length} />
          <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Total Cost" value={`$${costs.data?.total_cost_project ?? 0}`} />
          <KpiCard icon={<ShieldAlert className="h-4 w-4" />} label="High Risk" value={risk.data?.high_risk_validations.length ?? 0} variant="destructive" />
          <KpiCard icon={<Inbox className="h-4 w-4" />} label="Inbox" value={(inbox.data?.pendingApprovals.length ?? 0) + (inbox.data?.escalations.length ?? 0)} />
        </div>

        {/* PART 1 — Bottlenecks */}
        {bottlenecks.data && totalBottlenecks > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Bottlenecks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bottlenecks.data.tasksStuckInProgress.length > 0 && (
                  <BottleneckGroup label="Stuck In Progress (>30min)" icon={<Clock className="h-3.5 w-3.5" />} tasks={bottlenecks.data.tasksStuckInProgress} navigate={navigate} />
                )}
                {bottlenecks.data.tasksWaitingReviewTooLong.length > 0 && (
                  <BottleneckGroup label="Waiting Review Too Long" icon={<Clock className="h-3.5 w-3.5" />} tasks={bottlenecks.data.tasksWaitingReviewTooLong} navigate={navigate} />
                )}
                {bottlenecks.data.escalationsUnresolved.length > 0 && (
                  <BottleneckGroup label="Unresolved Escalations" icon={<Zap className="h-3.5 w-3.5" />} tasks={bottlenecks.data.escalationsUnresolved} navigate={navigate} />
                )}
                {bottlenecks.data.blockedTasks.length > 0 && (
                  <BottleneckGroup label="Blocked" icon={<Ban className="h-3.5 w-3.5" />} tasks={bottlenecks.data.blockedTasks} navigate={navigate} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PART 2 — Agent Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Agent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                  <TableHead className="text-right">Success %</TableHead>
                  <TableHead className="text-right">Perf Score</TableHead>
                  <TableHead className="text-right">Avg Latency</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(agents.data ?? []).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.name}
                      <Badge variant="outline" className="ml-2 text-[9px]">{a.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{a.total_runs}</TableCell>
                    <TableCell className="text-right font-mono">{(a.success_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{a.performance_score.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{a.avg_latency}ms</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">${a.avg_cost}</TableCell>
                  </TableRow>
                ))}
                {(agents.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No agent roles</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* PART 3 — Cost Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Cost by Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              {costs.data && costs.data.cost_by_provider.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costs.data.cost_by_provider} layout="vertical" margin={{ left: 60, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                    <Tooltip formatter={(v: number) => [`$${v}`, "Cost"]} />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {costs.data.cost_by_provider.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">No cost data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Cost by Role
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              {costs.data && costs.data.cost_by_role.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costs.data.cost_by_role} layout="vertical" margin={{ left: 80, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                    <Tooltip formatter={(v: number) => [`$${v}`, "Cost"]} />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {costs.data.cost_by_role.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs text-muted-foreground">No cost data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Cost summary */}
        {costs.data && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Project Cost</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-mono font-bold">${costs.data.total_cost_project}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Cost Last 24h</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-mono font-bold">${costs.data.cost_last_24h}</p></CardContent>
            </Card>
          </div>
        )}

        {/* PART 4 — Risk Panel */}
        {risk.data && (
          <Card className="border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="h-4 w-4" /> Risk Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">High Risk Validations</p>
                  <p className="text-lg font-mono font-bold">{risk.data.high_risk_validations.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Failed Runs</p>
                  <p className="text-lg font-mono font-bold">{risk.data.repeated_failures}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Retry Loops</p>
                  <p className="text-lg font-mono font-bold">{risk.data.retry_loops_detected.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Budget Status</p>
                  {risk.data.autonomy_budget_remaining.length > 0 ? (
                    risk.data.autonomy_budget_remaining.map((b: any) => (
                      <p key={b.projectId} className={`text-xs font-mono ${b.remaining <= 0 ? "text-destructive font-bold" : ""}`}>
                        {b.remaining <= 0 ? "EXCEEDED" : `${b.remaining} remaining`}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No budgets set</p>
                  )}
                </div>
              </div>

              {risk.data.retry_loops_detected.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium mb-1">Retry Loop Tasks (3+ failures)</p>
                  {risk.data.retry_loops_detected.map((r: any) => (
                    <div key={r.taskId} className="text-xs cursor-pointer hover:text-primary" onClick={() => navigate(`/control/tasks/${r.taskId}`)}>
                      Task {r.taskId.slice(0, 8)}… — {r.failedCount} failures
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* PART 5 — Founder Inbox */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Founder Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(inbox.data?.pendingApprovals ?? []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pending Approvals</p>
                {inbox.data!.pendingApprovals.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/control/approvals/${a.id}`)}>
                    <Badge variant="outline" className="text-[9px]">{a.approval_type}</Badge>
                    <span className="text-sm truncate flex-1">{a.summary}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {(inbox.data?.escalations ?? []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Escalations</p>
                {inbox.data!.escalations.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/control/tasks/${t.id}`)}>
                    <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-sm truncate flex-1">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground">{t.escalation_reason?.slice(0, 40) ?? ""}</span>
                  </div>
                ))}
              </div>
            )}

            {(inbox.data?.providerDegradedWarnings ?? []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Degraded Providers</p>
                {inbox.data!.providerDegradedWarnings.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5">
                    <Badge variant="destructive" className="text-[9px]">{p.status}</Badge>
                    <span className="text-sm">{p.name}</span>
                  </div>
                ))}
              </div>
            )}

            {!inbox.data?.pendingApprovals.length && !inbox.data?.escalations.length && !inbox.data?.providerDegradedWarnings.length && (
              <p className="text-sm text-muted-foreground">Inbox clear — no items requiring attention.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number | string; variant?: "destructive" }) {
  return (
    <Card className={variant === "destructive" && Number(value) > 0 ? "border-destructive/40" : ""}>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={variant === "destructive" && Number(value) > 0 ? "text-destructive" : "text-muted-foreground"}>{icon}</div>
        <div>
          <p className="text-lg font-mono font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BottleneckGroup({ label, icon, tasks, navigate }: { label: string; icon: React.ReactNode; tasks: any[]; navigate: (p: string) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">{icon} {label} ({tasks.length})</p>
      {tasks.slice(0, 5).map((t: any) => (
        <div key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/control/tasks/${t.id}`)}>
          <StatusBadge state={t.state} />
          <span className="text-sm truncate flex-1">{t.title}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleTimeString()}</span>
        </div>
      ))}
      {tasks.length > 5 && <p className="text-[10px] text-muted-foreground pl-2">+{tasks.length - 5} more</p>}
    </div>
  );
}
