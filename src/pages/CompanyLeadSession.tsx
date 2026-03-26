import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Send, Target, Layers, Clock, Coins, CheckCircle2, XCircle,
  RotateCcw, Users, AlertTriangle, ArrowRight, ArrowLeft,
  Briefcase, Zap, Sparkles, MessageSquare, ChevronRight,
  X, Maximize2, GraduationCap, User, ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { HumanTeamSuggestionPanel } from "@/components/intake/HumanTeamSuggestionPanel";
import { MarketBenchmarkPanel } from "@/components/intake/MarketBenchmarkPanel";
import { ClarificationChecklist } from "@/components/intake/ClarificationChecklist";
import { SystemDecompositionPanel } from "@/components/intake/SystemDecompositionPanel";
import { MvpReductionPanel } from "@/components/intake/MvpReductionPanel";
import { CtoBacklogDraftPanel } from "@/components/intake/CtoBacklogDraftPanel";
import { AiTaskDraftPanel } from "@/components/intake/AiTaskDraftPanel";
import { generateBacklogCards } from "@/lib/cto-backlog";
import { decomposeBacklogToTasks } from "@/lib/ai-task-decomposition";
import type { CTOBacklogCardDraft, AITaskDraft } from "@/types/front-office-planning";
import leadAvatar from "@/assets/pixel/lead-avatar.png";
import { LEAD_PROFILE_ROUTE } from "@/lib/company-lead-identity";
import { ExecutionPolicyBadge } from "@/components/ui/execution-policy-badge";
import { ExecutionOverrideSheet, type SessionOverride } from "@/components/ui/execution-override-sheet";
import { useExecutionPolicy } from "@/hooks/use-execution-policy";
import { ResearchModeBadge, type ResearchPhase } from "@/components/ui/research-mode-badge";
import {
  type ClarificationFields,
  EMPTY_CLARIFICATION,
  getClarificationStatus,
  inferClarificationFromText,
} from "@/lib/company-lead-clarification";
import type { SystemModule, DependencyEdge } from "@/types/front-office-planning";
import { decomposeSystem } from "@/lib/system-decomposition";
import type { MvpReductionEntry, MvpReductionResult } from "@/lib/mvp-reduction";
import { generateInitialReduction, computeReductionResult, getMvpScopeModules } from "@/lib/mvp-reduction";
import { validatePlanningGate, type PlanningGateResult } from "@/lib/planning-gates";

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

const PHASE_LABELS: Record<string, string> = {
  discovery: "Discovery",
  decomposition: "Decomposition",
  mvp_reduction: "MVP Reduction",
  consultation: "Team Review",
  estimate: "Estimate",
  decision: "Decision",
};

const PHASE_ORDER = ["discovery", "decomposition", "mvp_reduction", "consultation", "estimate", "decision"] as const;

const COMPLEXITY_CONFIG = {
  low: { label: "Low", color: "hsl(152 60% 42%)", bg: "hsl(152 60% 42% / 0.08)" },
  medium: { label: "Medium", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.08)" },
  high: { label: "High", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.08)" },
  critical: { label: "Critical", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.12)" },
};

const SEVERITY_CONFIG = {
  info: { label: "Info", color: "hsl(210 40% 52%)", bg: "hsl(210 40% 52% / 0.06)", border: "hsl(210 40% 52% / 0.15)" },
  warning: { label: "Warning", color: "hsl(38 92% 50%)", bg: "hsl(38 92% 50% / 0.06)", border: "hsl(38 92% 50% / 0.15)" },
  critical: { label: "Critical", color: "hsl(0 72% 51%)", bg: "hsl(0 72% 51% / 0.06)", border: "hsl(0 72% 51% / 0.15)" },
};

