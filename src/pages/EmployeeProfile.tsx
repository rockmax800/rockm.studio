import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

import avatarFrontend from "@/assets/avatars/avatar-frontend.jpg";
import avatarBackend from "@/assets/avatars/avatar-backend.jpg";
import avatarStrategist from "@/assets/avatars/avatar-strategist.jpg";
import avatarArchitect from "@/assets/avatars/avatar-architect.jpg";
import avatarReviewer from "@/assets/avatars/avatar-reviewer.jpg";
import avatarQa from "@/assets/avatars/avatar-qa.jpg";
import avatarRelease from "@/assets/avatars/avatar-release.jpg";
import avatarBackendImpl from "@/assets/avatars/avatar-backend-impl.jpg";

import {
  TrendingUp,
  TrendingDown,
  Shield,
  Brain,
  GraduationCap,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Lock,
  Unlock,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
  Zap,
  Rocket,
  RotateCcw,
  FlaskConical,
  ArrowUpRight,
  GitPullRequest,
  Server,
  FolderX,
  FolderCheck as FolderCheckIcon,
  BookOpen,
  Lightbulb,
  Ban,
  Save,
} from "lucide-react";

/* ── Persona System ──────────────────────────────────────────── */
interface RolePersona {
  avatar: string;
  ringClass: string;
  accentBg: string;
  tag: string;
}

const ROLE_PERSONAS: Record<string, RolePersona> = {
  frontend_builder:    { avatar: avatarFrontend,    ringClass: "ring-blue-500",    accentBg: "bg-blue-50/50",    tag: "Pixel Perfectionist" },
  backend_architect:   { avatar: avatarBackend,     ringClass: "ring-indigo-500",  accentBg: "bg-indigo-50/50",  tag: "Systems Thinker" },
  backend_implementer: { avatar: avatarBackendImpl, ringClass: "ring-violet-500",  accentBg: "bg-violet-50/50",  tag: "Pragmatic Builder" },
  product_strategist:  { avatar: avatarStrategist,  ringClass: "ring-amber-500",   accentBg: "bg-amber-50/50",   tag: "Vision Driver" },
  solution_architect:  { avatar: avatarArchitect,   ringClass: "ring-cyan-500",    accentBg: "bg-cyan-50/50",    tag: "Structure Architect" },
  reviewer:            { avatar: avatarReviewer,     ringClass: "ring-emerald-500", accentBg: "bg-emerald-50/50", tag: "Quality Guardian" },
  qa_agent:            { avatar: avatarQa,          ringClass: "ring-rose-500",    accentBg: "bg-rose-50/50",    tag: "Defect Hunter" },
  release_coordinator: { avatar: avatarRelease,     ringClass: "ring-orange-500",  accentBg: "bg-orange-50/50",  tag: "Ship Captain" },
};

const DEFAULT_PERSONA: RolePersona = {
  avatar: avatarArchitect, ringClass: "ring-muted-foreground", accentBg: "bg-secondary/20", tag: "Specialist",
};

