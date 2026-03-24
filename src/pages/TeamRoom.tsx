import { useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useDepartments } from "@/hooks/use-department-data";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  ArrowLeft, Users, MessageSquare, Send, SkipForward,
  Snowflake, Square, Coins, ChevronDown, ChevronUp,
  Target, Layers, ListChecks, HelpCircle, BarChart3,
  Brain, BookOpen, ShieldAlert, Lightbulb, XCircle,
  AlertTriangle, ArrowUpRight, Play, User, Zap,
} from "lucide-react";

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
const TYPE_COLOR: Record<EntryType, string> = { scope: "bg-primary/10 text-primary", architecture: "bg-blue-100 text-blue-700", risk: "bg-destructive/10 text-destructive", question: "bg-status-amber/10 text-status-amber", task: "bg-lifecycle-validated/10 text-lifecycle-validated", general: "bg-secondary text-muted-foreground" };
const CONFIDENCE_DOT: Record<string, string> = { high: "bg-status-green", medium: "bg-status-amber", low: "bg-destructive" };

const SESSION_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  listening:   { label: "Listening",   dot: "bg-status-green animate-pulse", text: "text-status-green" },
  thinking:    { label: "Thinking",    dot: "bg-status-amber animate-pulse", text: "text-status-amber" },
  responding:  { label: "Responding",  dot: "bg-primary animate-pulse",      text: "text-primary" },
  idle:        { label: "Idle",        dot: "bg-muted-foreground/30",         text: "text-muted-foreground" },
};

/* ================================================================
   MAIN — reads ?dept= and ?emp= from URL params (entered from Teams)
   ================================================================ */
