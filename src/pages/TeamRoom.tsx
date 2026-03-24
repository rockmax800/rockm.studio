import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useDepartments, type Department } from "@/hooks/use-department-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  Smartphone, Bot, Globe, Building2, ArrowRight, ArrowLeft, Users,
  TrendingUp, Gauge, AlertTriangle, Zap, MessageSquare, Send,
  SkipForward, Snowflake, Square, Coins, ChevronDown, ChevronUp,
  Target, Layers, ListChecks, HelpCircle, BarChart3, Pencil,
  FolderKanban, Clock,
} from "lucide-react";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2 };

/* ── Session types ──────────────────────────────────────────── */
const MEETING_ROLES = [
  { code: "product_strategist", name: "Product Strategist", short: "PS", subtitle: "Vision & scope ownership" },
  { code: "solution_architect", name: "Solution Architect", short: "SA", subtitle: "System design & boundaries" },
  { code: "frontend_builder", name: "Frontend Builder", short: "FB", subtitle: "UI delivery & components" },
  { code: "backend_architect", name: "Backend Architect", short: "BA", subtitle: "API & data layer" },
  { code: "reviewer", name: "Reviewer", short: "RV", subtitle: "Quality & compliance" },
  { code: "qa_agent", name: "QA Agent", short: "QA", subtitle: "Test & validation" },
  { code: "release_coordinator", name: "Release Coord", short: "RC", subtitle: "Deploy & release" },
] as const;

type RoleCode = (typeof MEETING_ROLES)[number]["code"];
type EntryType = "scope" | "architecture" | "risk" | "question" | "task" | "general";

interface TranscriptEntry { id: string; roleCode: RoleCode; content: string; timestamp: string; tokenCost: number; type: EntryType; }
interface ExtractionItem { text: string; confidence: "high" | "medium" | "low"; }
interface ExtractionState { scope: ExtractionItem[]; architectureNotes: ExtractionItem[]; taskBreakdown: ExtractionItem[]; risks: ExtractionItem[]; openQuestions: ExtractionItem[]; estimatedComplexity: string; }

function getRoleMeta(code: string) { return MEETING_ROLES.find((r) => r.code === code) ?? MEETING_ROLES[0]; }

const SEED_TRANSCRIPT: TranscriptEntry[] = [
  { id: "1", roleCode: "product_strategist", content: "The project goal is to build an AI-powered delivery system. Core value: automate task assignment and execution with quality gates.", timestamp: new Date(Date.now() - 300_000).toISOString(), tokenCost: 320, type: "scope" },
  { id: "2", roleCode: "solution_architect", content: "I recommend a layered architecture: Intent → Delivery → Knowledge → Experience. Each layer has strict boundary isolation.", timestamp: new Date(Date.now() - 240_000).toISOString(), tokenCost: 480, type: "architecture" },
  { id: "3", roleCode: "reviewer", content: "Risk: without contract enforcement, agents may overwrite files outside their domain.", timestamp: new Date(Date.now() - 180_000).toISOString(), tokenCost: 290, type: "risk" },
  { id: "4", roleCode: "frontend_builder", content: "For the Experience layer, I propose a 12-column grid system with semantic design tokens.", timestamp: new Date(Date.now() - 120_000).toISOString(), tokenCost: 350, type: "architecture" },
  { id: "5", roleCode: "qa_agent", content: "We need protected evaluation scenarios that cannot be bypassed.", timestamp: new Date(Date.now() - 60_000).toISOString(), tokenCost: 260, type: "risk" },
];

const SEED_EXTRACTION: ExtractionState = {
  scope: [{ text: "AI-powered delivery system", confidence: "high" }, { text: "Automated task assignment with quality gates", confidence: "high" }],
  architectureNotes: [{ text: "4-layer architecture: Intent → Delivery → Knowledge → Experience", confidence: "high" }],
  taskBreakdown: [{ text: "Implement role contract enforcement", confidence: "medium" }],
  risks: [{ text: "Agents may overwrite files outside domain without enforcement", confidence: "high" }],
  openQuestions: [{ text: "Path-level restriction implementation approach?", confidence: "medium" }],
  estimatedComplexity: "High — multi-layer system with enforcement gates",
};

