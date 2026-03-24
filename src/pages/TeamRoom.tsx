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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ── Role definitions (persona layer — UI only) ───────────────── */
const MEETING_ROLES = [
  { code: "product_strategist", name: "Product Strategist", short: "PS", subtitle: "Vision & scope ownership" },
  { code: "solution_architect", name: "Solution Architect", short: "SA", subtitle: "System design & boundaries" },
  { code: "frontend_builder", name: "Frontend Builder", short: "FB", subtitle: "UI delivery & components" },
  { code: "backend_architect", name: "Backend Architect", short: "BA", subtitle: "API & data layer" },
  { code: "reviewer", name: "Reviewer", short: "RV", subtitle: "Quality & compliance" },
  { code: "qa_agent", name: "QA Agent", short: "QA", subtitle: "Test & validation" },
  { code: "release_coordinator", name: "Release Coord", short: "RC", subtitle: "Deploy & release" },
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

interface ExtractionItem { text: string; confidence: "high" | "medium" | "low"; }

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

/* ── Simulated data ──────────────────────────────────────────── */
const INITIAL_TRANSCRIPT: TranscriptEntry[] = [
  { id: "1", roleCode: "product_strategist", content: "The project goal is to build an AI-powered delivery system. Core value: automate task assignment and execution with quality gates.", timestamp: new Date(Date.now() - 300_000).toISOString(), tokenCost: 320, type: "scope" },
  { id: "2", roleCode: "solution_architect", content: "I recommend a layered architecture: Intent → Delivery → Knowledge → Experience. Each layer has strict boundary isolation.", timestamp: new Date(Date.now() - 240_000).toISOString(), tokenCost: 480, type: "architecture" },
  { id: "3", roleCode: "reviewer", content: "Risk: without contract enforcement, agents may overwrite files outside their domain. We need path-level restrictions.", timestamp: new Date(Date.now() - 180_000).toISOString(), tokenCost: 290, type: "risk" },
  { id: "4", roleCode: "frontend_builder", content: "For the Experience layer, I propose a 12-column grid system with semantic design tokens. All pages follow the cockpit pattern with clear visual hierarchy.", timestamp: new Date(Date.now() - 120_000).toISOString(), tokenCost: 350, type: "architecture" },
  { id: "5", roleCode: "qa_agent", content: "We need protected evaluation scenarios that cannot be bypassed. Every prompt change must pass baseline comparison before promotion.", timestamp: new Date(Date.now() - 60_000).toISOString(), tokenCost: 260, type: "risk" },
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
    { text: "Agents may overwrite files outside domain without enforcement", confidence: "high" },
    { text: "Prompt changes could degrade quality without baseline comparison", confidence: "high" },
  ],
  openQuestions: [
    { text: "Path-level restriction implementation approach?", confidence: "medium" },
    { text: "Baseline comparison threshold values?", confidence: "low" },
  ],
  estimatedComplexity: "High — multi-layer system with enforcement gates",
};

const TYPE_LABEL: Record<EntryType, string> = {
  scope: "Scope", architecture: "Architecture", risk: "Risk",
  question: "Question", task: "Task", general: "Note",
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-green-500", medium: "bg-amber-500", low: "bg-red-400",
};

