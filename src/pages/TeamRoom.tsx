import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Lightbulb,
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
  Cpu,
} from "lucide-react";

// ── Role definitions (persona layer — UI only) ─────────────────
const MEETING_ROLES = [
  { code: "product_strategist", name: "Product Strategist", color: "bg-blue-500", short: "PS" },
  { code: "solution_architect", name: "Solution Architect", color: "bg-violet-500", short: "SA" },
  { code: "frontend_builder", name: "Frontend Builder", color: "bg-cyan-500", short: "FB" },
  { code: "backend_architect", name: "Backend Architect", color: "bg-amber-500", short: "BA" },
  { code: "reviewer", name: "Reviewer", color: "bg-orange-500", short: "RV" },
  { code: "qa_agent", name: "QA Agent", color: "bg-green-500", short: "QA" },
  { code: "release_coordinator", name: "Release Coord", color: "bg-rose-500", short: "RC" },
] as const;

type RoleCode = (typeof MEETING_ROLES)[number]["code"];

interface TranscriptEntry {
  id: string;
  roleCode: RoleCode;
  content: string;
  timestamp: string;
  tokenCost: number;
  type: "scope" | "architecture" | "risk" | "question" | "task" | "general";
}

interface ExtractionState {
  scope: string[];
  architectureNotes: string[];
  taskBreakdown: string[];
  risks: string[];
  openQuestions: string[];
}

function getRoleMeta(code: string) {
  return MEETING_ROLES.find((r) => r.code === code) ?? MEETING_ROLES[0];
}

// ── Simulated initial transcript (replace with real AI pipeline) ────
const INITIAL_TRANSCRIPT: TranscriptEntry[] = [
  {
    id: "1",
    roleCode: "product_strategist",
    content: "The project goal is to build an AI-powered delivery system. Core value: automate task assignment and execution with quality gates.",
    timestamp: new Date(Date.now() - 180_000).toISOString(),
    tokenCost: 320,
    type: "scope",
  },
  {
    id: "2",
    roleCode: "solution_architect",
    content: "I recommend a layered architecture: Intent → Delivery → Knowledge → Experience. Each layer has strict boundary isolation.",
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    tokenCost: 480,
    type: "architecture",
  },
  {
    id: "3",
    roleCode: "reviewer",
    content: "Risk: without contract enforcement, agents may overwrite files outside their domain. We need path-level restrictions.",
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    tokenCost: 290,
    type: "risk",
  },
];

const INITIAL_EXTRACTION: ExtractionState = {
  scope: ["AI-powered delivery system", "Automated task assignment", "Quality gates"],
  architectureNotes: ["4-layer architecture: Intent → Delivery → Knowledge → Experience", "Strict boundary isolation"],
  taskBreakdown: [],
  risks: ["Agents may overwrite files outside domain without contract enforcement"],
  openQuestions: ["Path-level restriction implementation approach?"],
};