const STATUS_META: Record<string, { label: string; dot: string; chipBg: string }> = {
  active:     { label: "Active",       dot: "bg-green-500",            chipBg: "bg-green-100 text-green-800" },
  probation:  { label: "On Probation", dot: "bg-amber-500",            chipBg: "bg-amber-100 text-amber-800" },
  terminated: { label: "Terminated",   dot: "bg-destructive",           chipBg: "bg-red-100 text-red-800" },
  inactive:   { label: "Inactive",     dot: "bg-muted-foreground/30",   chipBg: "bg-secondary text-muted-foreground" },
};

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});

  const toggleMemory = (key: string) =>
    setExpandedMemory((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ── Data Queries ──────────────────────────────────────── */
  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: roleData } = useQuery({
    queryKey: ["employee-role", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return null;
      const { data } = await supabase
        .from("agent_roles")
        .select("*, role_contracts(*)")
        .eq("id", employee.role_id)
        .single();
      return data;
    },
    enabled: !!employee?.role_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["employee-tasks", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, state, priority, updated_at")
        .eq("owner_role_id", employee.role_id)
        .in("state", ["in_progress", "assigned", "waiting_review", "blocked"])
        .order("updated_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["employee-runs", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase
        .from("runs")
        .select("id, state, duration_ms, created_at")
        .eq("agent_role_id", employee.role_id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["employee-reviews", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const roleTaskIds = tasks.map((t) => t.id);
      if (roleTaskIds.length === 0) return [];
      const { data } = await supabase
        .from("reviews")
        .select("id, state, verdict, created_at")
        .in("task_id", roleTaskIds)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const { data: checkSuites = [] } = useQuery({
    queryKey: ["employee-ci", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const roleTaskIds = tasks.map((t) => t.id);
      if (roleTaskIds.length === 0) return [];
      const { data } = await supabase
        .from("check_suites")
        .select("id, status, task_id")
        .in("task_id", roleTaskIds)
        .limit(20);
      return data ?? [];
    },
    enabled: tasks.length > 0,
  });

  const { data: deployments = [] } = useQuery({
    queryKey: ["employee-deploys"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deployments")
        .select("id, status, environment, version_label, started_at")
        .order("started_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["employee-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at, promoted_at, evaluated_at, rejection_reason")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: usageLogs = [] } = useQuery({
    queryKey: ["employee-usage", runs],
    queryFn: async () => {
      const runIds = runs.map((r) => r.id);
      if (runIds.length === 0) return [];
      const { data } = await supabase
        .from("provider_usage_logs")
        .select("run_id, tokens_in, tokens_out, estimated_cost_usd")
        .in("run_id", runIds);
      return data ?? [];
    },
    enabled: runs.length > 0,
  });

  if (isLoading) {
    return <AppLayout title="Loading…"><p className="text-[12px] text-muted-foreground p-6">Loading…</p></AppLayout>;
  }
  if (!employee) {
    return <AppLayout title="Not found"><p className="text-[12px] text-muted-foreground p-6">Employee not found.</p></AppLayout>;
  }

  const persona = ROLE_PERSONAS[employee.role_code] ?? DEFAULT_PERSONA;
  const st = STATUS_META[employee.status] ?? STATUS_META.inactive;
  const contract = (roleData as any)?.role_contracts?.[0] ?? null;
  const roleName = roleData?.name ?? employee.role_code;

  const totalTokens = usageLogs.reduce((s, u) => s + ((u as any).tokens_in ?? 0) + ((u as any).tokens_out ?? 0), 0);
  const totalCost = usageLogs.reduce((s, u) => s + ((u as any).estimated_cost_usd ?? 0), 0);

  const isUnderperforming = (employee.success_rate ?? 0) < 0.6 || (employee.bug_rate ?? 0) > 0.3;
  const successPct = Math.round((employee.success_rate ?? 0) * 100);

  const ciTotal = checkSuites.length;
  const ciPassed = checkSuites.filter((c) => c.status === "passed").length;
  const ciRate = ciTotal > 0 ? Math.round((ciPassed / ciTotal) * 100) : null;

  const lastReview = reviews[0] ?? null;
  const lastReviewVerdict = lastReview?.verdict ?? null;

  const pendingLearning = learningProposals.filter((l) => l.status === "candidate" || l.status === "approved");
  const promotedLearning = learningProposals.filter((l) => l.status === "promoted");
  const rejectedLearning = learningProposals.filter((l) => l.status === "rejected");

  // Mock performance trend (would come from historical data)
  const trendPoints = [62, 68, 65, 72, 78, successPct];
  const trendUp = trendPoints.length >= 2 && trendPoints[trendPoints.length - 1] >= trendPoints[trendPoints.length - 2];

  // Memory categories restructured per spec
  const memoryCategories = [
    {
      key: "domain_principles",
      section: "Core Knowledge",
      title: "Domain Principles",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      items: ["Follow role contract boundaries strictly", "Produce artifacts before marking tasks done", "Escalate when confidence < 70%"],
    },
    {
      key: "architecture_rules",
      section: "Core Knowledge",
      title: "Architecture Rules",
      icon: <Shield className="h-3.5 w-3.5" />,
      items: ["Use semantic tokens from design system", "All API routes require admin auth middleware", "No direct Prisma access from frontend"],
    },
    {
      key: "common_patterns",
      section: "Core Knowledge",
      title: "Common Patterns",
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      items: ["Prefer small, focused components over monolithic pages", "Always verify DB schema before writing queries", "Include error boundaries in page components"],
    },
    {
      key: "project_rules",
      section: "Project Memory",
      title: "Project-Specific Rules",
      icon: <FileCode className="h-3.5 w-3.5" />,
      items: ["Project Alpha: Use strict TypeScript mode", "Project Beta: GraphQL over REST preferred", "All projects: 80% test coverage minimum"],
    },
    {
      key: "failures",
      section: "Failure Memory",
      title: "Past Mistakes",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      items: ["Missed forbidden path check on prisma/ (Run #42)", "Produced output without acceptance criteria (Task #18)"],
    },
    {
      key: "corrective_rules",
      section: "Failure Memory",
      title: "Corrective Rules",
      icon: <Ban className="h-3.5 w-3.5" />,
      items: ["Always check forbidden paths before file creation", "Validate acceptance criteria presence in TaskSpec before starting"],
    },
  ];

  const groupedMemory = memoryCategories.reduce<Record<string, typeof memoryCategories>>((acc, cat) => {
    if (!acc[cat.section]) acc[cat.section] = [];
    acc[cat.section].push(cat);
    return acc;
  }, {});

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-5 space-y-6 max-w-[1200px]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Capabilities</Link>
            <span>/</span>
            <Link to="/company" className="hover:text-foreground transition-colors">Team</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{employee.name}</span>
          </div>

          {/* ═══════════════════════════════════════════════════════
              TOP HEADER — Large avatar, identity, metrics, trend
             ═══════════════════════════════════════════════════════ */}
          <div className={`ds-card p-0 overflow-hidden`}>
            <div className={`${persona.accentBg} px-6 py-5`}>
              <div className="flex items-start gap-5">
                {/* Large avatar */}
                <div className="relative shrink-0">
                  <img
                    src={persona.avatar}
                    alt={employee.name}
                    className={`h-20 w-20 rounded-2xl object-cover ring-[3px] ${persona.ringClass} ring-offset-[3px] ring-offset-background`}
                    width={80}
                    height={80}
                  />
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-background ${st.dot}`} />
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[24px] font-bold text-foreground tracking-tight leading-tight">{employee.name}</h1>
                    <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 border-0 ${st.chipBg}`}>
                      {st.label}
                    </Badge>
                    {isUnderperforming && (
                      <Badge className="text-[10px] font-semibold px-2.5 py-0.5 border-0 bg-red-100 text-red-700">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        At Risk
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{roleName}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{persona.tag}</span>
                    {employee.provider && (
                      <span className="text-[9px] font-mono text-muted-foreground/40 bg-background/50 px-1.5 py-0.5 rounded">
                        {employee.provider}/{employee.model_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics strip */}
                <div className="flex items-start gap-5 shrink-0">
                  {/* Metric blocks */}
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Success</div>
                    <div className="text-[20px] font-bold text-foreground leading-tight">{successPct}%</div>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {trendUp ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-[9px] font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
                        {trendUp ? "↑" : "↓"}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Reputation</div>
                    <div className="text-[20px] font-bold text-foreground leading-tight">{(employee.reputation_score ?? 0).toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Bug Rate</div>
                    <div className={`text-[20px] font-bold leading-tight ${(employee.bug_rate ?? 0) > 0.2 ? "text-destructive" : "text-foreground"}`}>
                      {Math.round((employee.bug_rate ?? 0) * 100)}%
                    </div>
                  </div>

                  {/* Mini trend sparkline */}
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Trend</div>
                    <MiniSparkline points={trendPoints} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              MAIN 8/4 GRID
             ═══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-12 gap-5">
            {/* LEFT — 8 columns */}
            <div className="col-span-12 lg:col-span-8 space-y-5">

              {/* ── SECTION 1: CURRENT WORK ──────────────────── */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  Current Work
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Active Tasks */}
                  <div className="ds-card p-3 border-t-[3px] border-t-amber-500">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[12px] font-semibold text-foreground">Active Tasks</h3>
                      <span className="text-[11px] font-bold text-foreground">{tasks.length}</span>
                    </div>
                    {tasks.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50">No active tasks</p>
                    ) : (
                      <div className="space-y-1">
                        {tasks.map((t) => (
                          <Link key={t.id} to={`/control/tasks/${t.id}`}>
                            <div className="flex items-center gap-2 py-1.5 px-1.5 hover:bg-secondary/30 rounded transition-colors group">
                              <TaskStateDot state={t.state} />
                              <span className="text-[11px] text-foreground/80 truncate flex-1">{t.title}</span>
                              {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column: Run + Review + CI + Deploy */}
                  <div className="space-y-3">
                    {/* Current Run */}
                    <div className="ds-card p-3">
                      <h3 className="text-[12px] font-semibold text-foreground mb-2">Current Run</h3>
                      {runs.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50">No recent runs</p>
                      ) : (
                        <div className="space-y-1.5">
                          {runs.slice(0, 3).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 text-[11px]">
                              <RunStateDot state={r.state} />
                              <span className="text-muted-foreground font-mono text-[10px]">{r.id.slice(0, 8)}</span>
                              <span className="text-[10px] text-muted-foreground/50 capitalize">{r.state}</span>
                              {r.duration_ms && (
                                <span className="text-muted-foreground/40 ml-auto flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {Math.round(r.duration_ms / 1000)}s
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Last Review + CI + Deploy row */}
                    <div className="grid grid-cols-3 gap-2">
                      <MiniStatCard
                        label="Last Review"
                        value={lastReviewVerdict ? (lastReviewVerdict === "approved" ? "Approved" : lastReviewVerdict === "rejected" ? "Rejected" : lastReviewVerdict) : "—"}
                        valueColor={lastReviewVerdict === "approved" ? "text-green-600" : lastReviewVerdict === "rejected" ? "text-destructive" : "text-muted-foreground"}
                      />
                      <MiniStatCard
                        label="CI Pass Rate"
                        value={ciRate !== null ? `${ciRate}%` : "—"}
                        valueColor={ciRate !== null && ciRate < 70 ? "text-destructive" : "text-foreground"}
                      />
                      <MiniStatCard
                        label="Deploys"
                        value={String(deployments.length)}
                        valueColor="text-foreground"
                      />
                    </div>

                    {/* Token usage */}
                    <div className="ds-card p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3 text-muted-foreground" />
                          Token Usage
                        </h3>
                        <span className="text-[11px] font-mono text-foreground font-semibold">${totalCost.toFixed(3)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {totalTokens.toLocaleString()} tokens across {runs.length} runs
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── SECTION 2: ROLE CONTRACT ──────────────────── */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Role Contract
                </h2>
                {!contract && !roleData ? (
                  <div className="ds-card p-3 text-[11px] text-muted-foreground/50">No role contract assigned.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ContractPathBlock
                      title="Allowed Repo Paths"
                      icon={<FolderCheckIcon className="h-3.5 w-3.5 text-green-600" />}
                      items={parseJsonArray(contract?.allowed_repo_paths_json)}
                      fallback="No path restrictions"
                      accentClass="border-l-green-500"
                    />
                    <ContractPathBlock
                      title="Forbidden Paths"
                      icon={<FolderX className="h-3.5 w-3.5 text-destructive" />}
                      items={parseJsonArray(contract?.forbidden_repo_paths_json)}
                      fallback="No forbidden paths"
                      accentClass="border-l-destructive"
                    />
                    <ContractPathBlock
                      title="Required Artifacts"
                      icon={<FileCode className="h-3.5 w-3.5 text-muted-foreground" />}
                      items={parseJsonArray(contract?.required_artifacts_json)}
                      fallback="No required artifacts"
                      accentClass="border-l-border"
                    />
                    <div className="ds-card p-3">
                      <h3 className="text-[12px] font-semibold text-foreground mb-2.5">Permissions & Thresholds</h3>
                      <div className="space-y-2 text-[11px]">
                        <PermRow label="Deploy" icon={<Rocket className="h-3 w-3" />} allowed={contract?.may_deploy} />
                        <PermRow label="Merge PRs" icon={<GitPullRequest className="h-3 w-3" />} allowed={contract?.may_merge} />
                        <PermRow label="Modify Schema" icon={<Server className="h-3 w-3" />} allowed={contract?.may_modify_schema} />
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Risk Threshold
                          </span>
                          <span className="font-mono font-semibold text-foreground">{contract?.risk_threshold ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT — 4 columns */}
            <div className="col-span-12 lg:col-span-4 space-y-5">

              {/* ── SECTION 3: MEMORY PANEL ──────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[16px] font-semibold text-foreground flex items-center gap-1.5">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    Memory
                  </h2>
                  {trainingMode && (
                    <Badge className="text-[9px] font-semibold border-0 bg-amber-100 text-amber-700 animate-pulse">
                      EDITING
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedMemory).map(([section, cats]) => (
                    <div key={section}>
                      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mb-1.5">{section}</h3>
                      <div className="space-y-1">
                        {cats.map((cat) => {
                          const isExpanded = expandedMemory[cat.key] ?? false;
                          return (
                            <div key={cat.key} className="ds-card overflow-hidden">
                              <button
                                onClick={() => toggleMemory(cat.key)}
                                className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-secondary/20 transition-colors"
                              >
                                <span className="text-muted-foreground">{cat.icon}</span>
                                <span className="text-[11px] font-semibold text-foreground flex-1">{cat.title}</span>
                                <span className="text-[9px] text-muted-foreground/50 font-mono mr-1">{cat.items.length}</span>
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="px-2.5 pb-2.5 pt-0 border-t border-border/20">
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
                                      <Plus className="h-2.5 w-2.5" />
                                      Add entry
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
              </section>

              {/* ── SECTION 4: TRAINING MODE ─────────────────── */}
              <section>
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Training
                </h2>
                <div className={`ds-card p-4 ${trainingMode ? "border-l-[3px] border-l-amber-500" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-foreground font-semibold">
                        {trainingMode ? "Training Mode Active" : "Training Mode"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {trainingMode
                          ? "Add rules, examples, corrections. Changes are staged until saved."
                          : "Enter to edit memory, add rules, and provide corrections."}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={trainingMode ? "outline" : "default"}
                      className="text-[11px] h-7 shrink-0"
                      onClick={() => setTrainingMode(!trainingMode)}
                    >
                      {trainingMode ? (
                        <><Lock className="h-3 w-3 mr-1" /> Exit</>
                      ) : (
                        <><Unlock className="h-3 w-3 mr-1" /> Enter</>
                      )}
                    </Button>
                  </div>

                  {trainingMode && (
                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <TrainingAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Rule" />
                        <TrainingAction icon={<FileCode className="h-3.5 w-3.5" />} label="Add Example" />
                        <TrainingAction icon={<Pencil className="h-3.5 w-3.5" />} label="Add Constraint" />
                        <TrainingAction icon={<Ban className="h-3.5 w-3.5" />} label="Override Default" />
                      </div>
                      <Button size="sm" className="w-full text-[11px] h-7 mt-2">
                        <Save className="h-3 w-3 mr-1" />
                        Save Memory Update
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* ── SECTION 5: LEARNING HISTORY ──────────────── */}
              <section className="pb-8">
                <h2 className="text-[16px] font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Learning History
                </h2>

                {/* Timeline */}
                <div className="space-y-0">
                  {learningProposals.slice(0, 12).map((lp, i) => {
                    const isLast = i === Math.min(learningProposals.length, 12) - 1;
                    return (
                      <LearningTimelineItem
                        key={lp.id}
                        proposal={lp}
                        isLast={isLast}
                      />
                    );
                  })}
                  {learningProposals.length === 0 && (
                    <p className="text-[10px] text-muted-foreground/50">No learning history yet.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const pathD = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const trendUp = points[points.length - 1] >= points[points.length - 2];
  return (
    <svg width={w} height={h} className="block">
      <path d={pathD} fill="none" stroke={trendUp ? "#16a34a" : "#ef4444"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniStatCard({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="ds-card p-2.5 text-center">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-[13px] font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const colors: Record<string, string> = {
    in_progress: "bg-amber-500",
    waiting_review: "bg-violet-500",
    blocked: "bg-destructive",
    assigned: "bg-blue-400",
  };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[state] ?? "bg-muted-foreground/30"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const colors: Record<string, string> = {
    running: "bg-amber-500 animate-pulse",
    finalized: "bg-green-500",
    produced_output: "bg-green-400",
    failed: "bg-destructive",
    timed_out: "bg-red-400",
  };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors[state] ?? "bg-muted-foreground/30"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: {
  title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string;
}) {
  return (
    <div className={`ds-card p-3 border-l-[3px] ${accentClass}`}>
      <h3 className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">{icon}{title}</h3>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">{fallback}</p>
      ) : (
        <div className="space-y-1">
          {items.map((p, i) => (
            <div key={i} className="text-[10px] font-mono text-foreground/60 bg-secondary/30 rounded px-1.5 py-0.5">
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      {allowed ? (
        <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Yes</span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground/50"><XCircle className="h-3 w-3" /> No</span>
      )}
    </div>
  );
}

function TrainingAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="ds-card p-2 flex items-center gap-2 hover:bg-secondary/30 transition-colors text-left">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-medium text-foreground">{label}</span>
    </button>
  );
}

/* ── Learning Timeline Item ──────────────────────────────────── */
function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:  { icon: <FlaskConical className="h-3 w-3" />, label: "Proposal Created",  dotColor: "bg-blue-500" },
    approved:   { icon: <CheckCircle2 className="h-3 w-3" />, label: "Approved for Eval",  dotColor: "bg-amber-500" },
    promoted:   { icon: <Rocket className="h-3 w-3" />,       label: "Promoted",            dotColor: "bg-green-500" },
    rejected:   { icon: <XCircle className="h-3 w-3" />,      label: "Rejected",            dotColor: "bg-red-500" },
    rolled_back:{ icon: <RotateCcw className="h-3 w-3" />,    label: "Rolled Back",         dotColor: "bg-red-400" },
  };
  const config = statusConfig[proposal.status] ?? statusConfig.candidate;
  const date = new Date(proposal.created_at);
  const dateStr = `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="flex gap-3">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${config.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/40 my-0.5" />}
      </div>
      {/* Content */}
      <div className="pb-3 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{config.icon}</span>
          <span className="text-[11px] font-semibold text-foreground">{config.label}</span>
          <span className="text-[9px] text-muted-foreground/50 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2 leading-snug">
          {proposal.hypothesis || proposal.proposal_type}
        </p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[9px] text-red-500/70 mt-0.5 line-clamp-1">
            Reason: {proposal.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}
