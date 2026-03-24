import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Send, Plus, RotateCcw, Save, Clock, FileText,
  MessageSquare, BookOpen, Shield, Brain, Zap, AlertTriangle,
  Ban, Sparkles, ChevronDown, ChevronRight, Download, Copy, Check,
  BadgeCheck, History, Loader2,
} from "lucide-react";
import {
  useTrainingLab, EMPTY_SECTIONS,
  type PromptSections,
} from "@/hooks/use-training-lab";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const DRAFT_SECTIONS: { key: keyof PromptSections; label: string; icon: React.ReactNode; placeholder: string }[] = [
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
  { value: "note", label: "Note", color: "bg-secondary text-muted-foreground" },
  { value: "example", label: "Example", color: "bg-status-green/15 text-status-green" },
  { value: "rule", label: "Rule", color: "bg-status-blue/15 text-status-blue" },
  { value: "anti_pattern", label: "Anti-pattern", color: "bg-destructive/15 text-destructive" },
  { value: "reference", label: "Reference", color: "bg-status-amber/15 text-status-amber" },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface TrainingLabProps {
  employeeId: string;
  employeeName: string;
  roleName: string;
}

export function TrainingLab({ employeeId, employeeName, roleName }: TrainingLabProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const {
    messages, materials, drafts, events, sections, loading,
    publishedDraft, setSections,
    addMessage, addMaterial, saveDraft, publishDraft, synthesizeDraft,
    exportAsMarkdown,
  } = useTrainingLab(employeeId);

  const [inputValue, setInputValue] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialContent, setMaterialContent] = useState("");
  const [materialCategory, setMaterialCategory] = useState("note");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await addMessage(text, "founder");

    setTimeout(async () => {
      await addMessage(
        "Noted. This instruction has been captured. Add it as a material block or regenerate the draft to incorporate it.",
        "system"
      );
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleAddMaterial = async () => {
    if (!materialContent.trim()) return;
    await addMaterial(
      materialTitle.trim() || `${materialCategory} note`,
      materialContent.trim(),
      materialCategory
    );
    setMaterialTitle("");
    setMaterialContent("");
    setShowAddMaterial(false);
  };

  const handleRegenerateDraft = async () => {
    setSaving(true);
    await synthesizeDraft(employeeName, roleName);
    setSaving(false);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveDraft(sections, false);
    setSaving(false);
  };

  const handlePublishLatest = async () => {
    if (drafts.length === 0) return;
    await publishDraft(drafts[0].id);
  };

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleDraftSectionEdit = (key: keyof PromptSections, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = () => {
    const md = exportAsMarkdown(employeeName, roleName);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-draft-${employeeName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Draft exported as markdown");
  };

  const handleCopyPrompt = () => {
    const text = Object.entries(sections)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `## ${k.replace(/([A-Z])/g, " $1").trim()}\n${v}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Prompt copied to clipboard");
  };

  const hasDraftContent = Object.values(sections).some((v) => v.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading training data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {publishedDraft ? (
            <span className="text-[10px] text-status-green flex items-center gap-1 font-medium">
              <BadgeCheck className="h-3 w-3" /> Active prompt: v{publishedDraft.version_number}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
              <Clock className="h-3 w-3" /> No published prompt yet
            </span>
          )}
          <span className="text-[9px] text-muted-foreground/30">•</span>
          <span className="text-[9px] text-muted-foreground/50">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""} · {messages.length} messages · {materials.length} materials
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground" onClick={handleExport} title="Export as markdown">
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2 text-muted-foreground" onClick={handleCopyPrompt} disabled={!hasDraftContent} title="Copy synthesized prompt">
            <Copy className="h-3 w-3" /> Copy prompt
          </Button>
        </div>
      </div>

      {/* 3-column workspace */}
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
              {messages.length === 0 && (
                <div className="rounded-xl bg-muted text-foreground mr-6 px-3.5 py-2.5 text-[13px] leading-relaxed">
                  <p>Training Lab for {employeeName} ({roleName}). Write instructions below — they will be captured as training material.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    msg.author_type === "founder"
                      ? "bg-primary text-primary-foreground ml-6"
                      : "bg-muted text-foreground mr-6"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className={cn(
                    "text-[9px] block mt-1.5",
                    msg.author_type === "founder" ? "text-primary-foreground/40" : "text-muted-foreground/40"
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 shrink-0"
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
                Notes, examples, rules, anti-patterns
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5 font-semibold" onClick={() => setShowAddMaterial(true)}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {showAddMaterial && (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 space-y-2.5">
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
                      onChange={(e) => setMaterialCategory(e.target.value)}
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
                    No materials yet. Add notes, examples, or anti-patterns.
                  </p>
                </div>
              )}

              {materials.map((mat) => {
                const cat = MATERIAL_CATEGORIES.find((c) => c.value === mat.material_type);
                return (
                  <div key={mat.id} className="rounded-xl border border-border bg-background p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", cat?.color)}>
                        {cat?.label ?? mat.material_type}
                      </span>
                      <span className="text-[12px] font-semibold text-foreground truncate flex-1">{mat.title}</span>
                      <span className="text-[9px] text-muted-foreground/40 font-mono">
                        {new Date(mat.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{mat.content}</p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Event log footer */}
          <div className="shrink-0 border-t border-border/50">
            <div className="px-4 py-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1.5 flex items-center gap-1">
                <History className="h-3 w-3" /> Training Event Log
              </h4>
              <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/40">No activity yet</p>
                ) : (
                  events.slice(0, 8).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                      <span className="text-muted-foreground truncate flex-1">{ev.event_type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground/30 font-mono shrink-0">
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                {drafts.length > 0 ? `v${drafts[0].version_number} — ${drafts[0].synthesized_from_session ? "auto-synthesized" : "manual"}` : "No drafts yet"}
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5 font-semibold" onClick={handleRegenerateDraft} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Regenerate
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {/* Published prompt indicator */}
              {publishedDraft && (
                <div className="rounded-xl border border-status-green/30 bg-status-green/5 px-3.5 py-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-status-green shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-status-green">Current active training prompt</p>
                      <p className="text-[10px] text-muted-foreground">
                        v{publishedDraft.version_number} · published {new Date(publishedDraft.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!hasDraftContent ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Add training notes and materials, then click "Regenerate" to synthesize a structured prompt draft.
                  </p>
                  <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 font-semibold" onClick={handleRegenerateDraft} disabled={saving}>
                    <RotateCcw className="h-3.5 w-3.5" /> Generate Draft
                  </Button>
                </div>
              ) : (
                DRAFT_SECTIONS.map((section) => {
                  const isExpanded = expandedSections[section.key] ?? true;
                  const value = sections[section.key];
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
                        {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/40" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3">
                          <textarea
                            value={value}
                            onChange={(e) => handleDraftSectionEdit(section.key, e.target.value)}
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

              {/* Revision history */}
              {drafts.length > 1 && (
                <div className="mt-4 rounded-xl border border-border bg-background p-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-2 flex items-center gap-1">
                    <History className="h-3 w-3" /> Revision History
                  </h4>
                  <div className="space-y-1">
                    {drafts.slice(0, 10).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-[10px]">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          d.is_published ? "bg-status-green" : "bg-muted-foreground/30"
                        )} />
                        <span className="text-muted-foreground flex-1">
                          v{d.version_number} — {d.synthesized_from_session ? "synthesized" : "manual"}
                          {d.is_published && " · published"}
                        </span>
                        <span className="text-muted-foreground/30 font-mono shrink-0">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="shrink-0 p-3 border-t border-border/50 space-y-2">
            <div className="flex gap-2">
              <Button
                className="flex-1 h-9 text-[12px] font-bold gap-2"
                disabled={!hasDraftContent || saving}
                onClick={handleSaveDraft}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Draft
              </Button>
              <Button
                variant="outline"
                className="h-9 text-[12px] font-bold gap-2 px-4"
                disabled={!hasDraftContent || drafts.length === 0}
                onClick={handlePublishLatest}
              >
                <BadgeCheck className="h-3.5 w-3.5" /> Publish
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground/50 text-center leading-snug">
              Persisted to database · Unpublished drafts are not applied to delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
