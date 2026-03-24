import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

const ROLE_AVATARS: Record<string, string> = {
  frontend_builder: avatarFrontend,
  backend_architect: avatarBackend,
  backend_implementer: avatarBackendImpl,
  product_strategist: avatarStrategist,
  solution_architect: avatarArchitect,
  reviewer: avatarReviewer,
  qa_agent: avatarQa,
  release_coordinator: avatarRelease,
};

const ROLE_RING: Record<string, string> = {
  frontend_builder: "ring-blue-500",
  backend_architect: "ring-indigo-500",
  backend_implementer: "ring-violet-500",
  product_strategist: "ring-amber-500",
  solution_architect: "ring-cyan-500",
  reviewer: "ring-emerald-500",
  qa_agent: "ring-rose-500",
  release_coordinator: "ring-orange-500",
};
import {
  ArrowLeft,
  TrendingUp,
  Shield,
  Brain,
  GraduationCap,
  Wrench,
  FolderCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  FileCode,
  Lock,
  Unlock,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-500" },
  probation: { label: "On Probation", color: "bg-amber-500" },
  terminated: { label: "Terminated", color: "bg-destructive" },
  inactive: { label: "Inactive", color: "bg-muted-foreground/30" },
};

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null);

  // Employee
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

  // Role + contract
  const { data: roleData } = useQuery({
    queryKey: ["employee-role", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return null;
      const { data: role } = await supabase
        .from("agent_roles")
        .select("*, role_contracts(*)")
        .eq("id", employee.role_id)
        .single();
      return role;
    },
    enabled: !!employee?.role_id,
  });

  // Tasks for this role
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

  // Recent runs
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

  // Recent reviews
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

  // Learning proposals
  const { data: learningProposals = [] } = useQuery({
    queryKey: ["employee-learning"],
    queryFn: async () => {
      const { data } = await supabase
        .from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at, promoted_at, evaluated_at")
        .order("created_at", { ascending: false })
        .limit(15);
      return data ?? [];
    },
  });

  // Usage logs
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

  const st = STATUS_META[employee.status] ?? STATUS_META.inactive;
  const contract = (roleData as any)?.role_contracts?.[0] ?? null;
  const roleName = roleData?.name ?? employee.role_code;

  const totalTokens = usageLogs.reduce((s, u) => s + ((u as any).tokens_in ?? 0) + ((u as any).tokens_out ?? 0), 0);
  const totalCost = usageLogs.reduce((s, u) => s + ((u as any).estimated_cost_usd ?? 0), 0);

  const pendingLearning = learningProposals.filter((l) => l.status === "candidate" || l.status === "approved");
  const promotedLearning = learningProposals.filter((l) => l.status === "promoted");
  const rejectedLearning = learningProposals.filter((l) => l.status === "rejected");

  // Mock memory data (structured — would come from a memory store in production)
  const memoryCategories = [
    {
      key: "principles",
      title: "Core Principles",
      icon: <Shield className="h-3.5 w-3.5" />,
      items: ["Follow role contract boundaries strictly", "Produce artifacts before marking tasks done", "Escalate when confidence < 70%"],
    },
    {
      key: "project_rules",
      title: "Project-Specific Rules",
      icon: <FileCode className="h-3.5 w-3.5" />,
      items: ["Use semantic tokens from design system", "All API routes require admin auth middleware", "No direct Prisma access from frontend"],
    },
    {
      key: "patterns",
      title: "Learned Patterns",
      icon: <Brain className="h-3.5 w-3.5" />,
      items: ["Prefer small, focused components over monolithic pages", "Always verify DB schema before writing queries", "Include error boundaries in page components"],
    },
    {
      key: "failures",
      title: "Failure History",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      items: ["Missed forbidden path check on prisma/ (Run #42)", "Produced output without acceptance criteria (Task #18)"],
    },
    {
      key: "overrides",
      title: "Founder Overrides",
      icon: <Lock className="h-3.5 w-3.5" />,
      items: ["Skip schema validation for docs-only tasks", "Allow cross-domain access for release coordinator role"],
    },
  ];

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 py-4 space-y-5 max-w-5xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Capabilities</Link>
            <span>/</span>
            <Link to="/company" className="hover:text-foreground transition-colors">Team</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{employee.name}</span>
          </div>

          {/* ── TOP HEADER ──────────────────────────────────── */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center text-[14px] font-bold text-foreground/60 shrink-0">
                {employee.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-semibold text-foreground tracking-tight">{employee.name}</h1>
                  <span className={`w-2 h-2 rounded-full ${st.color}`} />
                  <span className="text-[11px] text-muted-foreground">{st.label}</span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{roleName}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  {employee.provider && (
                    <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded">
                      {employee.provider}/{employee.model_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Success</div>
                <div className="text-[16px] font-semibold text-foreground">{Math.round((employee.success_rate ?? 0) * 100)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Reputation</div>
                <div className="text-[16px] font-semibold text-foreground">{(employee.reputation_score ?? 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Bug Rate</div>
                <div className={`text-[16px] font-semibold ${(employee.bug_rate ?? 0) > 0.2 ? "text-destructive" : "text-foreground"}`}>
                  {Math.round((employee.bug_rate ?? 0) * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 1: CURRENT WORK ─────────────────────── */}
          <section>
            <h2 className="text-[14px] font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Current Work
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Active Tasks */}
              <div className="ds-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold text-foreground">Active Tasks</h3>
                  <span className="text-[10px] font-mono text-muted-foreground">{tasks.length}</span>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/50">No active tasks</p>
                ) : (
                  <div className="space-y-1">
                    {tasks.map((t) => (
                      <Link key={t.id} to={`/control/tasks/${t.id}`}>
                        <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-secondary/30 rounded transition-colors">
                          <TaskStateDot state={t.state} />
                          <span className="text-[11px] text-foreground/80 truncate flex-1">{t.title}</span>
                          {t.priority === "high" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Runs + Reviews + Tokens */}
              <div className="space-y-3">
                <div className="ds-card p-3">
                  <h3 className="text-[12px] font-semibold text-foreground mb-2">Last Runs</h3>
                  {runs.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/50">No recent runs</p>
                  ) : (
                    <div className="space-y-1">
                      {runs.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-[11px]">
                          <RunStateDot state={r.state} />
                          <span className="text-muted-foreground font-mono text-[10px]">{r.id.slice(0, 8)}</span>
                          {r.duration_ms && <span className="text-muted-foreground/50 ml-auto">{Math.round(r.duration_ms / 1000)}s</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ds-card p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[12px] font-semibold text-foreground">Token Usage</h3>
                    <span className="text-[11px] font-mono text-muted-foreground">${totalCost.toFixed(3)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {totalTokens.toLocaleString()} tokens across {runs.length} runs
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 2: ROLE CONTRACT ─────────────────────── */}
          <section>
            <h2 className="text-[14px] font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Role Contract
            </h2>
            {!contract && !roleData ? (
              <div className="ds-card p-3 text-[11px] text-muted-foreground/50">No role contract assigned.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ContractBlock
                  title="Allowed Paths"
                  items={parseJsonArray(contract?.allowed_repo_paths_json)}
                  fallback="No path restrictions"
                  variant="allow"
                />
                <ContractBlock
                  title="Forbidden Paths"
                  items={parseJsonArray(contract?.forbidden_repo_paths_json)}
                  fallback="No forbidden paths"
                  variant="deny"
                />
                <ContractBlock
                  title="Required Artifacts"
                  items={parseJsonArray(contract?.required_artifacts_json)}
                  fallback="No required artifacts"
                  variant="neutral"
                />
                <div className="ds-card p-3">
                  <h3 className="text-[12px] font-semibold text-foreground mb-2">Permissions</h3>
                  <div className="space-y-1.5 text-[11px]">
                    <PermRow label="Deploy" allowed={contract?.may_deploy} />
                    <PermRow label="Merge PRs" allowed={contract?.may_merge} />
                    <PermRow label="Modify Schema" allowed={contract?.may_modify_schema} />
                    <div className="flex items-center justify-between pt-1 border-t border-border/30">
                      <span className="text-muted-foreground">Risk Threshold</span>
                      <span className="font-mono text-foreground">{contract?.risk_threshold ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── SECTION 3: MEMORY ────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-muted-foreground" />
                Memory
              </h2>
              {trainingMode && (
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 bg-amber-50">
                  Training Mode
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory === cat.key;
                return (
                  <div key={cat.key} className="ds-card overflow-hidden">
                    <button
                      onClick={() => setExpandedMemory(isExpanded ? null : cat.key)}
                      className="w-full flex items-center gap-2 p-3 text-left hover:bg-secondary/20 transition-colors"
                    >
                      <span className="text-muted-foreground">{cat.icon}</span>
                      <span className="text-[12px] font-semibold text-foreground flex-1">{cat.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono mr-1">{cat.items.length}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-border/30">
                        <div className="space-y-1.5 mt-2">
                          {cat.items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] group">
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                              <span className="text-foreground/70 flex-1">{item}</span>
                              {trainingMode && (
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {trainingMode && (
                          <button className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                            <Plus className="h-3 w-3" />
                            Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── SECTION 4: TRAINING MODE ─────────────────────── */}
          <section>
            <h2 className="text-[14px] font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Training
            </h2>
            <div className="ds-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] text-foreground font-medium">
                    {trainingMode ? "Training Mode Active" : "Training Mode"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {trainingMode
                      ? "You can now add rules, examples, corrections, and overrides to this employee's memory."
                      : "Enter training mode to edit memory, add rules, and provide corrections."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={trainingMode ? "outline" : "default"}
                  className="text-[11px] h-7"
                  onClick={() => setTrainingMode(!trainingMode)}
                >
                  {trainingMode ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Exit Training
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3 w-3 mr-1" />
                      Enter Training Mode
                    </>
                  )}
                </Button>
              </div>
              {trainingMode && (
                <div className="mt-3 pt-3 border-t border-border/30 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <TrainingAction icon={<Plus className="h-3.5 w-3.5" />} label="Add Rule" />
                  <TrainingAction icon={<FileCode className="h-3.5 w-3.5" />} label="Add Example" />
                  <TrainingAction icon={<Pencil className="h-3.5 w-3.5" />} label="Add Correction" />
                  <TrainingAction icon={<Lock className="h-3.5 w-3.5" />} label="Freeze Changes" />
                </div>
              )}
            </div>
          </section>

          {/* ── SECTION 5: LEARNING PIPELINE ─────────────────── */}
          <section className="pb-8">
            <h2 className="text-[14px] font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Learning Pipeline
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <LearningBlock
                title="Pending Proposals"
                count={pendingLearning.length}
                items={pendingLearning.slice(0, 5)}
                dotClass="bg-amber-500"
              />
              <LearningBlock
                title="Promotion History"
                count={promotedLearning.length}
                items={promotedLearning.slice(0, 5)}
                dotClass="bg-green-500"
              />
              <LearningBlock
                title="Failed Evaluations"
                count={rejectedLearning.length}
                items={rejectedLearning.slice(0, 5)}
                dotClass="bg-red-400"
              />
            </div>
          </section>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

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

function ContractBlock({ title, items, fallback, variant }: {
  title: string; items: string[]; fallback: string; variant: "allow" | "deny" | "neutral";
}) {
  const borderColor = variant === "allow" ? "border-t-green-500" : variant === "deny" ? "border-t-destructive" : "border-t-border";
  return (
    <div className={`ds-card p-3 border-t-[3px] ${borderColor}`}>
      <h3 className="text-[12px] font-semibold text-foreground mb-1.5">{title}</h3>
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

function PermRow({ label, allowed }: { label: string; allowed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {allowed ? (
        <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Yes</span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground/50"><XCircle className="h-3 w-3" /> No</span>
      )}
    </div>
  );
}

function TrainingAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="ds-card p-2.5 flex flex-col items-center gap-1.5 hover:bg-secondary/30 transition-colors text-center">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] font-medium text-foreground">{label}</span>
    </button>
  );
}

function LearningBlock({ title, count, items, dotClass }: {
  title: string; count: number; items: any[]; dotClass: string;
}) {
  return (
    <div className="ds-card p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
        <span className="text-[11px] font-semibold text-foreground">{count}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50">None</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((lp) => (
            <div key={lp.id} className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
              <span className="line-clamp-1">{lp.hypothesis || lp.proposal_type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
