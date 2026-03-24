import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Globe, Monitor, FileText, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { resolveClientAccess, fetchClientPortalData, type ClientPortalData } from "@/lib/clientPortal";

function StateBadge({ state }: { state: string }) {
  const variant = state === "done" ? "default"
    : state === "active" || state === "running" ? "secondary"
    : state === "blocked" || state === "failed" ? "destructive"
    : "outline";
  return <Badge variant={variant} className="text-[10px]">{state}</Badge>;
}

function formatEventType(type: string) {
  return type.replace(/\./g, " → ").replace(/_/g, " ");
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No access token provided.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const access = await resolveClientAccess(token);
        if (!access) {
          setError("Invalid or expired access link.");
          setLoading(false);
          return;
        }

        const clientName = (access as any).clients?.name ?? "Client";
        const portalData = await fetchClientPortalData(access.project_id, clientName);
        setData(portalData);
      } catch {
        setError("Unable to load project data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading project portal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full border-none shadow-sm">
          <CardContent className="p-8 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">Access Denied</h2>
            <p className="text-sm text-muted-foreground">{error ?? "Unable to verify access."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Client Portal</p>
            <h1 className="text-lg font-semibold text-foreground">{data.project.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Welcome, {data.client.name}</p>
            <StateBadge state={data.project.state} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Progress + Phase */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Delivery Progress</p>
                <p className="text-2xl font-bold text-foreground">{data.deliveryProgress}%</p>
              </div>
              {data.project.current_phase && (
                <Badge variant="outline" className="text-xs">
                  Phase: {data.project.current_phase}
                </Badge>
              )}
            </div>
            <Progress value={data.deliveryProgress} className="h-2" />
          </CardContent>
        </Card>

        {/* Preview Links */}
        {(data.stagingUrl || data.productionUrl) && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Preview Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.productionUrl && (
                <a
                  href={data.productionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" /> Production — {data.productionUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {data.stagingUrl && (
                <a
                  href={data.stagingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Monitor className="h-3.5 w-3.5" /> Staging Preview — {data.stagingUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Tasks */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Tasks
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {data.tasks.filter((t) => t.state === "done").length}/{data.tasks.length} done
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No tasks yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Task</TableHead>
                      <TableHead className="text-xs w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tasks.slice(0, 20).map((t, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{t.title}</TableCell>
                        <TableCell><StateBadge state={t.state} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.timeline.map((evt, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium capitalize">{formatEventType(evt.event_type)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(evt.created_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Release Notes */}
        {data.releaseNotes.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Release Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.releaseNotes.map((note, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{note.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {note.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5">{note.summary}</p>
                  )}
                  {i < data.releaseNotes.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Deployments */}
        {data.deployments.length > 0 && (
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Deployments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Environment</TableHead>
                    <TableHead className="text-xs">Version</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.deployments.slice(0, 10).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{d.environment}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{d.version_label ?? "—"}</TableCell>
                      <TableCell><StateBadge state={d.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <footer className="text-center py-6">
          <p className="text-[10px] text-muted-foreground">
            AI Production Studio — Client Portal • Read-only view
          </p>
        </footer>
      </main>
    </div>
  );
}
