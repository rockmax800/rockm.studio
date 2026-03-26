import { AppLayout } from "@/components/AppLayout";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Mic,
  Pencil,
  Lock,
  Users,
  Crosshair,
  Sparkles,
  ArrowDown,
  MessageCircle,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Snowflake,
} from "lucide-react";
import leadAvatar from "@/assets/pixel/lead-avatar.png";
import { useIntakeBriefDraft } from "@/hooks/use-intake-brief-draft";
import type { BriefSectionData } from "@/lib/intake-brief-transfer";
import { HumanTeamSuggestionPanel } from "@/components/intake/HumanTeamSuggestionPanel";
import type { BriefSignals } from "@/lib/business/market-benchmarking";
import { MarketBenchmarkPanel } from "@/components/intake/MarketBenchmarkPanel";
import { CtoBacklogDraftPanel } from "@/components/intake/CtoBacklogDraftPanel";
import { generateBacklogCards } from "@/lib/cto-backlog";
import type { CTOBacklogCardDraft, SystemModule } from "@/types/front-office-planning";

/* ── Types ───────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "navigator";
  content: string;
  timestamp: Date;
}

type Confidence = "low" | "medium" | "high";

interface BriefSection {
  key: string;
  title: string;
  content: string;
  confidence: Confidence;
}

const INITIAL_SECTIONS: BriefSection[] = [
  { key: "goal", title: "Business Goal", content: "", confidence: "low" },
  { key: "users", title: "Target Users", content: "", confidence: "low" },
  { key: "in_scope", title: "In Scope", content: "", confidence: "low" },
  { key: "out_scope", title: "Out of Scope", content: "", confidence: "low" },
  { key: "constraints", title: "Constraints", content: "", confidence: "low" },
  { key: "criteria", title: "Acceptance Criteria", content: "", confidence: "low" },
  { key: "risk", title: "Risk Class", content: "", confidence: "low" },
  { key: "complexity", title: "Estimated Complexity", content: "", confidence: "low" },
];

const GUIDANCE_CHIPS = [
  { label: "New web product", hint: "SaaS, marketplace, platform" },
  { label: "Internal automation", hint: "Admin panel, ops tool" },
  { label: "Audit existing system", hint: "Review & improve" },
  { label: "MVP launch", hint: "Fast validation" },
];

const CONF_STYLES: Record<Confidence, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-status-amber/10 text-status-amber",
  high: "bg-status-green/10 text-status-green",
};

/* ── Navigator simulation ────────────────────────────────── */

function simulateExtraction(message: string, sections: BriefSection[]): BriefSection[] {
  const lower = message.toLowerCase();
  const updated = [...sections];

  const update = (key: string, content: string, conf: Confidence) => {
    const idx = updated.findIndex((s) => s.key === key);
    if (idx >= 0 && (!updated[idx].content || conf !== "low")) {
      updated[idx] = { ...updated[idx], content, confidence: conf };
    }
  };

  if (lower.includes("admin") || lower.includes("dashboard") || lower.includes("panel")) {
    update("goal", "Build an operational dashboard for internal team management", "medium");
    update("complexity", "Medium — standard CRUD + data visualization", "medium");
  }
  if (lower.includes("crm") || lower.includes("customer")) {
    update("goal", "Customer relationship management platform", "high");
    update("users", "Sales team, account managers, support staff", "medium");
    update("complexity", "High — multi-entity, workflow automation", "medium");
  }
  if (lower.includes("landing") || lower.includes("marketing")) {
    update("goal", "High-conversion marketing landing page", "high");
    update("users", "Potential customers, marketing team", "medium");
    update("complexity", "Low — static content, analytics integration", "high");
  }
  if (lower.includes("internal") || lower.includes("tool") || lower.includes("operations") || lower.includes("automation")) {
    update("goal", "Internal operations tool for team efficiency", "medium");
    update("users", "Internal team members", "medium");
  }
  if (lower.includes("saas") || lower.includes("web product")) {
    update("goal", "SaaS platform with multi-tenant architecture", "medium");
    update("risk", "Medium — auth, billing, multi-tenancy", "medium");
  }
  if (lower.includes("mvp") || lower.includes("validation") || lower.includes("launch")) {
    update("goal", "MVP for rapid market validation", "medium");
    update("complexity", "Low-Medium — focused feature set", "medium");
  }
  if (lower.includes("audit") || lower.includes("review") || lower.includes("improve")) {
    update("goal", "Audit and improve existing system", "medium");
    update("risk", "Low-Medium — depends on system complexity", "medium");
  }
  if (lower.includes("react") || lower.includes("postgres") || lower.includes("aws")) {
    update("constraints", message, "high");
  }
  if (lower.includes("users") || lower.includes("audience") || lower.includes("who")) {
    update("users", message, "medium");
  }

  return updated;
}

