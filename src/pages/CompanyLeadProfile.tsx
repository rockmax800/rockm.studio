import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { TrainingLab } from "@/components/employees/TrainingLab";
import { MemorySummaryPanel, type MemoryCategory } from "@/components/employees/MemorySummaryPanel";
import { GuidancePackPanel } from "@/components/employees/GuidancePackPanel";
import { InstinctSettingsPanel } from "@/components/employees/InstinctSettingsPanel";
import { SkillPackPanel } from "@/components/employees/SkillPackPanel";
import { DEFAULT_GUIDANCE_DIMENSIONS, type GuidanceDimension } from "@/types/skill-pack";
import { DEFAULT_INSTINCT_SETTINGS, type InstinctSetting } from "@/types/instinct-settings";
import {
  COMPANY_LEAD_IDENTITY as LEAD,
  LEAD_PERSISTENCE_NOTE,
  LEAD_SESSION_ROUTE,
} from "@/lib/company-lead-identity";

import {
  Brain, GraduationCap, AlertTriangle, Pencil, ChevronDown, ChevronRight,
  BookOpen, Lightbulb, FileCode, Plus, Lock, Unlock, Shield,
  ArrowLeft, Target, MessageSquare, Briefcase, Info, Package, Sliders,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MEMORY CATEGORIES (UI-level — same pattern as employees)
   ═══════════════════════════════════════════════════════════ */

const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  contract: { label: "Contract", cls: "bg-secondary text-muted-foreground" },
  manual: { label: "Manual", cls: "bg-status-amber/15 text-status-amber" },
  learning: { label: "Learned", cls: "bg-status-green/15 text-status-green" },
  correction: { label: "Correction", cls: "bg-destructive/15 text-destructive" },
};

