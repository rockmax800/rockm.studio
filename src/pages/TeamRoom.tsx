import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDepartments, type Department } from "@/hooks/use-department-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  Building2, ArrowLeft, Users, TrendingUp, Gauge,
  AlertTriangle, Zap, MessageSquare, Send, SkipForward,
  Snowflake, Square, Coins, ChevronDown, ChevronUp,
  Target, Layers, ListChecks, HelpCircle, BarChart3, Pencil,
  FolderKanban, Clock, ChevronRight, Brain, BookOpen,
  ShieldAlert, Lightbulb, XCircle, Smartphone, Bot, Globe, Cpu,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DEPT_ICONS: Record<string, React.ElementType> = { Smartphone, Bot, Globe, Building2, Cpu };

/* ── Session seed data ────────────────────────────────────── */
type EntryType = "scope" | "architecture" | "risk" | "question" | "task" | "general";
interface TranscriptEntry { id: string; roleCode: string; content: string; timestamp: string; tokenCost: number; type: EntryType; }
interface ExtractionItem { text: string; confidence: "high" | "medium" | "low"; }
interface ExtractionState { scope: ExtractionItem[]; architectureNotes: ExtractionItem[]; taskBreakdown: ExtractionItem[]; risks: ExtractionItem[]; openQuestions: ExtractionItem[]; estimatedComplexity: string; }

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
const CONFIDENCE_DOT: Record<string, string> = { high: "bg-status-green", medium: "bg-status-amber", low: "bg-destructive" };

const STATUS_CHIP: Record<string, { label: string; cls: string; dotCls: string }> = {
  active:    { label: "Working",   cls: "bg-status-amber/10 text-status-amber",       dotCls: "bg-status-amber animate-pulse" },
  idle:      { label: "Idle",      cls: "bg-secondary text-muted-foreground",           dotCls: "bg-muted-foreground/25" },
  reviewing: { label: "Reviewing", cls: "bg-lifecycle-review/10 text-lifecycle-review", dotCls: "bg-lifecycle-review" },
  blocked:   { label: "Blocked",   cls: "bg-destructive/10 text-destructive",           dotCls: "bg-destructive" },
};

/* ================================================================
   MAIN — 3-phase flow: Select dept → Select employee → Session
   ================================================================ */