function navigatorReply(message: string, turn: number): string {
  const lower = message.toLowerCase();
  if (turn === 0) {
    return "Got it. I'm picking up the core direction. Let me ask a few follow-ups to sharpen the brief.\n\n**Who are the primary users** of this system? Are they internal team members, end customers, or both?";
  }
  if (lower.includes("internal") || lower.includes("team")) {
    return "Internal tool — understood. That simplifies auth and access patterns.\n\n**What are the key workflows** they need to perform? And are there any **existing systems** this needs to integrate with?";
  }
  if (lower.includes("customer") || lower.includes("external")) {
    return "External-facing — that raises the bar on UX, performance, and security.\n\n**What's the expected scale** in the first 6 months? And do you have **brand guidelines** or design references?";
  }
  return "Thanks, that's helpful. I've updated the structured brief on the right.\n\nAnything else to add, or should we **refine the scope boundaries** next?";
}

/* ── Hero guidance message ───────────────────────────────── */

function heroMessage(filledCount: number, isEmpty: boolean): string {
  if (isEmpty) return "Hey! I'm your Navigator. Tell me what you'd like to build — or pick a starting point below.";
  if (filledCount < 3) return "Good start. Let's keep filling in the brief — the more detail, the sharper the blueprint.";
  if (filledCount < 6) return "We're getting there. A few more sections and we can lock the brief.";
  return "Brief is looking solid. Review the sections below and freeze when you're ready.";
}

/* ── Component ───────────────────────────────────────────── */

