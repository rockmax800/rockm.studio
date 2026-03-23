import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProviderList } from "@/hooks/use-provider-data";
import { Server, Cpu, Activity } from "lucide-react";

function statusVariant(s: string) {
  if (s === "active" || s === "healthy" || s === "valid") return "green" as const;
  if (s === "degraded" || s === "expired") return "amber" as const;
  if (s === "inactive" || s === "unavailable" || s === "missing" || s === "error") return "red" as const;
  return "neutral" as const;
}

export default function ControlProviderList() {
  const { data, isLoading, error } = useProviderList();
  const navigate = useNavigate();

  return (
    <AppLayout title="Provider Control">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Providers</p>
                  <p className="text-xl font-semibold">{data.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Models</p>
                  <p className="text-xl font-semibold">{data.reduce((s: number, p: any) => s + p.activeModelsCount, 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last 24h Requests</p>
                  <p className="text-xl font-semibold">{data.reduce((s: number, p: any) => s + p.last24hRequests, 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader><CardTitle>Providers</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Credential</TableHead>
                    <TableHead>Active Models</TableHead>
                    <TableHead>24h Requests</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.code}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant(p.credentialStatus)}>{p.credentialStatus}</Badge></TableCell>
                      <TableCell>{p.activeModelsCount}</TableCell>
                      <TableCell>{p.last24hRequests}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/control/providers/${p.id}`)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No providers configured</TableCell></TableRow>
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
