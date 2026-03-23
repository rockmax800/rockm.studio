import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHRDashboard } from "@/hooks/use-hr-data";
import { useHiringMarket } from "@/hooks/use-hiring-market";
import { useBlogPosts, useApproveBlogPost, useGenerateDrafts } from "@/hooks/use-blog-data";
import {
  Users, Trophy, Megaphone, Star, CheckCircle, Lightbulb,
  ArrowLeft, Sparkles, FileText, TrendingUp, AlertCircle,
} from "lucide-react";

type Section = "overview" | "hr" | "talent" | "media";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  probation: "secondary",
  inactive: "destructive",
};

export default function CompanyPage() {
  const [section, setSection] = useState<Section>("overview");
  const { data: hrData, isLoading: hrLoading } = useHRDashboard();
  const { data: marketData } = useHiringMarket();
  const { data: posts = [] } = useBlogPosts();
  const approveBlog = useApproveBlogPost();
  const generateDrafts = useGenerateDrafts();

  const draftCount = posts.filter((p) => p.status === "draft").length;
  const approvedCount = posts.filter((p) => p.status === "approved").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  if (section !== "overview") {
    return (
      <AppLayout title="Company">
        <div className="max-w-6xl mx-auto space-y-4">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setSection("overview")}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Company
          </Button>

          {section === "hr" && <HRSection hrData={hrData} isLoading={hrLoading} />}
          {section === "talent" && <TalentSection marketData={marketData} />}
          {section === "media" && (
            <MediaSection posts={posts} approveBlog={approveBlog} generateDrafts={generateDrafts} />
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Company">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Company Dashboard</h1>
        <p className="text-sm text-muted-foreground -mt-4">Internal departments overview — AI talent, market intelligence, and public presence.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* HR Department */}
          <DepartmentCard
            icon={<Users className="h-5 w-5" />}
            title="HR Department"
            subtitle="Internal AI Talent Management"
            badgeLabel="HR"
            badgeVariant="blue"
            metrics={[
              { label: "Total Employees", value: hrData?.employees?.length ?? 0 },
              { label: "Avg Performance", value: hrData?.avgReputation ? `${hrData.avgReputation.toFixed(1)}★` : "—" },
              { label: "Active Suggestions", value: hrData?.suggestions?.length ?? 0 },
            ]}
            onClick={() => setSection("hr")}
          />

          {/* Talent Market */}
          <DepartmentCard
            icon={<Trophy className="h-5 w-5" />}
            title="AI Talent Market"
            subtitle="Model Competition & Benchmarking"
            badgeLabel="Market"
            badgeVariant="cyan"
            metrics={[
              { label: "Models Ranked", value: marketData?.rankedModels?.length ?? 0 },
              { label: "Active Experiments", value: marketData?.experiments?.length ?? 0 },
              { label: "Upgrade Suggestions", value: marketData?.upgradeSuggestions?.length ?? 0 },
            ]}
            onClick={() => setSection("talent")}
          />

          {/* Media & SMM */}
          <DepartmentCard
            icon={<Megaphone className="h-5 w-5" />}
            title="Media & SMM"
            subtitle="Company Public Presence"
            badgeLabel="Media"
            badgeVariant="green"
            metrics={[
              { label: "Drafts", value: draftCount },
              { label: "Approved", value: approvedCount },
              { label: "Published", value: publishedCount },
            ]}
            onClick={() => setSection("media")}
          />
        </div>
      </div>
    </AppLayout>
  );
}

/* ─── Department Card ─── */

interface DepartmentCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeVariant: "blue" | "cyan" | "green";
  metrics: { label: string; value: string | number }[];
  onClick: () => void;
}

function DepartmentCard({ icon, title, subtitle, badgeLabel, badgeVariant, metrics, onClick }: DepartmentCardProps) {
  return (
    <Card
      className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Badge variant={badgeVariant} className="text-[10px]">{badgeLabel}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-lg font-semibold">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full text-xs">
          Enter Department →
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─── HR Section ─── */

function HRSection({ hrData, isLoading }: { hrData: any; isLoading: boolean }) {
  const [tab, setTab] = useState<"employees" | "suggestions">("employees");

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="blue" className="text-[10px]">HR</Badge>
          <h2 className="text-lg font-semibold">HR Department</h2>
        </div>
        <p className="text-sm text-muted-foreground">Internal AI Talent Management</p>
      </div>

      <div className="flex gap-1">
        <Button variant={tab === "employees" ? "default" : "ghost"} size="sm" className="text-xs h-7" onClick={() => setTab("employees")}>
          <Users className="h-3 w-3 mr-1" /> Employees
        </Button>
        <Button variant={tab === "suggestions" ? "default" : "ghost"} size="sm" className="text-xs h-7" onClick={() => setTab("suggestions")}>
          <Lightbulb className="h-3 w-3 mr-1" /> Suggestions
        </Button>
      </div>

      {tab === "employees" && (
        isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : !hrData?.employees?.length ? (
          <EmptyState icon={<Users className="h-8 w-8" />} message="No AI employees yet. Hire your first AI team member." />
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
        )
      )}

      {tab === "suggestions" && (
        !hrData?.suggestions?.length ? (
          <EmptyState icon={<Lightbulb className="h-8 w-8" />} message="No system suggestions at this time." />
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
        )
      )}
    </div>
  );
}

/* ─── Talent Market Section ─── */

function TalentSection({ marketData }: { marketData: any }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="cyan" className="text-[10px]">Market</Badge>
          <h2 className="text-lg font-semibold">AI Talent Market</h2>
        </div>
        <p className="text-sm text-muted-foreground">Model Competition & Benchmarking</p>
      </div>

      {!marketData?.rankedModels?.length ? (
        <EmptyState icon={<Trophy className="h-8 w-8" />} message="No model benchmarks available yet." />
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
    </div>
  );
}

/* ─── Media Section ─── */

function MediaSection({ posts, approveBlog, generateDrafts }: { posts: any[]; approveBlog: any; generateDrafts: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="green" className="text-[10px]">Media</Badge>
            <h2 className="text-lg font-semibold">Media & SMM</h2>
          </div>
          <p className="text-sm text-muted-foreground">Company Public Presence</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => generateDrafts.mutate({ tone: "professional", platform: "blog" })}
          disabled={generateDrafts.isPending}
        >
          <Sparkles className="h-3 w-3" />
          {generateDrafts.isPending ? "Generating…" : "Generate Post from Recent Events"}
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-8 w-8" />} message="No blog posts yet. Generate posts from recent company events." />
      ) : (
        <div className="space-y-2">
          {posts.slice(0, 15).map((post: any) => (
            <Card key={post.id} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.event_type} · {post.platform}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={post.status === "published" ? "green" : post.status === "approved" ? "blue" : "amber"} className="text-[10px]">
                    {post.status}
                  </Badge>
                  {post.status === "draft" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => approveBlog.mutate(post.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Empty State ─── */

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-8 text-center">
        <div className="text-muted-foreground/40 mx-auto mb-2 w-fit">{icon}</div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