export default function TeamRoom() {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(INITIAL_TRANSCRIPT);
  const [extraction, setExtraction] = useState<ExtractionState>(INITIAL_EXTRACTION);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(2); // last speaker
  const [founderInput, setFounderInput] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<"active" | "frozen" | "ended">("active");
  const [totalTokens, setTotalTokens] = useState(
    INITIAL_TRANSCRIPT.reduce((s, e) => s + e.tokenCost, 0)
  );

  // Fetch real roles for display
  const { data: dbRoles = [] } = useQuery({
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

  const activeSpeaker = transcript[activeSpeakerIdx]
    ? getRoleMeta(transcript[activeSpeakerIdx].roleCode)
    : MEETING_ROLES[0];

  const activeMessage = transcript[activeSpeakerIdx];

  const tokensByRole: Record<string, number> = {};
  transcript.forEach((e) => {
    tokensByRole[e.roleCode] = (tokensByRole[e.roleCode] ?? 0) + e.tokenCost;
  });

  const handleFounderClarify = useCallback(() => {
    if (!founderInput.trim() || meetingStatus !== "active") return;
    const entry: TranscriptEntry = {
      id: `f-${Date.now()}`,
      roleCode: "product_strategist",
      content: `[Founder Clarification] ${founderInput.trim()}`,
      timestamp: new Date().toISOString(),
      tokenCost: 0,
      type: "general",
    };
    setTranscript((prev) => [...prev, entry]);
    setActiveSpeakerIdx(transcript.length);
    setFounderInput("");
  }, [founderInput, meetingStatus, transcript.length]);

  const handleFreezeBlueprint = () => setMeetingStatus("frozen");
  const handleEndMeeting = () => setMeetingStatus("ended");

  const entryTypeIcon = (type: TranscriptEntry["type"]) => {
    switch (type) {
      case "scope": return <Target className="h-3 w-3 text-blue-500" />;
      case "architecture": return <Layers className="h-3 w-3 text-violet-500" />;
      case "risk": return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case "question": return <HelpCircle className="h-3 w-3 text-amber-500" />;
      case "task": return <ListChecks className="h-3 w-3 text-green-500" />;
      default: return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout title="Team Room" fullHeight>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── TEAM PRESENCE ROW ────────────────────────────── */}
        <div className="px-6 py-3 border-b border-border/50 flex items-center gap-6">
          <div className="flex items-center gap-1">
            {MEETING_ROLES.map((role) => {
              const isSpeaking = activeSpeaker.code === role.code;
              const tokens = tokensByRole[role.code] ?? 0;
              return (
                <button
                  key={role.code}
                  onClick={() => {
                    const idx = [...transcript].reverse().findIndex((e) => e.roleCode === role.code);
                    if (idx >= 0) setActiveSpeakerIdx(transcript.length - 1 - idx);
                  }}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                    isSpeaking
                      ? "bg-secondary ring-2 ring-foreground/10"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${role.color} ${
                      isSpeaking ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/20" : ""
                    }`}
                  >
                    {role.short}
                  </div>
                  <span className="text-[9px] text-muted-foreground leading-tight whitespace-nowrap">
                    {role.name.split(" ")[0]}
                  </span>
                  {tokens > 0 && (
                    <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Coins className="h-2 w-2" />{tokens}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Badge
              variant={meetingStatus === "active" ? "default" : "secondary"}
              className="text-[10px] font-medium gap-1"
            >
              {meetingStatus === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {meetingStatus === "frozen" && <Snowflake className="h-3 w-3" />}
              {meetingStatus === "ended" && <Square className="h-3 w-3" />}
              {meetingStatus === "active" ? "Meeting Active" : meetingStatus === "frozen" ? "Blueprint Frozen" : "Meeting Ended"}
            </Badge>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              <span className="font-semibold">{totalTokens.toLocaleString()}</span> tokens
            </div>
          </div>
        </div>

        {/* ── MAIN 3-COLUMN LAYOUT ────────────────────────── */}
        <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">
          {/* LEFT: Transcript Timeline (3 cols) */}
          <div className="col-span-3 border-r border-border/40 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-border/30">
              <h3 className="text-[12px] font-semibold text-foreground">Transcript</h3>
              <p className="text-[10px] text-muted-foreground">{transcript.length} turns</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {transcript.map((entry, idx) => {
                  const role = getRoleMeta(entry.roleCode);
                  const isSelected = idx === activeSpeakerIdx;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setActiveSpeakerIdx(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                        isSelected
                          ? "bg-secondary ring-1 ring-border"
                          : "hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${role.color}`}
                        >
                          {role.short}
                        </div>
                        <span className="text-[11px] font-medium text-foreground">{role.name}</span>
                        {entryTypeIcon(entry.type)}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 ml-7">
                        {entry.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 ml-7">
                        <span className="text-[9px] text-muted-foreground/50">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5">
                          <Coins className="h-2 w-2" />{entry.tokenCost}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* CENTER: Active Speaker (5 cols) */}
          <div className="col-span-5 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
              {activeMessage ? (
                <>
                  {/* Speaker avatar */}
                  <div
                    className={`h-16 w-16 rounded-full flex items-center justify-center text-[18px] font-bold text-white ${activeSpeaker.color} ring-4 ring-offset-4 ring-offset-background ring-foreground/10 mb-4`}
                  >
                    {activeSpeaker.short}
                  </div>
                  <span className="text-[14px] font-semibold text-foreground mb-1">
                    {activeSpeaker.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] mb-6 gap-1">
                    {entryTypeIcon(activeMessage.type)}
                    {activeMessage.type.replace(/_/g, " ")}
                  </Badge>

                  {/* Message */}
                  <div className="ds-card p-6 max-w-lg w-full bg-secondary/20">
                    <p className="text-[14px] text-foreground leading-relaxed">
                      {activeMessage.content}
                    </p>
                    <div className="flex items-center gap-3 mt-4 text-[10px] text-muted-foreground">
                      <span>
                        {new Date(activeMessage.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Coins className="h-3 w-3" /> {activeMessage.tokenCost} tokens
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-muted-foreground">
                  No active speaker. Meeting has not started.
                </div>
              )}
            </div>

            {/* ── FOUNDER CONTROLS (Bottom) ──────────────── */}
            <div className="border-t border-border/40 px-6 py-3 bg-secondary/10">
              <div className="flex items-center gap-2 mb-2">
                <Textarea
                  value={founderInput}
                  onChange={(e) => setFounderInput(e.target.value)}
                  placeholder="Clarify, redirect, or constrain…"
                  className="h-9 min-h-[36px] text-[12px] resize-none bg-background"
                  disabled={meetingStatus !== "active"}
                />
                <Button
                  size="sm"
                  className="h-9 gap-1 text-[11px]"
                  onClick={handleFounderClarify}
                  disabled={meetingStatus !== "active" || !founderInput.trim()}
                >
                  <Send className="h-3 w-3" /> Clarify
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1"
                  disabled={meetingStatus !== "active"}
                >
                  <Coins className="h-3 w-3" /> Cap Tokens
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1"
                  disabled={meetingStatus !== "active"}
                >
                  <SkipForward className="h-3 w-3" /> Skip Role
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={handleFreezeBlueprint}
                  disabled={meetingStatus !== "active"}
                >
                  <Snowflake className="h-3 w-3" /> Freeze Blueprint
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleEndMeeting}
                  disabled={meetingStatus === "ended"}
                >
                  <Square className="h-3 w-3" /> End Meeting
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Extraction Panel (4 cols) */}
          <div className="col-span-4 border-l border-border/40 flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
              <div>
                <h3 className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Live Extraction
                </h3>
                <p className="text-[10px] text-muted-foreground">Structured output from discussion</p>
              </div>
              {meetingStatus === "frozen" && (
                <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0">FROZEN</Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Scope */}
                <ExtractionSection
                  title="Scope"
                  icon={<Target className="h-3 w-3 text-blue-500" />}
                  items={extraction.scope}
                  color="border-l-blue-500"
                />

                {/* Architecture */}
                <ExtractionSection
                  title="Architecture Notes"
                  icon={<Layers className="h-3 w-3 text-violet-500" />}
                  items={extraction.architectureNotes}
                  color="border-l-violet-500"
                />

                {/* Task Breakdown */}
                <ExtractionSection
                  title="Task Breakdown"
                  icon={<ListChecks className="h-3 w-3 text-green-500" />}
                  items={extraction.taskBreakdown}
                  color="border-l-green-500"
                  emptyText="No tasks extracted yet"
                />

                {/* Risks */}
                <ExtractionSection
                  title="Risks"
                  icon={<AlertTriangle className="h-3 w-3 text-red-500" />}
                  items={extraction.risks}
                  color="border-l-red-500"
                />

                {/* Open Questions */}
                <ExtractionSection
                  title="Open Questions"
                  icon={<HelpCircle className="h-3 w-3 text-amber-500" />}
                  items={extraction.openQuestions}
                  color="border-l-amber-500"
                />

                {/* Token Usage per Role */}
                <div>
                  <h4 className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    Token Usage
                  </h4>
                  <div className="space-y-1">
                    {MEETING_ROLES.filter((r) => (tokensByRole[r.code] ?? 0) > 0).map((role) => (
                      <div key={role.code} className="flex items-center gap-2">
                        <div
                          className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${role.color}`}
                        >
                          {role.short}
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-1">
                          {role.name}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-foreground">
                          {(tokensByRole[role.code] ?? 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-border/30 pt-1 mt-1 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-muted-foreground">Total</span>
                      <span className="text-[10px] font-mono font-bold text-foreground">
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

// ── Extraction Section Component ─────────────────────────────────
function ExtractionSection({
  title,
  icon,
  items,
  color,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  color: string;
  emptyText?: string;
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
        {icon}
        {title}
        {items.length > 0 && (
          <span className="text-[9px] text-muted-foreground font-normal">({items.length})</span>
        )}
      </h4>
      {items.length > 0 ? (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div
              key={i}
              className={`border-l-2 ${color} pl-2.5 py-1 text-[11px] text-foreground/80 bg-secondary/20 rounded-r`}
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/50 italic">
          {emptyText ?? "Nothing extracted yet"}
        </p>
      )}
    </div>
  );
}