const memoryCategories: MemoryCategory[] = [
  {
    key: "core_knowledge", title: "Core Knowledge", icon: <BookOpen className="h-3.5 w-3.5" />,
    description: "Permanent operational rules from contracts and system defaults.",
    items: [
      { text: "Always extract scope, risks, and constraints before estimate", desc: "Fundamental consultation discipline", updated: "system", source: "contract" },
      { text: "Simulate team consultation (Architect, QA, Reviewer) before presenting estimates", desc: "Multi-perspective validation requirement", updated: "system", source: "contract" },
      { text: "Present cost, timeline, and token budget transparently to founder", desc: "Founder trust principle", updated: "system", source: "contract" },
      { text: "Never auto-create blueprints — always require founder approval", desc: "Safety constraint", updated: "system", source: "contract" },
    ],
  },
  {
    key: "consultation_patterns", title: "Consultation Patterns", icon: <Target className="h-3.5 w-3.5" />,
    description: "Learned patterns for effective client conversations.",
    items: [
      { text: "Ask about business objectives before technical requirements", desc: "Ensures goal alignment", updated: "1 week ago", source: "learning" },
      { text: "Flag timeline constraints early — they affect scope recommendations", desc: "Avoids late-stage scope cuts", updated: "5 days ago", source: "learning" },
      { text: "Recommend phased delivery when module count exceeds 3", desc: "Risk mitigation pattern", updated: "3 days ago", source: "learning" },
    ],
  },
  {
    key: "project_memory", title: "Project-Specific Memory", icon: <FileCode className="h-3.5 w-3.5" />,
    description: "Context retained per project — scoped to active engagements.",
    items: [
      { text: "Founder prefers conservative estimates over optimistic ones", desc: "Calibrated from past briefing sessions", updated: "2 days ago", source: "manual" },
      { text: "Always include QA Agent in required roles for high-complexity projects", desc: "Quality standard", updated: "1 week ago", source: "manual" },
    ],
  },
  {
    key: "learned_patterns", title: "Learned Patterns", icon: <Lightbulb className="h-3.5 w-3.5" />,
    description: "Reusable insights promoted from training sessions or review feedback.",
    items: [
      { text: "Structured intake questions produce better scope extraction than open conversation", desc: "Discovered through session analysis", updated: "4 days ago", source: "learning" },
      { text: "Present team consultation results before estimates — builds founder confidence", desc: "Improved approval rates", updated: "2 days ago", source: "learning" },
    ],
  },
  {
    key: "failure_corrections", title: "Failure Corrections", icon: <AlertTriangle className="h-3.5 w-3.5" />,
    description: "Specific corrections from past failures — prevents repeat mistakes.",
    items: [
      { text: "Underestimated integration complexity on multi-API project", desc: "Correction: Add 30% buffer for integration-heavy scopes", updated: "1 week ago", source: "correction" },
    ],
  },
  {
    key: "manual_overrides", title: "Manual Overrides", icon: <Pencil className="h-3.5 w-3.5" />,
    description: "Founder-enforced rules that override all other behavior.",
    items: [
      { text: "Always present 'Revise' option alongside 'Approve' — never push for immediate approval", desc: "Founder override — consultation tone", updated: "3 days ago", source: "manual" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function CompanyLeadProfile() {
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("core_knowledge");
  const [attachedSkillPacks, setAttachedSkillPacks] = useState<string[]>([]);
  const [guidanceDimensions, setGuidanceDimensions] = useState<GuidanceDimension[]>(
    () => DEFAULT_GUIDANCE_DIMENSIONS.map((d) => ({ ...d }))
  );
  const [instinctSettings, setInstinctSettings] = useState<InstinctSetting[]>(
    () => DEFAULT_INSTINCT_SETTINGS.map((s) => ({ ...s }))
  );
  const toggleMemory = (key: string) => setExpandedMemory((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalMemoryEntries = memoryCategories.reduce((s, c) => s + c.items.length, 0);

  return (
    <AppLayout title="Navigator — Company Lead" fullHeight>
      <ScrollArea className="h-full">
        <div className="px-6 lg:px-8 py-5 space-y-5 max-w-[1100px]">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Command Center
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">{LEAD.name}</span>
          </div>

          {/* ═══ TRAINABILITY NOTE ═══ */}
          <div className="flex items-start gap-2.5 px-4 py-2.5 rounded-lg bg-primary/[0.04] border border-primary/10">
            <Info className="h-3.5 w-3.5 text-primary/50 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-primary/70 leading-relaxed">
                <span className="font-bold">Company Lead guidance is founder-trainable</span> like any other strategic agent.
                Use the Training Lab, Skill Packs, and Instinct Settings below to shape consultation behavior.
              </p>
              <p className="text-[10px] text-muted-foreground/40 mt-1 italic">{LEAD_PERSISTENCE_NOTE}</p>
            </div>
          </div>

          {/* ═══ TRAINING MODE BANNER ═══ */}
          {trainingMode && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-status-amber/5 border border-status-amber/15">
              <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse" />
              <span className="text-[11px] font-bold text-status-amber">Training Mode Active</span>
              <span className="text-[11px] text-muted-foreground/60">— Memory editable, changes staged</span>
              {pendingUpdates.length > 0 && (
                <span className="ml-auto text-[10px] font-mono text-status-amber">{pendingUpdates.length} pending</span>
              )}
            </div>
          )}

          {/* ═══ HEADER ═══ */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img src={LEAD.avatar} alt={LEAD.name}
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-border/30 ring-offset-1 ring-offset-background"
                width={56} height={56} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-status-green" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[18px] font-bold text-foreground tracking-tight leading-tight">{LEAD.name}</h1>
                <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 h-auto">Active</Badge>
                <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 h-auto gap-1 border-border/40">
                  <Briefcase className="h-3 w-3" /> {LEAD.persona}
                </Badge>
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {LEAD.role}
                <span className="text-muted-foreground/30 mx-1.5">·</span>
                {LEAD.model}
                <span className="text-muted-foreground/30 mx-1.5">·</span>
                {LEAD.provider}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1 max-w-lg leading-relaxed">
                {LEAD.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={trainingMode ? "outline" : "secondary"}
                className="h-8 text-[11px] font-semibold gap-1.5 px-3"
                onClick={() => setTrainingMode(!trainingMode)}
              >
                {trainingMode ? <><Lock className="h-3.5 w-3.5" /> Exit Training</> : <><GraduationCap className="h-3.5 w-3.5" /> Train</>}
              </Button>
              <Link to={LEAD_SESSION_ROUTE}>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 px-3">
                  <MessageSquare className="h-3.5 w-3.5" /> Open Session
                </Button>
              </Link>
            </div>
          </div>

          {/* ═══ CAPABILITIES ═══ */}
          <Section icon={<Shield className="h-4 w-4" />} title="Capabilities" subtitle="What this agent handles">
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {LEAD.capabilities.map((cap) => (
                  <div key={cap.label} className="px-3 py-2.5 rounded-lg bg-secondary/30 border border-border/20">
                    <p className="text-[12px] font-bold text-foreground">{cap.label}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══ MEMORY SUMMARY ═══ */}
          <MemorySummaryPanel
            categories={memoryCategories}
            lastTrainingUpdate={null}
            hasActiveGuidance={attachedSkillPacks.length > 0 || guidanceDimensions.some((d) => d.value !== 3)}
          />

          {/* ═══ MEMORY ═══ */}
          <Section icon={<Brain className="h-4 w-4" />} title="Operational Memory"
            subtitle={trainingMode ? "Click entries to edit — changes staged until saved" : `${memoryCategories.length} categories · ${totalMemoryEntries} entries`}>
            <div className="space-y-1.5">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`rounded-xl border overflow-hidden bg-card ${trainingMode ? "border-status-amber/15" : "border-border/40"}`}>
                    <button onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-secondary/15 transition-colors">
                      <span className="text-muted-foreground/50">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-bold text-foreground">{cat.title}</span>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">{cat.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/40 font-mono">{cat.items.length}</span>
                      {cat.items.length > 0 && (
                        <span className="text-[9px] text-muted-foreground/25">{cat.items[0].updated}</span>
                      )}
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/30" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 pt-0 border-t border-border/15">
                        <div className="space-y-0 mt-1.5">
                          {cat.items.map((item, i) => {
                            const sb = SOURCE_BADGE[item.source] ?? SOURCE_BADGE.contract;
                            return (
                              <div key={i} className="flex items-start gap-2 group py-1.5 px-2.5 rounded-lg hover:bg-secondary/10 transition-colors">
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/20 mt-2 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] text-foreground leading-relaxed">{item.text}</p>
                                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">{item.desc}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sb.cls}`}>{sb.label}</span>
                                    <span className="text-[9px] text-muted-foreground/30">{item.updated}</span>
                                  </div>
                                </div>
                                {trainingMode && (
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <Pencil className="h-3 w-3 text-muted-foreground/40 hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {trainingMode && (
                          <button className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors font-medium px-2.5"
                            onClick={() => setNewRuleCategory(cat.key)}>
                            <Plus className="h-3 w-3" /> Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ═══ SKILL PACKS & GUIDANCE ═══ */}
          <Section icon={<Package className="h-4 w-4" />} title="Skill Packs & Guidance"
            subtitle="Reusable capability bundles and active behavior configuration">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-7 rounded-xl border border-border/40 bg-card p-4">
                <SkillPackPanel
                  employeeName={LEAD.name}
                  attachedIds={attachedSkillPacks}
                  onToggle={(id) => setAttachedSkillPacks((prev) =>
                    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                  )}
                />
              </div>
              <div className="col-span-12 lg:col-span-5 rounded-xl border border-border/40 bg-card p-4">
                <GuidancePackPanel
                  employeeName={LEAD.name}
                  dimensions={guidanceDimensions}
                  onDimensionChange={(key, value) =>
                    setGuidanceDimensions((prev) =>
                      prev.map((d) => d.key === key ? { ...d, value } : d)
                    )
                  }
                  attachedSkillPackIds={attachedSkillPacks}
                  hasPublishedPrompt={false}
                />
              </div>
            </div>
          </Section>

          {/* ═══ INSTINCT SETTINGS ═══ */}
          <Section icon={<Sliders className="h-4 w-4" />} title="Instinct Settings"
            subtitle="Explicit founder-controlled behavior preferences — not self-adjusting">
            <InstinctSettingsPanel
              settings={instinctSettings}
              onChange={(key, value) =>
                setInstinctSettings((prev) =>
                  prev.map((s) => s.key === key ? { ...s, value: value as any } : s)
                )
              }
            />
          </Section>

          {/* ═══ TRAINING LAB ═══ */}
          <Section icon={<GraduationCap className="h-4 w-4" />} title="Training Lab"
            subtitle="Conversation, notes, and structured prompt drafting">
            {!trainingMode ? (
              <div className="rounded-xl border border-border/40 bg-card px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Open Training Lab</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    Enter training mode to teach the Company Lead through conversation, add materials, and refine its consultation prompt.
                  </p>
                </div>
                <Button size="sm" className="h-8 text-[11px] font-semibold gap-1.5 px-4 shrink-0 bg-foreground text-background hover:bg-foreground/90" onClick={() => setTrainingMode(true)}>
                  <Unlock className="h-3.5 w-3.5" /> Open
                </Button>
              </div>
            ) : (
              <TrainingLab employeeId={LEAD.id} employeeName={LEAD.name} roleName={LEAD.role} />
            )}
          </Section>

          <div className="h-4" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/50">{icon}</span>
        <h2 className="text-[15px] font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground/40 ml-1">— {subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
