// Intake Brief Transfer — localStorage-based frozen brief handoff
// No backend persistence yet; honest local draft behavior.

export interface BriefSectionData {
  key: string;
  title: string;
  content: string;
  confidence: "low" | "medium" | "high";
}

export interface FrozenBrief {
  id: string;
  frozenAt: string;
  sections: BriefSectionData[];
  tokenEstimate: number;
  kickoffStarted: boolean;
}

const STORAGE_KEY = "intake_frozen_brief";

export function saveFrozenBrief(brief: Omit<FrozenBrief, "id" | "frozenAt">): FrozenBrief {
  const frozen: FrozenBrief = {
    ...brief,
    id: crypto.randomUUID(),
    frozenAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(frozen));
  return frozen;
}

export function loadFrozenBrief(): FrozenBrief | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FrozenBrief;
  } catch {
    return null;
  }
}

export function markKickoffStarted(): void {
  const brief = loadFrozenBrief();
  if (brief) {
    brief.kickoffStarted = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
  }
}

export function clearFrozenBrief(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Minimum fields required to freeze a brief */
export function validateBriefForFreeze(sections: BriefSectionData[]): { valid: boolean; missing: string[] } {
  const required = ["goal", "users", "in_scope"];
  const missing = required.filter((key) => {
    const s = sections.find((sec) => sec.key === key);
    return !s || !s.content.trim();
  });
  return { valid: missing.length === 0, missing };
}
