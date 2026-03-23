// HR Dashboard — AI Company HR Core with Replacement Engine
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHRDashboard, useGenerateCandidates, useApproveProposal, useExecuteProposal } from "@/hooks/use-hr-data";
import { Users, UserCheck, UserX, AlertTriangle, TrendingUp, Star, UserPlus, RefreshCw, CheckCircle, Play } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  probation: "secondary",
  inactive: "destructive",
};

const SUGGESTION_ICON: Record<string, typeof AlertTriangle> = {
  replace: AlertTriangle,
  promote: TrendingUp,
  probation: UserX,
};

export default function HRDashboard() {
  const { data, isLoading, error } = useHRDashboard();
  const generateCandidates = useGenerateCandidates();
  const approveProposal = useApproveProposal();
  const executeProposal = useExecuteProposal();

  return (
    <AppLayout title="AI Company HR">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard icon={<Users className="h-4 w-4" />} label="Total Employees" value={data.employees.length} />
            <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Active" value={data.totalActive} />
            <KpiCard icon={<UserX className="h-4 w-4" />} label="Probation" value={data.totalProbation} variant={data.totalProbation > 0 ? "warn" : undefined} />
            <KpiCard icon={<Star className="h-4 w-4" />} label="Avg Reputation" value={data.avgReputation.toFixed(3)} />
            <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Suggestions" value={data.suggestions.length} variant={data.suggestions.length > 0 ? "warn" : undefined} />
          </div>

          {/* HR Suggestions with Generate Candidates button */}
          {data.suggestions.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> HR Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.suggestions.map((s, i) => {
                  const Icon = SUGGESTION_ICON[s.suggestion_type] ?? AlertTriangle;
                  return (
                    <div key={i} className="flex items-start gap-2 py-2 border-b last:border-0">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                        s.suggestion_type === "replace" ? "text-destructive" :
                        s.suggestion_type === "promote" ? "text-emerald-500" :
                        "text-amber-500"
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={s.suggestion_type === "replace" ? "destructive" : s.suggestion_type === "promote" ? "default" : "secondary"} className="text-[9px]">
                            {s.suggestion_type}
                          </Badge>
                          <span className="text-xs font-medium">{s.employee_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                      </div>
                      {s.suggestion_type === "replace" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 shrink-0"
                          onClick={() => generateCandidates.mutate(s.employee_id)}
                          disabled={generateCandidates.isPending}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Find Replacements
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Candidate Proposals */}
          {data.proposals && data.proposals.length > 0 && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Replacement Proposals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>For Employee</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="text-right">Proj. Success</TableHead>
                      <TableHead className="text-right">Proj. Cost</TableHead>
                      <TableHead className="text-right">Proj. Latency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.proposals.map((p: any) => (
                      <TableRow key={p.id} className={p.executed ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <span className="text-xs font-medium">{p.employee_name}</span>
                            <Badge variant="outline" className="text-[8px] ml-1">{p.employee_role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{p.suggested_provider ?? "—"}</TableCell>
                        <TableCell className="text-xs">{p.suggested_model ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{(p.projected_success_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-mono text-xs">${p.projected_cost?.toFixed(3) ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Math.round(p.projected_latency ?? 0)}ms</TableCell>
                        <TableCell>
                          {p.executed ? (
                            <Badge variant="default" className="text-[9px]">Executed</Badge>
                          ) : p.approved ? (
                            <Badge className="text-[9px] bg-emerald-600">Approved</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[9px]">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!p.executed && (
                            <div className="flex gap-1">
                              {!p.approved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[10px] h-6"
                                  onClick={() => approveProposal.mutate(p.id)}
                                  disabled={approveProposal.isPending}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" /> Approve
                                </Button>
                              )}
                              {p.approved && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="text-[10px] h-6"
                                  onClick={() => executeProposal.mutate(p.id)}
                                  disabled={executeProposal.isPending}
                                >
                                  <Play className="h-3 w-3 mr-1" /> Execute
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Proposals require founder approval before execution. Employees with active tasks cannot be replaced.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Employee Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Employee Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Success %</TableHead>
                    <TableHead className="text-right">Bug Rate</TableHead>
                    <TableHead className="text-right">Reputation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employees.map((emp: any) => (
                    <TableRow key={emp.id} className={
                      emp.status === "inactive" ? "opacity-40" :
                      emp.reputation_score < 0.2 ? "bg-destructive/5" :
                      emp.reputation_score > 0.5 ? "bg-emerald-500/5" : ""
                    }>
                      <TableCell className="font-medium">
                        {emp.name}
                        {emp.status === "inactive" && <span className="text-[9px] text-muted-foreground ml-1">(former)</span>}
                        {/* Check if hired recently (within last hour for demo) */}
                        {emp.status === "active" && new Date(emp.hired_at).getTime() > Date.now() - 3600000 && (
                          <Badge variant="default" className="text-[8px] ml-1 bg-emerald-600">New Hire</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px]">{emp.role_code}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{emp.model_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{(emp.success_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono">{(emp.bug_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={emp.reputation_score < 0.2 ? "text-destructive font-bold" : emp.reputation_score > 0.5 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                          {emp.reputation_score.toFixed(3)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[emp.status] ?? "outline"} className="text-[9px]">
                          {emp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No AI employees registered yet. Employees are created when agent roles are mapped.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}

function KpiCard({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number | string; variant?: "warn" }) {
  return (
    <Card className={variant === "warn" && Number(value) > 0 ? "border-amber-500/40" : ""}>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={variant === "warn" && Number(value) > 0 ? "text-amber-500" : "text-muted-foreground"}>{icon}</div>
        <div>
          <p className="text-lg font-mono font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