/* ═══════════════════════════════════════════════════════════
   SCOPE EXTRACTION HELPERS (unchanged business logic)
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
    goal, constraints, modules, risks,
    suggestedCapability: allUserText.includes("telegram") ? "Telegram Lab" : allUserText.includes("saas") ? "SaaS Studio" : "Web Studio",
    complexity, tokenBudget: baseTokens, estimatedCost: baseCost, estimatedDays: baseDays,
    requiredRoles,
    founderRequirements: ["Approve Blueprint", "Confirm budget allocation", "Define acceptance criteria"],
  };
}

function generateConsultation(scope: ExtractedScope): ConsultationEntry[] {
  const entries: ConsultationEntry[] = [];
  entries.push({
    id: "arch-1", agent: "Solution Architect", agentRole: "solution_architect",
    concern: scope.modules.length > 3
      ? `${scope.modules.length} modules identified. Recommend phased delivery to reduce integration risk.`
      : `Module scope is manageable. Standard architecture patterns apply.`,
    recommendation: scope.modules.length > 3
      ? "Split into 2 delivery phases. Ship core modules first."
      : "Proceed with single-phase delivery.",
    severity: scope.modules.length > 4 ? "warning" : "info",
  });
  entries.push({
    id: "qa-1", agent: "QA Agent", agentRole: "qa_agent",
    concern: scope.risks.length > 2
      ? `${scope.risks.length} risk factors flagged. Testing coverage must be expanded.`
      : "Standard test coverage plan sufficient.",
    recommendation: scope.risks.length > 2
      ? "Add regression suite and integration tests before each phase completion."
      : "Unit tests plus smoke tests at milestone boundaries.",
    severity: scope.risks.length > 2 ? "warning" : "info",
  });
  entries.push({
    id: "rev-1", agent: "Reviewer", agentRole: "reviewer",
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
      id: "ps-1", agent: "Product Strategist", agentRole: "product_strategist",
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

export default function CompanyLeadSession({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "lead",
      content: "Welcome. I'm your Company Lead — I coordinate all capabilities and team members to deliver your project.\n\nBefore we proceed to Blueprint creation, I need to understand your objectives, constraints, and expected outcomes.\n\nLet's begin: What is the primary business objective for this project?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<"discovery" | "decomposition" | "mvp_reduction" | "consultation" | "estimate" | "decision">("discovery");
  const [isThinking, setIsThinking] = useState(false);
  const { policy: globalPolicy } = useExecutionPolicy();
  const [execOverride, setExecOverride] = useState<SessionOverride>({ enabled: false, policy: globalPolicy });

  // ── Clarification Loop state (local draft — not persisted) ──
  const [clarification, setClarification] = useState<ClarificationFields>(EMPTY_CLARIFICATION);
  const [clarificationLocked, setClarificationLocked] = useState(false);
  const clarificationStatus = getClarificationStatus(clarification);

  const handleClarificationFieldChange = (key: keyof ClarificationFields, value: any) => {
    if (clarificationLocked) return;
    setClarification((prev) => ({ ...prev, [key]: value }));
  };

  const handleMarkClarificationComplete = () => {
    if (!clarificationStatus.isComplete) return;
    setClarificationLocked(true);
    toast.success("Clarification complete — system decomposition unlocked.");
    addLeadMessage("Clarification Loop is complete. All required fields are confirmed.\n\nI am now generating a system decomposition from the scope. Review the module map in the right panel — you can add, merge, or adjust modules before proceeding.");
    // Auto-generate decomposition from extracted scope
    const { modules: autoModules, dependencyGraph: autoGraph } = decomposeSystem(scope.modules);
    setDecompositionModules(autoModules);
    setDecompositionGraph(autoGraph);
    setPhase("decomposition");
  };

  // ── System Decomposition state (local draft — not persisted) ──
  const [decompositionModules, setDecompositionModules] = useState<SystemModule[]>([]);
  const [decompositionGraph, setDecompositionGraph] = useState<DependencyEdge[]>([]);
  const [decompositionLocked, setDecompositionLocked] = useState(false);

  const handleDecompositionChange = (modules: SystemModule[], graph: DependencyEdge[]) => {
    if (decompositionLocked) return;
    setDecompositionModules(modules);
    setDecompositionGraph(graph);
  };

  const handleDecompositionConfirm = () => {
    if (decompositionModules.length === 0) return;
    setDecompositionLocked(true);
    // Generate initial MVP reduction entries
    const initialEntries = generateInitialReduction(decompositionModules);
    setMvpReductionEntries(initialEntries);
    const isMvp = clarification.projectType === "mvp";
    if (isMvp) {
      toast.success("Decomposition confirmed — MVP Reduction Pass is mandatory.");
      addLeadMessage("System decomposition is confirmed. Since this is an MVP project, a Reduction Pass is mandatory.\n\nReview each module in the MVP Reduction panel — decide what to keep, defer, replace with SaaS, or remove for risk.");
      setPhase("mvp_reduction");
    } else {
      toast.success("Decomposition confirmed — MVP Reduction available.");
      addLeadMessage("System decomposition is confirmed. An optional MVP Reduction Pass is available — you can review scope reduction suggestions before proceeding.\n\nReview the panel or confirm to skip to team consultation.");
      setPhase("mvp_reduction");
    }
  };

  // ── MVP Reduction state (local draft — not persisted) ──
  const [mvpReductionEntries, setMvpReductionEntries] = useState<MvpReductionEntry[]>([]);
  const [mvpReductionLocked, setMvpReductionLocked] = useState(false);
  const mvpReductionResult = useMemo(() => computeReductionResult(mvpReductionEntries), [mvpReductionEntries]);
  const isMvpProject = clarification.projectType === "mvp";

  // Effective modules for estimation = post-reduction in MVP mode
  const effectiveModules = useMemo(() => {
    if (mvpReductionLocked && mvpReductionResult.keptModules.length > 0) {
      return getMvpScopeModules(decompositionModules, mvpReductionResult);
    }
    return decompositionModules;
  }, [decompositionModules, mvpReductionLocked, mvpReductionResult]);

  const effectiveModuleNames = useMemo(() => effectiveModules.map((m) => m.name), [effectiveModules]);

  const handleMvpReductionConfirm = () => {
    setMvpReductionLocked(true);
    toast.success("MVP scope confirmed — team consultation unlocked.");
    // Generate CTO Backlog Draft from effective modules
    const postReductionModules = getMvpScopeModules(decompositionModules, mvpReductionResult);
    const generatedCards = generateBacklogCards(postReductionModules.length > 0 ? postReductionModules : decompositionModules);
    setCtoBacklogCards(generatedCards);
    addLeadMessage(`MVP Reduction Pass complete. ${mvpReductionResult.keptModules.length} module${mvpReductionResult.keptModules.length !== 1 ? "s" : ""} in MVP scope, ${mvpReductionResult.deferredModules.length} deferred, ${mvpReductionResult.replacedModules.length} replaced with SaaS, ${mvpReductionResult.removedModules.length} removed.\n\nCTO Backlog Draft has been generated with ${generatedCards.length} cards. Review, edit, split, or merge cards before proceeding.\n\nI am now consulting with the internal team based on the reduced scope.`);
    setPhase("consultation");
    setTimeout(() => {
      addLeadMessage("Internal consultation is complete. The team has reviewed the post-reduction scope.\n\nEstimate Panel is ready — using MVP scope for projections.\n\nReview the estimate, then make your decision: Approve, Revise, or Cancel.");
      setPhase("estimate");
    }, 1500);
  };

  // ── CTO Backlog Draft state (local draft — not persisted) ──
  const [ctoBacklogCards, setCtoBacklogCards] = useState<CTOBacklogCardDraft[]>([]);

  // ── AI Task Drafts — decomposed from backlog (local draft) ──
  const aiTaskDrafts = useMemo(() => decomposeBacklogToTasks(ctoBacklogCards), [ctoBacklogCards]);
  const cardTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of ctoBacklogCards) map[c.id] = c.featureSlice;
    return map;
  }, [ctoBacklogCards]);

  useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, slug").order("name");
      return data ?? [];
    },
  });

  const scope = useMemo(() => extractScopeFromConversation(messages), [messages]);
  const consultation = useMemo(() => generateConsultation(scope), [scope]);
  // Use effective (post-reduction) modules for estimates when available
  const effectiveScope = useMemo(() => {
    if (mvpReductionLocked && effectiveModuleNames.length > 0) {
      return { ...scope, modules: effectiveModuleNames };
    }
    return scope;
  }, [scope, mvpReductionLocked, effectiveModuleNames]);
  const moduleEstimates = useMemo(() => generateModuleEstimates(effectiveScope), [effectiveScope]);
  const totalTokens = moduleEstimates.reduce((s, m) => s + m.tokens, 0);
  const totalCost = moduleEstimates.reduce((s, m) => s + m.cost, 0);
  const totalDays = Math.max(...moduleEstimates.map((m) => m.days), 0);

  // Auto-infer clarification fields from conversation (founder can override)
  useEffect(() => {
    if (clarificationLocked) return;
    const allUserText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" ");
    if (!allUserText) return;
    const inferred = inferClarificationFromText(allUserText, clarification);
    if (Object.keys(inferred).length > 0) {
      setClarification((prev) => ({ ...prev, ...inferred }));
    }
    // Infer projectGoal from first user message
    if (!clarification.projectGoal) {
      const firstMsg = messages.find((m) => m.role === "user");
      if (firstMsg) {
        setClarification((prev) => ({
          ...prev,
          projectGoal: prev.projectGoal || firstMsg.content.slice(0, 200),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, clarificationLocked]);

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
          "Thank you. I have sufficient context to proceed.\n\nPlease complete the Clarification Checklist in the right panel, then confirm to unlock System Decomposition."
        );
        // Don't auto-advance — clarification gate controls progression
      } else if (phase === "decomposition") {
        addLeadMessage("Review the System Decomposition panel. Add, merge, or adjust modules, then confirm to proceed.");
      } else if (phase === "mvp_reduction") {
        addLeadMessage("Review the MVP Reduction panel. Decide which modules to keep, defer, replace with SaaS, or remove. Confirm when ready.");
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
  // Planning outputs gated behind clarification + decomposition + mvp reduction
  const showDecomposition = clarificationLocked;
  const showMvpReduction = decompositionLocked;
  const showConsultation = mvpReductionLocked && (phase === "consultation" || phase === "estimate" || phase === "decision");
  const showEstimate = mvpReductionLocked && (phase === "estimate" || phase === "decision");

  // ── Planning Gate — blocks estimate if prerequisites are missing ──
  const planningGate: PlanningGateResult = useMemo(() => validatePlanningGate({
    clarificationComplete: clarificationLocked,
    modules: decompositionModules,
    dependencyEdges: decompositionGraph,
    mvpReductionComplete: mvpReductionLocked,
    isMvpProject: isMvpProject,
  }), [clarificationLocked, decompositionModules, decompositionEdges, mvpReductionLocked, isMvpProject]);
  const estimateBlocked = showEstimate && !planningGate.passed;
  const currentPhaseIdx = PHASE_ORDER.indexOf(phase);
  const latestLeadMessage = [...messages].reverse().find((m) => m.role === "lead");
  const isEarlyPhase = userMessageCount <= 2 && phase === "discovery";

  // Research readiness — derived from phase and user input
  const researchPhase: ResearchPhase =
    phase === "discovery" && userMessageCount <= 2 ? "researching"
    : phase === "discovery" ? "evidence-gathering"
    : phase === "decomposition" ? "evidence-gathering"
    : phase === "mvp_reduction" ? "evidence-gathering"
    : phase === "consultation" ? "evidence-gathering"
    : phase === "estimate" || phase === "decision" ? "ready-to-execute"
    : "unknown";

  const researchDetail =
    researchPhase === "researching" ? `Discovery in progress — ${LEAD_QUESTIONS.length - questionIndex} question(s) remaining.`
    : phase === "decomposition" ? "System decomposition in progress — modules not yet frozen."
    : phase === "mvp_reduction" ? "MVP Reduction Pass — scope decisions in progress."
    : researchPhase === "evidence-gathering" ? "Team is reviewing feasibility — scope not yet frozen."
    : researchPhase === "ready-to-execute" ? "Scope defined. Estimate ready — founder can approve or revise."
    : undefined;

  return (
    <div className={cn(
      "lead-session-root ls-grid-bg flex flex-col",
      embedded ? "h-full" : "min-h-screen"
    )}>

      {/* ── Top bar ──────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border bg-card/85 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {embedded ? (
            <>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[11px] text-muted-foreground">Command Center /</p>
                <h1 className="text-[15px] font-bold text-foreground">Project Briefing</h1>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/")}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-[16px] font-bold text-foreground">Project Briefing Workspace</h1>
                <p className="text-[11px] text-muted-foreground">Company Lead · Structured scope & estimate session</p>
              </div>
            </>
          )}
        </div>

        {/* Phase stepper */}
        <div className="flex items-center gap-1">
          {PHASE_ORDER.map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <div className={cn(
                "h-7 flex items-center gap-1.5 px-3 rounded-full text-[11px] font-semibold transition-all",
                i === currentPhaseIdx ? "ls-step-active" : i < currentPhaseIdx ? "ls-step-done" : "ls-step-upcoming",
              )}>
                <span className="text-[10px] font-bold">{i + 1}</span>
                <span className="hidden sm:inline">{PHASE_LABELS[p]}</span>
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <div className="w-6 h-px bg-border" style={i < currentPhaseIdx ? { background: "hsl(152 56% 42%)" } : undefined} />
              )}
            </div>
          ))}
        </div>

        {/* Research readiness indicator */}
        <ResearchModeBadge phase={researchPhase} detail={researchDetail} compact />

        {/* Right side: profile + training + execution badge + expand */}
        <div className="flex items-center gap-2">
          <Link to={LEAD_PROFILE_ROUTE}
            className="h-8 px-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Open Lead Profile"
            onClick={() => { if (embedded) onClose?.(); }}
          >
            <User className="h-3.5 w-3.5" /> Profile
          </Link>
          <Link to={LEAD_PROFILE_ROUTE}
            className="h-8 px-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Train Company Lead"
            onClick={() => { if (embedded) onClose?.(); }}
          >
            <GraduationCap className="h-3.5 w-3.5" /> Train
          </Link>

          {!embedded && (
            <>
              <ExecutionPolicyBadge
                label="How should the team execute this work?"
                policyOverride={execOverride.enabled ? execOverride.policy : null}
                isOverride={execOverride.enabled}
              />
              <ExecutionOverrideSheet override={execOverride} onChange={setExecOverride} triggerLabel="Override" />
            </>
          )}

          {embedded && (
            <button
              onClick={() => { onClose?.(); navigate("/lead"); }}
              className="h-8 px-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title="Open full workspace"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Expand
            </button>
          )}

          {showEstimate && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl text-[12px] font-mono bg-accent text-foreground">
              <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> ${totalCost}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {totalDays}d</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Purpose strip ────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-2 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Target className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">This conversation feeds the project blueprint and estimate.</span>
        </div>
        {showExtraction && scope.goal && (
          <div className="ml-auto flex items-center gap-4 text-[10px] font-mono text-muted-foreground/70">
            {scope.goal && (
              <span className="flex items-center gap-1 max-w-[200px] truncate">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">Objective</span>
                <span className="text-foreground/70 truncate">{scope.goal.slice(0, 60)}</span>
              </span>
            )}
            {scope.modules.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">Scope</span>
                <span className="text-foreground/70">{scope.modules.length} modules</span>
              </span>
            )}
            {scope.constraints.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">Constraints</span>
                <span className="text-foreground/70">{scope.constraints.length}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Confidence</span>
              <span className={cn(
                "text-foreground/70",
                userMessageCount >= 4 ? "text-status-green" : userMessageCount >= 2 ? "text-status-amber" : ""
              )}>
                {userMessageCount >= 4 ? "High" : userMessageCount >= 2 ? "Medium" : "Low"}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ══ LEFT — Guided briefing conversation ══ */}
        <div className="flex-1 flex flex-col min-h-0 relative">

          {/* Conversation area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

              {/* ── Character block (always visible) ── */}
              {isEarlyPhase && (
                <div className="flex flex-col items-center pt-4 mb-4 animate-slide-up">
                  {/* Speech bubble */}
                  <div className="ls-speech-bubble relative rounded-2xl px-7 py-5 max-w-xl text-center mb-4 bg-card shadow-[var(--shadow-card)]">
                    <p className="text-[15px] leading-[1.7] text-foreground">
                      {latestLeadMessage?.content}
                    </p>
                  </div>

                  {/* Character avatar */}
                  <div className="ls-float flex flex-col items-center">
                    <div className="relative">
                      <img
                        src={leadAvatar}
                        alt="Company Lead"
                        width={120}
                        height={120}
                        className="rounded-2xl"
                        style={{ imageRendering: "auto" }}
                      />
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center bg-status-green">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <span className="mt-2 text-[14px] font-bold text-foreground">Company Lead</span>
                    <span className="text-[11px] font-medium text-muted-foreground">AI Delivery Director</span>
                  </div>
                </div>
              )}

              {/* ── Message transcript (richer phase) ── */}
              {!isEarlyPhase && (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <LightMessageBubble key={msg.id} message={msg} />
                  ))}
                  {isThinking && <LightThinkingIndicator />}
                </div>
              )}

              {/* ── Early phase: quick-answer cards ── */}
              {isEarlyPhase && userMessageCount === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {[
                    { label: "Build a SaaS product", icon: Layers, desc: "Multi-tenant web application" },
                    { label: "Internal tool / dashboard", icon: Briefcase, desc: "Admin panel, analytics, ops" },
                    { label: "MVP / proof of concept", icon: Zap, desc: "Fast validation of an idea" },
                    { label: "Something else", icon: MessageSquare, desc: "I'll describe it myself" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => {
                        setInputValue(opt.label === "Something else" ? "" : opt.label);
                        if (opt.label !== "Something else") {
                          setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: opt.label, timestamp: new Date() }]);
                          setIsThinking(true);
                          setTimeout(() => {
                            addLeadMessage(`Great — "${opt.label}". Let me dig deeper.\n\n${LEAD_QUESTIONS[1]}`);
                            setQuestionIndex(1);
                            setIsThinking(false);
                          }, 600);
                        } else {
                          inputRef.current?.focus();
                        }
                      }}
                      className="group flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] bg-card border border-border shadow-[var(--shadow-card)]"
                    >
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-accent text-foreground">
                        <opt.icon className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="text-[14px] font-semibold block text-foreground">{opt.label}</span>
                        <span className="text-[12px] text-muted-foreground">{opt.desc}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* ── Composer ──────────────────────────────────── */}
          <div className="shrink-0 px-6 py-4 border-t border-border bg-card/70 backdrop-blur-xl">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-3 rounded-2xl px-4 py-2.5 transition-all bg-card border border-border shadow-[var(--shadow-card)]">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your requirements..."
                  rows={2}
                  className="flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] outline-none leading-relaxed placeholder:opacity-40 text-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking}
                  className="h-9 px-5 flex items-center gap-2 text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 shrink-0 mb-0.5 bg-primary text-primary-foreground"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-muted-foreground/50">
                  {phase === "discovery"
                    ? `Question ${Math.min(questionIndex + 1, LEAD_QUESTIONS.length)} of ${LEAD_QUESTIONS.length} · guided briefing`
                    : `Phase: ${PHASE_LABELS[phase]}`}
                </p>
                <p className="text-[10px] text-muted-foreground/50">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Structured extraction rail ══ */}
        <div
          className="w-[380px] shrink-0 overflow-y-auto hidden lg:block border-l border-border bg-secondary/60"
        >
          <div className="p-5 space-y-4">

            {/* Rail header */}
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} />
              <span className="text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">
                Live Extraction → Blueprint
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/50 px-1 -mt-2">
              Structured outputs extracted from the briefing conversation
            </p>

            {/* Clarification Loop checklist — always visible */}
            <ClarificationChecklist
              fields={clarification}
              onFieldChange={handleClarificationFieldChange}
              onMarkComplete={handleMarkClarificationComplete}
              isLocked={clarificationLocked}
            />

            {/* Gate notice when clarification incomplete */}
            {!clarificationLocked && userMessageCount >= LEAD_QUESTIONS.length && (
              <div className="rounded-xl px-3 py-2.5 border border-status-amber/20 bg-status-amber/5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-status-amber" />
                  <span className="text-[11px] font-bold text-status-amber">Planning Outputs Blocked</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Complete the Clarification Loop above to unlock System Decomposition and downstream planning.
                </p>
              </div>
            )}

            {/* System Decomposition panel — after clarification */}
            {showDecomposition && (
              <SystemDecompositionPanel
                modules={decompositionModules}
                dependencyGraph={decompositionGraph}
                onModulesChange={handleDecompositionChange}
                locked={decompositionLocked}
                onConfirm={handleDecompositionConfirm}
              />
            )}

            {/* Gate notice when decomposition incomplete */}
            {clarificationLocked && !decompositionLocked && (phase === "decomposition") && (
              <div className="rounded-xl px-3 py-2.5 border border-status-amber/20 bg-status-amber/5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-status-amber" />
                  <span className="text-[11px] font-bold text-status-amber">Estimate Blocked</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Confirm the System Decomposition above to unlock team consultation and estimates.
                </p>
              </div>
            )}

            {/* MVP Reduction panel — after decomposition */}
            {showMvpReduction && (
              <MvpReductionPanel
                modules={decompositionModules}
                entries={mvpReductionEntries}
                onEntriesChange={setMvpReductionEntries}
                locked={mvpReductionLocked}
                onConfirm={handleMvpReductionConfirm}
                isMandatory={isMvpProject}
              />
            )}

            {/* Gate notice when mvp reduction incomplete */}
            {decompositionLocked && !mvpReductionLocked && phase === "mvp_reduction" && (
              <div className="rounded-xl px-3 py-2.5 border border-status-amber/20 bg-status-amber/5">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-status-amber" />
                  <span className="text-[11px] font-bold text-status-amber">Estimate Blocked</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Confirm MVP scope to unlock team consultation and estimates.
                </p>
              </div>
            )}

            {/* Scope */}
            {showExtraction ? (
              <RailCard title="Scope" icon={Target}>
                <ExtRow label="Goal" value={scope.goal || "Awaiting input..."} />
                <ExtRow label="Capability" value={scope.suggestedCapability} />
                <ExtRow label="Complexity">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-block"
                    style={{ background: COMPLEXITY_CONFIG[scope.complexity].bg, color: COMPLEXITY_CONFIG[scope.complexity].color }}
                  >
                    {COMPLEXITY_CONFIG[scope.complexity].label}
                  </span>
                </ExtRow>
                {scope.modules.length > 0 && (
                  <ExtRow label="Modules">
                    <div className="flex flex-wrap gap-1">
                      {scope.modules.map((m) => (
                        <span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">{m}</span>
                      ))}
                    </div>
                  </ExtRow>
                )}
                {scope.constraints.length > 0 && (
                  <ExtRow label="Constraints">
                    <div className="flex flex-wrap gap-1">
                      {scope.constraints.map((c) => (
                        <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-status-amber/10 border border-status-amber/20 text-status-amber">{c}</span>
                      ))}
                    </div>
                  </ExtRow>
                )}
                {scope.risks.length > 0 && (
                  <ExtRow label="Risks">
                    <ul className="space-y-1">
                      {scope.risks.map((r) => (
                        <li key={r} className="text-[11px] flex items-start gap-1.5 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-status-amber/60" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </ExtRow>
                )}
                {scope.requiredRoles.length > 0 && (
                  <ExtRow label="Team">
                    <div className="flex flex-wrap gap-1">
                      {scope.requiredRoles.map((r) => (
                        <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">{r}</span>
                      ))}
                    </div>
                  </ExtRow>
                )}
              </RailCard>
            ) : (
              <div className="rounded-2xl p-6 text-center border-[1.5px] border-dashed border-border bg-card/50">
                <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-[12px] font-medium text-muted-foreground">
                  Scope will appear here as you describe your project
                </p>
              </div>
            )}

            {/* Consultation */}
            {showConsultation && (
              <RailCard title="Team Consultation" icon={Users}>
                <div className="space-y-2">
                  {consultation.map((entry) => (
                    <LightConsultationCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </RailCard>
            )}

            {/* Human Equivalent Team — uses post-reduction scope */}
            {showEstimate && effectiveScope && (
              <HumanTeamSuggestionPanel
                signals={{
                  scopeKeywords: [...effectiveScope.modules, ...effectiveScope.constraints].map(s => s.toLowerCase()),
                  complexity: effectiveScope.complexity,
                  hasFrontend: effectiveScope.modules.some(m => ["Dashboard", "Landing Page", "User Portal"].includes(m)),
                  hasBackend: effectiveScope.modules.some(m => ["Payments", "Real-time Chat", "API", "Search Engine"].includes(m)),
                  moduleCount: effectiveScope.modules.length,
                }}
              />
            )}

            {/* Estimate */}
            {showEstimate && (
              <RailCard title="Resource Estimate" icon={Coins}>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Tokens", value: `${(totalTokens / 1000).toFixed(0)}k` },
                    { label: "Cost", value: `$${totalCost}` },
                    { label: "Timeline", value: `${totalDays}d` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-3 text-center bg-muted">
                      <span className="text-[18px] font-bold font-mono text-foreground">{s.value}</span>
                      <p className="text-[10px] font-medium mt-0.5 text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Module breakdown */}
                <div className="rounded-xl overflow-hidden border border-border">
                  <div className="grid grid-cols-4 gap-0 text-[10px] font-semibold uppercase tracking-wider px-3 py-2 bg-muted text-muted-foreground">
                    <span>Module</span><span className="text-right">Tokens</span><span className="text-right">Cost</span><span className="text-right">Days</span>
                  </div>
                  {moduleEstimates.map((mod) => (
                    <div key={mod.name} className="grid grid-cols-4 gap-0 px-3 py-2 text-[11px] border-t border-border">
                      <span className="font-semibold truncate text-foreground">{mod.name}</span>
                      <span className="text-right font-mono text-muted-foreground">{(mod.tokens / 1000).toFixed(0)}k</span>
                      <span className="text-right font-mono text-muted-foreground">${mod.cost}</span>
                      <span className="text-right font-mono text-muted-foreground">{mod.days}d</span>
                    </div>
                  ))}
                </div>

                {/* Founder requirements */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">You must provide</p>
                  <ul className="space-y-1">
                    {scope.founderRequirements.map((req) => (
                      <li key={req} className="text-[11px] flex items-center gap-2 text-foreground/80">
                        <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Decision */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleApprove}
                    className="h-12 w-full flex items-center justify-center gap-2 text-[14px] font-bold rounded-xl transition-all hover:opacity-90 active:scale-[0.99] bg-primary text-primary-foreground shadow-[var(--shadow-elevated)]"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Create Blueprint
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRevise}
                      className="flex-1 h-9 flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-xl transition-all border border-border text-foreground bg-card"
                    >
                      <RotateCcw className="h-3 w-3" /> Revise
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 h-9 flex items-center justify-center gap-1.5 text-[12px] font-semibold rounded-xl transition-all border border-destructive/20 text-destructive bg-card"
                    >
                      <XCircle className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                </div>
              </RailCard>
            )}

            {/* CTO Backlog Draft — shown after MVP reduction */}
            {ctoBacklogCards.length > 0 && showEstimate && (
              <CtoBacklogDraftPanel
                cards={ctoBacklogCards}
                onCardsChange={setCtoBacklogCards}
              />
            )}

            {/* AI Task Drafts — decomposed from backlog */}
            {aiTaskDrafts.length > 0 && showEstimate && (
              <AiTaskDraftPanel
                drafts={aiTaskDrafts}
                cardTitles={cardTitles}
              />
            )}

            {/* Market Benchmark — founder-only, uses post-reduction scope */}
            {showEstimate && effectiveScope && (
              <MarketBenchmarkPanel
                signals={{
                  scopeKeywords: [...effectiveScope.modules, ...effectiveScope.constraints].map(s => s.toLowerCase()),
                  complexity: effectiveScope.complexity,
                  hasFrontend: effectiveScope.modules.some(m => ["Dashboard", "Landing Page", "User Portal"].includes(m)),
                  hasBackend: effectiveScope.modules.some(m => ["Payments", "Real-time Chat", "API", "Search Engine"].includes(m)),
                  moduleCount: effectiveScope.modules.length,
                }}
                estimatedAicUsd={totalCost}
                sourceType="company_lead"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Embedded footer ─────────────────────────────── */}
      {embedded && (
        <div className="shrink-0 flex items-center justify-between px-6 py-2 border-t border-border bg-card/60 backdrop-blur-xl">
          <span className="text-[11px] text-muted-foreground">
            Session active · {messages.filter(m => m.role === "user").length} messages
          </span>
          <button
            onClick={() => { onClose?.(); navigate("/lead"); }}
            className="text-[11px] font-medium text-foreground hover:underline flex items-center gap-1"
          >
            Open full workspace <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS — Theme-aware
   ═══════════════════════════════════════════════════════════ */

function LightMessageBubble({ message }: { message: ChatMessage }) {
  const isLead = message.role === "lead";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center animate-slide-up">
        <div className="px-4 py-2 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-3 animate-slide-up", !isLead && "flex-row-reverse")}>
      {isLead ? (
        <img src={leadAvatar} alt="Lead" width={36} height={36} className="rounded-xl shrink-0" style={{ imageRendering: "auto" }} />
      ) : (
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
          <span className="text-[13px] font-bold">Y</span>
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl px-5 py-3.5 max-w-[80%]",
          isLead ? "bg-card border border-border shadow-[var(--shadow-card)]" : "bg-primary text-primary-foreground"
        )}
      >
        {isLead && (
          <span className="text-[10px] font-semibold block mb-1.5 text-muted-foreground">Company Lead</span>
        )}
        <p className={cn("text-[14px] leading-[1.65] whitespace-pre-wrap", isLead ? "text-foreground" : "text-primary-foreground")}>
          {message.content}
        </p>
        <span className={cn("text-[10px] mt-2 block", isLead ? "text-muted-foreground" : "text-primary-foreground/50")}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function LightThinkingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <img src={leadAvatar} alt="Lead" width={36} height={36} className="rounded-xl shrink-0" />
      <div className="rounded-2xl px-5 py-4 bg-card border border-border shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full ls-thinking-dot bg-muted-foreground/40"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium ml-1 text-muted-foreground">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

function RailCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3 animate-slide-up bg-card border border-border shadow-[var(--shadow-card)]">
      <h3 className="text-[12px] font-bold tracking-tight flex items-center gap-2 text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {title}
      </h3>
      <div className="space-y-2.5">
        {children}
      </div>
    </div>
  );
}

function ExtRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5 text-muted-foreground">{label}</span>
      {children ?? <span className="text-[12px] font-medium text-foreground/80">{value}</span>}
    </div>
  );
}

function LightConsultationCard({ entry }: { entry: ConsultationEntry }) {
  const cfg = SEVERITY_CONFIG[entry.severity];
  return (
    <div className="rounded-xl px-3.5 py-3 space-y-1.5" style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-foreground">{entry.agent}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      </div>
      <p className="text-[11px] leading-snug text-foreground/80">{entry.concern}</p>
      <p className="text-[10px] italic leading-snug text-muted-foreground">{entry.recommendation}</p>
    </div>
  );
}
