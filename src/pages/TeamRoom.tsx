import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  HelpCircle,
  ListChecks,
  Layers,
  Target,
  Coins,
  SkipForward,
  Snowflake,
  Square,
  Send,
  Pencil,
  BarChart3,
  Shield,
} from "lucide-react";

// ── Role definitions (persona layer — UI only) ─────────────────
const MEETING_ROLES = [
  { code: "product_strategist", name: "Product Strategist", short: "PS" },
  { code: "solution_architect", name: "Solution Architect", short: "SA" },
  { code: "frontend_builder", name: "Frontend Builder", short: "FB" },
  { code: "backend_architect", name: "Backend Architect", short: "BA" },
  { code: "reviewer", name: "Reviewer", short: "RV" },
  { code: "qa_agent", name: "QA Agent", short: "QA" },
  { code: "release_coordinator", name: "Release Coord", short: "RC" },
] as const;

type RoleCode = (typeof MEETING_ROLES)[number]["code"];
type EntryType = "scope" | "architecture" | "risk" | "question" | "task" | "general";

interface TranscriptEntry {
  id: string;
  roleCode: RoleCode;
  content: string;
  timestamp: string;
  tokenCost: number;
  type: EntryType;
}

interface ExtractionItem {
  text: string;
  confidence: "high" | "medium" | "low";
}

interface ExtractionState {
  scope: ExtractionItem[];
  architectureNotes: ExtractionItem[];
  taskBreakdown: ExtractionItem[];
  risks: ExtractionItem[];
  openQuestions: ExtractionItem[];
  estimatedComplexity: string;
}

function getRoleMeta(code: string) {
  return MEETING_ROLES.find((r) => r.code === code) ?? MEETING_ROLES[0];
}

function getRoleStatus(code: string, activeSpeakerCode: string): "speaking" | "idle" {
  return code === activeSpeakerCode ? "speaking" : "idle";
}

// ── Simulated data ────
const INITIAL_TRANSCRIPT: TranscriptEntry[] = [
  {
    id: "1", roleCode: "product_strategist",
    content: "The project goal is to build an AI-powered delivery system. Core value: automate task assignment and execution with quality gates.",
    timestamp: new Date(Date.now() - 300_000).toISOString(), tokenCost: 320, type: "scope",
  },
  {
    id: "2", roleCode: "solution_architect",
    content: "I recommend a layered architecture: Intent → Delivery → Knowledge → Experience. Each layer has strict boundary isolation.",
    timestamp: new Date(Date.now() - 240_000).toISOString(), tokenCost: 480, type: "architecture",
  },
  {
    id: "3", roleCode: "reviewer",
    content: "Risk: without contract enforcement, agents may overwrite files outside their domain. We need path-level restrictions.",
    timestamp: new Date(Date.now() - 180_000).toISOString(), tokenCost: 290, type: "risk",
  },
  {
    id: "4", roleCode: "frontend_builder",
    content: "For the Experience layer, I propose a 12-column grid system with semantic design tokens. All pages follow the cockpit pattern.",
    timestamp: new Date(Date.now() - 120_000).toISOString(), tokenCost: 350, type: "architecture",
  },
  {
    id: "5", roleCode: "qa_agent",
    content: "We need protected evaluation scenarios that cannot be bypassed. Every prompt change must pass baseline comparison before promotion.",
    timestamp: new Date(Date.now() - 60_000).toISOString(), tokenCost: 260, type: "risk",
  },
];

const INITIAL_EXTRACTION: ExtractionState = {
  scope: [
    { text: "AI-powered delivery system", confidence: "high" },
    { text: "Automated task assignment with quality gates", confidence: "high" },
    { text: "Turn-based structured agent collaboration", confidence: "medium" },
  ],
  architectureNotes: [
    { text: "4-layer architecture: Intent → Delivery → Knowledge → Experience", confidence: "high" },
    { text: "Strict boundary isolation between layers", confidence: "high" },
    { text: "12-column grid system for Experience layer", confidence: "medium" },
  ],
  taskBreakdown: [
    { text: "Implement role contract enforcement", confidence: "medium" },
    { text: "Build path-level restriction system", confidence: "medium" },
  ],
  risks: [
    { text: "Agents may overwrite files outside domain without contract enforcement", confidence: "high" },
    { text: "Prompt changes could degrade quality without baseline comparison", confidence: "high" },
  ],
  openQuestions: [
    { text: "Path-level restriction implementation approach?", confidence: "medium" },
    { text: "Baseline comparison threshold values?", confidence: "low" },
  ],
  estimatedComplexity: "High — multi-layer system with enforcement",
};

