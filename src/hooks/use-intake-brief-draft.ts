import { useState, useCallback } from "react";
import {
  type FrozenBrief,
  type BriefSectionData,
  saveFrozenBrief,
  loadFrozenBrief,
  clearFrozenBrief,
  validateBriefForFreeze,
  markKickoffStarted,
} from "@/lib/intake-brief-transfer";

export type BriefPhase = "drafting" | "frozen" | "kickoff-started";

export function useIntakeBriefDraft() {
  const [frozenBrief, setFrozenBrief] = useState<FrozenBrief | null>(() => loadFrozenBrief());

  const phase: BriefPhase = frozenBrief
    ? frozenBrief.kickoffStarted
      ? "kickoff-started"
      : "frozen"
    : "drafting";

  const freeze = useCallback((sections: BriefSectionData[], tokenEstimate: number): { success: boolean; missing: string[] } => {
    const { valid, missing } = validateBriefForFreeze(sections);
    if (!valid) return { success: false, missing };
    const brief = saveFrozenBrief({ sections, tokenEstimate, kickoffStarted: false });
    setFrozenBrief(brief);
    return { success: true, missing: [] };
  }, []);

  const startKickoff = useCallback(() => {
    markKickoffStarted();
    setFrozenBrief((prev) => prev ? { ...prev, kickoffStarted: true } : prev);
  }, []);

  const reset = useCallback(() => {
    clearFrozenBrief();
    setFrozenBrief(null);
  }, []);

  return { frozenBrief, phase, freeze, startKickoff, reset };
}
