import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Send, Bot, User, Target, ShieldAlert, Layers, Clock,
  Coins, Cpu, CheckCircle2, XCircle, RotateCcw,
  MessageSquare, Users, AlertTriangle, ArrowRight,
  Briefcase, FileText, Zap, Sparkles, CircleDot,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface ChatMessage {
  id: string;
  role: "lead" | "user" | "system";
  content: string;
  timestamp: Date;
}

interface ConsultationEntry {
  id: string;
  agent: string;
  agentRole: string;
  concern: string;
  recommendation: string;
  severity: "info" | "warning" | "critical";
}

interface ModuleEstimate {
  name: string;
  tokens: number;
  cost: number;
  days: number;
}

interface ExtractedScope {
  goal: string;
  constraints: string[];
  modules: string[];
  risks: string[];
  suggestedCapability: string;
  complexity: "low" | "medium" | "high" | "critical";
  tokenBudget: number;
  estimatedCost: number;
  estimatedDays: number;
  requiredRoles: string[];
  founderRequirements: string[];
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const LEAD_QUESTIONS: string[] = [
  "What is the primary business objective for this project? Please describe the core problem you want to solve.",
  "Who are the target users? Describe the main user personas and their needs.",
  "What are the hard constraints? Consider timeline, budget ceiling, technology requirements, or compliance needs.",
  "What modules or features do you envision? List the major functional blocks.",
  "What are the known risks or uncertainties? Any dependencies on third parties or unclear requirements?",
  "What does success look like? Define measurable outcomes you expect at launch.",
];

const PHASE_LABELS = {
  discovery: "Discovery",
  consultation: "Team Review",
  estimate: "Estimate",
  decision: "Decision",
};

const PHASE_ORDER = ["discovery", "consultation", "estimate", "decision"] as const;

const COMPLEXITY_CONFIG = {
  low: { label: "Low", color: "text-status-green", bg: "bg-status-green/10" },
  medium: { label: "Medium", color: "text-status-amber", bg: "bg-status-amber/10" },
  high: { label: "High", color: "text-status-red", bg: "bg-status-red/10" },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10" },
};

const SEVERITY_CONFIG = {
  info: { label: "Info", color: "text-status-blue", bg: "bg-status-blue/10", border: "border-status-blue/20" },
  warning: { label: "Warning", color: "text-status-amber", bg: "bg-status-amber/10", border: "border-status-amber/20" },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

/* ═══════════════════════════════════════════════════════════
   SCOPE EXTRACTION HELPERS
   ═══════════════════════════════════════════════════════════ */

function extractScopeFromConversation(messages: ChatMessage[]): ExtractedScope {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.toLowerCase());
  const allUserText = userMessages.join(" ");

  const modules: string[] = [];
  const moduleKeywords: Record<string, string> = {
    auth: "Authentication", login: "Authentication", dashboard: "Dashboard",
    payment: "Payments", api: "API Layer", chat: "Real-time Chat",
    notification: "Notifications", report: "Reporting", admin: "Admin Panel",
    search: "Search Engine", upload: "File Management", email: "Email System",
    analytics: "Analytics", integration: "Third-party Integration",
  };
  for (const [kw, mod] of Object.entries(moduleKeywords)) {
    if (allUserText.includes(kw) && !modules.includes(mod)) modules.push(mod);
  }
  if (modules.length === 0 && userMessages.length > 0) modules.push("Core Application");

  const risks: string[] = [];
  if (allUserText.includes("deadline") || allUserText.includes("urgent")) risks.push("Tight timeline pressure");
  if (allUserText.includes("third") || allUserText.includes("external")) risks.push("Third-party dependency risk");
  if (allUserText.includes("compliance") || allUserText.includes("gdpr")) risks.push("Regulatory compliance required");
  if (allUserText.includes("scale") || allUserText.includes("performance")) risks.push("Scalability requirements");
  if (risks.length === 0 && userMessages.length > 1) risks.push("Requirements may evolve during delivery");

  const constraints: string[] = [];
  if (allUserText.includes("budget")) constraints.push("Budget-constrained");
  if (allUserText.includes("timeline") || allUserText.includes("week")) constraints.push("Timeline-driven");
  if (allUserText.includes("mobile")) constraints.push("Mobile-first requirement");
  if (allUserText.includes("security")) constraints.push("Security-critical");

  const complexity: ExtractedScope["complexity"] =
    modules.length > 5 ? "critical" : modules.length > 3 ? "high" : modules.length > 1 ? "medium" : "low";

  const baseTokens = modules.length * 45_000;
  const baseCost = modules.length * 12;
  const baseDays = Math.max(3, modules.length * 2);

  const requiredRoles: string[] = ["Product Strategist", "Solution Architect"];
  if (allUserText.includes("frontend") || allUserText.includes("ui") || allUserText.includes("dashboard")) requiredRoles.push("Frontend Builder");
  if (allUserText.includes("api") || allUserText.includes("backend") || allUserText.includes("database")) requiredRoles.push("Backend Architect");
  requiredRoles.push("QA Agent", "Reviewer");

  const goal = userMessages[0]
    ? userMessages[0].charAt(0).toUpperCase() + userMessages[0].slice(1, 120)
    : "";

  return {
    goal,
    constraints,
    modules,
    risks,
    suggestedCapability: allUserText.includes("telegram") ? "Telegram Lab" : allUserText.includes("saas") ? "SaaS Studio" : "Web Studio",
    complexity,
    tokenBudget: baseTokens,
    estimatedCost: baseCost,
    estimatedDays: baseDays,
    requiredRoles,
    founderRequirements: ["Approve Blueprint", "Confirm budget allocation", "Define acceptance criteria"],
  };
}

function generateConsultation(scope: ExtractedScope): ConsultationEntry[] {
  const entries: ConsultationEntry[] = [];

  entries.push({
    id: "arch-1",
    agent: "Solution Architect",
    agentRole: "solution_architect",
    concern: scope.modules.length > 3
      ? `${scope.modules.length} modules identified. Recommend phased delivery to reduce integration risk.`
      : `Module scope is manageable. Standard architecture patterns apply.`,
    recommendation: scope.modules.length > 3
      ? "Split into 2 delivery phases. Ship core modules first."
      : "Proceed with single-phase delivery.",
    severity: scope.modules.length > 4 ? "warning" : "info",
  });

  entries.push({
    id: "qa-1",
    agent: "QA Agent",
    agentRole: "qa_agent",
    concern: scope.risks.length > 2
      ? `${scope.risks.length} risk factors flagged. Testing coverage must be expanded.`
      : "Standard test coverage plan sufficient.",
    recommendation: scope.risks.length > 2
      ? "Add regression suite and integration tests before each phase completion."
      : "Unit tests plus smoke tests at milestone boundaries.",
    severity: scope.risks.length > 2 ? "warning" : "info",
  });

  entries.push({
    id: "rev-1",
    agent: "Reviewer",
    agentRole: "reviewer",
    concern: scope.complexity === "high" || scope.complexity === "critical"
      ? "High complexity warrants mandatory architectural review before implementation starts."
      : "Standard review checkpoints at task completion are sufficient.",
    recommendation: scope.complexity === "high" || scope.complexity === "critical"
      ? "Require architecture decision record (ADR) before first implementation task."
      : "Proceed with normal review cadence.",
    severity: scope.complexity === "critical" ? "critical" : scope.complexity === "high" ? "warning" : "info",
  });

  if (scope.constraints.some((c) => c.includes("Timeline"))) {
    entries.push({
      id: "ps-1",
      agent: "Product Strategist",
      agentRole: "product_strategist",
      concern: "Timeline constraint detected. Scope may need reduction to meet deadline.",
      recommendation: "Identify MVP scope. Defer non-critical features to post-launch iteration.",
      severity: "warning",
    });
  }

  return entries;
}

function generateModuleEstimates(scope: ExtractedScope): ModuleEstimate[] {
  return scope.modules.map((mod) => {
    const isComplex = ["Payments", "Real-time Chat", "Search Engine", "Analytics"].includes(mod);
    const tokens = isComplex ? 65_000 : 40_000;
    const cost = isComplex ? 18 : 10;
    const days = isComplex ? 4 : 2;
    return { name: mod, tokens, cost, days };
  });
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function CompanyLeadSession() {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "lead",
      content: "Welcome. I am your Company Lead — I coordinate all capabilities and team members to deliver your project.\n\nBefore we proceed to Blueprint creation, I need to understand your objectives, constraints, and expected outcomes.\n\nLet us begin: What is the primary business objective for this project?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<"discovery" | "consultation" | "estimate" | "decision">("discovery");
  const [isThinking, setIsThinking] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, slug").order("name");
      return data ?? [];
    },
  });

  const scope = useMemo(() => extractScopeFromConversation(messages), [messages]);
  const consultation = useMemo(() => generateConsultation(scope), [scope]);
  const moduleEstimates = useMemo(() => generateModuleEstimates(scope), [scope]);
  const totalTokens = moduleEstimates.reduce((s, m) => s + m.tokens, 0);
  const totalCost = moduleEstimates.reduce((s, m) => s + m.cost, 0);
  const totalDays = Math.max(...moduleEstimates.map((m) => m.days), 0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addLeadMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `lead-${Date.now()}`, role: "lead", content, timestamp: new Date() },
    ]);
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isThinking) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text, timestamp: new Date() },
    ]);
    setInputValue("");
    setIsThinking(true);

    setTimeout(() => {
      const nextIdx = questionIndex + 1;
      if (nextIdx < LEAD_QUESTIONS.length) {
        addLeadMessage(`Understood. Noted.\n\n${LEAD_QUESTIONS[nextIdx]}`);
        setQuestionIndex(nextIdx);
      } else if (phase === "discovery") {
        addLeadMessage(
          "Thank you. I have sufficient context to proceed.\n\nI am now consulting with the internal team — Architect, QA, and Reviewer — to assess feasibility, risks, and resource requirements.\n\nPlease review the Internal Consultation panel on the right."
        );
        setPhase("consultation");
        setTimeout(() => {
          addLeadMessage(
            "Internal consultation is complete. The team has provided their assessment.\n\nI have prepared the Estimate Panel with module-level breakdown, token budget, cost projection, and timeline.\n\nReview the estimate, then make your decision: Approve, Revise, or Cancel."
          );
          setPhase("estimate");
        }, 1500);
      } else {
        addLeadMessage("The estimate is ready for your review. Use the decision buttons below the estimate panel to proceed.");
      }
      setIsThinking(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApprove = async () => {
    toast.success("Blueprint approved. Proceeding to team session.");
    navigate("/presale/new");
  };

  const handleRevise = () => {
    setPhase("discovery");
    setQuestionIndex(0);
    addLeadMessage("Understood. Let us revisit the scope. What would you like to change about the current direction?");
  };

  const handleCancel = () => {
    navigate("/");
  };

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const showExtraction = userMessageCount >= 1;
  const showConsultation = phase === "consultation" || phase === "estimate" || phase === "decision";
  const showEstimate = phase === "estimate" || phase === "decision";
  const currentPhaseIdx = PHASE_ORDER.indexOf(phase);

  return (
    <AppLayout title="Company Lead" fullHeight>
      <div className="flex flex-col h-full">

        {/* ── Sticky top header ─────────────────────────────── */}
        <div className="shrink-0 px-8 py-4 border-b border-border/40 bg-surface-raised">
          <div className="flex items-center justify-between max-w-[1440px]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-foreground/90 flex items-center justify-center shadow-card">
                <Briefcase className="h-5 w-5 text-background" strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-foreground tracking-tight leading-tight">Company Lead</h1>
                <p className="text-[12px] text-muted-foreground/60">Step 1 — Consultation &amp; scope definition</p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {/* Phase stepper */}
              <div className="flex items-center gap-1">
                {PHASE_ORDER.map((p, i) => (
                  <div key={p} className="flex items-center gap-1">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors",
                      i === currentPhaseIdx
                        ? "bg-foreground/10 text-foreground"
                        : i < currentPhaseIdx
                          ? "text-muted-foreground/60"
                          : "text-muted-foreground/25",
                    )}>
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i === currentPhaseIdx
                          ? "bg-foreground"
                          : i < currentPhaseIdx
                            ? "bg-muted-foreground/40"
                            : "bg-muted-foreground/15",
                      )} />
                      {PHASE_LABELS[p]}
                    </div>
                    {i < PHASE_ORDER.length - 1 && (
                      <div className={cn(
                        "w-4 h-px",
                        i < currentPhaseIdx ? "bg-muted-foreground/30" : "bg-border/40",
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-glass border border-border/30">
                <span className="text-[11px] font-mono text-muted-foreground/50">
                  {userMessageCount}/{LEAD_QUESTIONS.length} inputs
                </span>
                <div className="w-16 h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/40 transition-all duration-500"
                    style={{ width: `${Math.min(100, (userMessageCount / LEAD_QUESTIONS.length) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Cost awareness */}
              {showEstimate && (
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-surface-glass border border-border/30">
                  <span className="text-[11px] font-mono text-muted-foreground/50 flex items-center gap-1">
                    <Coins className="h-3 w-3" /> ${totalCost}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/50 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {totalDays}d
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Main 8/4 grid ────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">

            {/* ── LEFT 8 — CONVERSATION ────────────────────── */}
            <div className="lg:col-span-8 flex flex-col h-full border-r border-border/30">

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-8 py-6 space-y-5 max-w-3xl mx-auto">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isThinking && <ThinkingIndicator />}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="shrink-0 border-t border-border/30 bg-surface-raised px-8 py-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-end gap-3 rounded-2xl bg-surface-sunken border border-border/40 p-2 focus-within:border-ring/30 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your requirements..."
                      rows={2}
                      className="flex-1 resize-none bg-transparent px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground/40 outline-none leading-relaxed"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isThinking}
                      size="sm"
                      className="h-9 px-4 gap-2 text-[12px] font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0 mb-0.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/30 mt-2 text-center">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT 4 — STRUCTURED RAIL ────────────────── */}
            <div className="lg:col-span-4 h-full bg-surface-raised/50 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-5 space-y-4">

                  {/* Rail header */}
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.8} />
                    <span className="text-[11px] font-semibold text-muted-foreground/50 tracking-[0.02em]">
                      Live Extraction
                    </span>
                  </div>

                  {/* Scope extraction */}
                  {showExtraction ? (
                    <div className="rounded-xl bg-card border border-border/40 p-4 space-y-3 animate-fade-in">
                      <h3 className="text-[12px] font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-muted-foreground/40" />
                        Scope
                      </h3>
                      <div className="space-y-2.5">
                        <ExtractionRow label="Goal" value={scope.goal || "Awaiting input..."} />
                        <ExtractionRow label="Capability" value={scope.suggestedCapability} />
                        <ExtractionRow label="Complexity">
                          <Badge className={cn("text-[10px] font-bold px-2 py-0 border-0", COMPLEXITY_CONFIG[scope.complexity].bg, COMPLEXITY_CONFIG[scope.complexity].color)}>
                            {COMPLEXITY_CONFIG[scope.complexity].label}
                          </Badge>
                        </ExtractionRow>
                        {scope.modules.length > 0 && (
                          <ExtractionRow label="Modules">
                            <div className="flex flex-wrap gap-1">
                              {scope.modules.map((m) => (
                                <span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-glass border border-border/30 text-foreground/80">{m}</span>
                              ))}
                            </div>
                          </ExtractionRow>
                        )}
                        {scope.constraints.length > 0 && (
                          <ExtractionRow label="Constraints">
                            <div className="flex flex-wrap gap-1">
                              {scope.constraints.map((c) => (
                                <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-status-amber/10 border border-status-amber/20 text-status-amber">{c}</span>
                              ))}
                            </div>
                          </ExtractionRow>
                        )}
                        {scope.risks.length > 0 && (
                          <ExtractionRow label="Risks">
                            <ul className="space-y-1">
                              {scope.risks.map((r) => (
                                <li key={r} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                                  <AlertTriangle className="h-3 w-3 text-status-amber/60 shrink-0 mt-0.5" />
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </ExtractionRow>
                        )}
                        {scope.requiredRoles.length > 0 && (
                          <ExtractionRow label="Team">
                            <div className="flex flex-wrap gap-1">
                              {scope.requiredRoles.map((r) => (
                                <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary border border-border/30 text-muted-foreground">{r}</span>
                              ))}
                            </div>
                          </ExtractionRow>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-card border border-border/30 border-dashed p-6 text-center">
                      <Target className="h-5 w-5 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-[12px] text-muted-foreground/40 font-medium">
                        Scope will appear here as you describe your project
                      </p>
                    </div>
                  )}

                  {/* Consultation */}
                  {showConsultation && (
                    <div className="rounded-xl bg-card border border-border/40 p-4 space-y-3 animate-fade-in">
                      <h3 className="text-[12px] font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground/40" />
                        Team Consultation
                      </h3>
                      <div className="space-y-2">
                        {consultation.map((entry) => (
                          <ConsultationCard key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estimate */}
                  {showEstimate && (
                    <div className="rounded-xl bg-card border border-border/40 p-4 space-y-4 animate-fade-in">
                      <h3 className="text-[12px] font-bold text-foreground tracking-tight flex items-center gap-2">
                        <Coins className="h-3.5 w-3.5 text-muted-foreground/40" />
                        Resource Estimate
                      </h3>

                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-surface-sunken p-3 text-center">
                          <span className="text-[18px] font-bold text-foreground font-mono">{(totalTokens / 1000).toFixed(0)}k</span>
                          <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Tokens</p>
                        </div>
                        <div className="rounded-lg bg-surface-sunken p-3 text-center">
                          <span className="text-[18px] font-bold text-foreground font-mono">${totalCost}</span>
                          <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Cost</p>
                        </div>
                        <div className="rounded-lg bg-surface-sunken p-3 text-center">
                          <span className="text-[18px] font-bold text-foreground font-mono">{totalDays}d</span>
                          <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">Timeline</p>
                        </div>
                      </div>

                      {/* Module breakdown */}
                      <div className="rounded-lg border border-border/30 overflow-hidden">
                        <div className="grid grid-cols-4 gap-0 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-surface-sunken px-3 py-2">
                          <span>Module</span>
                          <span className="text-right">Tokens</span>
                          <span className="text-right">Cost</span>
                          <span className="text-right">Days</span>
                        </div>
                        {moduleEstimates.map((mod) => (
                          <div key={mod.name} className="grid grid-cols-4 gap-0 px-3 py-2 border-t border-border/20 text-[11px]">
                            <span className="font-semibold text-foreground/80 truncate">{mod.name}</span>
                            <span className="text-right font-mono text-muted-foreground/60">{(mod.tokens / 1000).toFixed(0)}k</span>
                            <span className="text-right font-mono text-muted-foreground/60">${mod.cost}</span>
                            <span className="text-right font-mono text-muted-foreground/60">{mod.days}d</span>
                          </div>
                        ))}
                      </div>

                      {/* Founder requirements */}
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">You must provide</p>
                        <ul className="space-y-1">
                          {scope.founderRequirements.map((req) => (
                            <li key={req} className="text-[11px] text-foreground/70 flex items-center gap-2">
                              <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Decision */}
                      <div className="pt-2 space-y-2">
                        <Button
                          onClick={handleApprove}
                          className="h-11 gap-2 text-[13px] font-semibold rounded-xl bg-foreground text-background hover:bg-foreground/90 w-full shadow-card"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve & Create Blueprint
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleRevise}
                            className="flex-1 h-9 gap-1.5 text-[11px] font-semibold rounded-xl border-border/40"
                          >
                            <RotateCcw className="h-3 w-3" /> Revise
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1 h-9 gap-1.5 text-[11px] font-semibold rounded-xl border-border/40 text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isLead = message.role === "lead";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center animate-fade-in">
        <div className="px-4 py-2 rounded-full bg-surface-glass border border-border/30 text-[11px] text-muted-foreground/60 font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 animate-fade-in", !isLead && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-card",
        isLead ? "bg-foreground/90" : "bg-surface-glass border border-border/40",
      )}>
        {isLead
          ? <Bot className="h-4 w-4 text-background" strokeWidth={1.8} />
          : <User className="h-4 w-4 text-foreground/70" strokeWidth={1.8} />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        "rounded-2xl px-5 py-3.5 max-w-[80%]",
        isLead
          ? "bg-card border border-border/30 shadow-card"
          : "bg-foreground/90 text-background shadow-card",
      )}>
        {isLead && (
          <span className="text-[10px] font-semibold text-muted-foreground/50 block mb-1.5">Company Lead</span>
        )}
        <p className={cn("text-[14px] leading-[1.65] whitespace-pre-wrap", isLead ? "text-foreground/90" : "text-background")}>
          {message.content}
        </p>
        <span className={cn("text-[10px] mt-2 block", isLead ? "text-muted-foreground/35" : "text-background/40")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="h-8 w-8 rounded-xl bg-foreground/90 flex items-center justify-center shrink-0 shadow-card">
        <Bot className="h-4 w-4 text-background" strokeWidth={1.8} />
      </div>
      <div className="rounded-2xl bg-card border border-border/30 px-5 py-4 shadow-card">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.15s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.3s" }} />
          </div>
          <span className="text-[11px] text-muted-foreground/40 font-medium ml-1">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

function ExtractionRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold text-muted-foreground/45 uppercase tracking-wider block mb-0.5">{label}</span>
      {children ?? <span className="text-[12px] font-medium text-foreground/80">{value}</span>}
    </div>
  );
}

function ConsultationCard({ entry }: { entry: ConsultationEntry }) {
  const cfg = SEVERITY_CONFIG[entry.severity];
  return (
    <div className={cn("rounded-lg border px-3.5 py-3 space-y-1.5", cfg.border, "bg-card")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-foreground/80">{entry.agent}</span>
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", cfg.bg, cfg.color)}>{cfg.label}</span>
      </div>
      <p className="text-[11px] text-foreground/65 leading-snug">{entry.concern}</p>
      <p className="text-[10px] text-muted-foreground/50 italic leading-snug">{entry.recommendation}</p>
    </div>
  );
}
