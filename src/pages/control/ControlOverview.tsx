import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardOverview } from "@/hooks/use-control-data";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, ShieldAlert, FolderOpen } from "lucide-react";

export default function ControlOverview() {
  const { data, isLoading, error } = useDashboardOverview();
  const navigate = useNavigate();

  return (
    <AppLayout title="Founder Control Plane">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FolderOpen className="h-4 w-4" />Projects</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{data.projects.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" />Pending Approvals</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{data.pendingApprovals.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Failed Runs</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{data.recentlyFailedRuns.length}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Escalated</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{data.escalatedTasks.length}</p></CardContent></Card>
          </div>

          {/* Projects */}
          <Card>
            <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>State</TableHead><TableHead>Active</TableHead><TableHead>Blocked</TableHead><TableHead>Approvals</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.projects.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/projects/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><StatusBadge state={p.state} /></TableCell>
                      <TableCell>{p.activeTasksCount}</TableCell>
                      <TableCell>{p.blockedTasksCount}</TableCell>
                      <TableCell>{p.pendingApprovalsCount}</TableCell>
                    </TableRow>
                  ))}
                  {data.projects.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No projects</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          {data.pendingApprovals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Summary</TableHead><TableHead>Target</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.pendingApprovals.map((a: any) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/approvals/${a.id}`)}>
                        <TableCell>{a.approval_type}</TableCell>
                        <TableCell>{a.summary}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.target_type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Failed Runs */}
          {data.recentlyFailedRuns.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recently Failed Runs</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Run #</TableHead><TableHead>State</TableHead><TableHead>Failure</TableHead><TableHead>Updated</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.recentlyFailedRuns.map((r: any) => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/runs/${r.id}`)}>
                        <TableCell>{r.run_number}</TableCell>
                        <TableCell><StatusBadge state={r.state} /></TableCell>
                        <TableCell className="text-sm truncate max-w-[300px]">{r.failure_reason ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Escalated Tasks */}
          {data.escalatedTasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Escalated Tasks</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>State</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.escalatedTasks.map((t: any) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/tasks/${t.id}`)}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell><StatusBadge state={t.state} /></TableCell>
                        <TableCell className="text-sm truncate max-w-[300px]">{t.escalation_reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
}
