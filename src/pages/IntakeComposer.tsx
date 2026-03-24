import { AppLayout } from "@/components/AppLayout";
import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

const SUGGESTIONS = [
  "Build a SaaS admin panel",
  "Launch marketing landing page",
  "Create internal operations tool",
  "Build B2B CRM system",
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
  if (lower.includes("internal") || lower.includes("tool") || lower.includes("operations")) {
    update("goal", "Internal operations tool for team efficiency", "medium");
    update("users", "Internal team members", "medium");
  }
  if (lower.includes("saas")) {
    update("goal", "SaaS platform with multi-tenant architecture", "medium");
    update("risk", "Medium — auth, billing, multi-tenancy", "medium");
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

/* ── Component ───────────────────────────────────────────── */

export default function IntakeComposerV2() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sections, setSections] = useState<BriefSection[]>(INITIAL_SECTIONS);
  const [navStatus, setNavStatus] = useState<"listening" | "thinking" | "ready">("listening");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const turnRef = useRef(0);

  const filledCount = sections.filter((s) => s.content.length > 0).length;
  const tokenEstimate = messages.reduce((acc, m) => acc + Math.round(m.content.length / 4), 0);

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

    // Extract structured data
    setSections((prev) => simulateExtraction(text, prev));

    // Simulate Navigator reply
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

  const handleSuggestion = (text: string) => {
    setInput(text);
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

  const isEmpty = messages.length === 0;

  return (
    <AppLayout title="Intake Composer">
      <div className="grid-content h-[calc(100vh-4rem)] flex flex-col pb-4">
        {/* 7 + 5 column layout */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">

          {/* ── LEFT: Navigator Conversation (7 cols) ──────── */}
          <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
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
                {filledCount}/8 extracted
              </Badge>
            </div>

            {/* Chat area */}
            <div className="flex-1 bg-card border-x border-border overflow-hidden flex flex-col min-h-0">
              {isEmpty ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center px-8">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-4" />
                  <h3 className="text-[22px] font-semibold text-foreground text-center tracking-tight">
                    Describe what you want to build.
                  </h3>
                  <p className="text-[14px] text-muted-foreground mt-2 text-center max-w-[400px]">
                    Navigator will extract a structured brief from your conversation in real time.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6 justify-center">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="px-3 py-1.5 rounded-full bg-secondary text-[13px] text-foreground font-medium hover:bg-muted transition-colors duration-180 border border-border"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
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
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your project idea…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none leading-[150%] min-h-[24px] max-h-[120px]"
                  style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
                  onInput={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                >
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
          <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
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

              {/* Footer — Token meter + actions */}
              <div className="px-5 py-4 border-t border-border shrink-0 space-y-3">
                {/* Token meter */}
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

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-10 gap-2 text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-[10px]"
                    disabled={filledCount < 3}
                  >
                    <Lock className="h-3.5 w-3.5" /> Freeze Brief
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 gap-2 text-[13px] font-semibold border-border-strong text-foreground rounded-[10px]"
                    disabled={filledCount < 5}
                  >
                    <Users className="h-3.5 w-3.5" /> Invite to Kickoff
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
