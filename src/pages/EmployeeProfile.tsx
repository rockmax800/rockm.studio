import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getPersona, getStatusMeta } from "@/lib/personas";

import {
  TrendingUp, TrendingDown, Shield, Brain, GraduationCap, Wrench, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileCode, Lock, Unlock, Plus, Pencil,
  ChevronDown, ChevronRight, Zap, Rocket, RotateCcw, FlaskConical,
  ArrowUpRight, GitPullRequest, Server, FolderX, FolderCheck as FolderCheckIcon,
  BookOpen, Lightbulb, Ban, Save,
} from "lucide-react";

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});
  const toggleMemory = (key: string) => setExpandedMemory((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ── Data Queries ──────────────────────────────────────── */
  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: roleData } = useQuery({
    queryKey: ["employee-role", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return null;
      const { data } = await supabase.from("agent_roles").select("*, role_contracts(*)").eq("id", employee.role_id).single();
      return data;
    },
    enabled: !!employee?.role_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["employee-tasks", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase.from("tasks").select("id, title, state, priority, updated_at")
        .eq("owner_role_id", employee.role_id)
        .in("state", ["in_progress", "assigned", "waiting_review", "blocked"])
        .order("updated_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["employee-runs", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase.from("runs").select("id, state, duration_ms, created_at")
        .eq("agent_role_id", employee.role_id).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["employee-reviews", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase.from("reviews").select("id, state, verdict, created_at")
        .in("task_id", taskIds).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const { data: checkSuites = [] } = useQuery({
    queryKey: ["employee-ci", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const { data } = await supabase.from("check_suites").select("id, status, task_id").in("task_id", taskIds).limit(20);
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const { data: deployments = [] } = useQuery({
    queryKey: ["employee-deploys"],
    queryFn: async () => {
      const { data } = await supabase.from("deployments").select("id, status, environment, version_label, started_at")
        .order("started_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["employee-learning"],
    queryFn: async () => {
      const { data } = await supabase.from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at, promoted_at, evaluated_at, rejection_reason")
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: usageLogs = [] } = useQuery({
    queryKey: ["employee-usage", runs],
    queryFn: async () => {
      const runIds = runs.map((r) => r.id);
      if (runIds.length === 0) return [];
      const { data } = await supabase.from("provider_usage_logs")
        .select("run_id, tokens_in, tokens_out, estimated_cost_usd").in("run_id", runIds);
      return data ?? [];
    },
    enabled: runs.length > 0,
  });

  if (isLoading) return <AppLayout title="Loading…"><p className="text-[12px] text-muted-foreground p-6">Loading…</p></AppLayout>;
  if (!employee) return <AppLayout title="Not found"><p className="text-[12px] text-muted-foreground p-6">Employee not found.</p></AppLayout>;

  const persona = getPersona(employee.role_code);
  const st = getStatusMeta(employee.status);
  const contract = (roleData as any)?.role_contracts?.[0] ?? null;
  const roleName = roleData?.name ?? employee.role_code;
  const totalTokens = usageLogs.reduce((s, u) => s + ((u as any).tokens_in ?? 0) + ((u as any).tokens_out ?? 0), 0);
  const totalCost = usageLogs.reduce((s, u) => s + ((u as any).estimated_cost_usd ?? 0), 0);
  const isUnderperforming = (employee.success_rate ?? 0) < 0.6 || (employee.bug_rate ?? 0) > 0.3;
  const successPct = Math.round((employee.success_rate ?? 0) * 100);
  const ciTotal = checkSuites.length;
  const ciPassed = checkSuites.filter((c) => c.status === "passed").length;
  const ciRate = ciTotal > 0 ? Math.round((ciPassed / ciTotal) * 100) : null;
  const lastReviewVerdict = reviews[0]?.verdict ?? null;
  const trendPoints = [62, 68, 65, 72, 78, successPct];
  const trendUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[trendPoints.length - 2];

  const memoryCategories = [
    { key: "domain_principles", section: "Core Knowledge", title: "Domain Principles", icon: <BookOpen className="h-3.5 w-3.5" />,
      items: ["Follow role contract boundaries strictly", "Produce artifacts before marking tasks done", "Escalate when confidence < 70%"] },
    { key: "architecture_rules", section: "Core Knowledge", title: "Architecture Rules", icon: <Shield className="h-3.5 w-3.5" />,
      items: ["Use semantic tokens from design system", "All API routes require admin auth middleware", "No direct Prisma access from frontend"] },
    { key: "common_patterns", section: "Core Knowledge", title: "Common Patterns", icon: <Lightbulb className="h-3.5 w-3.5" />,
      items: ["Prefer small, focused components", "Verify DB schema before queries", "Include error boundaries"] },
    { key: "project_rules", section: "Project Memory", title: "Project-Specific Rules", icon: <FileCode className="h-3.5 w-3.5" />,
      items: ["Project Alpha: strict TypeScript", "Project Beta: GraphQL preferred", "All: 80% test coverage minimum"] },
    { key: "failures", section: "Failure Memory", title: "Mistakes & Corrections", icon: <AlertTriangle className="h-3.5 w-3.5" />,
      items: ["Missed forbidden path check on prisma/ (Run #42)", "Output without acceptance criteria (Task #18)", "Always check forbidden paths before file creation"] },
  ];

  const groupedMemory = memoryCategories.reduce<Record<string, typeof memoryCategories>>((acc, cat) => {
    if (!acc[cat.section]) acc[cat.section] = [];
    acc[cat.section].push(cat);
    return acc;
  }, {});

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-5 space-y-5 max-w-[1200px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Capabilities</Link>
            <span>/</span>
            <Link to="/company" className="hover:text-foreground transition-colors">Team</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{employee.name}</span>
          </div>

          {/* ── TOP HEADER ───────────────────────────────────── */}
          <div className="ds-card p-0 overflow-hidden">
            <div className={`${persona.bgTint} px-6 py-5`}>
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <img src={persona.avatar} alt={employee.name}
                    className={`h-20 w-20 rounded-2xl object-cover ring-[3px] ${persona.ringClass} ring-offset-[3px] ring-offset-background`}
                    width={80} height={80} />
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-background ${st.dot}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-tight">{employee.name}</h1>
                    <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 border-0 ${st.chipBg}`}>{st.label}</Badge>
                    {isUnderperforming && (
                      <Badge className="text-[10px] font-semibold px-2.5 py-0.5 border-0 bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3 mr-1" /> At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{roleName}</p>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{persona.tag}</span>
                </div>
                <div className="flex items-start gap-5 shrink-0">
                  <MetricBlock label="Success" value={`${successPct}%`} trend={trendUp} />
                  <MetricBlock label="Reputation" value={(employee.reputation_score ?? 0).toFixed(1)} />
                  <MetricBlock label="Bug Rate" value={`${Math.round((employee.bug_rate ?? 0) * 100)}%`}
                    danger={(employee.bug_rate ?? 0) > 0.2} />
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Trend</div>
                    <MiniSparkline points={trendPoints} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TABBED CONTENT ────────────────────────────────── */}
          <Tabs defaultValue="work" className="w-full">
            <TabsList className="bg-secondary/50 h-9">
              <TabsTrigger value="work" className="text-[11px] gap-1 data-[state=active]:font-semibold">
                <Wrench className="h-3 w-3" /> Current Work
              </TabsTrigger>
              <TabsTrigger value="contract" className="text-[11px] gap-1 data-[state=active]:font-semibold">
                <Shield className="h-3 w-3" /> Role Contract
              </TabsTrigger>
              <TabsTrigger value="memory" className="text-[11px] gap-1 data-[state=active]:font-semibold">
                <Brain className="h-3 w-3" /> Memory
              </TabsTrigger>
              <TabsTrigger value="training" className="text-[11px] gap-1 data-[state=active]:font-semibold">
                <GraduationCap className="h-3 w-3" /> Training
              </TabsTrigger>
              <TabsTrigger value="learning" className="text-[11px] gap-1 data-[state=active]:font-semibold">
                <TrendingUp className="h-3 w-3" /> Learning History
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Current Work */}
            <TabsContent value="work">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="ds-card p-4 border-t-[3px] border-t-amber-500">
                  <h3 className="text-[13px] font-semibold text-foreground mb-3">Active Tasks</h3>
                  {tasks.length === 0 ? <p className="text-[10px] text-muted-foreground/50">No active tasks</p> : (
                    <div className="space-y-1.5">
                      {tasks.map((t) => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-secondary/30 rounded transition-colors group">
                            <TaskStateDot state={t.state} />
                            <span className="text-[11px] text-foreground/80 truncate flex-1">{t.title}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="ds-card p-4">
                    <h3 className="text-[13px] font-semibold text-foreground mb-2">Recent Runs</h3>
                    {runs.length === 0 ? <p className="text-[10px] text-muted-foreground/50">No recent runs</p> : (
                      <div className="space-y-1.5">
                        {runs.slice(0, 3).map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-[11px]">
                            <RunStateDot state={r.state} />
                            <span className="font-mono text-[10px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                            <span className="text-[10px] text-muted-foreground/50 capitalize">{r.state}</span>
                            {r.duration_ms && <span className="text-muted-foreground/40 ml-auto flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{Math.round(r.duration_ms / 1000)}s</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStatCard label="Last Review" value={lastReviewVerdict === "approved" ? "Approved" : lastReviewVerdict === "rejected" ? "Rejected" : "—"}
                      valueColor={lastReviewVerdict === "approved" ? "text-green-600" : lastReviewVerdict === "rejected" ? "text-destructive" : "text-muted-foreground"} />
                    <MiniStatCard label="CI Pass" value={ciRate !== null ? `${ciRate}%` : "—"}
                      valueColor={ciRate !== null && ciRate < 70 ? "text-destructive" : "text-foreground"} />
                    <MiniStatCard label="Deploys" value={String(deployments.length)} valueColor="text-foreground" />
                  </div>
                  <div className="ds-card p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1"><Zap className="h-3 w-3 text-muted-foreground" /> Tokens</h3>
                      <span className="text-[11px] font-mono text-foreground font-semibold">${totalCost.toFixed(3)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{totalTokens.toLocaleString()} tokens across {runs.length} runs</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Role Contract */}
            <TabsContent value="contract">
              <div className="mt-4">
                {!contract && !roleData ? (
                  <div className="ds-card p-4 text-[11px] text-muted-foreground/50">No role contract assigned.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ContractPathBlock title="Allowed Repo Paths" icon={<FolderCheckIcon className="h-3.5 w-3.5 text-green-600" />}
                      items={parseJsonArray(contract?.allowed_repo_paths_json)} fallback="No path restrictions" accentClass="border-l-green-500" />
                    <ContractPathBlock title="Forbidden Paths" icon={<FolderX className="h-3.5 w-3.5 text-destructive" />}
                      items={parseJsonArray(contract?.forbidden_repo_paths_json)} fallback="No forbidden paths" accentClass="border-l-destructive" />
                    <ContractPathBlock title="Required Artifacts" icon={<FileCode className="h-3.5 w-3.5 text-muted-foreground" />}
                      items={parseJsonArray(contract?.required_artifacts_json)} fallback="No required artifacts" accentClass="border-l-border" />
                    <div className="ds-card p-4">
                      <h3 className="text-[13px] font-semibold text-foreground mb-3">Permissions & Thresholds</h3>
                      <div className="space-y-2.5 text-[11px]">
                        <PermRow label="Deploy" icon={<Rocket className="h-3 w-3" />} allowed={contract?.may_deploy} />
                        <PermRow label="Merge PRs" icon={<GitPullRequest className="h-3 w-3" />} allowed={contract?.may_merge} />
                        <PermRow label="Modify Schema" icon={<Server className="h-3 w-3" />} allowed={contract?.may_modify_schema} />
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className="text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" />Risk Threshold</span>
                          <span className="font-mono font-semibold text-foreground">{contract?.risk_threshold ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Memory */}
            <TabsContent value="memory">
              <div className="mt-4 space-y-4 max-w-[700px]">
                {trainingMode && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <Badge className="text-[9px] font-semibold border-0 bg-amber-200 text-amber-800 animate-pulse">EDITING</Badge>
                    <span className="text-[11px] text-amber-700">Training mode active — memory is editable</span>
                  </div>
                )}
                {Object.entries(groupedMemory).map(([section, cats]) => (
                  <div key={section}>
                    <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-1.5">{section}</h3>
                    <div className="space-y-1">
                      {cats.map((cat) => {
                        const isExpanded = expandedMemory[cat.key] ?? false;
                        return (
                          <div key={cat.key} className="ds-card overflow-hidden">
                            <button onClick={() => toggleMemory(cat.key)}
                              className="w-full flex items-center gap-2 p-3 text-left hover:bg-secondary/20 transition-colors">
                              <span className="text-muted-foreground">{cat.icon}</span>
                              <span className="text-[11px] font-semibold text-foreground flex-1">{cat.title}</span>
                              <span className="text-[9px] text-muted-foreground/50 font-mono mr-1">{cat.items.length}</span>
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 border-t border-border/20">
                                <div className="space-y-1 mt-1.5">
                                  {cat.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 text-[10px] group">
                                      <span className="w-1 h-1 rounded-full bg-muted-foreground/25 mt-1.5 shrink-0" />
                                      <span className="text-foreground/65 flex-1 leading-snug">{item}</span>
                                      {trainingMode && (
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Pencil className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {trainingMode && (
                                  <button className="mt-2 flex items-center gap-1 text-[9px] text-primary hover:text-primary/80 transition-colors">
                                    <Plus className="h-2.5 w-2.5" /> Add entry
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: Training */}
            <TabsContent value="training">
              <div className="mt-4 max-w-[600px]">
                <div className={`ds-card p-5 ${trainingMode ? "border-l-[3px] border-l-amber-500 bg-amber-50/30" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[14px] text-foreground font-semibold">
                        {trainingMode ? "Training Mode Active" : "Training Mode"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {trainingMode
                          ? "Add rules, examples, corrections. Changes are staged until saved."
                          : "Enter to edit memory, add rules, and provide corrections."}
                      </p>
                    </div>
                    <Button size="sm" variant={trainingMode ? "outline" : "default"} className="text-[11px] h-8 shrink-0"
                      onClick={() => setTrainingMode(!trainingMode)}>
                      {trainingMode ? <><Lock className="h-3 w-3 mr-1" /> Exit</> : <><Unlock className="h-3 w-3 mr-1" /> Enter Training Mode</>}
                    </Button>
                  </div>
                  {trainingMode && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <TrainingAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Rule" />
                        <TrainingAction icon={<FileCode className="h-3.5 w-3.5" />} label="Add Example" />
                        <TrainingAction icon={<Pencil className="h-3.5 w-3.5" />} label="Add Constraint" />
                        <TrainingAction icon={<Ban className="h-3.5 w-3.5" />} label="Override Default" />
                      </div>
                      <Button size="sm" className="w-full text-[11px] h-8">
                        <Save className="h-3 w-3 mr-1" /> Save Memory Update
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 5: Learning History */}
            <TabsContent value="learning">
              <div className="mt-4 max-w-[600px] space-y-0">
                {learningProposals.slice(0, 12).map((lp, i) => (
                  <LearningTimelineItem key={lp.id} proposal={lp} isLast={i === Math.min(learningProposals.length, 12) - 1} />
                ))}
                {learningProposals.length === 0 && <p className="text-[10px] text-muted-foreground/50">No learning history yet.</p>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══ Helper Components ═══════════════════════════════════════ */

function MetricBlock({ label, value, trend, danger }: { label: string; value: string; trend?: boolean; danger?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[20px] font-bold leading-tight ${danger ? "text-destructive" : "text-foreground"}`}>{value}</div>
      {trend !== undefined && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          {trend ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
        </div>
      )}
    </div>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 60, h = 24;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const up = points[points.length - 1] >= points[points.length - 2];
  return <svg width={w} height={h} className="block"><path d={pathD} fill="none" stroke={up ? "#16a34a" : "#ef4444"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MiniStatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return <div className="ds-card p-2.5 text-center"><div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div><div className={`text-[13px] font-bold ${valueColor}`}>{value}</div></div>;
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { in_progress: "bg-amber-500", waiting_review: "bg-violet-500", blocked: "bg-destructive", assigned: "bg-blue-400" };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { running: "bg-amber-500 animate-pulse", finalized: "bg-green-500", produced_output: "bg-green-400", failed: "bg-destructive", timed_out: "bg-red-400" };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: { title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string }) {
  return (
    <div className={`ds-card p-4 border-l-[3px] ${accentClass}`}>
      <h3 className="text-[13px] font-semibold text-foreground mb-2 flex items-center gap-1.5">{icon}{title}</h3>
      {items.length === 0 ? <p className="text-[10px] text-muted-foreground/50">{fallback}</p> : (
        <div className="space-y-1">{items.map((p, i) => <div key={i} className="text-[10px] font-mono text-foreground/60 bg-secondary/30 rounded px-1.5 py-0.5">{p}</div>)}</div>
      )}
    </div>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      {allowed ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Yes</span>
        : <span className="flex items-center gap-1 text-muted-foreground/50"><XCircle className="h-3 w-3" /> No</span>}
    </div>
  );
}

function TrainingAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="ds-card p-2.5 flex items-center gap-2 hover:bg-secondary/30 transition-colors text-left">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-medium text-foreground">{label}</span>
    </button>
  );
}

function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:   { icon: <FlaskConical className="h-3 w-3" />, label: "Proposal Created",  dotColor: "bg-blue-500" },
    approved:    { icon: <CheckCircle2 className="h-3 w-3" />, label: "Approved for Eval",  dotColor: "bg-amber-500" },
    promoted:    { icon: <Rocket className="h-3 w-3" />,       label: "Promoted",            dotColor: "bg-green-500" },
    rejected:    { icon: <XCircle className="h-3 w-3" />,      label: "Rejected",            dotColor: "bg-red-500" },
    rolled_back: { icon: <RotateCcw className="h-3 w-3" />,    label: "Rolled Back",         dotColor: "bg-red-400" },
  };
  const c = cfg[proposal.status] ?? cfg.candidate;
  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${c.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/40 my-0.5" />}
      </div>
      <div className="pb-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{c.icon}</span>
          <span className="text-[11px] font-semibold text-foreground">{c.label}</span>
          <span className="text-[9px] text-muted-foreground/50 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2 leading-snug">{proposal.hypothesis || proposal.proposal_type}</p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[9px] text-red-500/70 mt-0.5 line-clamp-1">Reason: {proposal.rejection_reason}</p>
        )}
      </div>
    </div>
  );
}
