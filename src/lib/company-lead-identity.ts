// Centralized Company Lead identity — single source of truth
// This is a UI-level strategic persona; no persistent DB record yet.
// Labeled honestly as internal persona state.

import leadAvatar from "@/assets/pixel/lead-avatar.png";

export const COMPANY_LEAD_IDENTITY = {
  id: "company-lead",
  name: "Navigator",
  role: "AI Delivery Director",
  persona: "Company Lead",
  status: "active" as const,
  description:
    "Coordinates all capabilities and team members. Conducts project briefings, scope extraction, team consultation, and estimate generation.",
  model: "gpt-5",
  provider: "openai",
  avatar: leadAvatar,

  /** Capabilities this agent covers */
  capabilities: [
    { label: "Project Briefing", desc: "Structured scope extraction" },
    { label: "Team Consultation", desc: "Simulated expert review" },
    { label: "Cost Estimation", desc: "Token & budget projections" },
    { label: "Blueprint Preparation", desc: "Pre-kickoff synthesis" },
  ] as const,
} as const;

/** Persistence disclaimer shown in profile UI */
export const LEAD_PERSISTENCE_NOTE =
  "Company Lead is an internal strategic persona. Its memory and guidance are currently UI-level drafts — not backed by a persistent DB record. Train and inspect it like any other agent; canonical persistence will be wired when the backend path is ready.";

/** Profile route */
export const LEAD_PROFILE_ROUTE = "/lead/profile";
/** Session route */
export const LEAD_SESSION_ROUTE = "/lead";
