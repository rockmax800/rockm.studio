import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getPersona, getStatusMeta } from "@/lib/personas";
import { TrainingLab } from "@/components/employees/TrainingLab";

import {
  TrendingUp, TrendingDown, Shield, Brain, GraduationCap, Wrench, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileCode, Lock, Unlock, Plus, Pencil,
  ChevronDown, ChevronRight, Zap, Rocket, RotateCcw, FlaskConical,
  ArrowUpRight, GitPullRequest, Server, FolderX, FolderCheck as FolderCheckIcon,
  BookOpen, Lightbulb, Ban, Save, ArrowLeft, Activity, Eye, Layers,
}from "lucide-react";

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("domain_principles");
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

  if (isLoading) return <AppLayout title="Loading…"><p className="text-[14px] text-muted-foreground p-8">Loading…</p></AppLayout>;
  if (!employee) return <AppLayout title="Not found"><p className="text-[14px] text-muted-foreground p-8">Employee not found.</p></AppLayout>;

  const persona = getPersona(employee.role_code);
  const st = getStatusMeta(employee.status);
  const contract = (roleData as any)?.role_contracts?.[0] ?? null;
  const roleName = roleData?.name ?? employee.role_code;
  const totalTokens = usageLogs.reduce((s, u) => s + ((u as any).tokens_in ?? 0) + ((u as any).tokens_out ?? 0), 0);
  const totalCost = usageLogs.reduce((s, u) => s + ((u as any).estimated_cost_usd ?? 0), 0);
  const isUnderperforming = (employee.success_rate ?? 0) < 0.6 || (employee.bug_rate ?? 0) > 0.3;
  const successPct = Math.round((employee.success_rate ?? 0) * 100);
  const reputationScore = (employee.reputation_score ?? 0);
  const perfColor = reputationScore >= 0.8 ? "text-status-green" : reputationScore >= 0.5 ? "text-status-amber" : "text-destructive";
  const ciTotal = checkSuites.length;
  const ciPassed = checkSuites.filter((c) => c.status === "passed").length;
  const ciRate = ciTotal > 0 ? Math.round((ciPassed / ciTotal) * 100) : null;
  const lastReviewVerdict = reviews[0]?.verdict ?? null;
  const trendPoints = [62, 68, 65, 72, 78, successPct];
  const trendUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[trendPoints.length - 2];
  const loadPct = tasks.length > 0 ? Math.min(100, Math.round((tasks.length / 4) * 100)) : 0;

  const memoryCategories = [
    { key: "core_knowledge", title: "Core Knowledge", icon: <BookOpen className="h-3.5 w-3.5" />,
      items: [
        { text: "Follow role contract boundaries strictly", desc: "Base behavioral rule inherited from system", updated: "2 days ago", source: "contract" },
        { text: "Produce artifacts before marking tasks done", desc: "Quality gate requirement", updated: "5 days ago", source: "manual" },
        { text: "Escalate when confidence < 70%", desc: "Auto-learned from failure pattern analysis", updated: "1 week ago", source: "learning" },
      ] },
    { key: "project_memory", title: "Project-Specific Memory", icon: <FileCode className="h-3.5 w-3.5" />,
      items: [
        { text: "Project Alpha: strict TypeScript — no any types", desc: "Enforced by client constraint", updated: "1 day ago", source: "manual" },
        { text: "Project Beta: GraphQL preferred for data fetching", desc: "Architecture decision from blueprint", updated: "4 days ago", source: "contract" },
        { text: "All projects: 80% test coverage minimum", desc: "Company-wide quality standard", updated: "1 week ago", source: "contract" },
      ] },
    { key: "learned_patterns", title: "Learned Patterns", icon: <Lightbulb className="h-3.5 w-3.5" />,
      items: [
        { text: "Prefer small, focused components over monolithic files", desc: "Discovered through review feedback analysis", updated: "2 days ago", source: "learning" },
        { text: "Verify DB schema before writing queries", desc: "Reduced bug rate by 15%", updated: "5 days ago", source: "learning" },
        { text: "Include error boundaries in page-level components", desc: "Learned from production incident", updated: "1 week ago", source: "learning" },
      ] },
    { key: "failure_corrections", title: "Failure Corrections", icon: <AlertTriangle className="h-3.5 w-3.5" />,
      items: [
        { text: "Missed forbidden path check on prisma/ (Run #42)", desc: "Correction: Always validate paths pre-execution", updated: "3 days ago", source: "manual" },
        { text: "Output without acceptance criteria (Task #18)", desc: "Correction: Verify criteria exist before submission", updated: "1 week ago", source: "manual" },
      ] },
    { key: "manual_overrides", title: "Manual Overrides", icon: <Pencil className="h-3.5 w-3.5" />,
      items: [
        { text: "Never auto-generate migrations without explicit task", desc: "Founder override — safety constraint", updated: "1 day ago", source: "manual" },
      ] },
  ];

  const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
    contract: { label: "Contract", cls: "bg-secondary text-muted-foreground" },
    manual: { label: "Manual", cls: "bg-status-amber/15 text-status-amber" },
    learning: { label: "Learned", cls: "bg-status-green/15 text-status-green" },
  };

  const addPendingRule = () => {
    if (!newRuleText.trim()) return;
    setPendingUpdates((prev) => [...prev, `[${newRuleCategory}] ${newRuleText.trim()}`]);
    setNewRuleText("");
  };

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-8 py-6 space-y-6 max-w-[1200px]">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Link to="/office" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Office
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{employee.name}</span>
          </div>

          {/* ════════════════════════════════════════════════════════
              COMPACT HEADER
              ════════════════════════════════════════════════════════ */}
          <div className={`rounded-xl border overflow-hidden ${trainingMode ? "ring-1 ring-status-amber/40 border-status-amber/20" : "border-border"} bg-card`}>
            {trainingMode && (
              <div className="px-5 py-2 bg-status-amber/5 border-b border-status-amber/15 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse" />
                <span className="text-[11px] font-bold text-status-amber">Training Mode</span>
                <span className="text-[11px] text-muted-foreground">— Memory editable, changes staged</span>
                <Badge className="ml-auto text-[9px] font-bold bg-status-amber/10 text-status-amber border-0 px-1.5">
                  {pendingUpdates.length} pending
                </Badge>
              </div>
            )}

            <div className="px-6 py-5">
              <div className="flex items-start gap-5">
                {/* Avatar — compact */}
                <div className="relative shrink-0">
                  <img src={persona.avatar} alt={employee.name}
                    className="h-16 w-16 rounded-xl object-cover"
                    width={64} height={64} />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${st.dot}`} />
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[20px] font-bold text-foreground tracking-tight leading-tight">{employee.name}</h1>
                    <Badge className={`text-[10px] font-bold px-2 py-0.5 border-0 ${st.chipBg}`}>{st.label}</Badge>
                    {isUnderperforming && (
                      <Badge className="text-[10px] font-bold px-2 py-0.5 border-0 bg-destructive/10 text-destructive gap-1">
                        <AlertTriangle className="h-3 w-3" /> At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{roleName} <span className="text-muted-foreground/40">· {persona.tag}</span></p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{employee.model_name ?? "—"}</span>
                    <span className="text-border">·</span>
                    <span>{employee.provider ?? "—"}</span>
                    <span className="text-border">·</span>
                    <span>Hired {new Date(employee.hired_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Inline stats strip */}
                <div className="flex items-center gap-5 shrink-0">
                  <InlineStat label="Score" value={Math.round(reputationScore * 100)} color={perfColor} />
                  <InlineStat label="Success" value={`${successPct}%`} />
                  <InlineStat label="Bug" value={`${Math.round((employee.bug_rate ?? 0) * 100)}%`} color={(employee.bug_rate ?? 0) > 0.2 ? "text-destructive" : undefined} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Trend</span>
                    <MiniSparkline points={trendPoints} />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Load</span>
                    <div className="flex items-center gap-1.5">
                      <Progress value={loadPct} className="h-1.5 w-12" />
                      <span className="text-[10px] font-mono text-foreground">{loadPct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="px-6 py-2.5 border-t border-border/30 flex items-center gap-2">
              <Button
                size="sm"
                variant={trainingMode ? "outline" : "default"}
                className={`h-8 text-[12px] font-bold gap-1.5 px-4 ${!trainingMode ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                onClick={() => setTrainingMode(!trainingMode)}
              >
                {trainingMode ? <><Lock className="h-3.5 w-3.5" /> Exit Training</> : <><GraduationCap className="h-3.5 w-3.5" /> Training Mode</>}
              </Button>
              <Link to="/control/tasks">
                <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 px-4 font-medium">
                  <Eye className="h-3.5 w-3.5" /> Tasks
                </Button>
              </Link>
              <div className="ml-auto flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> <strong className="text-foreground font-mono">{totalTokens.toLocaleString()}</strong> tkn</span>
                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> <strong className="text-foreground font-mono">${totalCost.toFixed(3)}</strong></span>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              CURRENT WORK
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Wrench className="h-4 w-4" />} title="Current Work" />
            <div className="grid grid-cols-12 gap-4 mt-3">
              {/* Active tasks */}
              <div className="col-span-12 lg:col-span-5">
                <SectionCard title="Active Tasks" accent="border-l-status-amber">
                  {tasks.length === 0 ? <EmptyLine text="No active tasks" /> : (
                    <div className="space-y-0.5">
                      {tasks.map((t) => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-2.5 py-2 px-2.5 hover:bg-secondary/30 rounded-lg transition-colors group">
                            <TaskStateDot state={t.state} />
                            <span className="text-[13px] text-foreground truncate flex-1">{t.title}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Runs */}
              <div className="col-span-12 lg:col-span-4">
                <SectionCard title="Recent Runs">
                  {runs.length === 0 ? <EmptyLine text="No recent runs" /> : (
                    <div className="space-y-2">
                      {runs.slice(0, 4).map((r) => (
                        <div key={r.id} className="flex items-center gap-2.5 text-[12px]">
                          <RunStateDot state={r.state} />
                          <span className="font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground/50 capitalize">{r.state}</span>
                          {r.duration_ms && (
                            <span className="text-muted-foreground/40 ml-auto flex items-center gap-1">
                              <Clock className="h-3 w-3" />{Math.round(r.duration_ms / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Stats */}
              <div className="col-span-12 lg:col-span-3 space-y-3">
                <MiniStatCard label="Last Review"
                  value={lastReviewVerdict === "approved" ? "Approved" : lastReviewVerdict === "rejected" ? "Rejected" : "—"}
                  valueColor={lastReviewVerdict === "approved" ? "text-status-green" : lastReviewVerdict === "rejected" ? "text-destructive" : "text-muted-foreground"} />
                <MiniStatCard label="CI Pass Rate" value={ciRate !== null ? `${ciRate}%` : "—"}
                  valueColor={ciRate !== null && ciRate < 70 ? "text-destructive" : "text-foreground"} />
                <MiniStatCard label="Deployments" value={String(deployments.length)} valueColor="text-foreground" />
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SYSTEM CONTRACT
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Shield className="h-4 w-4" />} title="System Contract" subtitle="Enforced boundaries — read only" />
            <div className="mt-3">
              {!contract && !roleData ? (
                <div className="rounded-xl border border-border bg-card p-5 text-[13px] text-muted-foreground">No role contract assigned.</div>
              ) : (
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Allowed Paths" icon={<FolderCheckIcon className="h-3.5 w-3.5 text-status-green" />}
                      items={parseJsonArray(contract?.allowed_repo_paths_json)} fallback="No path restrictions" accentClass="border-l-status-green" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Forbidden Paths" icon={<FolderX className="h-3.5 w-3.5 text-destructive" />}
                      items={parseJsonArray(contract?.forbidden_repo_paths_json)} fallback="No forbidden paths" accentClass="border-l-destructive" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <SectionCard title="Permissions" titleIcon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />}>
                      <div className="space-y-2.5 text-[13px]">
                        <PermRow label="Deploy" icon={<Rocket className="h-3.5 w-3.5" />} allowed={contract?.may_deploy} />
                        <PermRow label="Merge PRs" icon={<GitPullRequest className="h-3.5 w-3.5" />} allowed={contract?.may_merge} />
                        <PermRow label="Modify Schema" icon={<Server className="h-3.5 w-3.5" />} allowed={contract?.may_modify_schema} />
                        <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
                          <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                            <AlertTriangle className="h-3.5 w-3.5" />Risk Threshold
                          </span>
                          <span className="font-mono font-bold text-foreground">{contract?.risk_threshold ?? "—"}</span>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              MEMORY
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Brain className="h-4 w-4" />} title="Memory"
              subtitle={trainingMode ? "Click entries to edit — changes staged until saved" : `${memoryCategories.length} categories`} />

            <div className="mt-3 space-y-2">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`rounded-xl border overflow-hidden ${trainingMode ? "border-status-amber/20" : "border-border"} bg-card`}>
                    <button onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-2.5 px-5 py-3 text-left hover:bg-secondary/20 transition-colors">
                      <span className="text-muted-foreground">{cat.icon}</span>
                      <span className="text-[13px] font-bold text-foreground flex-1">{cat.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-secondary/40 px-2 py-0.5 rounded">{cat.items.length}</span>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-0 border-t border-border/20">
                        <div className="space-y-0.5 mt-2">
                          {cat.items.map((item, i) => {
                            const sb = SOURCE_BADGE[item.source] ?? SOURCE_BADGE.contract;
                            return (
                              <div key={i} className="flex items-start gap-2.5 group py-2 px-3 rounded-lg hover:bg-secondary/15 transition-colors">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] text-foreground leading-relaxed">{item.text}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sb.cls}`}>{sb.label}</span>
                                    <span className="text-[10px] text-muted-foreground/40">{item.updated}</span>
                                  </div>
                                </div>
                                {trainingMode && (
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {trainingMode && (
                          <button className="mt-2 flex items-center gap-1 text-[11px] text-foreground/70 hover:text-foreground transition-colors font-medium px-3"
                            onClick={() => { setNewRuleCategory(cat.key); }}>
                            <Plus className="h-3.5 w-3.5" /> Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              TRAINING LAB
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-4 w-4" />} title="Training Lab"
              subtitle="Conversation, notes, and structured prompt drafting" />
            <div className="mt-3">
              {!trainingMode ? (
                <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground">Open Training Lab</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Enter training mode to teach through conversation, add materials, and refine prompts.
                    </p>
                  </div>
                  <Button className="h-9 text-[12px] font-bold gap-1.5 px-5 shrink-0 bg-foreground text-background hover:bg-foreground/90" onClick={() => setTrainingMode(true)}>
                    <Unlock className="h-3.5 w-3.5" /> Open
                  </Button>
                </div>
              ) : (
                <TrainingLab employeeId={id} employeeName={employee.name} roleName={roleName} />
              )}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              LEARNING HISTORY
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<TrendingUp className="h-4 w-4" />} title="Learning History" />
            <div className="mt-3 rounded-xl border border-border bg-card p-5">
              {learningProposals.length === 0 ? (
                <EmptyLine text="No learning history yet" />
              ) : (
                <div className="space-y-0 max-w-[640px]">
                  {learningProposals.slice(0, 15).map((lp, i) => (
                    <LearningTimelineItem key={lp.id} proposal={lp} isLast={i === Math.min(learningProposals.length, 15) - 1} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="h-6" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-[16px] font-bold text-foreground tracking-tight">{title}</h2>
      {subtitle && <span className="text-[11px] text-muted-foreground ml-1">— {subtitle}</span>}
    </div>
  );
}

function SectionCard({ title, titleIcon, accent, children }: { title: string; titleIcon?: React.ReactNode; accent?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 h-full ${accent ? `border-l-[3px] ${accent}` : ""}`}>
      <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-1.5">
        {titleIcon}{title}
      </h3>
      {children}
    </div>
  );
}

function InlineStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <span className={`text-[16px] font-bold font-mono tabular-nums ${color ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[12px] text-muted-foreground/50 py-2">{text}</p>;
}

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 48, h = 20;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const up = points[points.length - 1] >= points[points.length - 2];
  return <svg width={w} height={h} className="block"><path d={pathD} fill="none" stroke={up ? "hsl(var(--status-green))" : "hsl(var(--destructive))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MiniStatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div className={`text-[16px] font-bold font-mono tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { in_progress: "bg-status-amber", waiting_review: "bg-lifecycle-review", blocked: "bg-destructive", assigned: "bg-status-neutral" };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { running: "bg-status-amber animate-pulse", finalized: "bg-status-green", produced_output: "bg-status-green/70", failed: "bg-destructive", timed_out: "bg-destructive/70" };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: { title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 border-l-[3px] ${accentClass} h-full`}>
      <h3 className="text-[13px] font-bold text-foreground mb-2.5 flex items-center gap-1.5">{icon}{title}</h3>
      {items.length === 0 ? <p className="text-[12px] text-muted-foreground/50">{fallback}</p> : (
        <div className="space-y-1">{items.map((p, i) => <div key={i} className="text-[11px] font-mono text-foreground/70 bg-secondary/30 rounded px-2.5 py-1">{p}</div>)}</div>
      )}
    </div>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">{icon}{label}</span>
      {allowed ? <span className="flex items-center gap-1 text-status-green text-[12px] font-bold"><CheckCircle2 className="h-3.5 w-3.5" /> Yes</span>
        : <span className="flex items-center gap-1 text-muted-foreground/40 text-[12px]"><XCircle className="h-3.5 w-3.5" /> No</span>}
    </div>
  );
}

function TrainingAction({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <button className="rounded-xl border border-border bg-card p-3.5 flex items-start gap-2.5 hover:bg-secondary/30 transition-all text-left group">
      <span className="text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">{icon}</span>
      <div>
        <span className="text-[13px] font-bold text-foreground block">{label}</span>
        <span className="text-[11px] text-muted-foreground">{desc}</span>
      </div>
    </button>
  );
}

function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:   { icon: <FlaskConical className="h-3.5 w-3.5" />, label: "Proposal Created",        dotColor: "bg-status-neutral" },
    approved:    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Approved for Evaluation",  dotColor: "bg-status-amber" },
    promoted:    { icon: <Rocket className="h-3.5 w-3.5" />,       label: "Promoted to Production",   dotColor: "bg-status-green" },
    rejected:    { icon: <XCircle className="h-3.5 w-3.5" />,      label: "Rejected",                 dotColor: "bg-destructive" },
    rolled_back: { icon: <RotateCcw className="h-3.5 w-3.5" />,    label: "Rolled Back",              dotColor: "bg-destructive/70" },
  };
  const c = cfg[proposal.status] ?? cfg.candidate;
  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${c.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/30 my-1" />}
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{c.icon}</span>
          <span className="text-[13px] font-bold text-foreground">{c.label}</span>
          <span className="text-[10px] text-muted-foreground/40 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{proposal.hypothesis || proposal.proposal_type}</p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[11px] text-destructive/70 mt-0.5">Reason: {proposal.rejection_reason}</p>
        )}
      </div>
    </div>
  );
}
