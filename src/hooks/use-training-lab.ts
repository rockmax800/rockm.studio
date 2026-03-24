import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export interface TrainingSession {
  id: string;
  employee_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingMessage {
  id: string;
  session_id: string;
  author_type: string;
  content: string;
  created_at: string;
}

export interface TrainingMaterial {
  id: string;
  session_id: string;
  material_type: string;
  title: string;
  content: string;
  created_at: string;
}

export interface PromptDraft {
  id: string;
  session_id: string;
  version_number: number;
  prompt_markdown: string;
  synthesized_from_session: boolean;
  is_published: boolean;
  created_at: string;
}

export interface TrainingEvent {
  id: string;
  session_id: string;
  event_type: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface PromptSections {
  roleMission: string;
  hardBoundaries: string;
  preferredBehavior: string;
  domainKnowledge: string;
  communicationStyle: string;
  escalationRules: string;
  antiPatterns: string;
  exampleResponses: string;
}

export const EMPTY_SECTIONS: PromptSections = {
  roleMission: "",
  hardBoundaries: "",
  preferredBehavior: "",
  domainKnowledge: "",
  communicationStyle: "",
  escalationRules: "",
  antiPatterns: "",
  exampleResponses: "",
};

function sectionsToMarkdown(s: PromptSections): string {
  return Object.entries(s)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `## ${k.replace(/([A-Z])/g, " $1").trim()}\n${v}`)
    .join("\n\n");
}

function markdownToSections(md: string): PromptSections {
  const result = { ...EMPTY_SECTIONS };
  if (!md) return result;
  const sectionRegex = /^## (.+)$/gm;
  const parts: { key: string; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(md)) !== null) {
    parts.push({ key: match[1].trim(), start: match.index + match[0].length });
  }
  for (let i = 0; i < parts.length; i++) {
    const end = i + 1 < parts.length ? md.lastIndexOf("## ", parts[i + 1].start) : md.length;
    const content = md.slice(parts[i].start, end).trim();
    const normalized = parts[i].key.replace(/\s+/g, "").replace(/^(.)/, (c) => c.toLowerCase());
    if (normalized in result) {
      (result as any)[normalized] = content;
    }
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════ */

export function useTrainingLab(employeeId: string) {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [messages, setMessages] = useState<TrainingMessage[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [drafts, setDrafts] = useState<PromptDraft[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<PromptSections>(EMPTY_SECTIONS);
  const [publishedDraft, setPublishedDraft] = useState<PromptDraft | null>(null);
  const initialized = useRef(false);

  // ── Load or create session ──
  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      // Find active/draft session for this employee
      const { data: existing } = await supabase
        .from("employee_training_sessions" as any)
        .select("*")
        .eq("employee_id", employeeId)
        .in("status", ["draft", "active"])
        .order("updated_at", { ascending: false })
        .limit(1);

      let sess: TrainingSession;
      if (existing && (existing as any[]).length > 0) {
        sess = (existing as any[])[0] as TrainingSession;
      } else {
        const { data: created, error } = await supabase
          .from("employee_training_sessions" as any)
          .insert({ employee_id: employeeId, title: "Training Session", status: "draft" } as any)
          .select()
          .single();
        if (error) throw error;
        sess = created as any as TrainingSession;
      }
      setSession(sess);

      // Load all related data in parallel
      const [msgsRes, matsRes, draftsRes, evtsRes] = await Promise.all([
        supabase.from("employee_training_messages" as any).select("*").eq("session_id", sess.id).order("created_at", { ascending: true }),
        supabase.from("employee_training_materials" as any).select("*").eq("session_id", sess.id).order("created_at", { ascending: false }),
        supabase.from("employee_prompt_drafts" as any).select("*").eq("session_id", sess.id).order("version_number", { ascending: false }),
        supabase.from("employee_training_events" as any).select("*").eq("session_id", sess.id).order("created_at", { ascending: false }).limit(50),
      ]);

      const msgs = (msgsRes.data ?? []) as any as TrainingMessage[];
      const mats = (matsRes.data ?? []) as any as TrainingMaterial[];
      const drfts = (draftsRes.data ?? []) as any as PromptDraft[];
      const evts = (evtsRes.data ?? []) as any as TrainingEvent[];

      setMessages(msgs);
      setMaterials(mats);
      setDrafts(drfts);
      setEvents(evts);

      const published = drfts.find((d) => d.is_published) ?? null;
      setPublishedDraft(published);

      const latestDraft = drfts[0];
      if (latestDraft?.prompt_markdown) {
        setSections(markdownToSections(latestDraft.prompt_markdown));
      }
    } catch (err: any) {
      console.error("Training lab load error:", err);
      toast.error("Failed to load training data");
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, [employeeId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ── Add message ──
  const addMessage = useCallback(async (content: string, authorType: string = "founder") => {
    if (!session) return;
    const { data, error } = await supabase
      .from("employee_training_messages" as any)
      .insert({ session_id: session.id, author_type: authorType, content } as any)
      .select()
      .single();
    if (error) { toast.error("Failed to save message"); return; }
    const msg = data as any as TrainingMessage;
    setMessages((prev) => [...prev, msg]);
    await logEvent("message_added", { author_type: authorType });
  }, [session]);

  // ── Add material ──
  const addMaterial = useCallback(async (title: string, content: string, materialType: string) => {
    if (!session) return;
    const { data, error } = await supabase
      .from("employee_training_materials" as any)
      .insert({ session_id: session.id, material_type: materialType, title, content } as any)
      .select()
      .single();
    if (error) { toast.error("Failed to save material"); return; }
    setMaterials((prev) => [data as any as TrainingMaterial, ...prev]);
    await logEvent("material_added", { material_type: materialType, title });
  }, [session]);

  // ── Save draft ──
  const saveDraft = useCallback(async (newSections: PromptSections, synthesized: boolean = false) => {
    if (!session) return;
    const markdown = sectionsToMarkdown(newSections);
    const nextVersion = drafts.length > 0 ? drafts[0].version_number + 1 : 1;
    const { data, error } = await supabase
      .from("employee_prompt_drafts" as any)
      .insert({
        session_id: session.id,
        version_number: nextVersion,
        prompt_markdown: markdown,
        synthesized_from_session: synthesized,
        is_published: false,
      } as any)
      .select()
      .single();
    if (error) { toast.error("Failed to save draft"); return; }
    const draft = data as any as PromptDraft;
    setDrafts((prev) => [draft, ...prev]);
    setSections(newSections);
    await logEvent(synthesized ? "draft_regenerated" : "draft_saved", { version: nextVersion });
    toast.success(`Draft v${nextVersion} saved`);
    return draft;
  }, [session, drafts]);

  // ── Publish draft ──
  const publishDraft = useCallback(async (draftId: string) => {
    if (!session) return;
    // Unpublish all others first
    await supabase
      .from("employee_prompt_drafts" as any)
      .update({ is_published: false } as any)
      .eq("session_id", session.id);
    // Publish selected
    const { error } = await supabase
      .from("employee_prompt_drafts" as any)
      .update({ is_published: true } as any)
      .eq("id", draftId);
    if (error) { toast.error("Failed to publish draft"); return; }
    setDrafts((prev) => prev.map((d) => ({ ...d, is_published: d.id === draftId })));
    const pub = drafts.find((d) => d.id === draftId) ?? null;
    setPublishedDraft(pub ? { ...pub, is_published: true } : null);
    await logEvent("draft_published", { draft_id: draftId });
    toast.success("Draft published as active training prompt");
  }, [session, drafts]);

  // ── Log event ──
  const logEvent = useCallback(async (eventType: string, payload: Record<string, unknown> = {}) => {
    if (!session) return;
    const { data } = await supabase
      .from("employee_training_events" as any)
      .insert({ session_id: session.id, event_type: eventType, payload_json: payload } as any)
      .select()
      .single();
    if (data) {
      setEvents((prev) => [data as any as TrainingEvent, ...prev]);
    }
  }, [session]);

  // ── Synthesize from materials ──
  const synthesizeDraft = useCallback(async (employeeName: string, roleName: string) => {
    const founderMsgs = messages.filter((m) => m.author_type === "founder").map((m) => m.content);
    const newSections: PromptSections = {
      roleMission: founderMsgs.length > 0
        ? `${employeeName} serves as ${roleName}. ${founderMsgs[0] ? `Primary directive: ${founderMsgs[0].slice(0, 120)}` : "Awaiting founder directives."}`
        : "",
      hardBoundaries: materials.filter((m) => m.material_type === "anti_pattern" || m.material_type === "rule").map((m) => `- ${m.content}`).join("\n") || "No hard boundaries defined yet.",
      preferredBehavior: materials.filter((m) => m.material_type === "note").map((m) => `- ${m.content}`).join("\n") || "No preferences captured yet.",
      domainKnowledge: "Inherited from role contract and project context.",
      communicationStyle: "Default: concise, operational, structured output.",
      escalationRules: "Escalate when confidence < 70% or when scope is ambiguous.",
      antiPatterns: materials.filter((m) => m.material_type === "anti_pattern").map((m) => `- ${m.content}`).join("\n") || "None defined.",
      exampleResponses: materials.filter((m) => m.material_type === "example" || m.material_type === "reference").map((m) => `### ${m.title}\n${m.content}`).join("\n\n") || "No examples provided yet.",
    };
    setSections(newSections);
    await saveDraft(newSections, true);
  }, [messages, materials, saveDraft]);

  // ── Export ──
  const exportAsMarkdown = useCallback((employeeName: string, roleName: string): string => {
    const lines = [
      `# Training Draft — ${employeeName} (${roleName})`,
      `*Exported: ${new Date().toLocaleString()}*`,
      publishedDraft ? `*Published draft: v${publishedDraft.version_number}*` : `*Status: No published draft*`,
      "",
      "## Conversation Notes",
      ...messages.filter((m) => m.author_type === "founder").map((m) => `- ${m.content}`),
      "",
      "## Source Materials",
      ...materials.map((m) => `### [${m.material_type}] ${m.title}\n${m.content}`),
      "",
      "## Synthesized Prompt",
      sectionsToMarkdown(sections),
    ];
    return lines.join("\n\n");
  }, [messages, materials, sections, publishedDraft]);

  return {
    session, messages, materials, drafts, events, sections,
    loading, publishedDraft,
    setSections,
    addMessage, addMaterial, saveDraft, publishDraft, synthesizeDraft,
    logEvent, exportAsMarkdown, reload: loadSession,
  };
}