export default function IntakeComposerV2() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sections, setSections] = useState<BriefSection[]>(INITIAL_SECTIONS);
  const [navStatus, setNavStatus] = useState<"listening" | "thinking" | "ready">("listening");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(0);
  const formRef = useRef<HTMLDivElement>(null);

  const { frozenBrief, phase, freeze, startKickoff, reset } = useIntakeBriefDraft();
  const [ctoBacklogCards, setCtoBacklogCards] = useState<CTOBacklogCardDraft[]>([]);

  const filledCount = sections.filter((s) => s.content.length > 0).length;
  const tokenEstimate = messages.reduce((acc, m) => acc + Math.round(m.content.length / 4), 0);
  const isEmpty = messages.length === 0;

  // Generate CTO backlog from brief sections after freeze
  const generateBacklogFromBrief = useCallback(() => {
    if (phase !== "frozen" && phase !== "kickoff-started") return;
    const scopeSection = sections.find(s => s.key === "in_scope");
    const goalSection = sections.find(s => s.key === "goal");
    if (!scopeSection?.content) return;
    // Derive simple modules from scope text
    const scopeItems = scopeSection.content.split(/[,;.\n]+/).map(s => s.trim()).filter(Boolean);
    const modules: SystemModule[] = scopeItems.map((item) => ({
      name: item.length > 40 ? item.slice(0, 40) : item,
      purpose: item,
      coreFeatures: [item],
      dependencies: [],
      riskLevel: "medium" as const,
      complexityEstimate: "medium" as const,
      mvpOptional: false,
    }));
    if (modules.length > 0 && ctoBacklogCards.length === 0) {
      setCtoBacklogCards(generateBacklogCards(modules));
    }
  }, [phase, sections, ctoBacklogCards.length]);

  // Trigger backlog generation when phase changes to frozen
  useEffect(() => {
    generateBacklogFromBrief();
  }, [generateBacklogFromBrief]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setNavStatus("thinking");
    setSections((prev) => simulateExtraction(text, prev));

    const turn = turnRef.current;
    turnRef.current++;
    setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "navigator",
        content: navigatorReply(text, turn),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setNavStatus("ready");
      scrollToBottom();
    }, 800 + Math.random() * 600);

    scrollToBottom();
  }, [input, scrollToBottom]);

  const handleChip = (label: string) => {
    setInput(label);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startEdit = (key: string, content: string) => {
    setEditingKey(key);
    setEditValue(content);
  };

  const saveEdit = (key: string) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, content: editValue, confidence: editValue ? "high" : "low" } : s))
    );
    setEditingKey(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppLayout title="Intake Composer">
      <div className="h-[calc(100vh-4rem)] overflow-y-auto">

        {/* ═══ STEP HEADER ═══ */}
        <div className="px-6 pt-5 pb-3 max-w-2xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">Step 2 — Structured Intake</p>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Turn the consultation into a frozen project brief</h1>
          <p className="text-[12px] text-muted-foreground/60 mt-1.5 max-w-md mx-auto leading-relaxed">
            This is the canonical project brief. The conversation fills it; you can refine and freeze it here.
          </p>
        </div>

        {/* ═══ JOURNEY STRIP ═══ */}
        <div className="flex items-center justify-center gap-1.5 px-6 pb-4">
          {[
            { label: "Consultation", done: true },
            { label: "Structured Intake", active: true },
            { label: "Kickoff", done: false },
            { label: "Project Setup", done: false },
            { label: "Delivery", done: false },
          ].map((step, i, arr) => (
            <span key={step.label} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                step.active
                  ? "bg-foreground text-background"
                  : step.done
                    ? "bg-status-green/10 text-status-green"
                    : "bg-muted/40 text-muted-foreground/40"
              }`}>{step.label}</span>
              {i < arr.length - 1 && <span className="text-muted-foreground/20 text-[10px]">→</span>}
            </span>
          ))}
        </div>

        {/* ═══ HERO — guided section ═══ */}
        <div className="intake-hero-root ih-grid-bg">
          <div className="max-w-2xl mx-auto px-6 pt-6 pb-6 flex flex-col items-center">
            {/* Speech bubble */}
            <div className="ih-speech-bubble px-6 py-4 max-w-lg text-center mb-5">
              <p className="text-[15px] leading-[160%] text-foreground">
                {heroMessage(filledCount, isEmpty)}
              </p>
            </div>

            {/* Character */}
            <div className="ih-float flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-2xl border-2 border-border overflow-hidden bg-card shadow-sm">
                <img src={leadAvatar} alt="Navigator" className="h-full w-full object-cover" />
              </div>
              <span className="mt-2 text-[14px] font-bold text-foreground">Navigator</span>
              <span className="text-[12px] text-muted-foreground">AI Delivery Lead</span>
            </div>

            {/* Guidance chips */}
            {isEmpty && (
              <div className="flex flex-wrap gap-2.5 justify-center mb-6">
                {GUIDANCE_CHIPS.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => handleChip(c.label)}
                    className="group flex flex-col items-center px-5 py-3 rounded-2xl border border-border bg-card text-foreground transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                  >
                    <span className="text-[14px] font-semibold">{c.label}</span>
                    <span className="text-[11px] mt-0.5 text-muted-foreground">{c.hint}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card px-4 py-3 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your project idea…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-[14px] text-foreground outline-none leading-[150%] min-h-[24px] max-h-[100px] placeholder:opacity-40"
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 bg-foreground text-background"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 mt-5">
              <Badge
                className="text-[11px] font-mono px-2.5 h-6 border border-border"
                variant={filledCount > 0 ? "default" : "secondary"}
              >
                {filledCount}/8 extracted
              </Badge>
              <button onClick={scrollToForm} className="flex items-center gap-1 text-[12px] hover:underline text-muted-foreground hover:text-foreground transition-colors">
                <ArrowDown className="h-3 w-3" /> View structured brief
              </button>
            </div>
          </div>
        </div>

        {/* ═══ MAIN BODY — existing dark-themed layout ═══ */}
        <div ref={formRef} className="grid-content flex flex-col pb-4">
          <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 pt-4">

            {/* ── LEFT: Navigator Conversation (7 cols) ──────── */}
            <div className="col-span-12 lg:col-span-7 flex flex-col" style={{ minHeight: "420px" }}>
              {/* Panel label */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5 px-1">Working conversation with the navigator</p>
              {/* Navigator persona */}
              <div className="flex items-center gap-3 px-6 py-4 bg-card rounded-t-[16px] border border-border border-b-0">
                <div className="h-10 w-10 rounded-full border-2 border-foreground/20 bg-secondary flex items-center justify-center shrink-0">
                  <Crosshair className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-foreground">Navigator</span>
                    <span className="text-[13px] text-muted-foreground">Delivery Lead</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`h-2 w-2 rounded-full ${
                      navStatus === "thinking" ? "bg-status-amber animate-pulse" :
                      navStatus === "ready" ? "bg-status-green" : "bg-muted-foreground/40"
                    }`} />
                    <span className="text-[12px] text-muted-foreground capitalize">{navStatus}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px] border-border-strong font-mono px-2 h-6">
                  {filledCount}/8
                </Badge>
              </div>

              {/* Chat area */}
              <div className="flex-1 bg-card border-x border-border overflow-hidden flex flex-col min-h-0">
                {isEmpty ? (
                  <div className="flex-1 flex flex-col items-center justify-center px-8">
                    <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-4" />
                    <p className="text-[14px] text-muted-foreground text-center max-w-[380px]">
                      Use the composer above or type here to start the conversation. Your inputs will populate the structured brief.
                    </p>
                  </div>
                ) : (
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                      >
                        <div
                          className={`max-w-[85%] rounded-[14px] px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          <p className="text-[14px] leading-[160%] whitespace-pre-wrap"
                             dangerouslySetInnerHTML={{
                               __html: msg.content
                                 .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                 .replace(/\n/g, "<br/>")
                             }}
                          />
                          <span className={`text-[11px] mt-1 block ${
                            msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                          }`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {navStatus === "thinking" && (
                      <div className="flex justify-start animate-fade-in">
                        <div className="bg-secondary rounded-[14px] px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "150ms" }} />
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input composer */}
              <div className="bg-card border border-border border-t-0 rounded-b-[16px] px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Continue the conversation…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none leading-[150%] min-h-[24px] max-h-[120px]"
                    style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
                    onInput={(e) => {
                      const el = e.target as HTMLTextAreaElement;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 120) + "px";
                    }}
                  />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0">
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Structured Brief (5 cols) ─────────── */}
            <div className="col-span-12 lg:col-span-5 flex flex-col" style={{ minHeight: "420px" }}>
              {/* Panel label */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-1.5 px-1">What will be saved into the brief</p>
              <div className="flex-1 bg-secondary rounded-[16px] border border-border flex flex-col min-h-0 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                  <h3 className="text-section-title text-foreground">Structured Brief</h3>
                  <span className="text-[12px] font-mono text-muted-foreground">{filledCount}/8</span>
                </div>

                {/* Sections */}
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-1">
                    {sections.map((section) => (
                      <div
                        key={section.key}
                        className={`rounded-[12px] border px-4 py-3 transition-colors duration-180 ${
                          section.content
                            ? "bg-card border-border hover:border-border-strong"
                            : "bg-transparent border-border/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[14px] font-semibold text-foreground">{section.title}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`ds-badge text-[10px] ${CONF_STYLES[section.confidence]}`}>
                              {section.confidence}
                            </span>
                            {section.content && editingKey !== section.key && (
                              <button
                                onClick={() => startEdit(section.key, section.content)}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editingKey === section.key ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <Button size="sm" className="h-6 text-[11px] px-2" onClick={() => saveEdit(section.key)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2 text-muted-foreground" onClick={() => setEditingKey(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : section.content ? (
                          <p className="text-[13px] text-foreground/80 leading-[150%]">{section.content}</p>
                        ) : (
                          <p className="text-[13px] text-muted-foreground/50 italic">Waiting for conversation…</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border shrink-0 space-y-3">
                  {/* Guidance draft hint */}
                  {filledCount >= 3 && phase === "drafting" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/[0.04] border border-primary/10">
                      <BookOpen className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                      <p className="text-[10px] text-primary/60 leading-relaxed">
                        A <span className="font-bold">Project Guidance Pack</span> will be generated from this brief — visible in the project cockpit after kickoff.
                      </p>
                    </div>
                  )}

                  {/* Human Equivalent Team suggestion */}
                  {filledCount >= 2 && (() => {
                    const cxSection = sections.find(s => s.key === "complexity");
                    const scopeSection = sections.find(s => s.key === "in_scope");
                    const goalSection = sections.find(s => s.key === "goal");
                    const allText = [scopeSection?.content, goalSection?.content, cxSection?.content].filter(Boolean).join(" ").toLowerCase();
                    const briefSignals: BriefSignals = {
                      scopeKeywords: allText.split(/[\s,;]+/).filter(w => w.length > 2),
                      complexity: cxSection?.content?.toLowerCase().includes("critical") ? "critical"
                        : cxSection?.content?.toLowerCase().includes("high") ? "high"
                        : cxSection?.content?.toLowerCase().includes("low") ? "low"
                        : "medium",
                      hasFrontend: allText.includes("frontend") || allText.includes("ui") || allText.includes("interface"),
                      hasBackend: allText.includes("backend") || allText.includes("api") || allText.includes("database"),
                      hasDesignSystem: allText.includes("design system") || allText.includes("design-system"),
                    };
                    return (
                      <>
                        <HumanTeamSuggestionPanel signals={briefSignals} />
                        <MarketBenchmarkPanel signals={briefSignals} sourceType="intake" />
                      </>
                    );
                  })()}

                  {/* CTO Backlog Draft — after freeze */}
                  {phase !== "drafting" && ctoBacklogCards.length > 0 && (
                    <CtoBacklogDraftPanel
                      cards={ctoBacklogCards}
                      onCardsChange={setCtoBacklogCards}
                    />
                  )}

                  {/* Frozen success state */}
                  {phase !== "drafting" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-green/[0.06] border border-status-green/20">
                      <Snowflake className="h-3.5 w-3.5 text-status-green shrink-0" />
                      <p className="text-[10px] text-status-green leading-relaxed">
                        Brief frozen at {frozenBrief ? new Date(frozenBrief.frozenAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}.
                        {phase === "kickoff-started" ? " Kickoff in progress." : " Ready for kickoff."}
                      </p>
                      {phase === "frozen" && (
                        <button onClick={reset} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline">Unfreeze</button>
                      )}
                    </div>
                  )}

                  {/* Freeze validation error */}
                  {freezeError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/[0.06] border border-destructive/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      <p className="text-[10px] text-destructive leading-relaxed">{freezeError}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-muted-foreground">Conversation tokens</span>
                        <span className="text-[12px] font-mono text-foreground">{tokenEstimate.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/30 rounded-full transition-all duration-250"
                          style={{ width: `${Math.min((tokenEstimate / 4000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Blueprint est.</span>
                      <span className="text-[12px] font-mono text-foreground">~{Math.round(tokenEstimate * 2.5).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-10 gap-2 text-[13px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-[10px]"
                        disabled={filledCount < 3 || phase !== "drafting"}
                        onClick={() => {
                          setFreezeError(null);
                          const result = freeze(sections as BriefSectionData[], tokenEstimate);
                          if (!result.success) {
                            const names = result.missing.map((k) => sections.find((s) => s.key === k)?.title ?? k).join(", ");
                            setFreezeError(`Cannot freeze — missing required fields: ${names}`);
                          }
                        }}
                      >
                        {phase !== "drafting" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {phase !== "drafting" ? "Brief Frozen" : "Freeze Brief"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-10 gap-2 text-[13px] font-semibold border-border-strong text-foreground rounded-[10px]"
                        disabled={phase === "drafting" || phase === "kickoff-started"}
                        onClick={() => {
                          if (phase !== "frozen") {
                            setFreezeError("You must freeze the brief before starting kickoff.");
                            return;
                          }
                          startKickoff();
                          navigate("/team-room?brief=frozen");
                        }}
                      >
                        <Users className="h-3.5 w-3.5" /> Invite to Kickoff
                      </Button>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground/40">
                      <span className="flex-1 text-center">{phase !== "drafting" ? "Brief is locked" : "Lock the brief as input for kickoff"}</span>
                      <span className="flex-1 text-center">{phase === "kickoff-started" ? "Kickoff in progress" : "Start team planning based on frozen brief"}</span>
                    </div>
                  </div>

                  {/* Progression footer */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: "Consultation", done: true },
                      { label: "Brief frozen", done: phase !== "drafting" },
                      { label: "Kickoff started", done: phase === "kickoff-started" },
                    ].map((step, i, arr) => (
                      <span key={step.label} className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${step.done ? "bg-status-green" : "bg-muted-foreground/20"}`} />
                        <span className={`text-[10px] ${step.done ? "text-foreground font-semibold" : "text-muted-foreground/40"}`}>{step.label}</span>
                        {i < arr.length - 1 && <span className="text-muted-foreground/15 text-[10px] mx-0.5">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
