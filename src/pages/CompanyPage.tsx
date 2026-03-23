import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHRDashboard } from "@/hooks/use-hr-data";
import { useHiringMarket } from "@/hooks/use-hiring-market";
import { useBlogPosts, useApproveBlogPost } from "@/hooks/use-blog-data";
import { Users, Trophy, Lightbulb, Megaphone, Star, CheckCircle } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  probation: "secondary",
  inactive: "destructive",
};

export default function CompanyPage() {
  const { data: hrData, isLoading: hrLoading } = useHRDashboard();
  const { data: marketData } = useHiringMarket();
  const { data: posts = [] } = useBlogPosts();
  const approveBlog = useApproveBlogPost();

  return (
    <AppLayout title="Company">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Company Management</h1>

        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Employees
            </TabsTrigger>
            <TabsTrigger value="rankings" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Model Rankings
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Suggestions
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Media
            </TabsTrigger>
          </TabsList>

          {/* EMPLOYEES */}
          <TabsContent value="employees">
            {hrLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : !hrData?.employees?.length ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No AI employees yet. Hire your first AI team member.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs">Success</TableHead>
                        <TableHead className="text-xs">Reputation</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hrData.employees.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="text-xs font-medium">{emp.name}</TableCell>
                          <TableCell className="text-xs">{emp.role_code}</TableCell>
                          <TableCell className="text-xs font-mono">{emp.model_name ?? "—"}</TableCell>
                          <TableCell className="text-xs">{(emp.success_rate * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-primary" />
                              {emp.reputation_score.toFixed(1)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[emp.status] ?? "outline"} className="text-[10px]">
                              {emp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RANKINGS */}
          <TabsContent value="rankings">
            {!marketData?.rankedModels?.length ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No model benchmarks available yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-xs">Provider</TableHead>
                        <TableHead className="text-xs">Score</TableHead>
                        <TableHead className="text-xs">Cost/1k</TableHead>
                        <TableHead className="text-xs">Reliability</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketData.rankedModels.map((m: any, i: number) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                          <TableCell className="text-xs font-mono">{m.model_name}</TableCell>
                          <TableCell className="text-xs">{m.provider}</TableCell>
                          <TableCell className="text-xs">{(m.competition_score * 100).toFixed(0)}%</TableCell>
                          <TableCell className="text-xs">${m.estimated_cost_per_1k_tokens?.toFixed(4) ?? "—"}</TableCell>
                          <TableCell className="text-xs">{(m.reliability_score * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SUGGESTIONS */}
          <TabsContent value="suggestions">
            {!hrData?.suggestions?.length ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No system suggestions at this time.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {hrData.suggestions.map((s: any) => (
                  <Card key={s.id} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="text-[10px] mb-1">{s.suggestion_type}</Badge>
                        <p className="text-sm">{s.reason}</p>
                      </div>
                      <Badge variant={s.resolved ? "outline" : "default"} className="text-[10px]">
                        {s.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MEDIA */}
          <TabsContent value="media">
            {posts.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Megaphone className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No blog posts yet. Posts are auto-generated from company events.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {posts.slice(0, 10).map((post: any) => (
                  <Card key={post.id} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{post.title}</p>
                        <p className="text-xs text-muted-foreground">{post.event_type} · {post.platform}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-[10px]">
                          {post.status}
                        </Badge>
                        {post.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px]"
                            onClick={() => approveBlog.mutate(post.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
