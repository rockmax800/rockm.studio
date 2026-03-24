import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Send, Plus, RotateCcw, Save, Clock, FileText, Pencil,
  MessageSquare, BookOpen, Shield, Brain, Zap, AlertTriangle,
  Ban, Sparkles, ChevronDown, ChevronRight, Upload,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface TrainingMessage {
  id: string;
  role: "founder" | "system";
  content: string;
  timestamp: Date;
}

interface MaterialBlock {
  id: string;
  title: string;
  content: string;
  category: "preference" | "example" | "anti-pattern" | "expectation" | "note";
  timestamp: Date;
}

interface HistoryEntry {
  id: string;
  action: string;
  timestamp: Date;
}

interface PromptDraft {
  roleMission: string;
  hardBoundaries: string;
  preferredBehavior: string;
  domainKnowledge: string;
  communicationStyle: string;
  escalationRules: string;
  antiPatterns: string;
  exampleResponses: string;
}

const EMPTY_DRAFT: PromptDraft = {
  roleMission: "",
  hardBoundaries: "",
  preferredBehavior: "",
  domainKnowledge: "",
  communicationStyle: "",
  escalationRules: "",
  antiPatterns: "",
  exampleResponses: "",
};

const DRAFT_SECTIONS: { key: keyof PromptDraft; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { key: "roleMission", label: "Role Mission", icon: <Zap className="h-3.5 w-3.5" />, placeholder: "Define the core purpose and mission of this role…" },
  { key: "hardBoundaries", label: "Hard Boundaries", icon: <Shield className="h-3.5 w-3.5" />, placeholder: "What must this agent never do? Strict constraints…" },
  { key: "preferredBehavior", label: "Preferred Behavior", icon: <Brain className="h-3.5 w-3.5" />, placeholder: "How should this agent approach work? Preferred patterns…" },
  { key: "domainKnowledge", label: "Domain Knowledge", icon: <BookOpen className="h-3.5 w-3.5" />, placeholder: "Specific domain expertise, terminology, context…" },
  { key: "communicationStyle", label: "Communication Style", icon: <MessageSquare className="h-3.5 w-3.5" />, placeholder: "How should this agent communicate? Tone, format…" },
  { key: "escalationRules", label: "Escalation Rules", icon: <AlertTriangle className="h-3.5 w-3.5" />, placeholder: "When should this agent escalate to the founder?…" },
  { key: "antiPatterns", label: "Anti-patterns", icon: <Ban className="h-3.5 w-3.5" />, placeholder: "Known bad patterns to avoid…" },
  { key: "exampleResponses", label: "Examples to Follow", icon: <FileText className="h-3.5 w-3.5" />, placeholder: "Reference examples of good outputs…" },
];

