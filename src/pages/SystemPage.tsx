import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProviders, useProviderModels } from "@/hooks/use-provider-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Unplug, Settings, Activity, FileText, Shield, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

export default function SystemPage() {
  const { data: providers = [] } = useProviders();
  const { data: modeData } = useSystemMode();

  return (
    <AppLayout title="System">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">System Administration</h1>

        <Tabs defaultValue="providers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="providers" className="gap-1.5">
              <Unplug className="h-3.5 w-3.5" /> Providers
            </TabsTrigger>
            <TabsTrigger value="mode" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Mode
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Audit
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Documentation
            </TabsTrigger>
          </TabsList>

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
                        <TableHead className="text-xs">Text</TableHead>
                        <TableHead className="text-xs">Streaming</TableHead>
                        <TableHead className="text-xs">Tools</TableHead>
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
                          <TableCell className="text-xs">{p.supports_text ? "✓" : "—"}</TableCell>
                          <TableCell className="text-xs">{p.supports_streaming ? "✓" : "—"}</TableCell>
                          <TableCell className="text-xs">{p.supports_tools ? "✓" : "—"}</TableCell>
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
                <div className="flex items-center gap-4 mb-4">
                  <Badge
                    className={`text-xs px-3 py-1 font-mono ${
                      modeData?.mode === "production"
                        ? "bg-emerald-600/90 text-white"
                        : "bg-amber-500/90 text-black"
                    }`}
                  >
                    {modeData?.mode === "production" ? "🛡 PRODUCTION MODE" : "🧪 EXPERIMENTAL MODE"}
                  </Badge>
                </div>
                {modeData?.experimental_features && (
                  <div className="space-y-2">
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

          {/* HEALTH */}
          <TabsContent value="health">
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Activity className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-700">System Healthy</p>
                <p className="text-xs text-muted-foreground">
                  Use /api/system/status and /api/system/consistency-check for detailed health reports.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIT */}
          <TabsContent value="audit">
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Export audit logs for compliance and review.
                </p>
                <Button size="sm" variant="outline" className="text-xs">
                  Export Audit Log
                </Button>
              </CardContent>
            </Card>
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
