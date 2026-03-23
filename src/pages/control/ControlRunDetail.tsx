import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useRunDetail, useInvalidateControl } from "@/hooks/use-control-data";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ControlRunDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useRunDetail(id!);
  const invalidate = useInvalidateControl();

  if (!id) return null;

  const handleRetry = () => {
    toast.info(`Action "retry" would be called for run ${id}. Backend API required.`);
    invalidate();
  };

  return (
    <AppLayout title="Run Detail">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Run #{data.run.run_number}</CardTitle>
                <StatusBadge state={data.run.state} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Task</p>
                  <p>{data.task?.title ?? data.run.task_id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Started</p>
                  <p>{data.run.started_at ? new Date(data.run.started_at).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Duration</p>
                  <p>{data.run.duration_ms ? `${data.run.duration_ms}ms` : "—"}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Ended</p>
                  <p>{data.run.ended_at ? new Date(data.run.ended_at).toLocaleString() : "—"}</p>
                </div>
              </div>
              {data.run.failure_reason && (
                <div>
                  <p className="text-sm font-medium text-destructive">Failure Reason</p>
                  <p className="text-sm">{data.run.failure_reason}</p>
                </div>
              )}
              {data.run.output_summary && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Output Summary</p>
                  <p className="text-sm">{data.run.output_summary}</p>
                </div>
              )}
              {["failed", "timed_out"].includes(data.run.state) && (
                <Button size="sm" onClick={handleRetry}>Retry Run</Button>
              )}
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

          {/* Activity */}
          <Card>
            <CardHeader><CardTitle>Activity Feed</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {data.activityFeed.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.event_type}</p>
                      <p className="text-xs text-muted-foreground">{e.actor_type}</p>
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
