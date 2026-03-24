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
import { AddEmployeeDialog } from "@/components/teams/AddEmployeeDialog";
import { cn } from "@/lib/utils";
import { ExecutionPolicyBadge } from "@/components/ui/execution-policy-badge";
import { ExecutionOverrideSheet, type SessionOverride } from "@/components/ui/execution-override-sheet";
import { useExecutionPolicy } from "@/hooks/use-execution-policy";
import {
  ArrowLeft, Users, MessageSquare, Send, SkipForward,
  Snowflake, Square, Coins, ChevronDown, ChevronUp,
  Target, Layers, ListChecks, HelpCircle, BarChart3,
  Brain, BookOpen, ShieldAlert, Lightbulb, XCircle,
  AlertTriangle, ArrowUpRight, Play, User, Zap, UserPlus,
  Sparkles, Clock, TrendingUp, Shield, BadgeCheck, FileText,
}from "lucide-react";

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
const TYPE_COLOR: Record<EntryType, string> = { scope: "bg-primary/10 text-primary", architecture: "bg-status-blue/10 text-status-blue", risk: "bg-destructive/10 text-destructive", question: "bg-status-amber/10 text-status-amber", task: "bg-status-green/10 text-status-green", general: "bg-secondary text-muted-foreground" };
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

  // Specialist intro line based on role
  const getSpecialistIntro = (roleCode: string, name: string) => {
    const intros: Record<string, string> = {
      product_strategist: `I'm ${name}. I'll help you sharpen the product scope and prioritize what matters.`,
      solution_architect: `${name} here. Let's map out the architecture — layers, boundaries, and trade-offs.`,
      frontend_builder: `Hey, I'm ${name}. I build interfaces that are clean, fast, and maintainable.`,
      reviewer: `I'm ${name}. I review for correctness, security, and contract compliance.`,
      qa_agent: `${name} reporting. I'll find the edge cases before your users do.`,
    };
    return intros[roleCode] ?? `I'm ${name}. Ready to work — let's start the session.`;
  };

  // ── Pre-session: employee selection
  return (
    <AppLayout title="Team Room">
      <ScrollArea className="h-full">
        <div className="h-full">

          {/* ═══ HERO — Light themed briefing entrance ═══ */}
          <div className="intake-hero-root ih-grid-bg">
            <div className="max-w-3xl mx-auto px-6 pt-8 pb-6 flex flex-col items-center">
              {/* Speech bubble — only when employee is selected */}
              {selectedEmp ? (
                <>
                  <div className="ih-speech-bubble px-6 py-4 max-w-lg text-center mb-4">
                    <p className="text-[15px] leading-[160%]" style={{ color: "hsl(222 32% 14%)" }}>
                      {getSpecialistIntro(selectedEmp.role_code, selectedEmp.name)}
                    </p>
                  </div>
                  <div className="ih-float flex flex-col items-center mb-4">
                    <div className="relative">
                      <img
                        src={getPersona(selectedEmp.role_code).avatar}
                        alt={selectedEmp.name}
                        className={cn("h-24 w-24 rounded-2xl object-cover ring-2 ring-offset-[3px] shadow-lg ring-offset-[hsl(220_20%_97%)]", getPersona(selectedEmp.role_code).ringClass)}
                        width={96} height={96}
                      />
                      <span className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px]", getStatusMeta(selectedEmp.status).dot)} style={{ borderColor: "hsl(220 20% 97%)" }} />
                    </div>
                    <span className="mt-3 text-[18px] font-bold" style={{ color: "hsl(222 32% 14%)" }}>{selectedEmp.name}</span>
                    <span className="text-[13px]" style={{ color: "hsl(220 10% 46%)" }}>
                      {roles.find((r: any) => r.code === selectedEmp.role_code)?.name ?? selectedEmp.role_code}
                    </span>
                    <span className="text-[11px] mt-0.5 italic" style={{ color: "hsl(220 10% 64%)" }}>
                      {getPersona(selectedEmp.role_code).specialty}
                    </span>
                  </div>
                  <Button
                    className="h-12 px-8 gap-2.5 text-[14px] font-bold rounded-xl mb-2"
                    style={{ backgroundColor: "hsl(0 0% 93%)", color: "hsl(0 0% 7%)" }}
                    onClick={() => setSessionActive(true)}
                  >
                    <Play className="h-4 w-4" /> Begin Session
                  </Button>
                  <button
                    onClick={() => setSelectedEmpId(null)}
                    className="text-[12px] hover:underline"
                    style={{ color: "hsl(217 91% 60%)" }}
                  >
                    Choose a different specialist
                  </button>
                </>
              ) : (
                <>
                  <div className="ih-speech-bubble px-6 py-4 max-w-md text-center mb-4">
                    <p className="text-[15px] leading-[160%]" style={{ color: "hsl(222 32% 14%)" }}>
                      Welcome to the briefing room. Pick a specialist to start a structured working session.
                    </p>
                  </div>
                  <div className="ih-float flex flex-col items-center mb-2">
                    <div className="h-20 w-20 rounded-2xl border-2 bg-white flex items-center justify-center shadow-sm" style={{ borderColor: "hsl(220 14% 90%)" }}>
                      <Users className="h-8 w-8" style={{ color: "hsl(220 10% 64%)" }} />
                    </div>
                  </div>
                  <h1 className="text-[22px] font-bold tracking-tight text-center" style={{ color: "hsl(222 32% 14%)" }}>
                    {deptName}
                  </h1>
                  <p className="text-[13px] mt-1 text-center max-w-md" style={{ color: "hsl(220 10% 46%)" }}>
                    Select a specialist below to begin.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ═══ TRANSITION STRIP ═══ */}
          <div className="border-t border-b px-6 py-2 flex items-center justify-between bg-card border-border">
            <div className="flex items-center gap-2">
              <Link to="/teams" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Teams
              </Link>
            </div>
            <span className="text-[11px] text-muted-foreground/50">
              {displayEmployees.length} specialist{displayEmployees.length !== 1 ? "s" : ""} available
            </span>
          </div>

          {/* ═══ EMPLOYEE SELECTION GRID ═══ */}
          <div className="px-8 py-6 max-w-[1200px] mx-auto space-y-4">
            {displayEmployees.length === 0 ? (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="relative px-10 py-16 text-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mx-auto mb-5">
                      <Users className="h-7 w-7 text-muted-foreground/20" strokeWidth={1.5} />
                    </div>
                    <p className="text-[20px] font-bold text-foreground">No team members yet</p>
                    <p className="text-[14px] text-muted-foreground mt-2 max-w-[420px] mx-auto leading-relaxed">
                      Add AI employees to this capability to start working sessions and generate structured blueprints.
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <AddEmployeeDialog
                        teamId={selectedDept?.id ?? urlDept ?? undefined}
                        teamName={deptName}
                        trigger={
                          <Button className="h-11 px-6 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                            <UserPlus className="h-4 w-4" /> Add Team Member
                          </Button>
                        }
                      />
                      <Link to="/teams">
                        <Button variant="outline" className="h-11 px-6 gap-2 text-[13px] font-semibold rounded-xl border-border/60">
                          <Users className="h-4 w-4" /> Go to Teams Setup
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
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
                  const successPct = Math.round(((emp.success_rate as number) ?? 0) * 100);

                  return (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmpId(isSelected ? null : emp.id)}
                      className={cn(
                        "rounded-2xl border bg-card overflow-hidden cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-primary/50 shadow-lg ring-2 ring-primary/15 -translate-y-1"
                          : "border-border/40 hover:shadow-md hover:-translate-y-0.5 hover:border-border/60"
                      )}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <img src={persona.avatar} alt={emp.name}
                              className={cn(
                                "h-[72px] w-[72px] rounded-xl object-cover ring-2 ring-offset-2 ring-offset-card",
                                isSelected ? "ring-primary/50" : persona.ringClass
                              )}
                              width={72} height={72} loading="lazy" />
                            <span className={cn("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card", meta.dot)} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="text-[17px] font-bold text-foreground leading-tight truncate">{emp.name}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[13px] text-muted-foreground truncate">{roleName}</p>
                              <span className="text-[11px] text-muted-foreground/30">·</span>
                              <span className="text-[11px] text-muted-foreground/40 italic truncate">{persona.nickname}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", meta.chipBg)}>{meta.label}</span>
                              {persona.chips.slice(0, 2).map((chip) => (
                                <span key={chip} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">{chip}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/20">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-muted-foreground/40" />
                            <span className={cn("text-[14px] font-bold font-mono", perfColor)}>{perfScore}</span>
                            <span className="text-[10px] text-muted-foreground/40">perf</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-muted-foreground/40" />
                            <span className="text-[14px] font-bold font-mono text-foreground">{successPct}%</span>
                            <span className="text-[10px] text-muted-foreground/40">success</span>
                          </div>
                          {emp.model_name && (
                            <span className="text-[10px] text-muted-foreground/30 font-mono ml-auto truncate max-w-[80px]">
                              {emp.model_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
  const { policy: globalPolicy } = useExecutionPolicy();
  const [execOverride, setExecOverride] = useState<SessionOverride>({ enabled: false, policy: globalPolicy });

  // ── Published training prompt query
  const { data: activeGuidance } = useQuery({
    queryKey: ["active-guidance", emp.id],
    queryFn: async () => {
      // Find active/draft session for employee
      const { data: sessions } = await supabase
        .from("employee_training_sessions" as any)
        .select("id")
        .eq("employee_id", emp.id)
        .in("status", ["draft", "active"])
        .order("updated_at", { ascending: false })
        .limit(1);
      if (!sessions || (sessions as any[]).length === 0) return null;
      const sessionId = (sessions as any[])[0].id;
      // Find published draft
      const { data: drafts } = await supabase
        .from("employee_prompt_drafts" as any)
        .select("id, version_number, prompt_markdown, created_at, is_published")
        .eq("session_id", sessionId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!drafts || (drafts as any[]).length === 0) return null;
      return (drafts as any[])[0] as { id: string; version_number: number; prompt_markdown: string; created_at: string; is_published: boolean };
    },
    staleTime: 30_000,
  });

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const lastEntry = transcript[transcript.length - 1];
  const previousEntries = transcript.slice(0, -1);

  const persona = getPersona(emp.role_code);
  const roleName = roles.find((r: any) => r.code === emp.role_code)?.name ?? emp.role_code;
  const perfScore = Math.round(((emp.reputation_score as number) ?? 0) * 100);
  const perfColor = perfScore >= 80 ? "text-status-green" : perfScore >= 50 ? "text-status-amber" : "text-destructive";
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

  // Extract top guidance sections from published prompt markdown
  const guidanceSections = useMemo(() => {
    if (!activeGuidance?.prompt_markdown) return [];
    const lines = activeGuidance.prompt_markdown.split("\n");
    const sections: { title: string; preview: string }[] = [];
    let currentTitle = "";
    let currentContent = "";
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentTitle && currentContent.trim()) {
          sections.push({ title: currentTitle, preview: currentContent.trim().slice(0, 80) });
        }
        currentTitle = line.replace("## ", "").trim();
        currentContent = "";
      } else {
        currentContent += line + " ";
      }
    }
    if (currentTitle && currentContent.trim()) {
      sections.push({ title: currentTitle, preview: currentContent.trim().slice(0, 80) });
    }
    return sections.slice(0, 3);
  }, [activeGuidance]);

  const meetingDot = meetingStatus === "active" ? "bg-status-green animate-pulse" : meetingStatus === "frozen" ? "bg-status-amber" : "bg-muted-foreground/30";
  const meetingLabel = meetingStatus === "active" ? "Live" : meetingStatus === "frozen" ? "Frozen" : "Ended";

  return (
    <AppLayout title={`${deptName} — Session`} fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ═══ TOP STRIP ═══ */}
        <div className="px-6 py-3 border-b border-border/30 bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <span className="w-px h-5 bg-border/40" />
              <span className="text-[13px] font-bold text-foreground">{deptName}</span>
              <span className="w-px h-5 bg-border/40" />
              <div className="flex items-center gap-2">
                <img src={persona.avatar} alt="" className="h-6 w-6 rounded-md object-cover" width={24} height={24} />
                <span className="text-[13px] font-semibold text-foreground">{emp.name}</span>
              </div>
              <span className="w-px h-5 bg-border/40" />
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", meetingDot)} />
              <span className="text-[12px] font-bold text-muted-foreground">{meetingLabel}</span>
              </div>
              <span className="w-px h-5 bg-border/40" />
              <ExecutionPolicyBadge
                label="Current execution environment"
                policyOverride={execOverride.enabled ? execOverride.policy : null}
                isOverride={execOverride.enabled}
              />
              <ExecutionOverrideSheet override={execOverride} onChange={setExecOverride} triggerLabel="Override" />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[11px] text-muted-foreground/60 font-mono flex items-center gap-1.5">
                <Coins className="h-3 w-3" /> {totalTokens.toLocaleString()} tokens
              </span>
              <div className="w-px h-5 bg-border/40" />
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 text-[12px] gap-1.5 text-muted-foreground px-3 rounded-lg hover:bg-secondary" disabled={meetingStatus !== "active"}>
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[12px] gap-1.5 text-muted-foreground px-3 rounded-lg hover:bg-secondary"
                  onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}>
                  <Snowflake className="h-3.5 w-3.5" /> Freeze
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[12px] gap-1.5 text-destructive px-3 rounded-lg hover:bg-destructive/5"
                  onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}>
                  <Square className="h-3.5 w-3.5" /> End
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MAIN 8/4 SPLIT ═══ */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">

          {/* ── LEFT 8 cols — Working Session ── */}
          <div className="col-span-8 border-r border-border/20 flex flex-col min-h-0 bg-background">

            {/* Specialist header — briefing identity */}
            <div className="px-6 py-5 border-b border-border/15 bg-card/30">
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <img src={persona.avatar} alt={emp.name}
                    className={cn("h-[72px] w-[72px] rounded-2xl object-cover ring-2 ring-offset-[3px] ring-offset-background", persona.ringClass)}
                    width={72} height={72} />
                  <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-lg bg-card border border-border/40 flex items-center justify-center shadow-sm">
                    <span className={cn("text-[11px] font-bold font-mono", perfColor)}>{perfScore}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[22px] font-bold text-foreground leading-tight">{emp.name}</h2>
                    <Badge variant="secondary" className="text-[11px] h-6 px-2.5 font-semibold rounded-lg">{roleName}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground/40 mt-0.5 italic">{persona.specialty}</p>

                  {/* Intro bubble — briefing feel */}
                  <div className="mt-2.5 rounded-xl bg-secondary/60 border border-border/30 px-4 py-2.5 max-w-[520px]">
                    <p className="text-[13px] text-foreground/70 leading-[160%]">
                      {(() => {
                        const intros: Record<string, string> = {
                          product_strategist: "Let's clarify the scope and make sure we're solving the right problem.",
                          solution_architect: "I'll map the architecture — let's define layers and boundaries.",
                          frontend_builder: "Ready to translate specs into clean, maintainable interfaces.",
                          reviewer: "I'll check for correctness, security gaps, and contract compliance.",
                          qa_agent: "Let's identify edge cases and make sure nothing slips through.",
                        };
                        return intros[emp.role_code] ?? "Session active. Let's work through this together.";
                      })()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", statusInfo.dot)} />
                      <span className={cn("text-[13px] font-semibold", statusInfo.text)}>{statusInfo.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/30">·</span>
                    <span className="text-[12px] text-muted-foreground/50 italic">{persona.nickname}</span>
                    {persona.chips.slice(0, 2).map((chip) => (
                      <span key={chip} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground/60">{chip}</span>
                    ))}
                  </div>
                </div>

                <Link to={`/employees/${emp.id}`}>
                  <Button size="sm" variant="outline" className="h-9 text-[12px] gap-1.5 rounded-xl border-border/50">
                    <User className="h-3.5 w-3.5" /> Full Profile
                  </Button>
                </Link>
              </div>
            </div>

            {/* ── Hero message ── */}
            {lastEntry && (
              <div className="px-6 py-6 border-b border-border/10">
                <div className="flex items-start gap-4">
                  <img src={getPersona(lastEntry.roleCode).avatar} alt=""
                    className={cn("h-10 w-10 rounded-xl object-cover ring-1 ring-offset-2 ring-offset-background shrink-0 mt-0.5", getPersona(lastEntry.roleCode).ringClass)}
                    width={40} height={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-[14px] font-bold text-foreground">{roles.find((r: any) => r.code === lastEntry.roleCode)?.name ?? lastEntry.roleCode}</span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", TYPE_COLOR[lastEntry.type])}>{TYPE_LABEL[lastEntry.type]}</span>
                      <span className="text-[11px] text-muted-foreground/30 ml-auto font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[16px] text-foreground leading-[1.8] max-w-[640px] font-medium">{lastEntry.content}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── History toggle ── */}
            <button onClick={() => setShowHistory(!showHistory)}
              className="px-6 py-2.5 border-b border-border/10 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors flex items-center gap-2 w-full text-left font-medium">
              {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showHistory ? "Hide" : "Show"} previous ({previousEntries.length} turns)
            </button>

            {showHistory && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-border/8">
                  {previousEntries.map((entry) => {
                    const ep = getPersona(entry.roleCode);
                    const isFounder = entry.content.startsWith("[Founder]");
                    return (
                      <div key={entry.id} className={cn("px-6 py-4 hover:bg-muted/10 transition-colors", isFounder && "bg-primary/[0.015]")}>
                        <div className="flex items-start gap-3">
                          <img src={ep.avatar} alt="" className="h-7 w-7 rounded-lg object-cover mt-0.5 shrink-0" width={28} height={28} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-foreground/70">{isFounder ? "You" : (roles.find((r: any) => r.code === entry.roleCode)?.name ?? entry.roleCode)}</span>
                              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", TYPE_COLOR[entry.type])}>{TYPE_LABEL[entry.type]}</span>
                              <span className="text-[10px] text-muted-foreground/30 ml-auto font-mono">
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                              {isFounder ? entry.content.replace("[Founder] ", "") : entry.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {!showHistory && <div className="flex-1" />}

            {/* ── Composer ── */}
            <div className="border-t border-border/20 px-6 py-4 bg-card/50 shrink-0">
              <div className="rounded-xl border border-border/40 bg-background overflow-hidden focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Input
                    value={founderInput}
                    onChange={(e) => setFounderInput(e.target.value)}
                    placeholder="Clarify, redirect, or ask a question…"
                    className="h-8 text-[14px] border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent flex-1"
                    disabled={meetingStatus !== "active"}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                  <Button className="h-9 px-5 gap-2 text-[13px] font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90 shrink-0" onClick={handleSend}
                    disabled={meetingStatus !== "active" || !founderInput.trim()}>
                    <Send className="h-3.5 w-3.5" /> Send
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT 4 cols — Structured Context ── */}
          <div className="col-span-4 flex flex-col min-h-0 bg-muted/10">

            {/* Rail header */}
            <div className="px-5 py-3.5 border-b border-border/20 shrink-0">
              <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2 uppercase tracking-wide">
                <Target className="h-4 w-4 text-muted-foreground/40" /> Structured Context
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-5 space-y-0 divide-y divide-border/15">
                <ExtractionSection title="Scope" icon={<Target className="h-3.5 w-3.5 text-primary/50" />} items={extraction.scope} />
                <ExtractionSection title="Architecture" icon={<Layers className="h-3.5 w-3.5 text-status-blue/50" />} items={extraction.architectureNotes} />
                <ExtractionSection title="Task Breakdown" icon={<ListChecks className="h-3.5 w-3.5 text-status-green/50" />} items={extraction.taskBreakdown} emptyText="No tasks extracted yet" />
                <ExtractionSection title="Risks" icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive/50" />} items={extraction.risks} critical />
                <ExtractionSection title="Open Questions" icon={<HelpCircle className="h-3.5 w-3.5 text-status-amber/50" />} items={extraction.openQuestions} />

                {/* Complexity */}
                <div className="py-4">
                  <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2 mb-2">
                    <BarChart3 className="h-3.5 w-3.5 text-muted-foreground/40" /> Complexity
                  </h4>
                  <div className="rounded-lg bg-status-amber/5 border border-status-amber/15 px-3 py-2">
                    <p className="text-[12px] text-status-amber font-medium leading-relaxed">{extraction.estimatedComplexity}</p>
                  </div>
                </div>
              </div>

              {/* ── Active Guidance (Training Prompt) ── */}
              <div className="mx-5 mb-4 rounded-xl border border-border/30 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/15 bg-muted/10">
                  <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground/40" /> Active Guidance
                  </h4>
                </div>
                {activeGuidance ? (
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-3.5 w-3.5 text-status-green shrink-0" />
                      <span className="text-[11px] font-bold text-status-green">Published training prompt</span>
                      <span className="text-[10px] text-muted-foreground/40 ml-auto font-mono">v{activeGuidance.version_number}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">
                      Last updated {new Date(activeGuidance.created_at).toLocaleDateString()}
                    </p>
                    {guidanceSections.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {guidanceSections.map((s, i) => (
                          <div key={i} className="rounded-lg bg-secondary/40 px-3 py-2">
                            <p className="text-[10px] font-bold text-foreground/70 mb-0.5">{s.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed truncate">{s.preview}{s.preview.length >= 80 ? "…" : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <Link to={`/employees/${emp.id}`}>
                      <Button variant="outline" size="sm" className="w-full h-8 text-[12px] gap-1.5 rounded-lg border-border/40 mt-1">
                        <BookOpen className="h-3.5 w-3.5" /> Open Training Lab
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-[11px] text-muted-foreground/50 mb-2">No active training guidance published</p>
                    <Link to={`/employees/${emp.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 rounded-lg border-border/40">
                        <BookOpen className="h-3 w-3" /> Open Training Lab
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* ── Memory Snapshot ── */}
              <div className="mx-5 mb-5 rounded-xl border border-border/30 bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border/15 bg-muted/10">
                  <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary/40" /> Memory Snapshot
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-0 divide-x divide-border/15 py-3">
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.coreRules}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium">Core Rules</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.learnedPatterns}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium">Patterns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold font-mono text-foreground">{memoryCounts.failures}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-medium">Failures</p>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <Link to={`/employees/${emp.id}`}>
                    <Button variant="outline" size="sm" className="w-full h-8 text-[12px] gap-1.5 rounded-lg border-border/40">
                      <Brain className="h-3.5 w-3.5" /> Open Full Memory
                    </Button>
                  </Link>
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
   EXTRACTION SECTION — collapsible
   ================================================================ */
function ExtractionSection({ title, icon, items, emptyText, critical }: {
  title: string; icon: React.ReactNode; items: ExtractionItem[]; emptyText?: string; critical?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn("py-4 first:pt-0", critical && items.length > 0 && "border-l-2 border-destructive/20 pl-3 -ml-3")}>
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-between w-full mb-2 group">
        <h4 className="text-[13px] font-bold text-foreground flex items-center gap-2">
          {icon} {title}
          {items.length > 0 && <span className="text-[11px] text-muted-foreground/40 font-mono font-normal">{items.length}</span>}
        </h4>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-all", collapsed && "-rotate-90")} />
      </button>
      {!collapsed && (
        items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/70 leading-relaxed">
                <span className={cn("w-2 h-2 rounded-full mt-[6px] shrink-0", CONFIDENCE_DOT[item.confidence])} title={`${item.confidence} confidence`} />
                {item.text}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground/30 italic">{emptyText ?? "—"}</p>
        )
      )}
    </div>
  );
}