const TYPE_LABEL: Record<EntryType, string> = { scope: "Scope", architecture: "Architecture", risk: "Risk", question: "Question", task: "Task", general: "Note" };
const CONFIDENCE_DOT: Record<string, string> = { high: "bg-green-500", medium: "bg-amber-500", low: "bg-red-400" };

/* ================================================================
   MAIN COMPONENT — 2-step flow
   ================================================================ */
export default function TeamRoom() {
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  if (sessionActive && selectedDept) {
    return <ActiveSession dept={selectedDept} onBack={() => setSessionActive(false)} />;
  }

  if (selectedDept) {
    return <TeamStudio dept={selectedDept} onBack={() => setSelectedDept(null)} onStartSession={() => setSessionActive(true)} />;
  }

  return <DepartmentSelector onSelect={setSelectedDept} />;
}

/* ================================================================
   STEP 1 — Department Selector
   ================================================================ */
function DepartmentSelector({ onSelect }: { onSelect: (d: Department) => void }) {
  const { data: departments = [], isLoading } = useDepartments();

  const { data: roles = [] } = useQuery({
    queryKey: ["team-room-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, status, success_rate, total_runs, capacity_score")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["team-room-employees-count"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees").select("id, status").eq("status", "active");
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["team-room-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, state")
        .in("state", ["active", "in_review", "scoped"]);
      return data ?? [];
    },
  });

  const totalCap = roles.reduce((s, r) => s + ((r as any).capacity_score ?? 1), 0);
  const usedCap = roles.reduce((s, r) => s + Math.min((r as any).total_runs ?? 0, (r as any).capacity_score ?? 1), 0);
  const globalLoad = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
  const avgSuccess = roles.length > 0
    ? Math.round(roles.reduce((s, r) => s + ((r as any).success_rate ?? 0), 0) / roles.length * 100)
    : 0;

  return (
    <AppLayout title="Team Room">
      <ScrollArea className="h-full">
        <div className="px-8 py-8 max-w-[1200px] mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight leading-tight">
              Select Production Capability
            </h1>
            <p className="text-[15px] text-muted-foreground mt-2 max-w-[600px]">
              Choose a department to manage team members, review performance, or start a collaborative session.
            </p>
          </div>

          {/* Global stats */}
          <div className="flex items-center gap-6">
            <StatPill icon={<Users className="h-4 w-4" />} value={employees.length} label="Active Agents" />
            <StatPill icon={<FolderKanban className="h-4 w-4" />} value={projects.length} label="Active Projects" />
            <StatPill icon={<TrendingUp className="h-4 w-4" />} value={`${avgSuccess}%`} label="Avg Success" />
            <StatPill icon={<Gauge className="h-4 w-4" />} value={`${globalLoad}%`} label="System Load" />
          </div>

          {/* Department cards */}
          {isLoading ? (
            <p className="text-[14px] text-muted-foreground">Loading capabilities…</p>
          ) : departments.length === 0 ? (
            <div className="ds-card p-8 text-center">
              <p className="text-[14px] text-muted-foreground">No capability pools configured.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {departments.map((dept) => {
                const Icon = DEPT_ICONS[dept.icon] || Building2;
                const perDept = departments.length > 0 ? Math.ceil(employees.length / departments.length) : 0;
                const loadStatus = globalLoad > 85 ? "Overloaded" : globalLoad < 30 ? "Underutilized" : "Stable";
                const loadColor = globalLoad > 85 ? "bg-red-100 text-red-700" : globalLoad < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

                return (
                  <button
                    key={dept.id}
                    onClick={() => onSelect(dept)}
                    className="ds-card p-0 overflow-hidden text-left hover:-translate-y-1 hover:shadow-lg transition-all group cursor-pointer"
                  >
                    <div className="p-6 pb-5">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-[20px] font-bold text-foreground leading-tight">{dept.name}</h2>
                            <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 border-0 shrink-0 ${loadColor}`}>
                              {loadStatus}
                            </Badge>
                          </div>
                          <p className="text-[13px] text-muted-foreground leading-relaxed">
                            {dept.description || "Specialized production capability"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="px-6 pb-4 flex items-center gap-6 text-[13px]">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-bold text-foreground">{perDept}</span>
                        <span>members</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-bold text-foreground">{avgSuccess}%</span>
                        <span>success</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        <span className="font-bold text-foreground">{globalLoad}%</span>
                        <span>load</span>
                      </div>
                    </div>

                    {/* Load bar */}
                    <div className="px-6 pb-4">
                      <Progress value={globalLoad} className="h-1.5" />
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-primary group-hover:text-foreground transition-colors flex items-center gap-2">
                        Enter Team Studio <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ================================================================
   STEP 2 — Team Studio (inside selected department)
   ================================================================ */
function TeamStudio({ dept, onBack, onStartSession }: { dept: Department; onBack: () => void; onStartSession: () => void }) {
  const { data: employees = [] } = useQuery({
    queryKey: ["studio-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, status, success_rate, avg_latency, avg_cost, bug_rate, reputation_score, model_name")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["studio-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, code, name, status, success_rate, total_runs, capacity_score")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["studio-projects"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, state")
        .in("state", ["active", "in_review", "scoped"]);
      return data ?? [];
    },
  });

  const activeEmployees = employees.filter((e) => e.status === "active");
  const avgSuccess = activeEmployees.length > 0
    ? Math.round(activeEmployees.reduce((s, e) => s + (e.success_rate ?? 0), 0) / activeEmployees.length * 100) : 0;
  const avgLatency = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + (e.avg_latency ?? 0), 0) / activeEmployees.length : 0;
  const totalCap = roles.reduce((s, r) => s + (r.capacity_score ?? 1), 0);
  const usedCap = roles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
  const loadPct = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;
  const loadStatus = loadPct > 85 ? "Overloaded" : loadPct < 30 ? "Underutilized" : "Stable";
  const loadColor = loadPct > 85 ? "bg-red-100 text-red-700" : loadPct < 30 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";

  return (
    <AppLayout title={dept.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-8 py-6 max-w-[1400px] space-y-6">

          {/* Back + Header */}
          <div>
            <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-3">
              <ArrowLeft className="h-4 w-4" /> Back to Capabilities
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight">{dept.name}</h1>
                <p className="text-[14px] text-muted-foreground mt-1">{dept.description || "Specialized production capability"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`text-[11px] font-semibold px-3 py-1.5 border-0 ${loadColor}`}>{loadStatus}</Badge>
                <Button onClick={onStartSession} className="gap-2 h-10 px-5 text-[13px] font-semibold">
                  <MessageSquare className="h-4 w-4" /> Start Team Session
                </Button>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-6 text-[13px] pb-2">
            <StatChip icon={<Users className="h-4 w-4" />} value={activeEmployees.length} label="team members" />
            <StatChip icon={<TrendingUp className="h-4 w-4" />} value={`${avgSuccess}%`} label="success rate" />
            <StatChip icon={<Clock className="h-4 w-4" />} value={avgLatency > 0 ? `${Math.round(avgLatency / 1000)}s` : "—"} label="avg delivery" />
            <StatChip icon={<FolderKanban className="h-4 w-4" />} value={projects.length} label="active projects" />
            <div className="flex items-center gap-2 text-muted-foreground ml-auto">
              <Gauge className="h-4 w-4" />
              <span className="font-bold text-foreground">{loadPct}%</span>
              <span>load</span>
              <Progress value={loadPct} className="h-2 w-28 ml-1" />
            </div>
          </div>

          {/* ── MAIN 8/4 GRID ──────────────────────────── */}
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT: Employee Grid */}
            <div className="col-span-12 lg:col-span-8">
              <h2 className="text-[18px] font-bold text-foreground mb-4">Team Members</h2>
              {activeEmployees.length === 0 ? (
                <div className="ds-card p-8 text-center text-[14px] text-muted-foreground">No active team members.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeEmployees.map((emp) => {
                    const persona = getPersona(emp.role_code);
                    const meta = getStatusMeta(emp.status);
                    const isRisk = (emp.success_rate ?? 0) < 0.6 || (emp.bug_rate ?? 0) > 0.3;
                    const roleName = roles.find((r) => r.code === emp.role_code)?.name ?? emp.role_code;
                    const tokenEff = (emp.avg_cost ?? 0) > 0 ? Math.round((emp.success_rate ?? 0) / (emp.avg_cost ?? 0.01) * 100) : 0;

                    return (
                      <Link key={emp.id} to={`/employees/${emp.id}`}>
                        <div className="ds-card p-0 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group">
                          {/* Card top */}
                          <div className={`p-5 pb-4 ${persona.bgTint}`}>
                            <div className="flex items-start gap-4">
                              <div className="relative shrink-0">
                                <img src={persona.avatar} alt={emp.name} loading="lazy" width={56} height={56}
                                  className={`h-14 w-14 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-background`} />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${meta.dot}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-bold text-foreground truncate">{emp.name}</span>
                                  {isRisk && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                                </div>
                                <p className="text-[12px] text-muted-foreground mt-0.5">{roleName}</p>
                                <span className="inline-block mt-1.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground/60">
                                  {persona.tag}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card body */}
                          <div className="px-5 pb-4 pt-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.chipBg}`}>{meta.label}</span>
                            </div>

                            {/* Metrics */}
                            <div className="pt-3 border-t border-border/30 flex items-center gap-4 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span className="font-bold text-foreground">{Math.round((emp.success_rate ?? 0) * 100)}%</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                ★ <span className="font-bold text-foreground">{(emp.reputation_score ?? 0).toFixed(1)}</span>
                              </span>
                              <span className="flex items-center gap-1.5 ml-auto">
                                <Zap className="h-3.5 w-3.5" />
                                <span className="font-mono font-semibold">{tokenEff}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Department Overview */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <h2 className="text-[18px] font-bold text-foreground">Department Overview</h2>

              <div className="ds-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-3">Performance</h3>
                <div className="space-y-3">
                  <OverviewRow label="Success Rate" value={`${avgSuccess}%`} />
                  <OverviewRow label="Active Agents" value={String(activeEmployees.length)} />
                  <OverviewRow label="Active Projects" value={String(projects.length)} />
                  <OverviewRow label="Avg Delivery" value={avgLatency > 0 ? `${Math.round(avgLatency / 1000)}s` : "—"} />
                  <div className="pt-3 border-t border-border/30">
                    <div className="flex items-center justify-between text-[12px] mb-1.5">
                      <span className="text-muted-foreground font-medium">Current Load</span>
                      <span className="font-bold text-foreground">{loadPct}%</span>
                    </div>
                    <Progress value={loadPct} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="ds-card p-5">
                <h3 className="text-[14px] font-semibold text-foreground mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button onClick={onStartSession} className="w-full gap-2 h-10 text-[12px] font-semibold">
                    <MessageSquare className="h-4 w-4" /> Start Team Session
                  </Button>
                  <Link to={`/departments/${dept.slug}`} className="block">
                    <Button variant="outline" className="w-full gap-2 h-10 text-[12px]">
                      <ArrowRight className="h-4 w-4" /> Full Department View
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ================================================================
   STEP 3 — Active Session (only shown after Start)
   ================================================================ */
function ActiveSession({ dept, onBack }: { dept: Department; onBack: () => void }) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(SEED_TRANSCRIPT);
  const [extraction] = useState<ExtractionState>(SEED_EXTRACTION);
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");
  const [showHistory, setShowHistory] = useState(false);
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false);

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const tokensByRole: Record<string, number> = {};
  transcript.forEach((e) => { tokensByRole[e.roleCode] = (tokensByRole[e.roleCode] ?? 0) + e.tokenCost; });

  const lastEntry = transcript[transcript.length - 1];
  const previousEntries = transcript.slice(0, -1);
  const speakerMeta = lastEntry ? getRoleMeta(lastEntry.roleCode) : null;

  const { data: employees = [] } = useQuery({
    queryKey: ["session-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, status")
        .eq("status", "active").order("name").limit(20);
      return data ?? [];
    },
  });

  const handleFounderClarify = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    setTranscript((prev) => [...prev, {
      id: `f-${Date.now()}`, roleCode: "product_strategist",
      content: `[Founder] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(), tokenCost: 0, type: "general",
    }]);
    setFounderInput("");
  }, [founderInput, meetingStatus]);

  return (
    <AppLayout title={`${dept.name} — Session`} fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Session header */}
        <div className="px-6 py-3 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Team
              </button>
              <span className="text-border">|</span>
              <span className="text-[16px] font-bold text-foreground">{dept.name}</span>
              <span className="text-[13px] text-muted-foreground">· Team Session</span>
              <Badge variant={meetingStatus === "active" ? "default" : "secondary"} className="text-[10px] h-6 px-2 font-semibold gap-1.5">
                {meetingStatus === "active" && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                {meetingStatus === "active" ? "Active" : meetingStatus === "frozen" ? "Frozen" : "Ended"}
              </Badge>
            </div>
            <button onClick={() => setShowTokenBreakdown(!showTokenBreakdown)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-mono">
              <Coins className="h-3.5 w-3.5" /> {totalTokens.toLocaleString()} tokens
            </button>
          </div>
        </div>

        {/* Token breakdown */}
        {showTokenBreakdown && (
          <div className="px-6 py-2 border-b border-border/30 bg-secondary/20 flex items-center gap-4 flex-wrap">
            {MEETING_ROLES.filter((r) => (tokensByRole[r.code] ?? 0) > 0).map((role) => (
              <span key={role.code} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground">{role.short}</span>
                {(tokensByRole[role.code] ?? 0).toLocaleString()}
              </span>
            ))}
            <span className="text-[11px] font-bold text-foreground ml-auto font-mono">Σ {totalTokens.toLocaleString()}</span>
          </div>
        )}

        {/* ── MAIN 8 / 4 GRID ──────────────────────── */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">

          {/* LEFT: Transcript */}
          <div className="col-span-8 border-r border-border/30 flex flex-col min-h-0">
            {/* Hero speaker */}
            {lastEntry && speakerMeta && (
              <div className="px-8 py-6 border-b border-border/20 bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <img src={getPersona(lastEntry.roleCode).avatar} alt=""
                    className={`h-10 w-10 rounded-xl object-cover ring-2 ${getPersona(lastEntry.roleCode).ringClass} ring-offset-2 ring-offset-background`}
                    width={40} height={40} />
                  <div>
                    <span className="text-[18px] font-bold text-foreground leading-tight">{speakerMeta.name}</span>
                    <p className="text-[11px] text-muted-foreground">{speakerMeta.subtitle}</p>
                  </div>
                  {(() => {
                    const empId = employees.find(e => e.role_code === lastEntry.roleCode)?.id;
                    return empId ? (
                      <Link to={`/employees/${empId}`} className="ml-auto text-[11px] text-primary hover:text-foreground transition-colors font-medium">
                        View Profile →
                      </Link>
                    ) : null;
                  })()}
                </div>
                <div className="max-w-[680px]">
                  <p className="text-[15px] text-foreground leading-[1.7] tracking-[-0.01em]">{lastEntry.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Badge variant="secondary" className="text-[10px] h-6 px-2">{TYPE_LABEL[lastEntry.type]}</Badge>
                  <span className="text-[11px] text-muted-foreground/50">
                    {new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] text-muted-foreground/40 font-mono flex items-center gap-1">
                    <Coins className="h-3 w-3" />{lastEntry.tokenCost}
                  </span>
                </div>
              </div>
            )}

            {/* History toggle */}
            <button onClick={() => setShowHistory(!showHistory)}
              className="px-8 py-2.5 border-b border-border/20 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors flex items-center gap-2 w-full text-left">
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showHistory ? "Hide" : "Show"} previous discussion ({previousEntries.length} turns)
            </button>

            {showHistory && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-border/10">
                  {previousEntries.map((entry) => {
                    const role = getRoleMeta(entry.roleCode);
                    const persona = getPersona(entry.roleCode);
                    const empId = employees.find(e => e.role_code === entry.roleCode)?.id;
                    return (
                      <div key={entry.id} className="px-8 py-3 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          {empId ? (
                            <Link to={`/employees/${empId}`}>
                              <img src={persona.avatar} alt="" className="h-6 w-6 rounded-lg object-cover hover:scale-110 transition-transform" width={24} height={24} />
                            </Link>
                          ) : (
                            <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{role.short}</span>
                          )}
                          <span className="text-[12px] font-semibold text-foreground/70">{role.name}</span>
                          <span className="text-[10px] text-muted-foreground/40 ml-auto">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-1 pl-8 leading-relaxed">{entry.content}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {!showHistory && <div className="flex-1" />}

            {/* Founder controls */}
            <div className="border-t border-border/30 px-6 py-3 flex items-center gap-3">
              <Input value={founderInput} onChange={(e) => setFounderInput(e.target.value)}
                placeholder="Clarify or redirect the session…"
                className="h-9 text-[13px] bg-background flex-1 max-w-lg"
                disabled={meetingStatus !== "active"}
                onKeyDown={(e) => e.key === "Enter" && handleFounderClarify()} />
              <Button size="sm" className="h-9 gap-1.5 text-[12px] px-4" onClick={handleFounderClarify}
                disabled={meetingStatus !== "active" || !founderInput.trim()}>
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-muted-foreground" disabled={meetingStatus !== "active"}>
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-muted-foreground"
                  onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}>
                  <Snowflake className="h-3.5 w-3.5" /> Freeze
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-destructive"
                  onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}>
                  <Square className="h-3.5 w-3.5" /> End
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: Structured Output */}
          <div className="col-span-4 flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-border/30">
              <h3 className="text-[14px] font-bold text-foreground">Structured Output</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-0 divide-y divide-border/20">
                <ExtractionSection title="Scope" icon={<Target className="h-4 w-4 text-muted-foreground" />} items={extraction.scope} />
                <ExtractionSection title="Architecture" icon={<Layers className="h-4 w-4 text-muted-foreground" />} items={extraction.architectureNotes} />
                <ExtractionSection title="Tasks" icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} items={extraction.taskBreakdown} emptyText="No tasks yet" />
                <ExtractionSection title="Risks" icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} items={extraction.risks} />
                <ExtractionSection title="Questions" icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />} items={extraction.openQuestions} />
                <div className="py-4">
                  <h4 className="text-[14px] font-bold text-foreground flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" /> Complexity
                  </h4>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{extraction.estimatedComplexity}</p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════ */

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      {icon}
      <span className="font-bold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="font-bold text-foreground">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function ExtractionSection({ title, icon, items, emptyText }: {
  title: string; icon: React.ReactNode; items: ExtractionItem[]; emptyText?: string;
}) {
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[14px] font-bold text-foreground flex items-center gap-2">
          {icon} {title}
          {items.length > 0 && <span className="text-[11px] text-muted-foreground font-normal">{items.length}</span>}
        </h4>
        <button className="text-muted-foreground/30 hover:text-muted-foreground transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/75 leading-relaxed">
              <span className={`w-2 h-2 rounded-full mt-[6px] shrink-0 ${CONFIDENCE_DOT[item.confidence]}`} title={`${item.confidence} confidence`} />
              {item.text}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground/40">{emptyText ?? "—"}</p>
      )}
    </div>
  );
}
