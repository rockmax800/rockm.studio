import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Send, Bot, User, Target, ShieldAlert, Layers, Clock,
  Coins, Cpu, CheckCircle2, XCircle, RotateCcw,
  MessageSquare, Users, AlertTriangle, ArrowRight,
  Briefcase, FileText, Zap,
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

  return (
    <AppLayout title="Company Lead Session">
      <div className="grid-content pb-8">
        {/* ── Header strip ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-background" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">Company Lead</h1>
              <p className="text-[12px] text-muted-foreground">AI Delivery Director — Project Initiation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
              {phase}
            </Badge>
            {userMessageCount > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {userMessageCount} / {LEAD_QUESTIONS.length} inputs
              </span>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            MAIN GRID — 8 / 4
            ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>

          {/* ── LEFT 8 — CONVERSATION ── */}
          <div className="lg:col-span-8 flex flex-col rounded-2xl bg-card border border-border shadow-sm overflow-hidden">

            {/* Chat messages */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-6 py-5 space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isThinking && (
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-background" />
                    </div>
                    <div className="rounded-xl bg-secondary/40 border border-border/30 px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.2s" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t border-border px-5 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your requirements..."
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-border bg-secondary/20 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking}
                  className="h-11 px-5 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </div>
          </div>

          {/* ── RIGHT 4 — EXTRACTION + CONSULTATION + ESTIMATE ── */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">

            {/* Live extraction */}
            {showExtraction && (
              <div className="rounded-2xl bg-card border border-border shadow-sm px-5 py-4">
                <h3 className="text-[13px] font-bold text-foreground tracking-tight flex items-center gap-2 mb-3">
                  <Target className="h-3.5 w-3.5 text-muted-foreground/50" />
                  Scope Extraction
                </h3>
                <div className="space-y-3">
                  <ExtractionRow label="Goal" value={scope.goal || "Awaiting input..."} />
                  <ExtractionRow label="Suggested Capability" value={scope.suggestedCapability} />
                  <ExtractionRow label="Complexity">
                    <Badge className={cn("text-[10px] font-bold px-2 py-0", COMPLEXITY_CONFIG[scope.complexity].bg, COMPLEXITY_CONFIG[scope.complexity].color)}>
                      {COMPLEXITY_CONFIG[scope.complexity].label}
                    </Badge>
                  </ExtractionRow>
                  {scope.modules.length > 0 && (
                    <ExtractionRow label="Modules">
                      <div className="flex flex-wrap gap-1">
                        {scope.modules.map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px] font-bold px-1.5 py-0">{m}</Badge>
                        ))}
                      </div>
                    </ExtractionRow>
                  )}
                  {scope.constraints.length > 0 && (
                    <ExtractionRow label="Constraints">
                      <div className="flex flex-wrap gap-1">
                        {scope.constraints.map((c) => (
                          <Badge key={c} variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-status-amber/30 text-status-amber">{c}</Badge>
                        ))}
                      </div>
                    </ExtractionRow>
                  )}
                  {scope.risks.length > 0 && (
                    <ExtractionRow label="Risks">
                      <ul className="space-y-0.5">
                        {scope.risks.map((r) => (
                          <li key={r} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-status-amber shrink-0 mt-0.5" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </ExtractionRow>
                  )}
                  {scope.requiredRoles.length > 0 && (
                    <ExtractionRow label="Required Roles">
                      <div className="flex flex-wrap gap-1">
                        {scope.requiredRoles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px] font-bold px-1.5 py-0">{r}</Badge>
                        ))}
                      </div>
                    </ExtractionRow>
                  )}
                </div>
              </div>
            )}

            {/* Internal consultation */}
            {showConsultation && (
              <div className="rounded-2xl bg-card border border-border shadow-sm px-5 py-4">
                <h3 className="text-[13px] font-bold text-foreground tracking-tight flex items-center gap-2 mb-3">
                  <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
                  Internal Team Consultation
                </h3>
                <div className="space-y-3">
                  {consultation.map((entry) => (
                    <ConsultationCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            )}

            {/* Estimate panel */}
            {showEstimate && (
              <div className="rounded-2xl bg-card border border-border shadow-sm px-5 py-4">
                <h3 className="text-[13px] font-bold text-foreground tracking-tight flex items-center gap-2 mb-3">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground/50" />
                  Resource Estimate
                </h3>

                {/* Module breakdown */}
                <div className="rounded-xl border border-border overflow-hidden mb-3">
                  <div className="grid grid-cols-4 gap-0 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/40 px-3 py-2">
                    <span>Module</span>
                    <span className="text-right">Tokens</span>
                    <span className="text-right">Cost</span>
                    <span className="text-right">Days</span>
                  </div>
                  {moduleEstimates.map((mod) => (
                    <div key={mod.name} className="grid grid-cols-4 gap-0 px-3 py-2 border-t border-border/30 text-[12px]">
                      <span className="font-bold text-foreground truncate">{mod.name}</span>
                      <span className="text-right font-mono text-muted-foreground">{(mod.tokens / 1000).toFixed(0)}k</span>
                      <span className="text-right font-mono text-muted-foreground">${mod.cost}</span>
                      <span className="text-right font-mono text-muted-foreground">{mod.days}d</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-0 px-3 py-2 border-t border-border bg-secondary/20 text-[12px] font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-right font-mono text-foreground">{(totalTokens / 1000).toFixed(0)}k</span>
                    <span className="text-right font-mono text-foreground">${totalCost}</span>
                    <span className="text-right font-mono text-foreground">{totalDays}d</span>
                  </div>
                </div>

                {/* Founder requirements */}
                <div className="mb-4">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Founder Must Provide</p>
                  <ul className="space-y-1">
                    {scope.founderRequirements.map((req) => (
                      <li key={req} className="text-[12px] text-foreground flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator className="my-3" />

                {/* Decision buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleApprove}
                    className="h-11 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve and Create Blueprint
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRevise}
                      className="flex-1 h-10 gap-2 text-[12px] font-bold rounded-xl"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Revise Scope
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 h-10 gap-2 text-[12px] font-bold rounded-xl text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
  return (
    <div className={cn("flex items-start gap-3", !isLead && "flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
        isLead ? "bg-foreground" : "bg-secondary border border-border",
      )}>
        {isLead
          ? <Bot className="h-4 w-4 text-background" />
          : <User className="h-4 w-4 text-foreground" />
        }
      </div>
      <div className={cn(
        "rounded-xl px-4 py-3 max-w-[85%]",
        isLead
          ? "bg-secondary/40 border border-border/30"
          : "bg-foreground text-background",
      )}>
        <p className={cn("text-[14px] leading-relaxed whitespace-pre-wrap", isLead ? "text-foreground" : "text-background")}>
          {message.content}
        </p>
        <span className={cn("text-[10px] mt-1.5 block", isLead ? "text-muted-foreground/50" : "text-background/50")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function ExtractionRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">{label}</span>
      {children ?? <span className="text-[13px] font-medium text-foreground">{value}</span>}
    </div>
  );
}

function ConsultationCard({ entry }: { entry: ConsultationEntry }) {
  const cfg = SEVERITY_CONFIG[entry.severity];
  return (
    <div className={cn("rounded-xl border px-3.5 py-3 space-y-1.5", cfg.border, cfg.bg)}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-foreground">{entry.agent}</span>
        <Badge className={cn("text-[9px] font-bold px-1.5 py-0", cfg.bg, cfg.color)}>{cfg.label}</Badge>
      </div>
      <p className="text-[12px] text-foreground/80 leading-snug">{entry.concern}</p>
      <p className="text-[11px] text-muted-foreground italic">{entry.recommendation}</p>
    </div>
  );
}