/* ================================================================ */
export default function TeamRoom() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(INITIAL_TRANSCRIPT);
  const [extraction] = useState<ExtractionState>(INITIAL_EXTRACTION);
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");
  const [showHistory, setShowHistory] = useState(false);
  const [showTokenBreakdown, setShowTokenBreakdown] = useState(false);

  const totalTokens = transcript.reduce((s, e) => s + e.tokenCost, 0);
  const tokensByRole: Record<string, number> = {};
  transcript.forEach((e) => {
    tokensByRole[e.roleCode] = (tokensByRole[e.roleCode] ?? 0) + e.tokenCost;
  });

  const lastEntry = transcript[transcript.length - 1];
  const previousEntries = transcript.slice(0, -1);
  const speakerMeta = lastEntry ? getRoleMeta(lastEntry.roleCode) : null;

  useQuery({
    queryKey: ["meeting-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("agent_roles").select("id, code, name, status").eq("status", "active").limit(10);
      return data ?? [];
    },
  });

  const handleFounderClarify = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    setTranscript((prev) => [...prev, {
      id: `f-${Date.now()}`, roleCode: "product_strategist",
      content: `[Founder] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(), tokenCost: 0, type: "general",
    }]);
    setFounderInput("");
  }, [founderInput, meetingStatus]);

  return (
    <AppLayout title="Team Session" fullHeight>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── TOP STRIP ─────────────────────────────────────── */}
        <div className="px-6 py-2 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold text-foreground">Team Session</span>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[12px] text-muted-foreground">Blueprint Scoping</span>
            <Badge
              variant={meetingStatus === "active" ? "default" : "secondary"}
              className="text-[9px] h-5 px-1.5 font-medium gap-1"
            >
              {meetingStatus === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {meetingStatus === "active" ? "Active" : meetingStatus === "frozen" ? "Frozen" : "Ended"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTokenBreakdown(!showTokenBreakdown)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono"
            >
              <Coins className="h-3 w-3" />
              {totalTokens.toLocaleString()}
              <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showTokenBreakdown ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── TOKEN BREAKDOWN (expandable) ─────────────────── */}
        {showTokenBreakdown && (
          <div className="px-6 py-2 border-b border-border/30 bg-secondary/20 flex items-center gap-4 flex-wrap">
            {MEETING_ROLES.filter((r) => (tokensByRole[r.code] ?? 0) > 0).map((role) => (
              <span key={role.code} className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="font-mono font-semibold text-foreground">{role.short}</span>
                {(tokensByRole[role.code] ?? 0).toLocaleString()}
              </span>
            ))}
            <span className="text-[10px] font-semibold text-foreground ml-auto font-mono">
              Σ {totalTokens.toLocaleString()}
            </span>
          </div>
        )}

        {/* ── MAIN 8 / 4 GRID ──────────────────────────────── */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">

          {/* ═══ LEFT: 8 COLUMNS ═══════════════════════════ */}
          <div className="col-span-8 border-r border-border/30 flex flex-col min-h-0">

            {/* ── HERO: Current Speaker (Level 1) ──────── */}
            {lastEntry && speakerMeta && (
              <div className="px-8 py-6 border-b border-border/20 bg-secondary/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 rounded">
                    {speakerMeta.short}
                  </span>
                  <span className="text-[20px] font-semibold text-foreground leading-tight tracking-tight">
                    {speakerMeta.name}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-4">{speakerMeta.subtitle}</p>

                <div className="max-w-[640px]">
                  <p className="text-[15px] text-foreground leading-[1.65] tracking-[-0.01em]">
                    {lastEntry.content}
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <Badge variant="secondary" className="text-[9px] h-5 px-1.5">
                    {TYPE_LABEL[lastEntry.type]}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground/50">
                    {new Date(lastEntry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono flex items-center gap-0.5">
                    <Coins className="h-2.5 w-2.5" />{lastEntry.tokenCost}
                  </span>
                </div>
              </div>
            )}

            {/* ── TOGGLE: Show Previous ────────────────── */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-8 py-2 border-b border-border/20 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors flex items-center gap-1.5 w-full text-left"
            >
              {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showHistory ? "Hide" : "Show"} previous discussion ({previousEntries.length} turns)
            </button>

            {/* ── HISTORY: Condensed Transcript (Level 3) ── */}
            {showHistory && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="divide-y divide-border/10">
                  {previousEntries.map((entry) => {
                    const role = getRoleMeta(entry.roleCode);
                    return (
                      <div key={entry.id} className="px-8 py-2.5 hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] font-semibold text-muted-foreground bg-muted px-1 rounded">
                            {role.short}
                          </span>
                          <span className="text-[11px] font-medium text-foreground/70">{role.name}</span>
                          <span className="text-[9px] text-muted-foreground/40 ml-auto">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 pl-6 leading-relaxed">
                          {entry.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Spacer when history hidden */}
            {!showHistory && <div className="flex-1" />}

            {/* ── FOUNDER CONTROLS (Bottom Bar) ────────── */}
            <div className="border-t border-border/30 px-6 py-2.5 flex items-center gap-2">
              <Input
                value={founderInput}
                onChange={(e) => setFounderInput(e.target.value)}
                placeholder="Clarify or redirect…"
                className="h-8 text-[12px] bg-background flex-1 max-w-md"
                disabled={meetingStatus !== "active"}
                onKeyDown={(e) => e.key === "Enter" && handleFounderClarify()}
              />
              <Button
                size="sm" className="h-8 gap-1 text-[11px] px-3"
                onClick={handleFounderClarify}
                disabled={meetingStatus !== "active" || !founderInput.trim()}
              >
                <Send className="h-3 w-3" /> Clarify
              </Button>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground" disabled={meetingStatus !== "active"}>
                  <Coins className="h-3 w-3" /> Cap
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground" disabled={meetingStatus !== "active"}>
                  <SkipForward className="h-3 w-3" /> Skip
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-muted-foreground"
                  onClick={() => setMeetingStatus("frozen")} disabled={meetingStatus !== "active"}
                >
                  <Snowflake className="h-3 w-3" /> Freeze
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-[10px] gap-1 text-destructive"
                  onClick={() => setMeetingStatus("ended")} disabled={meetingStatus === "ended"}
                >
                  <Square className="h-3 w-3" /> End
                </Button>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: 4 COLUMNS — Structured Output (Level 2) ═══ */}
          <div className="col-span-4 flex flex-col min-h-0">
            <div className="px-5 py-2.5 border-b border-border/30">
              <h3 className="text-[13px] font-semibold text-foreground">Structured Output</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-0 divide-y divide-border/20">
                <ExtractionSection title="Scope" icon={<Target className="h-3.5 w-3.5 text-muted-foreground" />} items={extraction.scope} />
                <ExtractionSection title="Architecture" icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />} items={extraction.architectureNotes} />
                <ExtractionSection title="Task Breakdown" icon={<ListChecks className="h-3.5 w-3.5 text-muted-foreground" />} items={extraction.taskBreakdown} emptyText="No tasks extracted yet" />
                <ExtractionSection title="Risks" icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />} items={extraction.risks} />
                <ExtractionSection title="Open Questions" icon={<HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />} items={extraction.openQuestions} />
                <div className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      Complexity
                    </h4>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{extraction.estimatedComplexity}</p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ── Extraction Section ──────────────────────────────────────── */
function ExtractionSection({
  title, icon, items, emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: ExtractionItem[];
  emptyText?: string;
}) {
  return (
    <div className="py-3 first:pt-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
          {icon}
          {title}
          {items.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-normal ml-0.5">{items.length}</span>
          )}
        </h4>
        <button className="text-muted-foreground/30 hover:text-muted-foreground transition-colors">
          <Pencil className="h-3 w-3" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px] text-foreground/75 leading-relaxed">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-[7px] shrink-0 ${CONFIDENCE_DOT[item.confidence]}`}
                title={`${item.confidence} confidence`}
              />
              {item.text}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/40">{emptyText ?? "—"}</p>
      )}
    </div>
  );
}
