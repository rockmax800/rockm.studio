import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getPersona, getStatusMeta } from "@/lib/personas";

import {
  TrendingUp, TrendingDown, Shield, Brain, GraduationCap, Wrench, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileCode, Lock, Unlock, Plus, Pencil,
  ChevronDown, ChevronRight, Zap, Rocket, RotateCcw, FlaskConical,
  ArrowUpRight, GitPullRequest, Server, FolderX, FolderCheck as FolderCheckIcon,
  BookOpen, Lightbulb, Ban, Save, ArrowLeft, Activity, Eye, Layers,
} from "lucide-react";

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
  const ciTotal = checkSuites.length;
  const ciPassed = checkSuites.filter((c) => c.status === "passed").length;
  const ciRate = ciTotal > 0 ? Math.round((ciPassed / ciTotal) * 100) : null;
  const lastReviewVerdict = reviews[0]?.verdict ?? null;
  const trendPoints = [62, 68, 65, 72, 78, successPct];
  const trendUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[trendPoints.length - 2];

  const memoryCategories = [
    { key: "domain_principles", section: "Core Principles", title: "Domain Principles", icon: <BookOpen className="h-4 w-4" />, source: "inherited",
      items: [
        { text: "Follow role contract boundaries strictly", updated: "2 days ago", source: "inherited" },
        { text: "Produce artifacts before marking tasks done", updated: "5 days ago", source: "manual" },
        { text: "Escalate when confidence < 70%", updated: "1 week ago", source: "learning_proposal" },
      ] },
    { key: "architecture_rules", section: "Core Principles", title: "Architecture Rules", icon: <Shield className="h-4 w-4" />, source: "inherited",
      items: [
        { text: "Use semantic tokens from design system", updated: "3 days ago", source: "inherited" },
        { text: "All API routes require admin auth middleware", updated: "1 week ago", source: "manual" },
        { text: "No direct Prisma access from frontend", updated: "2 weeks ago", source: "inherited" },
      ] },
    { key: "project_rules", section: "Project-specific Rules", title: "Project Context", icon: <FileCode className="h-4 w-4" />, source: "manual",
      items: [
        { text: "Project Alpha: strict TypeScript — no any types", updated: "1 day ago", source: "manual" },
        { text: "Project Beta: GraphQL preferred for data fetching", updated: "4 days ago", source: "manual" },
        { text: "All projects: 80% test coverage minimum", updated: "1 week ago", source: "inherited" },
      ] },
    { key: "learned_patterns", section: "Learned Patterns", title: "Learned Patterns", icon: <Lightbulb className="h-4 w-4" />, source: "learning_proposal",
      items: [
        { text: "Prefer small, focused components over monolithic files", updated: "2 days ago", source: "learning_proposal" },
        { text: "Verify DB schema before writing queries", updated: "5 days ago", source: "learning_proposal" },
        { text: "Include error boundaries in page-level components", updated: "1 week ago", source: "learning_proposal" },
      ] },
    { key: "failures", section: "Failure Corrections", title: "Mistakes & Corrections", icon: <AlertTriangle className="h-4 w-4" />, source: "manual",
      items: [
        { text: "Missed forbidden path check on prisma/ (Run #42) → Always validate paths pre-execution", updated: "3 days ago", source: "manual" },
        { text: "Output without acceptance criteria (Task #18) → Verify criteria exist before submission", updated: "1 week ago", source: "manual" },
      ] },
    { key: "manual_overrides", section: "Manual Overrides", title: "Founder Overrides", icon: <Pencil className="h-4 w-4" />, source: "manual",
      items: [
        { text: "Never auto-generate migrations without explicit task", updated: "1 day ago", source: "manual" },
      ] },
  ];

  const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
    inherited: { label: "Inherited", cls: "bg-secondary text-muted-foreground" },
    manual: { label: "Manual", cls: "bg-amber-100 text-amber-700" },
    learning_proposal: { label: "Learned", cls: "bg-blue-100 text-blue-700" },
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
            <Link to="/departments" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Capabilities
            </Link>
            <span>/</span>
            <Link to="/company" className="hover:text-foreground transition-colors">Team</Link>
            <span>/</span>
            <span className="text-foreground font-semibold">{employee.name}</span>
          </div>

          {/* ════════════════════════════════════════════════════════
              TOP HEADER — Large, dominant
              ════════════════════════════════════════════════════════ */}
          <div className={`ds-card p-0 overflow-hidden ${trainingMode ? "ring-2 ring-amber-400/60" : ""}`}>
            {trainingMode && (
              <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[13px] font-semibold text-amber-800">Training Mode Active</span>
                <span className="text-[12px] text-amber-600 ml-1">— Memory is editable, changes are staged</span>
                <Badge className="ml-auto text-[10px] font-bold bg-amber-200 text-amber-800 border-0 px-2">
                  {pendingUpdates.length} pending
                </Badge>
              </div>
            )}

            <div className={`px-8 py-7 ${persona.bgTint}`}>
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img src={persona.avatar} alt={employee.name}
                    className={`h-24 w-24 rounded-2xl object-cover ring-[3px] ${persona.ringClass} ring-offset-[3px] ring-offset-background`}
                    width={96} height={96} />
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-background ${st.dot}`} />
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-[30px] font-bold text-foreground tracking-tight leading-tight">{employee.name}</h1>
                    <Badge className={`text-[11px] font-semibold px-3 py-1 border-0 ${st.chipBg}`}>{st.label}</Badge>
                    {isUnderperforming && (
                      <Badge className="text-[11px] font-semibold px-3 py-1 border-0 bg-red-100 text-red-700 gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-[16px] text-muted-foreground mt-1">{roleName}</p>
                  <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-medium mt-0.5 inline-block">{persona.tag}</span>

                  <div className="flex items-center gap-3 mt-3 text-[12px] text-muted-foreground">
                    <span>Model: <strong className="text-foreground">{employee.model_name ?? "—"}</strong></span>
                    <span className="text-border">•</span>
                    <span>Provider: <strong className="text-foreground">{employee.provider ?? "—"}</strong></span>
                    <span className="text-border">•</span>
                    <span>Hired: <strong className="text-foreground">{new Date(employee.hired_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-start gap-6 shrink-0">
                  <MetricBlock label="Success" value={`${successPct}%`} trend={trendUp} size="lg" />
                  <MetricBlock label="Reputation" value={(employee.reputation_score ?? 0).toFixed(1)} size="lg" />
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
            <div className="px-8 py-3 border-t border-border/30 bg-card flex items-center gap-3">
              <Button
                size="sm"
                variant={trainingMode ? "outline" : "default"}
                className="h-9 text-[13px] font-semibold gap-2 px-5"
                onClick={() => setTrainingMode(!trainingMode)}
              >
                {trainingMode ? <><Lock className="h-4 w-4" /> Exit Training Mode</> : <><GraduationCap className="h-4 w-4" /> Enter Training Mode</>}
              </Button>
              <Link to={`/control/tasks`}>
                <Button size="sm" variant="outline" className="h-9 text-[13px] gap-2 px-5">
                  <Eye className="h-4 w-4" /> View Active Tasks
                </Button>
              </Link>
              <div className="ml-auto flex items-center gap-4 text-[13px] text-muted-foreground">
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
                <div className="ds-card p-5 border-t-[3px] border-t-amber-400 h-full">
                  <h3 className="text-[15px] font-bold text-foreground mb-4">Active Tasks</h3>
                  {tasks.length === 0 ? <EmptyLine text="No active tasks" /> : (
                    <div className="space-y-2">
                      {tasks.map((t) => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-3 py-2.5 px-3 hover:bg-secondary/30 rounded-lg transition-colors group">
                            <TaskStateDot state={t.state} />
                            <span className="text-[13px] text-foreground truncate flex-1 font-medium">{t.title}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Runs + CI + Review */}
              <div className="col-span-12 lg:col-span-4">
                <div className="ds-card p-5 h-full">
                  <h3 className="text-[15px] font-bold text-foreground mb-4">Recent Runs</h3>
                  {runs.length === 0 ? <EmptyLine text="No recent runs" /> : (
                    <div className="space-y-2.5">
                      {runs.slice(0, 4).map((r) => (
                        <div key={r.id} className="flex items-center gap-3 text-[13px]">
                          <RunStateDot state={r.state} />
                          <span className="font-mono text-[12px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                          <span className="text-[12px] text-muted-foreground/60 capitalize">{r.state}</span>
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
                <MiniStatCard label="Last Review" value={lastReviewVerdict === "approved" ? "Approved" : lastReviewVerdict === "rejected" ? "Rejected" : "—"}
                  valueColor={lastReviewVerdict === "approved" ? "text-green-600" : lastReviewVerdict === "rejected" ? "text-destructive" : "text-muted-foreground"} />
                <MiniStatCard label="CI Pass Rate" value={ciRate !== null ? `${ciRate}%` : "—"}
                  valueColor={ciRate !== null && ciRate < 70 ? "text-destructive" : "text-foreground"} />
                <MiniStatCard label="Deployments" value={String(deployments.length)} valueColor="text-foreground" />
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════════════════════
              SECTION 2 — ROLE CONTRACT (Static, non-editable)
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<Shield className="h-5 w-5" />} title="Role Contract" subtitle="System-enforced boundaries — not editable here" />
            <div className="mt-4">
              {!contract && !roleData ? (
                <div className="ds-card p-6 text-[14px] text-muted-foreground">No role contract assigned.</div>
              ) : (
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Allowed Repo Paths" icon={<FolderCheckIcon className="h-4 w-4 text-green-600" />}
                      items={parseJsonArray(contract?.allowed_repo_paths_json)} fallback="No path restrictions" accentClass="border-l-green-500" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <ContractPathBlock title="Forbidden Paths" icon={<FolderX className="h-4 w-4 text-destructive" />}
                      items={parseJsonArray(contract?.forbidden_repo_paths_json)} fallback="No forbidden paths" accentClass="border-l-destructive" />
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="ds-card p-5 h-full">
                      <h3 className="text-[15px] font-bold text-foreground mb-4 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" /> Permissions
                      </h3>
                      <div className="space-y-3 text-[13px]">
                        <PermRow label="Deploy" icon={<Rocket className="h-3.5 w-3.5" />} allowed={contract?.may_deploy} />
                        <PermRow label="Merge PRs" icon={<GitPullRequest className="h-3.5 w-3.5" />} allowed={contract?.may_merge} />
                        <PermRow label="Modify Schema" icon={<Server className="h-3.5 w-3.5" />} allowed={contract?.may_modify_schema} />
                        <div className="flex items-center justify-between pt-3 border-t border-border/30">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />Risk Threshold
                          </span>
                          <span className="font-mono font-bold text-foreground">{contract?.risk_threshold ?? "—"}</span>
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
              subtitle={trainingMode ? "Click entries to edit — changes are staged until saved" : "Structured knowledge base"} />

            <div className="mt-4 space-y-3">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`ds-card overflow-hidden ${trainingMode ? "border-amber-200/60" : ""}`}>
                    <button onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/20 transition-colors">
                      <span className="text-muted-foreground">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-bold text-foreground">{cat.title}</span>
                        <span className="text-[12px] text-muted-foreground ml-3">{cat.section}</span>
                      </div>
                      <span className="text-[12px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">{cat.items.length} entries</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/40" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-border/20">
                        <div className="space-y-3 mt-3">
                          {cat.items.map((item, i) => {
                            const sb = SOURCE_BADGE[item.source] ?? SOURCE_BADGE.inherited;
                            return (
                              <div key={i} className="flex items-start gap-3 group py-2 px-3 rounded-lg hover:bg-secondary/15 transition-colors">
                                <span className="w-2 h-2 rounded-full bg-primary/30 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] text-foreground leading-relaxed">{item.text}</p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sb.cls}`}>{sb.label}</span>
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
                          <button className="mt-3 flex items-center gap-1.5 text-[13px] text-primary hover:text-primary/80 transition-colors font-medium px-3"
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
              SECTION 4 — TRAINING MODE (always visible, active when toggled)
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<GraduationCap className="h-5 w-5" />} title="Training" />
            <div className="mt-4">
              <div className={`ds-card p-6 ${trainingMode ? "border-l-4 border-l-amber-400 bg-amber-50/20" : ""}`}>
                {!trainingMode ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[16px] font-bold text-foreground">Training Mode</p>
                      <p className="text-[14px] text-muted-foreground mt-1 leading-relaxed">
                        Enter training mode to add rules, examples, corrections, and constraints to this employee's knowledge base. Changes are staged until explicitly saved.
                      </p>
                    </div>
                    <Button className="h-10 text-[13px] font-semibold gap-2 px-6 shrink-0" onClick={() => setTrainingMode(true)}>
                      <Unlock className="h-4 w-4" /> Enter Training Mode
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[16px] font-bold text-foreground">Training Mode Active</p>
                        <p className="text-[13px] text-amber-700 mt-0.5">Add rules, examples, corrections. Changes are staged until saved.</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-9 text-[13px] gap-2" onClick={() => setTrainingMode(false)}>
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
                    <div className="border border-border/40 rounded-lg p-4 bg-card">
                      <p className="text-[13px] font-semibold text-foreground mb-3">Quick Add Memory Entry</p>
                      <Textarea
                        value={newRuleText}
                        onChange={(e) => setNewRuleText(e.target.value)}
                        placeholder="Type a new rule, pattern, or correction…"
                        className="h-20 text-[14px] resize-none bg-background"
                      />
                      <div className="flex items-center gap-3 mt-3">
                        <select value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-3 text-[13px] text-foreground">
                          <option value="domain_principles">Core Principle</option>
                          <option value="project_rules">Project Rule</option>
                          <option value="learned_patterns">Learned Pattern</option>
                          <option value="failures">Failure Correction</option>
                          <option value="manual_overrides">Manual Override</option>
                        </select>
                        <Button size="sm" className="h-9 text-[13px] gap-2 px-4" onClick={addPendingRule}
                          disabled={!newRuleText.trim()}>
                          <Plus className="h-4 w-4" /> Stage Entry
                        </Button>
                      </div>
                    </div>

                    {/* Pending updates */}
                    {pendingUpdates.length > 0 && (
                      <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/30">
                        <p className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600" /> Pending Memory Updates ({pendingUpdates.length})
                        </p>
                        <div className="space-y-2">
                          {pendingUpdates.map((u, i) => (
                            <div key={i} className="flex items-start gap-2 text-[13px] text-foreground bg-background rounded px-3 py-2">
                              <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              <span className="flex-1">{u}</span>
                              <button onClick={() => setPendingUpdates((p) => p.filter((_, j) => j !== i))}
                                className="text-muted-foreground hover:text-destructive transition-colors">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Button className="mt-3 w-full h-10 text-[13px] font-semibold gap-2">
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
              SECTION 5 — LEARNING HISTORY (Timeline)
              ════════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader icon={<TrendingUp className="h-5 w-5" />} title="Learning History" />
            <div className="mt-4 ds-card p-6">
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

          {/* Bottom spacer */}
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
        <h2 className="text-[20px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[14px] text-muted-foreground/50 py-2">{text}</p>;
}

function MetricBlock({ label, value, trend, danger, size = "md" }: { label: string; value: string; trend?: boolean; danger?: boolean; size?: "md" | "lg" }) {
  return (
    <div className="text-center">
      <div className={`text-muted-foreground uppercase tracking-wider mb-1 font-medium ${size === "lg" ? "text-[11px]" : "text-[10px]"}`}>{label}</div>
      <div className={`font-bold leading-tight ${danger ? "text-destructive" : "text-foreground"} ${size === "lg" ? "text-[26px]" : "text-[20px]"}`}>{value}</div>
      {trend !== undefined && (
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {trend ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
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
  return <svg width={w} height={h} className="block"><path d={pathD} fill="none" stroke={up ? "#16a34a" : "#ef4444"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MiniStatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="ds-card p-4 text-center">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div className={`text-[18px] font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { in_progress: "bg-amber-500", waiting_review: "bg-violet-500", blocked: "bg-destructive", assigned: "bg-blue-400" };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { running: "bg-amber-500 animate-pulse", finalized: "bg-green-500", produced_output: "bg-green-400", failed: "bg-destructive", timed_out: "bg-red-400" };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/30"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: { title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string }) {
  return (
    <div className={`ds-card p-5 border-l-4 ${accentClass} h-full`}>
      <h3 className="text-[15px] font-bold text-foreground mb-3 flex items-center gap-2">{icon}{title}</h3>
      {items.length === 0 ? <p className="text-[13px] text-muted-foreground/50">{fallback}</p> : (
        <div className="space-y-1.5">{items.map((p, i) => <div key={i} className="text-[13px] font-mono text-foreground/70 bg-secondary/30 rounded px-2.5 py-1">{p}</div>)}</div>
      )}
    </div>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-2">{icon}{label}</span>
      {allowed ? <span className="flex items-center gap-1.5 text-green-600 font-semibold"><CheckCircle2 className="h-4 w-4" /> Yes</span>
        : <span className="flex items-center gap-1.5 text-muted-foreground/50"><XCircle className="h-4 w-4" /> No</span>}
    </div>
  );
}

function TrainingAction({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <button className="ds-card p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors text-left group">
      <span className="text-muted-foreground group-hover:text-foreground transition-colors mt-0.5">{icon}</span>
      <div>
        <span className="text-[13px] font-semibold text-foreground block">{label}</span>
        <span className="text-[11px] text-muted-foreground">{desc}</span>
      </div>
    </button>
  );
}

function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:   { icon: <FlaskConical className="h-4 w-4" />, label: "Proposal Created",  dotColor: "bg-blue-500" },
    approved:    { icon: <CheckCircle2 className="h-4 w-4" />, label: "Approved for Eval",  dotColor: "bg-amber-500" },
    promoted:    { icon: <Rocket className="h-4 w-4" />,       label: "Promoted to Production", dotColor: "bg-green-500" },
    rejected:    { icon: <XCircle className="h-4 w-4" />,      label: "Rejected",            dotColor: "bg-red-500" },
    rolled_back: { icon: <RotateCcw className="h-4 w-4" />,    label: "Rolled Back",         dotColor: "bg-red-400" },
  };
  const c = cfg[proposal.status] ?? cfg.candidate;
  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${c.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{c.icon}</span>
          <span className="text-[14px] font-bold text-foreground">{c.label}</span>
          <span className="text-[12px] text-muted-foreground/50 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{proposal.hypothesis || proposal.proposal_type}</p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[12px] text-red-500/70 mt-1">Reason: {proposal.rejection_reason}</p>
        )}
      </div>
    </div>
  );
}
