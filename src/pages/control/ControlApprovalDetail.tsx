import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useApprovalDetail, useInvalidateControl } from "@/hooks/use-control-data";
import { toast } from "sonner";

export default function ControlApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useApprovalDetail(id!);
  const invalidate = useInvalidateControl();

  if (!id) return null;

  const handleResolve = async (decision: string) => {
    toast.info(`Action "resolve(${decision})" would be called for approval ${id}. Backend API required.`);
    invalidate();
  };

  return (
    <AppLayout title="Approval Detail">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{data.approval.approval_type}</CardTitle>
                <StatusBadge state={data.approval.state} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Summary</p>
                <p className="text-sm">{data.approval.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Target</p>
                  <p>{data.approval.target_type} / {data.approval.target_id.slice(0, 8)}…</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Created</p>
                  <p>{new Date(data.approval.created_at).toLocaleString()}</p>
                </div>
              </div>
              {data.approval.recommendation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recommendation</p>
                  <p className="text-sm">{data.approval.recommendation}</p>
                </div>
              )}
              {data.approval.consequence_if_approved && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">If Approved</p>
                  <p className="text-sm">{data.approval.consequence_if_approved}</p>
                </div>
              )}
              {data.approval.consequence_if_rejected && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">If Rejected</p>
                  <p className="text-sm">{data.approval.consequence_if_rejected}</p>
                </div>
              )}
              {data.approval.founder_decision_note && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Decision Note</p>
                  <p className="text-sm">{data.approval.founder_decision_note}</p>
                </div>
              )}
              {data.approval.state === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => handleResolve("approved")}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleResolve("rejected")}>Reject</Button>
                  <Button size="sm" variant="outline" onClick={() => handleResolve("deferred")}>Defer</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {data.relatedArtifacts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Related Artifacts</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.relatedArtifacts.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.artifact_type}</TableCell>
                        <TableCell><StatusBadge state={a.state} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.relatedReviews.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Related Reviews</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>State</TableHead><TableHead>Verdict</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.relatedReviews.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell><StatusBadge state={r.state} /></TableCell>
                        <TableCell>{r.verdict ?? "—"}</TableCell>
                        <TableCell className="text-sm">{r.reason ?? "—"}</TableCell>
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