export default function TeamRoom() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: departments = [] } = useDepartments();

  const urlDept = searchParams.get("dept");
  const urlEmp = searchParams.get("emp");

  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(urlEmp);
  const [sessionActive, setSessionActive] = useState(false);

  // ── Employees query
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

  // Resolve department from URL slug
  const selectedDept = departments.find((d) => d.slug === urlDept) ?? null;
  const deptName = selectedDept?.name ?? teams.find((t) => t.id === urlDept)?.name ?? "Team";

  // Filter employees by department
  const displayEmployees = useMemo(() => {
    const active = employees.filter((e) => e.status === "active");
    if (!selectedDept && !urlDept) return active;
    const deptId = selectedDept?.id ?? urlDept;
    const byTeam = active.filter((e) => e.team_id === deptId);
    if (byTeam.length > 0) return byTeam;
    const teamRoleIds = new Set(roles.filter((r) => r.team_id === deptId).map((r) => r.id));
    return active.filter((e) => e.role_id && teamRoleIds.has(e.role_id));
  }, [employees, roles, selectedDept, urlDept]);

  const selectedEmp = employees.find((e) => e.id === selectedEmpId) ?? null;

  // ── Session active state
  if (sessionActive && selectedEmp) {
    return (
      <SessionWorkspace
        emp={selectedEmp}
        roles={roles}
        deptName={deptName}
        onBack={() => setSessionActive(false)}
      />
    );
  }

  // ── Pre-session: employee selection grid
  return (
    <AppLayout title="Team Room">
      <ScrollArea className="h-full">
        <div className="px-8 py-6 max-w-[1200px] space-y-6">

          {/* Back to Teams */}
          <Link to="/teams" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Teams
          </Link>

          {/* Header */}
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">{deptName}</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Select an employee to start a working session.
            </p>
          </div>

          {/* Employee grid */}
          {displayEmployees.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Users className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-foreground">No team members found</p>
              <p className="text-[13px] text-muted-foreground mt-1">This capability has no active employees.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayEmployees.map((emp) => {
                const isSelected = selectedEmpId === emp.id;
                const persona = getPersona(emp.role_code);
                const meta = getStatusMeta(emp.status);
                const roleName = roles.find((r: any) => r.code === emp.role_code)?.name ?? emp.role_code;
                const perfScore = Math.round(((emp.reputation_score as number) ?? 0) * 100);
                const perfColor = perfScore >= 80 ? "text-status-green" : perfScore >= 50 ? "text-status-amber" : "text-destructive";
                const perfRing = perfScore >= 80 ? "border-status-green/40" : perfScore >= 50 ? "border-status-amber/40" : "border-destructive/40";

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmpId(isSelected ? null : emp.id)}
                    className={`rounded-2xl border bg-card p-5 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-primary shadow-lg ring-2 ring-primary/20 -translate-y-1"
                        : "border-border hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className={`rounded-xl border-[3px] ${isSelected ? "border-primary/50" : perfRing} p-0.5`}>
                          <img src={persona.avatar} alt={emp.name}
                            className={`h-16 w-16 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                            width={64} height={64} loading="lazy" />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${meta.dot}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[17px] font-bold text-foreground leading-tight">{emp.name}</h3>
                        <p className="text-[13px] text-muted-foreground mt-0.5">{roleName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge className={`text-[10px] font-bold px-2 py-0.5 border-0 ${meta.chipBg}`}>{meta.label}</Badge>
                          <span className={`text-[13px] font-bold font-mono ${perfColor}`}>{perfScore}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{Math.round(((emp.success_rate as number) ?? 0) * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions when selected */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-3">
                        <Button className="h-10 flex-1 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"
                          onClick={(e) => { e.stopPropagation(); setSessionActive(true); }}>
                          <Play className="h-4 w-4" /> Start Working Session
                        </Button>
                        <Link to={`/employees/${emp.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" className="h-10 text-[12px] gap-1.5 rounded-xl">
                            <User className="h-3.5 w-3.5" /> Profile
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Large start button when employee selected but not yet started */}
          {selectedEmp && !sessionActive && (
            <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/[0.02] p-8 text-center">
              <p className="text-[20px] font-bold text-foreground">
                Start Working Session with {selectedEmp.name}
              </p>
              <p className="text-[14px] text-muted-foreground mt-1">
                Begin a structured conversation to extract scope, architecture, and task breakdowns.
              </p>
              <Button className="mt-5 h-12 px-8 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"
                onClick={() => setSessionActive(true)}>
                <Play className="h-4 w-4" /> Begin Session
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ================================================================
   SESSION WORKSPACE — 8/4 split
   ================================================================ */
function SessionWorkspace({ emp, roles, deptName, onBack }: {
  emp: any; roles: any[]; deptName: string; onBack: () => void;
}) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(SEED_TRANSCRIPT);
  const [extraction] = useState<ExtractionState>(SEED_EXTRACTION);
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");
  const [showHistory, setShowHistory] = useState(false);
  const [empStatus] = useState<"listening" | "thinking" | "responding" | "idle">("listening");

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const lastEntry = transcript[transcript.length - 1];
  const previousEntries = transcript.slice(0, -1);

  const persona = getPersona(emp.role_code);
  const roleName = roles.find((r: any) => r.code === emp.role_code)?.name ?? emp.role_code;
  const perfScore = Math.round(((emp.reputation_score as number) ?? 0) * 100);
  const perfColor = perfScore >= 80 ? "text-status-green" : perfScore >= 50 ? "text-status-amber" : "text-destructive";
  const perfRingColor = perfScore >= 80 ? "border-status-green" : perfScore >= 50 ? "border-status-amber" : "border-destructive";
  const statusInfo = SESSION_STATUS[empStatus];

  const handleSend = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    setTranscript((prev) => [...prev, {
      id: `f-${Date.now()}`, roleCode: emp.role_code,
      content: `[Founder] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(), tokenCost: 0, type: "general",
    }]);
    setFounderInput("");
  }, [founderInput, meetingStatus, emp.role_code]);

  // Memory counts (seed)
  const memoryCounts = { coreRules: 4, learnedPatterns: 3, failures: 2 };

  return (
    <AppLayout title={`${deptName} — Session`} fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ═══ COMPACT TOP STRIP ═══════════════════════════════ */}
        <div className="px-6 py-2.5 border-b border-border/40 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="w-px h-4 bg-border" />
              <span className="text-[13px] font-bold text-foreground">{deptName}</span>
              <span className="w-px h-4 bg-border" />
              <span className="text-[13px] font-semibold text-muted-foreground">{emp.name}</span>
              <span className="w-px h-4 bg-border" />

              {/* Session status dot */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${meetingStatus === "active" ? "bg-status-green animate-pulse" : meetingStatus === "frozen" ? "bg-status-amber" : "bg-muted-foreground/30"}`} />
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {meetingStatus === "active" ? "Active" : meetingStatus === "frozen" ? "Frozen" : "Ended"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                <Coins className="h-3 w-3" /> {totalTokens.toLocaleString()}
              </span>
              <div className="flex items-center gap-0.5">
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground px-2" disabled={meetingStatus !== "active"}>
                  <SkipForward className="h-3 w-3" /> Skip
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-muted-foreground px-2"
                  onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}>
                  <Snowflake className="h-3 w-3" /> Freeze
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive px-2"
                  onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}>
                  <Square className="h-3 w-3" /> End
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN 8/4 SPLIT ═══════════════════════════════ */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">

          {/* ──────────────────────────────────────────────────
              LEFT 8 cols — Working Session
              ────────────────────────────────────────────────── */}
          <div className="col-span-8 border-r border-border/30 flex flex-col min-h-0">

            {/* Employee header */}
            <div className="px-6 py-4 border-b border-border/20 bg-card/50">
              <div className="flex items-center gap-4">
                {/* Large avatar with perf ring */}
                <div className="relative shrink-0">
                  <div className={`rounded-2xl border-[3px] ${perfRingColor}/40 p-0.5`}>
                    <img src={persona.avatar} alt={emp.name}
                      className={`h-16 w-16 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                      width={64} height={64} />
                  </div>
                  {/* Perf score overlay */}
                  <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-md bg-card border border-border flex items-center justify-center`}>
                    <span className={`text-[10px] font-bold font-mono ${perfColor}`}>{perfScore}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[20px] font-bold text-foreground leading-tight">{emp.name}</h2>
                    <Badge variant="secondary" className="text-[11px] h-6 px-2 font-semibold">{roleName}</Badge>
                  </div>
                  {/* Status */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                    <span className={`text-[13px] font-semibold ${statusInfo.text}`}>{statusInfo.label}</span>
                  </div>
                </div>

                <Link to={`/employees/${emp.id}`}>
                  <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 rounded-lg">
                    <User className="h-3.5 w-3.5" /> View Full Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Current message (hero) ── */}
            {lastEntry && (
              <div className="px-6 py-5 border-b border-border/15">
                <div className="flex items-center gap-2.5 mb-3">
                  <img src={getPersona(lastEntry.roleCode).avatar} alt=""
                    className={`h-8 w-8 rounded-lg object-cover ring-1 ${getPersona(lastEntry.roleCode).ringClass} ring-offset-1 ring-offset-background`}
                    width={32} height={32} />
                  <span className="text-[14px] font-bold text-foreground">{roles.find((r: any) => r.code === lastEntry.roleCode)?.name ?? lastEntry.roleCode}</span>
                  <Badge className={`text-[9px] h-5 px-1.5 border-0 ${TYPE_COLOR[lastEntry.type]}`}>{TYPE_LABEL[lastEntry.type]}</Badge>
                  <span className="text-[11px] text-muted-foreground/40 ml-auto font-mono">
                    {new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[16px] text-foreground leading-[1.75] max-w-[680px] font-medium">{lastEntry.content}</p>
              </div>
            )}

            {/* ── History toggle ── */}
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
                          <span className="text-[13px] font-semibold text-foreground/70">{roles.find((r: any) => r.code === entry.roleCode)?.name ?? entry.roleCode}</span>
                          <Badge className={`text-[9px] h-4 px-1 border-0 ${TYPE_COLOR[entry.type]}`}>{TYPE_LABEL[entry.type]}</Badge>
                          <span className="text-[11px] text-muted-foreground/40 ml-auto font-mono">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 pl-8">{entry.content}</p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {!showHistory && <div className="flex-1" />}

            {/* ── Input area ── */}
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
                <Button className="h-12 px-6 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90" onClick={handleSend}
                  disabled={meetingStatus !== "active" || !founderInput.trim()}>
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────
              RIGHT 4 cols — Structured Context + Memory
              ────────────────────────────────────────────────── */}
          <div className="col-span-4 flex flex-col min-h-0 bg-secondary/5">

            {/* Structured context header */}
            <div className="px-5 py-3 border-b border-border/30">
              <h3 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" /> Structured Context
              </h3>
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

              {/* ── Memory Snapshot ── */}
              <div className="mx-5 mb-5 rounded-xl border border-border bg-card p-4">
                <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-primary/60" /> Employee Memory Snapshot
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.coreRules}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Core Rules</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.learnedPatterns}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Patterns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.failures}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Failures</p>
                  </div>
                </div>
                <Link to={`/employees/${emp.id}`}>
                  <Button variant="outline" size="sm" className="w-full h-8 text-[12px] gap-1.5 rounded-lg">
                    <Brain className="h-3.5 w-3.5" /> Open Full Memory
                  </Button>
                </Link>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ================================================================
   EXTRACTION SECTION — collapsible
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
