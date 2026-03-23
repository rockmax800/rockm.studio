import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjectDetail } from "@/hooks/use-control-data";
import { formatDistanceToNow } from "date-fns";

export default function ControlProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useProjectDetail(id!);

  if (!id) return null;

  return (
    <AppLayout title="Project Detail">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{data.project.name}</CardTitle>
                <StatusBadge state={data.project.state} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{data.project.purpose}</p>
              {data.project.founder_notes && <p className="text-sm mt-2 text-muted-foreground italic">{data.project.founder_notes}</p>}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader><CardTitle>Tasks ({data.tasks.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>State</TableHead><TableHead>Domain</TableHead><TableHead>Priority</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.tasks.map((t: any) => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/tasks/${t.id}`)}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell><StatusBadge state={t.state} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.domain}</TableCell>
                      <TableCell><StatusBadge state={t.priority} /></TableCell>
                    </TableRow>
                  ))}
                  {data.tasks.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No tasks</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Artifacts */}
          <Card>
            <CardHeader><CardTitle>Artifacts ({data.artifacts.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.artifacts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.artifact_type}</TableCell>
                      <TableCell><StatusBadge state={a.state} /></TableCell>
                    </TableRow>
                  ))}
                  {data.artifacts.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No artifacts</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approvals */}
          <Card>
            <CardHeader><CardTitle>Approvals ({data.approvals.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Summary</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.approvals.map((a: any) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/approvals/${a.id}`)}>
                      <TableCell>{a.approval_type}</TableCell>
                      <TableCell>{a.summary}</TableCell>
                      <TableCell><StatusBadge state={a.state} /></TableCell>
                    </TableRow>
                  ))}
                  {data.approvals.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No approvals</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader><CardTitle>Activity Feed</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.activityFeed.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.event_type}</p>
                      <p className="text-xs text-muted-foreground">{e.entity_type} · {e.actor_type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
                {data.activityFeed.length === 0 && <p className="text-sm text-muted-foreground text-center">No activity</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
