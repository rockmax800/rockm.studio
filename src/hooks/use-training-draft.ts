import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   Types — shared with TrainingLab
   ═══════════════════════════════════════════════════════════ */

export interface TrainingMessage {
  id: string;
  role: "founder" | "system";
  content: string;
  timestamp: string; // ISO string for serialization
}

export interface MaterialBlock {
  id: string;
  title: string;
  content: string;
  category: "preference" | "example" | "anti-pattern" | "expectation" | "note";
  timestamp: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: string;
}

export interface PromptDraft {
  roleMission: string;
  hardBoundaries: string;
  preferredBehavior: string;
  domainKnowledge: string;
  communicationStyle: string;
  escalationRules: string;
  antiPatterns: string;
  exampleResponses: string;
}

export interface TrainingDraftState {
  messages: TrainingMessage[];
  materials: MaterialBlock[];
  draft: PromptDraft;
  history: HistoryEntry[];
  lastUpdated: string | null;
}

export const EMPTY_DRAFT: PromptDraft = {
  roleMission: "",
  hardBoundaries: "",
  preferredBehavior: "",
  domainKnowledge: "",
  communicationStyle: "",
  escalationRules: "",
  antiPatterns: "",
  exampleResponses: "",
};

const STORAGE_PREFIX = "training-lab-draft-";

function storageKey(employeeId: string) {
  return `${STORAGE_PREFIX}${employeeId}`;
}

function loadState(employeeId: string): TrainingDraftState | null {
  try {
    const raw = localStorage.getItem(storageKey(employeeId));
    if (!raw) return null;
    return JSON.parse(raw) as TrainingDraftState;
  } catch {
    return null;
  }
}

function saveState(employeeId: string, state: TrainingDraftState) {
  try {
    localStorage.setItem(storageKey(employeeId), JSON.stringify(state));
  } catch {
    // localStorage full — silently fail
  }
}

/* ═══════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════ */

export function useTrainingDraft(employeeId: string, employeeName: string, roleName: string) {
  const introMessage: TrainingMessage = {
    id: "sys-intro",
    role: "system",
    content: `Training Lab for ${employeeName} (${roleName}). Use this workspace to teach behavioral preferences, add examples, and refine the synthesized prompt draft.\n\nWrite instructions below — they will be captured as training material.`,
    timestamp: new Date().toISOString(),
  };

  const [messages, setMessages] = useState<TrainingMessage[]>([introMessage]);
  const [materials, setMaterials] = useState<MaterialBlock[]>([]);
  const [draft, setDraft] = useState<PromptDraft>(EMPTY_DRAFT);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState(employeeId);
    if (saved) {
      setMessages(saved.messages.length > 0 ? saved.messages : [introMessage]);
      setMaterials(saved.materials);
      setDraft(saved.draft);
      setHistory(saved.history);
      setLastUpdated(saved.lastUpdated);
    }
    initialized.current = true;
  }, [employeeId]);

  // Autosave on state changes (debounced)
  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const now = new Date().toISOString();
      const state: TrainingDraftState = { messages, materials, draft, history, lastUpdated: now };
      saveState(employeeId, state);
      setLastUpdated(now);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, materials, draft, history, employeeId]);

  const addHistory = useCallback((action: string) => {
    setHistory((prev) => [{ id: `h-${Date.now()}`, action, timestamp: new Date().toISOString() }, ...prev]);
  }, []);

  const addMessage = useCallback((msg: TrainingMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const addMaterial = useCallback((mat: MaterialBlock) => {
    setMaterials((prev) => [...prev, mat]);
  }, []);

  const updateDraft = useCallback((d: PromptDraft) => {
    setDraft(d);
  }, []);

  const updateDraftSection = useCallback((key: keyof PromptDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setMessages([introMessage]);
    setMaterials([]);
    setDraft(EMPTY_DRAFT);
    setHistory((prev) => [{ id: `h-${Date.now()}`, action: "Draft reset", timestamp: new Date().toISOString() }, ...prev]);
    localStorage.removeItem(storageKey(employeeId));
    setLastUpdated(null);
  }, [employeeId, introMessage]);

  const exportAsMarkdown = useCallback((): string => {
    const sections = [
      `# Training Draft — ${employeeName} (${roleName})`,
      `*Exported: ${new Date().toLocaleString()}*`,
      `*Status: Local draft only — not published to canonical team memory*`,
      "",
      "## Conversation Notes",
      ...messages.filter((m) => m.role === "founder").map((m) => `- ${m.content}`),
      "",
      "## Source Materials",
      ...materials.map((m) => `### [${m.category}] ${m.title}\n${m.content}`),
      "",
      "## Synthesized Prompt",
      ...(Object.entries(draft) as [keyof PromptDraft, string][])
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => `### ${k.replace(/([A-Z])/g, " $1").trim()}\n${v}`),
    ];
    return sections.join("\n\n");
  }, [messages, materials, draft, employeeName, roleName]);

  const copySynthesizedPrompt = useCallback((): string => {
    return (Object.entries(draft) as [keyof PromptDraft, string][])
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `## ${k.replace(/([A-Z])/g, " $1").trim()}\n${v}`)
      .join("\n\n");
  }, [draft]);

  return {
    messages, materials, draft, history, lastUpdated, saveStatus,
    setMessages, addMessage, addMaterial, updateDraft, updateDraftSection,
    addHistory, resetAll, exportAsMarkdown, copySynthesizedPrompt,
  };
}