export default function TeamRoom() {
  const { data: departments = [], isLoading: deptLoading } = useDepartments();
  const navigate = useNavigate();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  const selectedDept = departments.find((d) => d.id === selectedDeptId) ?? null;

  // ── Employees query ─────────────────────────────────────
  const { data: employees = [] } = useQuery({
    queryKey: ["team-room-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, status, success_rate, avg_latency, avg_cost, bug_rate, reputation_score, model_name, role_id, team_id")
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["team-room-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles")
        .select("id, code, name, status, success_rate, total_runs, capacity_score, performance_score, team_id")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["team-room-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, focus_domain");
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["team-room-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("id, title, state, owner_role_id")
        .not("state", "in", "(done,cancelled)");
      return data ?? [];
    },
  });

  // Filter employees by selected department (team)
  const filteredEmployees = useMemo(() => {
    if (!selectedDeptId) return employees.filter((e) => e.status === "active");
    // match by team_id
    return employees.filter((e) => e.status === "active" && e.team_id === selectedDeptId);
  }, [employees, selectedDeptId]);

  // If filtering by dept yields nothing, also try matching by team from roles
  const displayEmployees = useMemo(() => {
    if (filteredEmployees.length > 0) return filteredEmployees;
    if (!selectedDeptId) return employees.filter((e) => e.status === "active");
    // fallback: match roles in that team, then find employees by role_id
    const teamRoleIds = new Set(roles.filter((r) => r.team_id === selectedDeptId).map((r) => r.id));
    return employees.filter((e) => e.status === "active" && e.role_id && teamRoleIds.has(e.role_id));
  }, [filteredEmployees, employees, roles, selectedDeptId]);

  const selectedEmp = displayEmployees.find((e) => e.id === selectedEmpId) ?? null;

  // Stats
  const activeEmps = displayEmployees;
  const avgSuccess = activeEmps.length > 0
    ? Math.round(activeEmps.reduce((s, e) => s + ((e.success_rate as number) ?? 0), 0) / activeEmps.length * 100) : 0;

  // Department dropdown items — use teams or departments
  const deptOptions = teams.length > 0
    ? teams.map((t) => ({ id: t.id, name: t.name ?? "Team" }))
    : departments.map((d) => ({ id: d.id, name: d.name }));

  // ── Session active state ─────────────────────────────────
  if (sessionActive && selectedEmp) {
    return (
      <SessionWorkspace
        emp={selectedEmp}
        roles={roles}
        deptName={selectedDept?.name ?? deptOptions.find((d) => d.id === selectedDeptId)?.name ?? "Team"}
        onBack={() => setSessionActive(false)}
        onMemory={() => setMemoryOpen(true)}
      />
    );
  }

  // ── Main: Department selector + Employee grid ────────────
  return (
    <AppLayout title="Team Room">
      {/* Memory modal */}
      <MemoryModal open={memoryOpen} onClose={() => setMemoryOpen(false)} employee={selectedEmp} />

      <div className="grid-content space-y-5 pb-8">

        {/* ═══ TOP BAR ═════════════════════════════════════════ */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Department selector */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">Department</span>
            <Select value={selectedDeptId ?? "__all"} onValueChange={(v) => { setSelectedDeptId(v === "__all" ? null : v); setSelectedEmpId(null); setSessionActive(false); }}>
              <SelectTrigger className="h-9 w-[220px] text-[13px] font-semibold">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Departments</SelectItem>
                {deptOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 ml-4 text-[13px]">
            <MiniStat icon={Users} value={activeEmps.length} label="members" />
            <MiniStat icon={TrendingUp} value={`${avgSuccess}%`} label="success" />
          </div>

          {/* Session status */}
          <div className="ml-auto flex items-center gap-3">
            {selectedEmp && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5" onClick={() => setMemoryOpen(true)}>
                  <Brain className="h-3.5 w-3.5" /> View Memory
                </Button>
                <Button size="sm" className="h-8 text-[12px] gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => setSessionActive(true)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Start Session
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ═══ EMPLOYEE GRID ═══════════════════════════════════ */}
        <div>
          <h2 className="text-[22px] font-bold text-foreground tracking-tight mb-4">
            {selectedDept?.name ?? deptOptions.find((d) => d.id === selectedDeptId)?.name ?? "All Team Members"}
          </h2>

          {deptLoading ? (
            <p className="text-[14px] text-muted-foreground">Loading…</p>
          ) : displayEmployees.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-foreground">No team members found.</p>
              <p className="text-[13px] text-muted-foreground mt-1">Select a different department or add employees.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayEmployees.map((emp) => {
                const isSelected = selectedEmpId === emp.id;
                return (
                  <EmployeeCard
                    key={emp.id}
                    employee={emp}
                    roles={roles}
                    tasks={tasks}
                    selected={isSelected}
                    onClick={() => setSelectedEmpId(isSelected ? null : emp.id)}
                    onProfile={() => navigate(`/employees/${emp.id}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   EMPLOYEE CARD — Large, clear, clickable
   ================================================================ */
function EmployeeCard({ employee, roles, tasks, selected, onClick, onProfile }: {
  employee: any; roles: any[]; tasks: any[]; selected: boolean; onClick: () => void; onProfile: () => void;
}) {
  const persona = getPersona(employee.role_code);
  const meta = getStatusMeta(employee.status);
  const roleName = roles.find((r: any) => r.code === employee.role_code)?.name ?? employee.role_code;
  const perfScore = Math.round(((employee.reputation_score as number) ?? 0) * 100);
  const perfColor = perfScore >= 80 ? "text-status-green" : perfScore >= 50 ? "text-status-amber" : "text-destructive";
  const perfRing = perfScore >= 80 ? "border-status-green/40" : perfScore >= 50 ? "border-status-amber/40" : "border-destructive/40";
  const successPct = Math.round(((employee.success_rate as number) ?? 0) * 100);

  // Find active task
  const roleObj = roles.find((r: any) => r.code === employee.role_code);
  const activeTask = roleObj ? tasks.find((t: any) => t.owner_role_id === roleObj.id && ["in_progress", "waiting_review", "blocked"].includes(t.state)) : null;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col items-center text-center px-5 py-6 rounded-2xl border bg-card transition-all duration-200 cursor-pointer ${
        selected
          ? "border-primary shadow-lg ring-2 ring-primary/20 -translate-y-1"
          : "border-border hover:shadow-lg hover:-translate-y-1"
      }`}
    >
      {/* Avatar with perf ring */}
      <div className="relative mb-3">
        <div className={`rounded-2xl border-[3px] ${selected ? "border-primary/50" : perfRing} p-1`}>
          <img src={persona.avatar} alt={employee.name}
            className={`h-[120px] w-[120px] rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
            width={120} height={120} loading="lazy" />
        </div>
        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card ${meta.dot}`} />
      </div>

      {/* Name & role */}
      <h5 className="text-[18px] font-bold text-foreground leading-tight">{employee.name}</h5>
      <p className="text-[13px] text-muted-foreground mt-0.5 font-medium">{roleName}</p>
      <span className="text-[11px] text-muted-foreground/50 mt-0.5">{persona.tag}</span>

      {/* Status */}
      <span className={`mt-3 text-[11px] font-bold px-3 py-1 rounded-full ${meta.chipBg}`}>{meta.label}</span>

      {/* Performance + success */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <span className={`text-[20px] font-bold font-mono tabular-nums ${perfColor}`}>{perfScore}</span>
          <span className="text-[10px] text-muted-foreground">perf</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-bold font-mono tabular-nums text-foreground">{successPct}%</span>
          <span className="text-[10px] text-muted-foreground">success</span>
        </div>
      </div>

      {/* Current task */}
      {activeTask && (
        <p className="text-[12px] text-muted-foreground mt-2 line-clamp-1 max-w-full">{activeTask.title}</p>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3">
        {selected && (
          <span className="text-[11px] font-bold text-primary">✓ Selected</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onProfile(); }}
          className="text-[11px] text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1"
        >
          View Profile <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   SESSION WORKSPACE — 7/5 split
   ================================================================ */
function SessionWorkspace({ emp, roles, deptName, onBack, onMemory }: {
  emp: any; roles: any[]; deptName: string; onBack: () => void; onMemory: () => void;
}) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(SEED_TRANSCRIPT);
  const [extraction] = useState<ExtractionState>(SEED_EXTRACTION);
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");
  const [showHistory, setShowHistory] = useState(false);

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const lastEntry = transcript[transcript.length - 1];
  const previousEntries = transcript.slice(0, -1);

  const persona = getPersona(emp.role_code);
  const roleName = roles.find((r: any) => r.code === emp.role_code)?.name ?? emp.role_code;

  const handleSend = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    setTranscript((prev) => [...prev, {
      id: `f-${Date.now()}`, roleCode: emp.role_code,
      content: `[Founder] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(), tokenCost: 0, type: "general",
    }]);
    setFounderInput("");
  }, [founderInput, meetingStatus, emp.role_code]);

  return (
    <AppLayout title={`${deptName} — Session`} fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ═══ SESSION TOP BAR ═══════════════════════════════ */}
        <div className="px-6 py-3 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="text-border">|</span>
              <span className="text-[14px] font-bold text-foreground">{deptName}</span>
              <Badge variant={meetingStatus === "active" ? "default" : "secondary"} className="text-[10px] h-6 px-2 font-semibold gap-1.5">
                {meetingStatus === "active" && <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />}
                {meetingStatus === "active" ? "Active" : meetingStatus === "frozen" ? "Frozen" : "Ended"}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5" /> {totalTokens.toLocaleString()} tokens
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground" disabled={meetingStatus !== "active"}>
                  <SkipForward className="h-3 w-3" /> Skip
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground"
                  onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}>
                  <Snowflake className="h-3 w-3" /> Freeze
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive"
                  onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}>
                  <Square className="h-3 w-3" /> End
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN 7/5 SPLIT ═══════════════════════════════ */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">

          {/* LEFT 7 cols — Conversation */}
          <div className="col-span-7 border-r border-border/30 flex flex-col min-h-0">

            {/* Selected employee header */}
            <div className="px-6 py-4 border-b border-border/20 bg-card flex items-center gap-4">
              <img src={persona.avatar} alt={emp.name}
                className={`h-12 w-12 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                width={48} height={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-foreground">{emp.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-2">{roleName}</Badge>
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {meetingStatus === "active" ? "Listening…" : meetingStatus === "frozen" ? "Session paused" : "Session ended"}
                </p>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1.5" onClick={onMemory}>
                <Brain className="h-3.5 w-3.5" /> Memory
              </Button>
            </div>

            {/* Hero message */}
            {lastEntry && (
              <div className="px-6 py-5 border-b border-border/20">
                <div className="flex items-center gap-2.5 mb-3">
                  <img src={getPersona(lastEntry.roleCode).avatar} alt=""
                    className={`h-8 w-8 rounded-lg object-cover ring-1 ${getPersona(lastEntry.roleCode).ringClass} ring-offset-1 ring-offset-background`}
                    width={32} height={32} />
                  <span className="text-[14px] font-bold text-foreground">{roles.find((r: any) => r.code === lastEntry.roleCode)?.name ?? lastEntry.roleCode}</span>
                  <Badge variant="secondary" className="text-[9px] h-5 px-1.5">{TYPE_LABEL[lastEntry.type]}</Badge>
                  <span className="text-[10px] text-muted-foreground/40 ml-auto">
                    {new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[14px] text-foreground leading-[1.7] max-w-[620px]">{lastEntry.content}</p>
              </div>
            )}

            {/* History toggle */}
            <button onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-2 border-b border-border/10 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors flex items-center gap-2 w-full text-left">
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showHistory ? "Hide" : "Show"} previous ({previousEntries.length} turns)
            </button>

            {showHistory && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-border/10">
                  {previousEntries.map((entry) => {
                    const ep = getPersona(entry.roleCode);
                    return (
                      <div key={entry.id} className="px-6 py-3 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <img src={ep.avatar} alt="" className="h-6 w-6 rounded-lg object-cover" width={24} height={24} />
                          <span className="text-[12px] font-semibold text-foreground/70">{roles.find((r: any) => r.code === entry.roleCode)?.name ?? entry.roleCode}</span>
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

            {/* Input area — visually larger */}
            <div className="border-t border-border/30 px-6 py-4 bg-card">
              <div className="flex items-center gap-3">
                <Input
                  value={founderInput}
                  onChange={(e) => setFounderInput(e.target.value)}
                  placeholder="Clarify, redirect, or ask a question…"
                  className="h-12 text-[14px] bg-background flex-1 rounded-xl"
                  disabled={meetingStatus !== "active"}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button className="h-12 px-6 gap-2 text-[13px] font-bold rounded-xl" onClick={handleSend}
                  disabled={meetingStatus !== "active" || !founderInput.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
                <Button size="sm" variant="outline" className="h-12 px-4 text-[12px] rounded-xl" onClick={handleSend}
                  disabled={meetingStatus !== "active" || !founderInput.trim()}>
                  Clarify
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT 5 cols — Structured Output */}
          <div className="col-span-5 flex flex-col min-h-0 bg-secondary/5">
            <div className="px-5 py-3 border-b border-border/30">
              <h3 className="text-[15px] font-bold text-foreground">Structured Output</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-0 divide-y divide-border/20">
                <ExtractionSection title="Scope" icon={<Target className="h-4 w-4 text-muted-foreground" />} items={extraction.scope} />
                <ExtractionSection title="Architecture" icon={<Layers className="h-4 w-4 text-muted-foreground" />} items={extraction.architectureNotes} />
                <ExtractionSection title="Task Breakdown" icon={<ListChecks className="h-4 w-4 text-muted-foreground" />} items={extraction.taskBreakdown} emptyText="No tasks yet" />
                <ExtractionSection title="Risks" icon={<AlertTriangle className="h-4 w-4 text-destructive/50" />} items={extraction.risks} critical />
                <ExtractionSection title="Open Questions" icon={<HelpCircle className="h-4 w-4 text-muted-foreground" />} items={extraction.openQuestions} />
                <div className="py-4">
                  <h4 className="text-[14px] font-bold text-foreground flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" /> Estimated Complexity
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

/* ================================================================
   MEMORY MODAL
   ================================================================ */
function MemoryModal({ open, onClose, employee }: { open: boolean; onClose: () => void; employee: any }) {
  if (!employee) return null;
  const persona = getPersona(employee.role_code);

  const memSections = [
    { title: "Core Knowledge", icon: BookOpen, items: ["Role contract boundaries", "Allowed file paths", "Domain restrictions", "Output format requirements"] },
    { title: "Project Memory", icon: FolderKanban, items: ["Last 5 task outcomes", "Preferred architecture patterns", "Client-specific constraints"] },
    { title: "Learned Rules", icon: Lightbulb, items: ["Always validate schema before PR", "Use semantic tokens only", "Max 3 files per commit"] },
    { title: "Failure Memory", icon: XCircle, items: ["Bug #42: missed edge case in auth flow", "Review rejection: insufficient test coverage"] },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img src={persona.avatar} alt="" className="h-8 w-8 rounded-lg object-cover" width={32} height={32} />
            <span>{employee.name} — Memory</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {memSections.map((sec) => (
            <div key={sec.title}>
              <h4 className="text-[14px] font-bold text-foreground flex items-center gap-2 mb-2">
                <sec.icon className="h-4 w-4 text-muted-foreground" /> {sec.title}
              </h4>
              <ul className="space-y-1.5 pl-6">
                {sec.items.map((item, i) => (
                  <li key={i} className="text-[13px] text-muted-foreground list-disc">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================================================================
   EXTRACTION SECTION
   ================================================================ */
function ExtractionSection({ title, icon, items, emptyText, critical }: {
  title: string; icon: React.ReactNode; items: ExtractionItem[]; emptyText?: string; critical?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`py-4 first:pt-0 ${critical && items.length > 0 ? "border-l-2 border-destructive/30 pl-3 -ml-3" : ""}`}>
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-between w-full mb-2 group">
        <h4 className="text-[14px] font-bold text-foreground flex items-center gap-2">
          {icon} {title}
          {items.length > 0 && <span className="text-[11px] text-muted-foreground font-normal">{items.length}</span>}
        </h4>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-all ${collapsed ? "-rotate-90" : ""}`} />
      </button>
      {!collapsed && (
        items.length > 0 ? (
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
        )
      )}
    </div>
  );
}

/* ═══ Helper ═══ */
function MiniStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-[13px] font-bold text-foreground">{value}</span>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  );
}