const MATERIAL_CATEGORIES = [
  { value: "preference" as const, label: "Preference", color: "bg-status-blue/15 text-status-blue" },
  { value: "example" as const, label: "Example", color: "bg-status-green/15 text-status-green" },
  { value: "anti-pattern" as const, label: "Anti-pattern", color: "bg-destructive/15 text-destructive" },
  { value: "expectation" as const, label: "Expectation", color: "bg-status-amber/15 text-status-amber" },
  { value: "note" as const, label: "Note", color: "bg-secondary text-muted-foreground" },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface TrainingLabProps {
  employeeName: string;
  roleName: string;
}

export function TrainingLab({ employeeName, roleName }: TrainingLabProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([
    {
      id: "sys-intro",
      role: "system",
      content: `Training Lab for ${employeeName} (${roleName}). Use this workspace to teach behavioral preferences, add examples, and refine the synthesized prompt draft.\n\nWrite instructions below — they will be captured as training material.`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [materials, setMaterials] = useState<MaterialBlock[]>([]);
  const [draft, setDraft] = useState<PromptDraft>(EMPTY_DRAFT);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [materialCategory, setMaterialCategory] = useState<MaterialBlock["category"]>("preference");
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addHistory = (action: string) => {
    setHistory((prev) => [{ id: `h-${Date.now()}`, action, timestamp: new Date() }, ...prev]);
  };

  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `f-${Date.now()}`, role: "founder", content: text, timestamp: new Date() },
    ]);
    setInputValue("");
    addHistory("Founder note added");

    // System acknowledgement
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: "system",
          content: "Noted. This instruction has been captured. Add it as a material block or regenerate the draft to incorporate it.",
          timestamp: new Date(),
        },
      ]);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddMaterial = () => {
    if (!materialContent.trim()) return;
    setMaterials((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        title: materialTitle.trim() || `${materialCategory} note`,
        content: materialContent.trim(),
        category: materialCategory,
        timestamp: new Date(),
      },
    ]);
    setMaterialTitle("");
    setMaterialContent("");
    setShowAddMaterial(false);
    addHistory(`Material added: ${materialCategory}`);
  };

  const handleRegenerateDraft = () => {
    // Mock synthesis from conversation + materials
    const founderMessages = messages.filter((m) => m.role === "founder").map((m) => m.content);
    const allText = [...founderMessages, ...materials.map((m) => m.content)].join("\n");

    setDraft({
      roleMission: allText.length > 0
        ? `${employeeName} serves as ${roleName}. ${founderMessages[0] ? `Primary directive: ${founderMessages[0].slice(0, 120)}` : "Awaiting founder directives."}`
        : "",
      hardBoundaries: materials.filter((m) => m.category === "anti-pattern").map((m) => `- ${m.content}`).join("\n") || "No hard boundaries defined yet.",
      preferredBehavior: materials.filter((m) => m.category === "preference").map((m) => `- ${m.content}`).join("\n") || "No preferences captured yet.",
      domainKnowledge: "Inherited from role contract and project context.",
      communicationStyle: "Default: concise, operational, structured output.",
      escalationRules: "Escalate when confidence < 70% or when scope is ambiguous.",
      antiPatterns: materials.filter((m) => m.category === "anti-pattern").map((m) => `- ${m.content}`).join("\n") || "None defined.",
      exampleResponses: materials.filter((m) => m.category === "example").map((m) => `### ${m.title}\n${m.content}`).join("\n\n") || "No examples provided yet.",
    });
    addHistory("Draft regenerated");
  };

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const updateDraftSection = (key: keyof PromptDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    addHistory(`Draft manually edited: ${key}`);
  };

  const hasDraftContent = Object.values(draft).some((v) => v.length > 0);

  return (
    <div className="grid grid-cols-12 gap-0 h-[700px] rounded-2xl border border-border bg-card overflow-hidden">

      {/* ══ LEFT — Conversation Thread ══ */}
      <div className="col-span-12 lg:col-span-4 flex flex-col border-r border-border">
        <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-secondary/30">
          <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            Training Conversation
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Write instructions to teach {employeeName}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                  msg.role === "founder"
                    ? "bg-status-blue text-white ml-6"
                    : "bg-muted text-foreground mr-6"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className={cn(
                  "text-[9px] block mt-1.5",
                  msg.role === "founder" ? "text-white/40" : "text-muted-foreground/40"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        <div className="shrink-0 p-3 border-t border-border/50">
          <div className="flex items-end gap-2 rounded-xl bg-background border border-border px-3 py-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Teach this agent…"
              rows={2}
              className="flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="h-8 w-8 rounded-lg bg-status-blue text-white flex items-center justify-center disabled:opacity-30 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ══ CENTER — Source Materials & Notes ══ */}
      <div className="col-span-12 lg:col-span-4 flex flex-col border-r border-border">
        <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Source Materials
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Preferences, examples, anti-patterns
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 px-2.5 font-semibold"
            onClick={() => setShowAddMaterial(true)}
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Add material form */}
            {showAddMaterial && (
              <div className="rounded-xl border border-status-amber/30 bg-status-amber/5 p-3.5 space-y-2.5">
                <input
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full h-8 rounded-lg bg-background border border-border px-3 text-[12px] text-foreground outline-none"
                />
                <textarea
                  value={materialContent}
                  onChange={(e) => setMaterialContent(e.target.value)}
                  placeholder="Write or paste content…"
                  rows={4}
                  className="w-full rounded-lg bg-background border border-border px-3 py-2 text-[12px] text-foreground outline-none resize-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value as MaterialBlock["category"])}
                    className="h-7 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <Button size="sm" className="h-7 text-[11px] px-3 gap-1 font-bold ml-auto" onClick={handleAddMaterial} disabled={!materialContent.trim()}>
                    <Plus className="h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => setShowAddMaterial(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {materials.length === 0 && !showAddMaterial && (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <FileText className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground">
                  No materials yet. Add preferences, examples, or anti-patterns.
                </p>
              </div>
            )}

            {materials.map((mat) => {
              const cat = MATERIAL_CATEGORIES.find((c) => c.value === mat.category);
              return (
                <div key={mat.id} className="rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", cat?.color)}>
                      {cat?.label}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground truncate flex-1">{mat.title}</span>
                    <span className="text-[9px] text-muted-foreground/40 font-mono">
                      {mat.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{mat.content}</p>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* History footer */}
        <div className="shrink-0 border-t border-border/50">
          <div className="px-4 py-2.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Training History
            </h4>
            <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/40">No activity yet</p>
              ) : (
                history.slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                    <span className="text-muted-foreground truncate flex-1">{h.action}</span>
                    <span className="text-muted-foreground/30 font-mono shrink-0">
                      {h.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Synthesized Prompt Draft ══ */}
      <div className="col-span-12 lg:col-span-4 flex flex-col">
        <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-secondary/30 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              Synthesized Prompt Draft
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Structured output from training — UI draft only
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 px-2.5 font-semibold"
            onClick={handleRegenerateDraft}
          >
            <RotateCcw className="h-3 w-3" /> Regenerate
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {!hasDraftContent ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-[12px] text-muted-foreground mb-3">
                  Add training notes and materials, then click "Regenerate" to synthesize a structured prompt draft.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[12px] gap-1.5 font-semibold"
                  onClick={handleRegenerateDraft}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Generate Draft
                </Button>
              </div>
            ) : (
              DRAFT_SECTIONS.map((section) => {
                const isExpanded = expandedSections[section.key] ?? true;
                const value = draft[section.key];
                return (
                  <div key={section.key} className="rounded-xl border border-border bg-background overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/20 transition-colors"
                    >
                      <span className="text-muted-foreground">{section.icon}</span>
                      <span className="text-[12px] font-bold text-foreground flex-1">{section.label}</span>
                      {value ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-status-green shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 shrink-0" />
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        <textarea
                          value={value}
                          onChange={(e) => updateDraftSection(section.key, e.target.value)}
                          placeholder={section.placeholder}
                          rows={3}
                          className="w-full rounded-lg bg-card border border-border/50 px-3 py-2 text-[11px] text-foreground outline-none resize-none leading-relaxed placeholder:text-muted-foreground/30 focus:border-primary/30 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Publish footer */}
        <div className="shrink-0 p-3 border-t border-border/50 space-y-2">
          <Button
            className="w-full h-9 text-[12px] font-bold gap-2"
            disabled={!hasDraftContent}
            title="No backend persistence layer exists yet — this saves to UI state only"
            onClick={() => {
              addHistory("Draft saved (UI draft only)");
            }}
          >
            <Save className="h-3.5 w-3.5" /> Publish UI Draft Only
          </Button>
          <p className="text-[9px] text-muted-foreground/50 text-center leading-snug">
            No canonical prompt persistence exists yet. This draft is local to the current session.
          </p>
        </div>
      </div>
    </div>
  );
}
