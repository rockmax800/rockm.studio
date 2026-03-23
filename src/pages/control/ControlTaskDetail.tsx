import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useTaskDetail, useInvalidateControl } from "@/hooks/use-control-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ControlTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useTaskDetail(id!);
  const invalidate = useInvalidateControl();

  if (!id) return null;

  const handleAction = async (action: string) => {
    try {
      // These are placeholder calls — in production they'd hit the API routes.
      // For now we show what WOULD be called.
      toast.info(`Action "${action}" would be called for task ${id}. Backend API required.`);
      invalidate();
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    }
  };

  return (
    <AppLayout title="Task Detail">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{data.task.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{data.task.purpose}</p>
                </div>
                <StatusBadge state={data.task.state} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                <span>Domain: <strong>{data.task.domain}</strong></span>
                <span>Priority: <StatusBadge state={data.task.priority} /></span>
                <span>Output: <strong>{data.task.expected_output_type}</strong></span>
              </div>
              <div className="flex gap-2">
                {["ready", "rework_required", "blocked", "escalated"].includes(data.task.state) && (
                  <Button size="sm" onClick={() => handleAction("assign")}>Assign</Button>
                )}
                {data.task.state === "assigned" && (
                  <Button size="sm" onClick={() => handleAction("start-run")}>Start Run</Button>
                )}
                {data.task.state === "approved" && (
                  <Button size="sm" onClick={() => handleAction("complete")}>Complete Task</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Context Pack */}
          {data.contextPack && (
            <Card>
              <CardHeader><CardTitle>Context Pack</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">{data.contextPack.summary ?? "No summary"}</p>
                {data.contextPack.missing_context_notes && (
                  <p className="text-sm text-destructive mt-2">Missing: {data.contextPack.missing_context_notes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Runs */}
          <Card>
            <CardHeader><CardTitle>Runs ({data.runs.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>State</TableHead><TableHead>Failure</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.runs.map((r: any) => (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/runs/${r.id}`)}>
                      <TableCell>{r.run_number}</TableCell>
                      <TableCell><StatusBadge state={r.state} /></TableCell>
                      <TableCell className="text-sm truncate max-w-[250px]">{r.failure_reason ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {data.runs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No runs</TableCell></TableRow>}
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

          {/* Reviews */}
          <Card>
            <CardHeader><CardTitle>Reviews ({data.reviews.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>State</TableHead><TableHead>Verdict</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data.reviews.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><StatusBadge state={r.state} /></TableCell>
                      <TableCell>{r.verdict ?? "—"}</TableCell>
                      <TableCell className="text-sm truncate max-w-[250px]">{r.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {data.reviews.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No reviews</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Approvals */}
          {data.approvals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Approvals ({data.approvals.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>State</TableHead><TableHead>Summary</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.approvals.map((a: any) => (
                      <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/control/approvals/${a.id}`)}>
                        <TableCell>{a.approval_type}</TableCell>
                        <TableCell><StatusBadge state={a.state} /></TableCell>
                        <TableCell>{a.summary}</TableCell>
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
