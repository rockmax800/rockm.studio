import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getPersona, getStatusMeta } from "@/lib/personas";
import { TrainingLab } from "@/components/employees/TrainingLab";
import { SkillPackPanel } from "@/components/employees/SkillPackPanel";
import { GuidancePackPanel } from "@/components/employees/GuidancePackPanel";
import { DEFAULT_GUIDANCE_DIMENSIONS, type GuidanceDimension } from "@/types/skill-pack";

import {
  TrendingUp, Shield, Brain, GraduationCap, Wrench, AlertTriangle,
  CheckCircle2, XCircle, Clock, FileCode, Lock, Unlock, Plus, Pencil,
  ChevronDown, ChevronRight, Zap, Rocket, RotateCcw, FlaskConical,
  ArrowUpRight, GitPullRequest, Server, FolderX, FolderCheck as FolderCheckIcon,
  BookOpen, Lightbulb, Activity, Eye, Layers, ArrowLeft, Package, Sliders,
} from "lucide-react";

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("domain_principles");
  const [attachedSkillPacks, setAttachedSkillPacks] = useState<string[]>([]);
  const [guidanceDimensions, setGuidanceDimensions] = useState<GuidanceDimension[]>(
    () => DEFAULT_GUIDANCE_DIMENSIONS.map((d) => ({ ...d }))
  );
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
        <div className="px-6 lg:px-8 py-5 space-y-5 max-w-[1100px]">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Link to="/office" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Office
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">{employee.name}</span>
          </div>

          {/* ═══ HEADER ═══ */}
          {trainingMode && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-status-amber/5 border border-status-amber/15">
              <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse" />
              <span className="text-[11px] font-bold text-status-amber">Training Mode Active</span>
              <span className="text-[11px] text-muted-foreground/60">— Memory editable, changes staged</span>
              {pendingUpdates.length > 0 && (
                <span className="ml-auto text-[10px] font-mono text-status-amber">{pendingUpdates.length} pending</span>
              )}
            </div>
          )}

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img src={persona.avatar} alt={employee.name}
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-border/30 ring-offset-1 ring-offset-background"
                width={56} height={56} />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${st.dot}`} />
            </div>

            {/* Identity + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] font-bold text-foreground tracking-tight leading-tight">{employee.name}</h1>
                <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 h-auto">{st.label}</Badge>
                {isUnderperforming && (
                  <Badge variant="destructive" className="text-[10px] font-medium px-2 py-0.5 h-auto gap-1">
                    <AlertTriangle className="h-3 w-3" /> At Risk
                  </Badge>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {roleName}
                <span className="text-muted-foreground/30 mx-1.5">·</span>
                {employee.model_name ?? "—"}
                <span className="text-muted-foreground/30 mx-1.5">·</span>
                {employee.provider ?? "—"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={trainingMode ? "outline" : "secondary"}
                className="h-8 text-[11px] font-semibold gap-1.5 px-3"
                onClick={() => setTrainingMode(!trainingMode)}
              >
                {trainingMode ? <><Lock className="h-3.5 w-3.5" /> Exit Training</> : <><GraduationCap className="h-3.5 w-3.5" /> Train</>}
              </Button>
              <Link to={`/employees/${id}/tasks`}>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 px-3">
                  <Eye className="h-3.5 w-3.5" /> Tasks
                </Button>
              </Link>
            </div>
          </div>

          {/* ═══ STATS ROW ═══ */}
          <div className="flex items-center gap-4 flex-wrap text-[12px]">
            <StatPill label="Score" value={Math.round(reputationScore * 100)} color={perfColor} />
            <StatPill label="Success" value={`${successPct}%`} />
            <StatPill label="Bug Rate" value={`${Math.round((employee.bug_rate ?? 0) * 100)}%`} color={(employee.bug_rate ?? 0) > 0.2 ? "text-destructive" : undefined} />
            <StatPill label="CI" value={ciRate !== null ? `${ciRate}%` : "—"} color={ciRate !== null && ciRate < 70 ? "text-destructive" : undefined} />
            <StatPill label="Review" value={lastReviewVerdict === "approved" ? "✓" : lastReviewVerdict === "rejected" ? "✗" : "—"} color={lastReviewVerdict === "approved" ? "text-status-green" : lastReviewVerdict === "rejected" ? "text-destructive" : undefined} />
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/50">Load</span>
              <Progress value={loadPct} className="h-1 w-10" />
              <span className="font-mono text-muted-foreground/60 text-[10px]">{loadPct}%</span>
            </div>
            <div className="flex items-center gap-1">
              <MiniSparkline points={trendPoints} />
            </div>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /><span className="font-mono text-foreground/70">{totalTokens.toLocaleString()}</span> tkn</span>
              <span className="flex items-center gap-1"><Activity className="h-3 w-3" /><span className="font-mono text-foreground/70">${totalCost.toFixed(3)}</span></span>
            </div>
          </div>

          {/* ═══ CURRENT WORK ═══ */}
          <Section icon={<Wrench className="h-4 w-4" />} title="Current Work">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-6">
                <Panel title="Active Tasks" accent="border-l-status-amber">
                  {tasks.length === 0 ? <EmptyLine text="No active tasks" /> : (
                    <div className="space-y-0">
                      {tasks.map((t) => (
                        <Link key={t.id} to={`/control/tasks/${t.id}`}>
                          <div className="flex items-center gap-2.5 py-2 px-2 hover:bg-secondary/20 rounded-lg transition-colors group">
                            <TaskStateDot state={t.state} />
                            <span className="text-[12px] text-foreground truncate flex-1">{t.title}</span>
                            {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
              <div className="col-span-12 lg:col-span-6">
                <Panel title="Recent Runs">
                  {runs.length === 0 ? <EmptyLine text="No recent runs" /> : (
                    <div className="space-y-1.5">
                      {runs.slice(0, 4).map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-[11px]">
                          <RunStateDot state={r.state} />
                          <span className="font-mono text-muted-foreground/60">{r.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground/40 capitalize">{r.state}</span>
                          {r.duration_ms && (
                            <span className="text-muted-foreground/30 ml-auto flex items-center gap-1">
                              <Clock className="h-3 w-3" />{Math.round(r.duration_ms / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          </Section>

          {/* ═══ SYSTEM CONTRACT ═══ */}
          <Section icon={<Shield className="h-4 w-4" />} title="System Contract" subtitle="Enforced boundaries — read only">
            {!contract && !roleData ? (
              <p className="text-[12px] text-muted-foreground/50 py-2">No role contract assigned.</p>
            ) : (
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <ContractPathBlock title="Allowed Paths" icon={<FolderCheckIcon className="h-3.5 w-3.5 text-status-green" />}
                    items={parseJsonArray(contract?.allowed_repo_paths_json)} fallback="No path restrictions" accentClass="border-l-status-green" />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <ContractPathBlock title="Forbidden Paths" icon={<FolderX className="h-3.5 w-3.5 text-destructive" />}
                    items={parseJsonArray(contract?.forbidden_repo_paths_json)} fallback="No forbidden paths" accentClass="border-l-destructive" />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <Panel title="Permissions" titleIcon={<Layers className="h-3.5 w-3.5 text-muted-foreground/40" />}>
                    <div className="space-y-2 text-[12px]">
                      <PermRow label="Deploy" icon={<Rocket className="h-3.5 w-3.5" />} allowed={contract?.may_deploy} />
                      <PermRow label="Merge PRs" icon={<GitPullRequest className="h-3.5 w-3.5" />} allowed={contract?.may_merge} />
                      <PermRow label="Modify Schema" icon={<Server className="h-3.5 w-3.5" />} allowed={contract?.may_modify_schema} />
                      <div className="flex items-center justify-between pt-2 border-t border-border/20">
                        <span className="text-muted-foreground/60 flex items-center gap-1.5 text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" />Risk Threshold
                        </span>
                        <span className="font-mono font-bold text-foreground text-[12px]">{contract?.risk_threshold ?? "—"}</span>
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            )}
          </Section>

          {/* ═══ MEMORY ═══ */}
          <Section icon={<Brain className="h-4 w-4" />} title="Memory"
            subtitle={trainingMode ? "Click entries to edit — changes staged until saved" : `${memoryCategories.length} categories`}>
            <div className="space-y-1.5">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`rounded-xl border overflow-hidden bg-card ${trainingMode ? "border-status-amber/15" : "border-border/40"}`}>
                    <button onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-secondary/15 transition-colors">
                      <span className="text-muted-foreground/50">{cat.icon}</span>
                      <span className="text-[12px] font-bold text-foreground flex-1">{cat.title}</span>
                      <span className="text-[10px] text-muted-foreground/40 font-mono">{cat.items.length}</span>
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/30" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0 border-t border-border/15">
                        <div className="space-y-0 mt-1.5">
                          {cat.items.map((item, i) => {
                            const sb = SOURCE_BADGE[item.source] ?? SOURCE_BADGE.contract;
                            return (
                              <div key={i} className="flex items-start gap-2 group py-1.5 px-2.5 rounded-lg hover:bg-secondary/10 transition-colors">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/20 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] text-foreground leading-relaxed">{item.text}</p>
                                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">{item.desc}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sb.cls}`}>{sb.label}</span>
                                    <span className="text-[9px] text-muted-foreground/30">{item.updated}</span>
                                  </div>
                                </div>
                                {trainingMode && (
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <Pencil className="h-3 w-3 text-muted-foreground/40 hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {trainingMode && (
                          <button className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors font-medium px-2.5"
                            onClick={() => { setNewRuleCategory(cat.key); }}>
                            <Plus className="h-3 w-3" /> Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ═══ SKILL PACKS & GUIDANCE ═══ */}
          <Section icon={<Package className="h-4 w-4" />} title="Skill Packs & Guidance"
            subtitle="Reusable capability bundles and active behavior configuration">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-7 rounded-xl border border-border/40 bg-card p-4">
                <SkillPackPanel
                  employeeName={employee.name}
                  attachedIds={attachedSkillPacks}
                  onToggle={(id) => setAttachedSkillPacks((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )}
                />
              </div>
              <div className="col-span-12 lg:col-span-5 rounded-xl border border-border/40 bg-card p-4">
                <GuidancePackPanel
                  employeeName={employee.name}
                  dimensions={guidanceDimensions}
                  onDimensionChange={(key, value) =>
                    setGuidanceDimensions((prev) =>
                      prev.map((d) => d.key === key ? { ...d, value } : d)
                    )
                  }
                  attachedSkillPackIds={attachedSkillPacks}
                  hasPublishedPrompt={false}
                />
              </div>
            </div>
          </Section>

          {/* ═══ TRAINING LAB ═══ */}
          <Section icon={<GraduationCap className="h-4 w-4" />} title="Training Lab"
            subtitle="Conversation, notes, and structured prompt drafting">
            {!trainingMode ? (
              <div className="rounded-xl border border-border/40 bg-card px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Open Training Lab</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Enter training mode to teach through conversation, add materials, and refine prompts.
                  </p>
                </div>
                <Button size="sm" className="h-8 text-[11px] font-semibold gap-1.5 px-4 shrink-0 bg-foreground text-background hover:bg-foreground/90" onClick={() => setTrainingMode(true)}>
                  <Unlock className="h-3.5 w-3.5" /> Open
                </Button>
              </div>
            ) : (
              <TrainingLab
                employeeId={id}
                employeeName={employee.name}
                roleName={roleName}
                attachedSkillPackIds={attachedSkillPacks}
                guidanceDimensions={guidanceDimensions}
              />
            )}
          </Section>

          {/* ═══ LEARNING HISTORY ═══ */}
          <Section icon={<TrendingUp className="h-4 w-4" />} title="Learning History">
            <div className="rounded-xl border border-border/40 bg-card px-5 py-4">
              {learningProposals.length === 0 ? (
                <EmptyLine text="No learning history yet" />
              ) : (
                <div className="space-y-0 max-w-[600px]">
                  {learningProposals.slice(0, 15).map((lp, i) => (
                    <LearningTimelineItem key={lp.id} proposal={lp} isLast={i === Math.min(learningProposals.length, 15) - 1} />
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/50">{icon}</span>
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground/40 ml-1">— {subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Panel({ title, titleIcon, accent, children }: { title: string; titleIcon?: React.ReactNode; accent?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-border/40 bg-card p-4 h-full ${accent ? `border-l-[3px] ${accent}` : ""}`}>
      <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        {titleIcon}{title}
      </h3>
      {children}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground/50">{label}</span>
      <span className={`font-bold font-mono tabular-nums ${color ?? "text-foreground"}`}>{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-[11px] text-muted-foreground/40 py-1.5">{text}</p>;
}

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const w = 40, h = 16;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const up = points[points.length - 1] >= points[points.length - 2];
  return <svg width={w} height={h} className="block"><path d={pathD} fill="none" stroke={up ? "hsl(var(--status-green))" : "hsl(var(--destructive))"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

function TaskStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { in_progress: "bg-status-amber", waiting_review: "bg-lifecycle-review", blocked: "bg-destructive", assigned: "bg-status-neutral" };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/20"}`} />;
}

function RunStateDot({ state }: { state: string }) {
  const c: Record<string, string> = { running: "bg-status-amber animate-pulse", finalized: "bg-status-green", produced_output: "bg-status-green/70", failed: "bg-destructive", timed_out: "bg-destructive/70" };
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c[state] ?? "bg-muted-foreground/20"}`} />;
}

function ContractPathBlock({ title, icon, items, fallback, accentClass }: { title: string; icon: React.ReactNode; items: string[]; fallback: string; accentClass: string }) {
  return (
    <Panel title={title} titleIcon={icon} accent={accentClass}>
      {items.length === 0 ? <p className="text-[11px] text-muted-foreground/40">{fallback}</p> : (
        <div className="space-y-1">{items.map((p, i) => <div key={i} className="text-[11px] font-mono text-foreground/60 bg-secondary/20 rounded px-2 py-1">{p}</div>)}</div>
      )}
    </Panel>
  );
}

function PermRow({ label, icon, allowed }: { label: string; icon: React.ReactNode; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground/50 flex items-center gap-1.5 text-[11px]">{icon}{label}</span>
      {allowed ? <span className="flex items-center gap-1 text-status-green text-[11px] font-bold"><CheckCircle2 className="h-3.5 w-3.5" /> Yes</span>
        : <span className="flex items-center gap-1 text-muted-foreground/30 text-[11px]"><XCircle className="h-3.5 w-3.5" /> No</span>}
    </div>
  );
}

function LearningTimelineItem({ proposal, isLast }: { proposal: any; isLast: boolean }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; dotColor: string }> = {
    candidate:   { icon: <FlaskConical className="h-3 w-3" />, label: "Proposal Created",        dotColor: "bg-status-neutral" },
    approved:    { icon: <CheckCircle2 className="h-3 w-3" />, label: "Approved for Evaluation",  dotColor: "bg-status-amber" },
    promoted:    { icon: <Rocket className="h-3 w-3" />,       label: "Promoted to Production",   dotColor: "bg-status-green" },
    rejected:    { icon: <XCircle className="h-3 w-3" />,      label: "Rejected",                 dotColor: "bg-destructive" },
    rolled_back: { icon: <RotateCcw className="h-3 w-3" />,    label: "Rolled Back",              dotColor: "bg-destructive/70" },
  };
  const c = cfg[proposal.status] ?? cfg.candidate;
  const dateStr = new Date(proposal.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${c.dotColor}`} />
        {!isLast && <div className="w-px flex-1 bg-border/20 my-1" />}
      </div>
      <div className="pb-3 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/40">{c.icon}</span>
          <span className="text-[12px] font-bold text-foreground">{c.label}</span>
          <span className="text-[10px] text-muted-foreground/30 ml-auto font-mono">{dateStr}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-relaxed">{proposal.hypothesis || proposal.proposal_type}</p>
        {proposal.status === "rejected" && proposal.rejection_reason && (
          <p className="text-[10px] text-destructive/60 mt-0.5">Reason: {proposal.rejection_reason}</p>
        )}
      </div>
    </div>
  );
}