const TYPE_META: Record<EntryType, { label: string; cls: string }> = {
  scope: { label: "Scope", cls: "text-blue-600 bg-blue-500/10" },
  architecture: { label: "Arch", cls: "text-violet-600 bg-violet-500/10" },
  risk: { label: "Risk", cls: "text-red-600 bg-red-500/10" },
  question: { label: "Question", cls: "text-amber-600 bg-amber-500/10" },
  task: { label: "Task", cls: "text-green-600 bg-green-500/10" },
  general: { label: "General", cls: "text-muted-foreground bg-secondary" },
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-green-500",
  medium: "bg-amber-500",
  low: "bg-red-400",
};

export default function TeamRoom() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(INITIAL_TRANSCRIPT);
  const [extraction] = useState<ExtractionState>(INITIAL_EXTRACTION);
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const tokensByRole: Record<string, number> = {};
  transcript.forEach((e) => {
    tokensByRole[e.roleCode] = (tokensByRole[e.roleCode] ?? 0) + e.tokenCost;
  });

  const lastSpeakerCode = transcript.length > 0 ? transcript[transcript.length - 1].roleCode : "";

  useQuery({
    queryKey: ["meeting-roles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_roles")
        .select("id, code, name, status")
        .eq("status", "active")
        .limit(10);
      return data ?? [];
    },
  });

  const handleFounderClarify = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    const entry: TranscriptEntry = {
      id: `f-${Date.now()}`,
      roleCode: "product_strategist",
      content: `[Founder] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(),
      tokenCost: 0,
      type: "general",
    };
    setTranscript((prev) => [...prev, entry]);
    setFounderInput("");
  }, [founderInput, meetingStatus]);

  return (
    <AppLayout title="Team Session" fullHeight>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── TOP BAR ──────────────────────────────────────── */}
        <div className="px-6 py-2.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">Team Session</h2>
            <Badge variant="secondary" className="text-[10px]">Blueprint Scoping</Badge>
            <Badge
              variant={meetingStatus === "active" ? "default" : "secondary"}
              className="text-[10px] font-medium gap-1"
            >
              {meetingStatus === "active" && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
              {meetingStatus === "frozen" && <Snowflake className="h-3 w-3" />}
              {meetingStatus === "ended" && <Square className="h-3 w-3" />}
              {meetingStatus === "active" ? "Active" : meetingStatus === "frozen" ? "Frozen" : "Ended"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-2">
              <Coins className="h-3 w-3" />
              <span className="font-semibold font-mono">{totalTokens.toLocaleString()}</span> tokens
            </span>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" disabled={meetingStatus !== "active"}>
              <Coins className="h-3 w-3" /> Cap
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" disabled={meetingStatus !== "active"}>
              <SkipForward className="h-3 w-3" /> Skip
            </Button>
            <Button
              size="sm" variant="outline" className="h-7 text-[10px] gap-1"
              onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}
            >
              <Snowflake className="h-3 w-3" /> Freeze
            </Button>
            <Button
              size="sm" variant="outline"
              className="h-7 text-[10px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}
            >
              <Square className="h-3 w-3" /> End
            </Button>
          </div>
        </div>

        {/* ── ROLE STRIP ───────────────────────────────────── */}
        <div className="px-6 py-1.5 border-b border-border/30 flex items-center gap-1 bg-secondary/20">
          {MEETING_ROLES.map((role) => {
            const status = getRoleStatus(role.code, lastSpeakerCode);
            const tokens = tokensByRole[role.code] ?? 0;
            return (
              <div
                key={role.code}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
                  status === "speaking"
                    ? "bg-foreground/5 text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                <span className="font-mono text-[10px] font-semibold bg-muted px-1 rounded">
                  {role.short}
                </span>
                <span className="hidden xl:inline">{role.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status === "speaking" ? "bg-green-500 animate-pulse" : "bg-muted-foreground/20"
                  }`}
                />
                {tokens > 0 && (
                  <span className="text-[9px] text-muted-foreground/60 font-mono">{tokens}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── MAIN 2-PANEL LAYOUT (7 / 5) ──────────────────── */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">
          {/* LEFT: Structured Transcript (7 cols) */}
          <div className="col-span-7 border-r border-border/40 flex flex-col min-h-0">
            <div className="px-5 py-2 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-foreground">Session Transcript</h3>
              <span className="text-[10px] text-muted-foreground">{transcript.length} turns</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="divide-y divide-border/20">
                {transcript.map((entry) => {
                  const role = getRoleMeta(entry.roleCode);
                  const typeMeta = TYPE_META[entry.type];
                  return (
                    <div key={entry.id} className="px-5 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-semibold bg-muted px-1 rounded">
                          {role.short}
                        </span>
                        <span className="text-[12px] font-medium text-foreground">{role.name}</span>
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${typeMeta.cls}`}>
                          {typeMeta.label}
                        </Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground/50">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5 font-mono">
                          <Coins className="h-2.5 w-2.5" />{entry.tokenCost}
                        </span>
                      </div>
                      <p className="text-[12px] text-foreground/80 leading-relaxed pl-6">
                        {entry.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* ── BOTTOM COMPOSER ───────────────────────── */}
            <div className="border-t border-border/40 px-5 py-2.5 flex items-center gap-2 bg-secondary/10">
              <Input
                value={founderInput}
                onChange={(e) => setFounderInput(e.target.value)}
                placeholder="Clarify or redirect…"
                className="h-8 text-[12px] bg-background flex-1"
                disabled={meetingStatus !== "active"}
                onKeyDown={(e) => e.key === "Enter" && handleFounderClarify()}
              />
              <Button
                size="sm"
                className="h-8 gap-1 text-[11px] px-3"
                onClick={handleFounderClarify}
                disabled={meetingStatus !== "active" || !founderInput.trim()}
              >
                <Send className="h-3 w-3" /> Clarify
              </Button>
            </div>
          </div>

          {/* RIGHT: Extraction Panel (5 cols) */}
          <div className="col-span-5 flex flex-col min-h-0 bg-secondary/10">
            <div className="px-5 py-2 border-b border-border/30 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-foreground">Structured Output</h3>
              {meetingStatus === "frozen" && (
                <Badge variant="secondary" className="text-[9px] gap-1">
                  <Snowflake className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <ExtractionCard
                  title="Scope"
                  icon={<Target className="h-3.5 w-3.5" />}
                  items={extraction.scope}
                  accentClass="border-t-blue-500"
                />
                <ExtractionCard
                  title="Architecture Notes"
                  icon={<Layers className="h-3.5 w-3.5" />}
                  items={extraction.architectureNotes}
                  accentClass="border-t-violet-500"
                />
                <ExtractionCard
                  title="Task Breakdown"
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  items={extraction.taskBreakdown}
                  accentClass="border-t-green-500"
                  emptyText="No tasks extracted yet"
                />
                <ExtractionCard
                  title="Risks"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  items={extraction.risks}
                  accentClass="border-t-red-500"
                />
                <ExtractionCard
                  title="Open Questions"
                  icon={<HelpCircle className="h-3.5 w-3.5" />}
                  items={extraction.openQuestions}
                  accentClass="border-t-amber-500"
                />

                {/* Estimated Complexity */}
                <div className="ds-card p-3 border-t-[3px] border-t-muted-foreground/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Estimated Complexity
                    </h4>
                  </div>
                  <p className="text-[11px] text-foreground/70">{extraction.estimatedComplexity}</p>
                </div>

                {/* Token Usage Summary */}
                <div className="ds-card p-3 border-t-[3px] border-t-muted-foreground/20">
                  <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <Shield className="h-3.5 w-3.5" />
                    Token Budget
                  </h4>
                  <div className="space-y-1">
                    {MEETING_ROLES.filter((r) => (tokensByRole[r.code] ?? 0) > 0).map((role) => (
                      <div key={role.code} className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span className="font-mono font-semibold bg-muted px-1 rounded text-[9px]">
                            {role.short}
                          </span>
                          {role.name}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {(tokensByRole[role.code] ?? 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border/30 pt-1 flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-muted-foreground">Total</span>
                      <span className="font-mono font-bold text-foreground">
                        {totalTokens.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Extraction Card ──────────────────────────────────────────────
function ExtractionCard({
  title,
  icon,
  items,
  accentClass,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: ExtractionItem[];
  accentClass: string;
  emptyText?: string;
}) {
  return (
    <div className={`ds-card p-3 border-t-[3px] ${accentClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
          {icon}
          {title}
          {items.length > 0 && (
            <span className="text-[9px] text-muted-foreground font-normal">({items.length})</span>
          )}
        </h4>
        <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${CONFIDENCE_DOT[item.confidence]}`}
                title={`Confidence: ${item.confidence}`}
              />
              <span className="leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/50">{emptyText ?? "Nothing extracted yet"}</p>
      )}
    </div>
  );
}
