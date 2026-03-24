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
  const perfRingBorder = reputationScore >= 0.8 ? "border-status-green/40" : reputationScore >= 0.5 ? "border-status-amber/40" : "border-destructive/40";
  const ciTotal = checkSuites.length;
  const ciPassed = checkSuites.filter((c) => c.status === "passed").length;
  const ciRate = ciTotal > 0 ? Math.round((ciPassed / ciTotal) * 100) : null;
  const lastReviewVerdict = reviews[0]?.verdict ?? null;
  const trendPoints = [62, 68, 65, 72, 78, successPct];
  const trendUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[trendPoints.length - 2];
  const loadPct = tasks.length > 0 ? Math.min(100, Math.round((tasks.length / 4) * 100)) : 0;

  const memoryCategories = [
    { key: "core_knowledge", title: "Core Knowledge", icon: <BookOpen className="h-4 w-4" />,
      items: [
        { text: "Follow role contract boundaries strictly", desc: "Base behavioral rule inherited from system", updated: "2 days ago", source: "contract" },
        { text: "Produce artifacts before marking tasks done", desc: "Quality gate requirement", updated: "5 days ago", source: "manual" },
        { text: "Escalate when confidence < 70%", desc: "Auto-learned from failure pattern analysis", updated: "1 week ago", source: "learning" },
      ] },
    { key: "project_memory", title: "Project-Specific Memory", icon: <FileCode className="h-4 w-4" />,
      items: [
        { text: "Project Alpha: strict TypeScript — no any types", desc: "Enforced by client constraint", updated: "1 day ago", source: "manual" },
        { text: "Project Beta: GraphQL preferred for data fetching", desc: "Architecture decision from blueprint", updated: "4 days ago", source: "contract" },
        { text: "All projects: 80% test coverage minimum", desc: "Company-wide quality standard", updated: "1 week ago", source: "contract" },
      ] },
    { key: "learned_patterns", title: "Learned Patterns", icon: <Lightbulb className="h-4 w-4" />,
      items: [
        { text: "Prefer small, focused components over monolithic files", desc: "Discovered through review feedback analysis", updated: "2 days ago", source: "learning" },
        { text: "Verify DB schema before writing queries", desc: "Reduced bug rate by 15%", updated: "5 days ago", source: "learning" },
        { text: "Include error boundaries in page-level components", desc: "Learned from production incident", updated: "1 week ago", source: "learning" },
      ] },
    { key: "failure_corrections", title: "Failure Corrections", icon: <AlertTriangle className="h-4 w-4" />,
      items: [
        { text: "Missed forbidden path check on prisma/ (Run #42)", desc: "Correction: Always validate paths pre-execution", updated: "3 days ago", source: "manual" },
        { text: "Output without acceptance criteria (Task #18)", desc: "Correction: Verify criteria exist before submission", updated: "1 week ago", source: "manual" },
      ] },
    { key: "manual_overrides", title: "Manual Overrides", icon: <Pencil className="h-4 w-4" />,
      items: [
        { text: "Never auto-generate migrations without explicit task", desc: "Founder override — safety constraint", updated: "1 day ago", source: "manual" },
      ] },
  ];

  const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
    contract: { label: "Contract", cls: "bg-secondary text-muted-foreground" },
    manual: { label: "Manual", cls: "bg-status-amber/15 text-status-amber" },
    learning: { label: "Learned", cls: "bg-status-blue/15 text-status-blue" },
  };

  const addPendingRule = () => {
    if (!newRuleText.trim()) return;
    setPendingUpdates((prev) => [...prev, `[${newRuleCategory}] ${newRuleText.trim()}`]);
    setNewRuleText("");
  };

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-8 py-6 space-y-8 max-w-[1280px]">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Link to="/office" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Production Floor
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">{employee.name}</span>
          </div>

          {/* ════════════════════════════════════════════════════════
              TOP HEADER — 150px avatar, dominant
              ════════════════════════════════════════════════════════ */}
          <div className={`rounded-2xl border overflow-hidden ${trainingMode ? "ring-2 ring-status-amber/60 border-status-amber/30" : "border-border"}`}>
            {trainingMode && (
              <div className="px-6 py-2.5 bg-status-amber/5 border-b border-status-amber/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-amber animate-pulse" />
                <span className="text-[13px] font-bold text-status-amber">Training Mode Active</span>
                <span className="text-[12px] text-muted-foreground ml-1">— Memory is editable, changes are staged</span>
                <Badge className="ml-auto text-[10px] font-bold bg-status-amber/15 text-status-amber border-0 px-2">
                  {pendingUpdates.length} pending
                </Badge>
              </div>
            )}

            <div className={`px-8 py-8 ${persona.bgTint}`}>
              <div className="flex items-start gap-8">
                {/* Large avatar with performance ring */}
                <div className="relative shrink-0">
                  <div className={`rounded-2xl border-[4px] ${perfRingBorder} p-1.5`}>
                    <img src={persona.avatar} alt={employee.name}
                      className={`h-[150px] w-[150px] rounded-xl object-cover ring-[3px] ${persona.ringClass} ring-offset-[3px] ring-offset-background`}
                      width={150} height={150} />
                  </div>
                  <span className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-[3px] border-card ${st.dot}`} />
                  {/* Performance score overlay */}
                  <div className={`absolute -top-2 -right-2 h-10 w-10 rounded-xl bg-card border-2 ${perfRingBorder} flex items-center justify-center shadow-md`}>
                    <span className={`text-[16px] font-bold font-mono ${perfColor}`}>{Math.round(reputationScore * 100)}</span>
                  </div>
                </div>

                {/* Identity block */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-[32px] font-bold text-foreground tracking-tight leading-none">{employee.name}</h1>
                    <Badge className={`text-[12px] font-bold px-3 py-1.5 border-0 ${st.chipBg}`}>{st.label}</Badge>
                    {isUnderperforming && (
                      <Badge className="text-[11px] font-bold px-3 py-1 border-0 bg-destructive/10 text-destructive gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-[18px] text-muted-foreground mt-1 font-medium">{roleName}</p>
                  <span className="text-[13px] uppercase tracking-wider text-muted-foreground/40 font-semibold mt-0.5 inline-block">{persona.tag}</span>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 mt-4 text-[13px] text-muted-foreground">
                    <span>Model: <strong className="text-foreground">{employee.model_name ?? "—"}</strong></span>
                    <span className="text-border">•</span>
                    <span>Provider: <strong className="text-foreground">{employee.provider ?? "—"}</strong></span>
                    <span className="text-border">•</span>
                    <span>Hired: <strong className="text-foreground">{new Date(employee.hired_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></span>
                  </div>

                  {/* Load bar */}
                  <div className="flex items-center gap-3 mt-4 max-w-[300px]">
                    <span className="text-[12px] text-muted-foreground font-medium">Load</span>
                    <Progress value={loadPct} className="h-2 flex-1" />
                    <span className="text-[12px] font-bold font-mono text-foreground">{loadPct}%</span>
                  </div>
                </div>

                {/* Metrics column */}
                <div className="flex items-start gap-6 shrink-0 pt-2">
                  <MetricBlock label="Success" value={`${successPct}%`} trend={trendUp} size="lg" />
                  <MetricBlock label="Reputation" value={reputationScore.toFixed(1)} size="lg" />
                  <MetricBlock label="Bug Rate" value={`${Math.round((employee.bug_rate ?? 0) * 100)}%`}
                    danger={(employee.bug_rate ?? 0) > 0.2} size="lg" />
                  <div className="text-center">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Trend</div>
                    <MiniSparkline points={trendPoints} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="px-8 py-3.5 border-t border-border/30 bg-card flex items-center gap-3">
              <Button
                size="sm"
                variant={trainingMode ? "outline" : "default"}
                className={`h-10 text-[13px] font-bold gap-2 px-6 ${!trainingMode ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
                onClick={() => setTrainingMode(!trainingMode)}
              >
                {trainingMode ? <><Lock className="h-4 w-4" /> Exit Training Mode</> : <><GraduationCap className="h-4 w-4" /> Enter Training Mode</>}
              </Button>
              <Link to="/control/tasks">
                <Button size="sm" variant="outline" className="h-10 text-[13px] gap-2 px-5 font-semibold">
                  <Eye className="h-4 w-4" /> View Active Tasks
                </Button>
              </Link>
              <div className="ml-auto flex items-center gap-5 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" /> <strong className="text-foreground font-mono">{totalTokens.toLocaleString()}</strong> tokens</span>
                <span className="flex items-center gap-1.5"><Activity className="h-4 w-4" /> <strong className="text-foreground font-mono">${totalCost.toFixed(3)}</strong></span>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 1 — CURRENT WORK
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Wrench className="h-5 w-5" />} title="Current Work" />
            <div className="grid grid-cols-12 gap-5 mt-4">
              {/* Active tasks */}
              <div className="col-span-12 lg:col-span-5">
                <div className="rounded-2xl border border-border bg-card p-5 border-t-[3px] border-t-status-amber h-full">
                  <h3 className="text-[16px] font-bold text-foreground mb-4">Active Tasks</h3>
                  {tasks.length === 0 ? <EmptyLine text="No active tasks" /> : (
                    <div className="space-y-1.5">
                      {tasks.map((t) => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                            <TaskStateDot state={t.state} />
                            <span className="text-[14px] text-foreground truncate flex-1 font-medium">{t.title}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Runs */}
              <div className="col-span-12 lg:col-span-4">
                <div className="rounded-2xl border border-border bg-card p-5 h-full">
                  <h3 className="text-[16px] font-bold text-foreground mb-4">Recent Runs</h3>
                  {runs.length === 0 ? <EmptyLine text="No recent runs" /> : (
                    <div className="space-y-2.5">
                      {runs.slice(0, 4).map((r) => (
                        <div key={r.id} className="flex items-center gap-3 text-[13px]">
                          <RunStateDot state={r.state} />
                          <span className="font-mono text-[12px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                          <span className="text-[13px] text-muted-foreground/60 capitalize">{r.state}</span>
                          {r.duration_ms && (
                            <span className="text-muted-foreground/40 ml-auto flex items-center gap-1">
                              <Clock className="h-3 w-3" />{Math.round(r.duration_ms / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
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
              SECTION 2 — ROLE CONTRACT (System Rules)
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Shield className="h-5 w-5" />} title="System Contract" subtitle="System-enforced boundaries — read only" />
            <div className="mt-4">
              {!contract && !roleData ? (
                <div className="rounded-2xl border border-border bg-card p-6 text-[14px] text-muted-foreground">No role contract assigned.</div>
              ) : (
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Allowed Repo Paths" icon={<FolderCheckIcon className="h-4 w-4 text-status-green" />}
                      items={parseJsonArray(contract?.allowed_repo_paths_json)} fallback="No path restrictions" accentClass="border-l-status-green" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Forbidden Paths" icon={<FolderX className="h-4 w-4 text-destructive" />}
                      items={parseJsonArray(contract?.forbidden_repo_paths_json)} fallback="No forbidden paths" accentClass="border-l-destructive" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="rounded-2xl border border-border bg-card p-5 h-full">
                      <h3 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" /> Permissions
                      </h3>
                      <div className="space-y-3 text-[14px]">
                        <PermRow label="Deploy" icon={<Rocket className="h-4 w-4" />} allowed={contract?.may_deploy} />
                        <PermRow label="Merge PRs" icon={<GitPullRequest className="h-4 w-4" />} allowed={contract?.may_merge} />
                        <PermRow label="Modify Schema" icon={<Server className="h-4 w-4" />} allowed={contract?.may_modify_schema} />
                        <div className="flex items-center justify-between pt-3 border-t border-border/30">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4" />Risk Threshold
                          </span>
                          <span className="font-mono font-bold text-foreground text-[16px]">{contract?.risk_threshold ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — MEMORY (Core Knowledge)
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Brain className="h-5 w-5" />} title="Memory"
              subtitle={trainingMode ? "Click entries to edit — changes are staged until saved" : "Structured knowledge base — 5 categories"} />

            <div className="mt-4 space-y-3">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`rounded-2xl border overflow-hidden ${trainingMode ? "border-status-amber/30" : "border-border"} bg-card`}>
                    <button onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-secondary/20 transition-colors">
                      <span className="text-muted-foreground">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[16px] font-bold text-foreground">{cat.title}</span>
                      </div>
                      <span className="text-[12px] text-muted-foreground font-mono bg-secondary/50 px-2.5 py-1 rounded-lg">{cat.items.length} entries</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-0 border-t border-border/20">
                        <div className="space-y-2 mt-3">
                          {cat.items.map((item, i) => {
                            const sb = SOURCE_BADGE[item.source] ?? SOURCE_BADGE.contract;
                            return (
                              <div key={i} className="flex items-start gap-3 group py-3 px-4 rounded-xl hover:bg-secondary/15 transition-colors">
                                <span className="w-2.5 h-2.5 rounded-full bg-primary/30 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[15px] text-foreground font-medium leading-relaxed">{item.text}</p>
                                  <p className="text-[13px] text-muted-foreground mt-0.5">{item.desc}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sb.cls}`}>{sb.label}</span>
                                    <span className="text-[11px] text-muted-foreground/50">Updated {item.updated}</span>
                                  </div>
                                </div>
                                {trainingMode && (
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {trainingMode && (
                          <button className="mt-3 flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 transition-colors font-bold px-4"
                            onClick={() => { setNewRuleCategory(cat.key); }}>
                            <Plus className="h-4 w-4" /> Add entry to {cat.title}
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
              SECTION 4 — TRAINING MODE
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-5 w-5" />} title="Training" />
            <div className="mt-4">
              <div className={`rounded-2xl border bg-card p-6 ${trainingMode ? "border-l-4 border-l-status-amber border-status-amber/30 bg-status-amber/3" : "border-border"}`}>
                {!trainingMode ? (
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <p className="text-[18px] font-bold text-foreground">Training Mode</p>
                      <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed max-w-[600px]">
                        Enter training mode to add rules, examples, corrections, and constraints. Changes are staged until explicitly saved.
                      </p>
                    </div>
                    <Button className="h-11 text-[14px] font-bold gap-2 px-6 shrink-0 bg-foreground text-background hover:bg-foreground/90" onClick={() => setTrainingMode(true)}>
                      <Unlock className="h-4 w-4" /> Enter Training Mode
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[18px] font-bold text-foreground">Training Mode Active</p>
                        <p className="text-[14px] text-status-amber mt-0.5">Add rules, examples, corrections. Changes are staged until saved.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-[13px] gap-2 font-bold" onClick={() => setTrainingMode(false)}>
                        <Lock className="h-4 w-4" /> Exit
                      </Button>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <TrainingAction icon={<Plus className="h-4 w-4" />} label="Add Rule" desc="New behavioral rule" />
                      <TrainingAction icon={<FileCode className="h-4 w-4" />} label="Add Example" desc="Reference pattern" />
                      <TrainingAction icon={<Ban className="h-4 w-4" />} label="Add Constraint" desc="Explicit restriction" />
                      <TrainingAction icon={<AlertTriangle className="h-4 w-4" />} label="Add Correction" desc="Fix past mistake" />
                    </div>

                    {/* Inline add */}
                    <div className="border border-border/40 rounded-xl p-5 bg-card">
                      <p className="text-[14px] font-bold text-foreground mb-3">Quick Add Memory Entry</p>
                      <Textarea
                        value={newRuleText}
                        onChange={(e) => setNewRuleText(e.target.value)}
                        placeholder="Type a new rule, pattern, or correction…"
                        className="h-20 text-[14px] resize-none bg-background rounded-xl"
                      />
                      <div className="flex items-center gap-3 mt-3">
                        <select value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}
                          className="h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground">
                          <option value="core_knowledge">Core Knowledge</option>
                          <option value="project_memory">Project Memory</option>
                          <option value="learned_patterns">Learned Pattern</option>
                          <option value="failure_corrections">Failure Correction</option>
                          <option value="manual_overrides">Manual Override</option>
                        </select>
                        <Button size="sm" className="h-9 text-[13px] gap-2 px-4 font-bold" onClick={addPendingRule}
                          disabled={!newRuleText.trim()}>
                          <Plus className="h-4 w-4" /> Stage Entry
                        </Button>
                      </div>
                    </div>

                    {/* Pending updates */}
                    {pendingUpdates.length > 0 && (
                      <div className="border border-status-amber/30 rounded-xl p-5 bg-status-amber/5">
                        <p className="text-[15px] font-bold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-status-amber" /> Pending Memory Updates ({pendingUpdates.length})
                        </p>
                        <div className="space-y-2">
                          {pendingUpdates.map((u, i) => (
                            <div key={i} className="flex items-start gap-2 text-[14px] text-foreground bg-card rounded-lg px-3 py-2.5">
                              <span className="w-2 h-2 rounded-full bg-status-amber mt-2 shrink-0" />
                              <span className="flex-1">{u}</span>
                              <button onClick={() => setPendingUpdates((p) => p.filter((_, j) => j !== i))}
                                className="text-muted-foreground hover:text-destructive transition-colors">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Button className="mt-4 w-full h-11 text-[14px] font-bold gap-2 bg-foreground text-background hover:bg-foreground/90">
                          <Save className="h-4 w-4" /> Save All Memory Updates
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 5 — LEARNING HISTORY
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<TrendingUp className="h-5 w-5" />} title="Learning History" />
            <div className="mt-4 rounded-2xl border border-border bg-card p-6">
              {learningProposals.length === 0 ? (
                <EmptyLine text="No learning history yet" />
              ) : (
                <div className="space-y-0 max-w-[700px]">
                  {learningProposals.slice(0, 15).map((lp, i) => (
                    <LearningTimelineItem key={lp.id} proposal={lp} isLast={i === Math.min(learningProposals.length, 15) - 1} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="h-8" />
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
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <h2 className="text-[22px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[14px] text-muted-foreground/50 py-3">{text}</p>;
}

function MetricBlock({ label, value, trend, danger, size = "md" }: { label: string; value: string; trend?: boolean; danger?: boolean; size?: "md" | "lg" }) {
  return (
    <div className="text-center">
      <div className={`text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold ${size === "lg" ? "text-[11px]" : "text-[10px]"}`}>{label}</div>
      <div className={`font-bold leading-tight font-mono tabular-nums ${danger ? "text-destructive" : "text-foreground"} ${size === "lg" ? "text-[28px]" : "text-[20px]"}`}>{value}</div>
      {trend !== undefined && (
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {trend ? <TrendingUp className="h-4 w-4 text-status-green" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
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
  const w = 72, h = 32;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const up = points[points.length - 1] >= points[points.length - 2];
  return <svg width={w} height={h} className="block"><path d={pathD} fill="none" stroke={up ? "hsl(var(--status-green))" : "hsl(var(--destructive))"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MiniStatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">{label}</div>
      <div className={`text-[20px] font-bold font-mono tabular-nums ${valueColor}`}>{value}</div>
    </div>
  );
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { in_progress: "bg-status-amber", waiting_review: "bg-lifecycle-review", blocked: "bg-destructive", assigned: "bg-status-blue" };
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { running: "bg-status-amber animate-pulse", finalized: "bg-status-green", produced_output: "bg-status-green/70", failed: "bg-destructive", timed_out: "bg-destructive/70" };
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: { title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 border-l-4 ${accentClass} h-full`}>
      <h3 className="text-[16px] font-bold text-foreground mb-3 flex items-center gap-2">{icon}{title}</h3>
      {items.length === 0 ? <p className="text-[14px] text-muted-foreground/50">{fallback}</p> : (
        <div className="space-y-1.5">{items.map((p, i) => <div key={i} className="text-[13px] font-mono text-foreground/70 bg-secondary/30 rounded-lg px-3 py-1.5">{p}</div>)}</div>
      )}
    </div>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-2">{icon}{label}</span>
      {allowed ? <span className="flex items-center gap-1.5 text-status-green font-bold"><CheckCircle2 className="h-4 w-4" /> Yes</span>
        : <span className="flex items-center gap-1.5 text-muted-foreground/50"><XCircle className="h-4 w-4" /> No</span>}
    </div>
  );
}

function TrainingAction({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <button className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:bg-secondary/30 hover:shadow-md transition-all text-left group">
      <span className="text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">{icon}</span>
      <div>
        <span className="text-[14px] font-bold text-foreground block">{label}</span>
        <span className="text-[12px] text-muted-foreground">{desc}</span>
      </div>
    </button>
  );
}

function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:   { icon: <FlaskConical className="h-4 w-4" />, label: "Proposal Created",        dotColor: "bg-status-blue" },
    approved:    { icon: <CheckCircle2 className="h-4 w-4" />, label: "Approved for Evaluation",  dotColor: "bg-status-amber" },
    promoted:    { icon: <Rocket className="h-4 w-4" />,       label: "Promoted to Production",   dotColor: "bg-status-green" },
    rejected:    { icon: <XCircle className="h-4 w-4" />,      label: "Rejected",                 dotColor: "bg-destructive" },
    rolled_back: { icon: <RotateCcw className="h-4 w-4" />,    label: "Rolled Back",              dotColor: "bg-destructive/70" },
  };
  const c = cfg[proposal.status] ?? cfg.candidate;
  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ${c.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{c.icon}</span>
          <span className="text-[15px] font-bold text-foreground">{c.label}</span>
          <span className="text-[12px] text-muted-foreground/50 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">{proposal.hypothesis || proposal.proposal_type}</p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[13px] text-destructive/70 mt-1">Reason: {proposal.rejection_reason}</p>
        )}
      </div>
    </div>
  );
}
