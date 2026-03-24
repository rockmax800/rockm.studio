import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getPersona, getStatusMeta } from "@/lib/personas";
import {
  Brain, GraduationCap, AlertTriangle, Lock, Unlock, Plus, Pencil,
  ChevronDown, ChevronRight, ArrowLeft, BookOpen, Lightbulb, Ban,
  FileCode, XCircle, Save, Clock,
} from "lucide-react";

export default function EmployeeProfile() {
  const { id = "" } = useParams();
  const [trainingMode, setTrainingMode] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState<Record<string, boolean>>({});
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);
  const [newRuleText, setNewRuleText] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("domain_principles");
  const toggleMemory = (key: string) => setExpandedMemory((prev) => ({ ...prev, [key]: !prev[key] }));

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: roleData } = useQuery({
    queryKey: ["employee-role", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return null;
      const { data } = await supabase.from("agent_roles").select("*").eq("id", employee.role_id).single();
      return data;
    },
    enabled: !!employee?.role_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["employee-tasks", employee?.role_id],
    queryFn: async () => {
      if (!employee?.role_id) return [];
      const { data } = await supabase.from("tasks").select("id, title, state, priority, updated_at")
        .eq("owner_role_id", employee.role_id)
        .in("state", ["in_progress", "assigned", "waiting_review", "blocked"])
        .order("updated_at", { ascending: false }).limit(10);
      return data ?? [];
    },
    enabled: !!employee?.role_id,
  });

  const { data: learningProposals = [] } = useQuery({
    queryKey: ["employee-learning"],
    queryFn: async () => {
      const { data } = await supabase.from("learning_proposals")
        .select("id, proposal_type, status, hypothesis, created_at")
        .order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  if (isLoading) return <AppLayout title="Loading…"><p className="text-[15px] text-muted-foreground p-10">Loading…</p></AppLayout>;
  if (!employee) return <AppLayout title="Not found"><p className="text-[15px] text-muted-foreground p-10">Employee not found.</p></AppLayout>;

  const persona = getPersona(employee.role_code);
  const st = getStatusMeta(employee.status);
  const roleName = roleData?.name ?? employee.role_code;
  const isUnderperforming = (employee.success_rate ?? 0) < 0.6 || (employee.bug_rate ?? 0) > 0.3;
  const successPct = Math.round((employee.success_rate ?? 0) * 100);
  const reputationScore = employee.reputation_score ?? 0;
  const perfColor = reputationScore >= 0.8 ? "text-status-green" : reputationScore >= 0.5 ? "text-status-amber" : "text-destructive";

  const memoryCategories = [
    { key: "core_knowledge", title: "Core Knowledge", icon: <BookOpen className="h-4 w-4" />,
      items: [
        { text: "Follow role contract boundaries strictly", source: "contract", updated: "2 days ago" },
        { text: "Produce artifacts before marking tasks done", source: "manual", updated: "5 days ago" },
        { text: "Escalate when confidence < 70%", source: "learning", updated: "1 week ago" },
      ] },
    { key: "learned_patterns", title: "Learned Patterns", icon: <Lightbulb className="h-4 w-4" />,
      items: [
        { text: "Prefer small, focused components over monolithic files", source: "learning", updated: "2 days ago" },
        { text: "Verify DB schema before writing queries", source: "learning", updated: "5 days ago" },
      ] },
    { key: "failure_corrections", title: "Corrections", icon: <AlertTriangle className="h-4 w-4" />,
      items: [
        { text: "Missed forbidden path check on prisma/ (Run #42)", source: "manual", updated: "3 days ago" },
      ] },
  ];

  const SOURCE_STYLE: Record<string, string> = {
    contract: "text-muted-foreground/50",
    manual: "text-status-amber/70",
    learning: "text-status-blue/70",
  };

  const addPendingRule = () => {
    if (!newRuleText.trim()) return;
    setPendingUpdates((prev) => [...prev, `[${newRuleCategory}] ${newRuleText.trim()}`]);
    setNewRuleText("");
  };

  return (
    <AppLayout title={employee.name} fullHeight>
      <ScrollArea className="h-full">
        <div className="px-10 py-8 max-w-[960px] space-y-12">

          {/* Breadcrumb */}
          <Link to="/teams" className="inline-flex items-center gap-1.5 text-[14px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Teams
          </Link>

          {/* ═══ PORTRAIT HEADER ═══ */}
          <div className={`flex items-start gap-8 ${trainingMode ? "ring-2 ring-status-amber/40 rounded-2xl p-6 -mx-6 bg-status-amber/[0.02]" : ""}`}>
            {/* Large portrait */}
            <div className="relative shrink-0">
              <img
                src={persona.avatar} alt={employee.name}
                className={`h-[160px] w-[160px] rounded-2xl object-cover`}
                width={160} height={160}
              />
              <span className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-[3px] border-background ${st.dot}`} />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-[36px] font-bold text-foreground tracking-tight leading-none">{employee.name}</h1>
              <p className="text-[18px] text-muted-foreground mt-2 font-medium">{roleName}</p>

              <div className="flex items-center gap-3 mt-4">
                <Badge className={`text-[12px] font-semibold px-3 py-1 border-0 ${st.chipBg}`}>{st.label}</Badge>
                {isUnderperforming && (
                  <Badge className="text-[12px] font-semibold px-3 py-1 border-0 bg-destructive/10 text-destructive">At Risk</Badge>
                )}
              </div>

              {/* Key metrics — minimal */}
              <div className="flex items-center gap-8 mt-6 text-[15px]">
                <div>
                  <span className="text-muted-foreground">Score</span>
                  <span className={`ml-2 font-bold font-mono ${perfColor}`}>{Math.round(reputationScore * 100)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Success</span>
                  <span className="ml-2 font-bold font-mono text-foreground">{successPct}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bug rate</span>
                  <span className="ml-2 font-bold font-mono text-foreground">{Math.round((employee.bug_rate ?? 0) * 100)}%</span>
                </div>
              </div>

              {/* Model info */}
              <p className="text-[13px] text-muted-foreground/50 mt-4">
                {employee.model_name ?? "—"} · {employee.provider ?? "—"} · Hired {new Date(employee.hired_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* ═══ TRAINING MODE TOGGLE ═══ */}
          <div className="flex items-center gap-4">
            <Button
              variant={trainingMode ? "outline" : "default"}
              className={`h-10 text-[14px] font-semibold gap-2 px-5 rounded-xl ${!trainingMode ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
              onClick={() => setTrainingMode(!trainingMode)}
            >
              {trainingMode
                ? <><Lock className="h-4 w-4" /> Exit Training</>
                : <><GraduationCap className="h-4 w-4" /> Train</>
              }
            </Button>
            {trainingMode && pendingUpdates.length > 0 && (
              <span className="text-[13px] text-status-amber font-medium">{pendingUpdates.length} pending</span>
            )}
          </div>

          {/* ═══ ACTIVE WORK ═══ */}
          {tasks.length > 0 && (
            <section>
              <h2 className="text-[20px] font-bold text-foreground mb-4">Active Work</h2>
              <div className="space-y-1">
                {tasks.map((t) => {
                  const stateColor = t.state === "in_progress" ? "bg-status-amber" : t.state === "blocked" ? "bg-destructive" : "bg-status-blue";
                  return (
                    <Link key={t.id} to={`/control/tasks/${t.id}`}>
                      <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-card transition-colors group">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${stateColor}`} />
                        <span className="text-[15px] text-foreground truncate flex-1 font-medium group-hover:text-primary transition-colors">{t.title}</span>
                        <span className="text-[12px] text-muted-foreground/40 capitalize">{t.state.replace("_", " ")}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══ MEMORY ═══ */}
          <section>
            <h2 className="text-[20px] font-bold text-foreground mb-4">Memory</h2>
            <div className="space-y-2">
              {memoryCategories.map((cat) => {
                const isExpanded = expandedMemory[cat.key] ?? false;
                return (
                  <div key={cat.key} className={`rounded-2xl border overflow-hidden ${trainingMode ? "border-status-amber/20" : "border-border/60"} bg-card`}>
                    <button
                      onClick={() => toggleMemory(cat.key)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/15 transition-colors"
                    >
                      <span className="text-muted-foreground/40">{cat.icon}</span>
                      <span className="text-[15px] font-semibold text-foreground flex-1">{cat.title}</span>
                      <span className="text-[13px] text-muted-foreground/40 font-mono">{cat.items.length}</span>
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground/30" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/30" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-border/20">
                        <div className="space-y-1 mt-3">
                          {cat.items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 py-3 px-3 rounded-xl hover:bg-secondary/10 transition-colors group">
                              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20 mt-2.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] text-foreground leading-relaxed">{item.text}</p>
                                <span className={`text-[12px] mt-1 inline-block ${SOURCE_STYLE[item.source] ?? "text-muted-foreground/40"}`}>
                                  {item.source} · {item.updated}
                                </span>
                              </div>
                              {trainingMode && (
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground/40 hover:text-foreground" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {trainingMode && (
                          <button className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium px-3"
                            onClick={() => setNewRuleCategory(cat.key)}>
                            <Plus className="h-3.5 w-3.5" /> Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ═══ TRAINING INPUT (only in training mode) ═══ */}
          {trainingMode && (
            <section>
              <h2 className="text-[20px] font-bold text-foreground mb-4">Add Knowledge</h2>
              <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
                <Textarea
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  placeholder="Type a new rule, pattern, or correction…"
                  className="h-20 text-[15px] resize-none rounded-xl border-border/40"
                />
                <div className="flex items-center gap-3">
                  <select value={newRuleCategory} onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="h-10 rounded-xl border border-border/40 bg-background px-3 text-[14px] text-foreground">
                    <option value="core_knowledge">Core Knowledge</option>
                    <option value="learned_patterns">Learned Pattern</option>
                    <option value="failure_corrections">Correction</option>
                  </select>
                  <Button className="h-10 text-[14px] gap-2 px-5 font-semibold rounded-xl" onClick={addPendingRule}
                    disabled={!newRuleText.trim()}>
                    <Plus className="h-4 w-4" /> Stage
                  </Button>
                </div>

                {pendingUpdates.length > 0 && (
                  <div className="border-t border-border/20 pt-4 mt-4 space-y-2">
                    {pendingUpdates.map((u, i) => (
                      <div key={i} className="flex items-center gap-3 text-[14px] text-foreground px-3 py-2 rounded-xl bg-secondary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-amber shrink-0" />
                        <span className="flex-1 truncate">{u}</span>
                        <button onClick={() => setPendingUpdates((p) => p.filter((_, j) => j !== i))}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button className="w-full h-10 text-[14px] font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 rounded-xl mt-2">
                      <Save className="h-4 w-4" /> Save All
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ═══ LEARNING HISTORY ═══ */}
          {learningProposals.length > 0 && (
            <section>
              <h2 className="text-[20px] font-bold text-foreground mb-4">Learning History</h2>
              <div className="space-y-1">
                {learningProposals.slice(0, 8).map((lp) => (
                  <div key={lp.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-card transition-colors">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      lp.status === "promoted" ? "bg-status-green"
                        : lp.status === "rejected" ? "bg-destructive"
                        : "bg-status-blue"
                    }`} />
                    <span className="text-[14px] text-foreground truncate flex-1">{lp.hypothesis || lp.proposal_type}</span>
                    <span className="text-[12px] text-muted-foreground/40 capitalize">{lp.status}</span>
                    <span className="text-[12px] text-muted-foreground/30 font-mono">
                      {new Date(lp.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="h-12" />
        </div>
      </ScrollArea>
    </AppLayout>
  );
}
