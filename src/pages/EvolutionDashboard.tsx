import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Brain, Dna, Activity, Shield, RotateCcw, CheckCircle2,
  XCircle, AlertTriangle, TrendingUp, Copy, Eye,
  Layers, Cpu, Zap, Clock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════ */

type EvolutionTab = "godel" | "darwin" | "feedback" | "capability";

const TAB_CONFIG: { key: EvolutionTab; label: string; icon: React.ReactNode }[] = [
  { key: "godel", label: "Godel Proposals", icon: <Brain className="h-3.5 w-3.5" /> },
  { key: "darwin", label: "Darwin Experiments", icon: <Dna className="h-3.5 w-3.5" /> },
  { key: "feedback", label: "Feedback Loop", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "capability", label: "Capability Templates", icon: <Copy className="h-3.5 w-3.5" /> },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  candidate: { color: "text-status-blue", bg: "bg-status-blue/10" },
  evaluated: { color: "text-status-cyan", bg: "bg-status-cyan/10" },
  approved: { color: "text-status-green", bg: "bg-status-green/10" },
  promoted: { color: "text-status-green", bg: "bg-status-green/10" },
  rejected: { color: "text-destructive", bg: "bg-destructive/10" },
  running: { color: "text-status-amber", bg: "bg-status-amber/10" },
  survived: { color: "text-status-green", bg: "bg-status-green/10" },
  proposed: { color: "text-status-blue", bg: "bg-status-blue/10" },
  acknowledged: { color: "text-status-cyan", bg: "bg-status-cyan/10" },
  applied: { color: "text-status-green", bg: "bg-status-green/10" },
  dismissed: { color: "text-muted-foreground", bg: "bg-muted/30" },
};

const SEVERITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  info: { color: "text-status-blue", bg: "bg-status-blue/10", border: "border-status-blue/20" },
  warning: { color: "text-status-amber", bg: "bg-status-amber/10", border: "border-status-amber/20" },
  critical: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
};

/* ═══════════════════════════════════════════════════════════
   DATA HOOKS
   ═══════════════════════════════════════════════════════════ */

function useEvolutionData() {
  const proposals = useQuery({
    queryKey: ["evolution-proposals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("self_modification_proposals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const experiments = useQuery({
    queryKey: ["evolution-experiments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mutation_experiments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const corrections = useQuery({
    queryKey: ["evolution-corrections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("correction_proposals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const templates = useQuery({
    queryKey: ["evolution-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("capability_templates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return { proposals, experiments, corrections, templates };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function EvolutionDashboard() {
  const [tab, setTab] = useState<EvolutionTab>("godel");
  const { proposals, experiments, corrections, templates } = useEvolutionData();
  const qc = useQueryClient();

  const proposalData = proposals.data ?? [];
  const experimentData = experiments.data ?? [];
  const correctionData = corrections.data ?? [];
  const templateData = templates.data ?? [];

  /* ── Stats strip ── */
  const stats = useMemo(() => ({
    activeProposals: proposalData.filter((p: any) => p.status === "candidate" || p.status === "evaluated").length,
    promotedProposals: proposalData.filter((p: any) => p.status === "promoted").length,
    runningExperiments: experimentData.filter((e: any) => e.status === "running").length,
    survivedExperiments: experimentData.filter((e: any) => e.status === "survived").length,
    openCorrections: correctionData.filter((c: any) => c.status === "proposed").length,
    templateCount: templateData.length,
  }), [proposalData, experimentData, correctionData, templateData]);

  return (
    <AppLayout title="Evolution Dashboard">
      <div className="grid-content space-y-5 pb-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-foreground flex items-center justify-center">
              <Brain className="h-5 w-5 text-background" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">AI Evolution Layer</h1>
              <p className="text-[12px] text-muted-foreground">Formal self-modification, mutation and selection, cybernetic feedback</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
            <Shield className="h-3 w-3 mr-1" /> Founder-Gated
          </Badge>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Active Proposals" value={stats.activeProposals} icon={<Brain className="h-4 w-4" />} />
          <StatCard label="Promoted" value={stats.promotedProposals} icon={<CheckCircle2 className="h-4 w-4" />} accent="green" />
          <StatCard label="Running Experiments" value={stats.runningExperiments} icon={<Dna className="h-4 w-4" />} accent="amber" />
          <StatCard label="Survived" value={stats.survivedExperiments} icon={<TrendingUp className="h-4 w-4" />} accent="green" />
          <StatCard label="Open Corrections" value={stats.openCorrections} icon={<AlertTriangle className="h-4 w-4" />} accent="red" />
          <StatCard label="Templates" value={stats.templateCount} icon={<Copy className="h-4 w-4" />} />
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 bg-secondary/30 rounded-xl p-1">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-lg transition-all flex-1 justify-center",
                tab === t.key
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden" style={{ minHeight: 400 }}>
          {tab === "godel" && <GodelTab proposals={proposalData} />}
          {tab === "darwin" && <DarwinTab experiments={experimentData} />}
          {tab === "feedback" && <FeedbackTab corrections={correctionData} />}
          {tab === "capability" && <CapabilityTab templates={templateData} />}
        </div>

        {/* ── Safety footer ── */}
        <div className="rounded-xl border border-border/50 bg-secondary/10 px-5 py-3 flex items-center gap-3">
          <Shield className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Hard Safety Guarantees:</strong> No direct prompt overwrite. No auto contract changes.
            No auto stack replacement. No hidden trait modifications. No silent mutations. No self-edit without audit trail.
            Delivery spine (Task, Run, Deploy states) is never modified by the evolution layer.
            All promotions are reversible. All changes require Founder Approval.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function GodelTab({ proposals }: { proposals: any[] }) {
  if (proposals.length === 0) {
    return <EmptyState icon={<Brain className="h-10 w-10" />} title="No self-modification proposals" description="Proposals are generated when the system identifies potential improvements to its own contracts, prompts, or rules." />;
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="divide-y divide-border/30">
        {proposals.map((p: any) => {
          const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.candidate;
          return (
            <div key={p.id} className="px-5 py-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-[9px] font-bold px-1.5 py-0", st.bg, st.color)}>{p.status}</Badge>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 uppercase">{p.target_component}</Badge>
                    {(p.safety_flags ?? []).length > 0 && (
                      <Badge className="text-[9px] font-bold px-1.5 py-0 bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {p.safety_flags.length} flags
                      </Badge>
                    )}
                  </div>
                  <p className="text-[14px] font-bold text-foreground leading-snug mb-1">{p.expected_improvement}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">{p.formal_reasoning_summary}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{p.current_version} → {p.proposed_version}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    {p.impact_scope?.length > 0 && <span>Impact: {p.impact_scope.join(", ")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.status === "promoted" && (
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1">
                      <RotateCcw className="h-3 w-3" /> Rollback
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function DarwinTab({ experiments }: { experiments: any[] }) {
  if (experiments.length === 0) {
    return <EmptyState icon={<Dna className="h-10 w-10" />} title="No mutation experiments" description="Darwin Mode creates controlled variations of prompts and traits, then evaluates them against baselines. Only runs in Experimental Mode." />;
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="divide-y divide-border/30">
        {experiments.map((e: any) => {
          const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.running;
          const delta = e.pass_rate != null && e.baseline_pass_rate != null
            ? (e.pass_rate - e.baseline_pass_rate).toFixed(1)
            : null;
          const deltaPositive = delta != null && parseFloat(delta) > 0;

          return (
            <div key={e.id} className="px-5 py-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-[9px] font-bold px-1.5 py-0", st.bg, st.color)}>{e.status}</Badge>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 uppercase">{e.mutation_type}</Badge>
                    {e.protected_scenarios_passed && (
                      <Badge className="text-[9px] font-bold px-1.5 py-0 bg-status-green/10 text-status-green">
                        <Shield className="h-2.5 w-2.5 mr-0.5" /> Protected OK
                      </Badge>
                    )}
                  </div>
                  <p className="text-[14px] font-bold text-foreground leading-snug mb-1">{e.mutation_delta_description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px]">
                    <span className="font-mono text-muted-foreground">{e.base_version} → {e.mutated_version}</span>
                    {e.pass_rate != null && (
                      <span className="font-mono">
                        Pass: <strong className="text-foreground">{e.pass_rate}%</strong>
                        {delta != null && (
                          <span className={cn("ml-1", deltaPositive ? "text-status-green" : "text-destructive")}>
                            ({deltaPositive ? "+" : ""}{delta}%)
                          </span>
                        )}
                      </span>
                    )}
                    {e.token_delta != null && e.token_delta !== 0 && (
                      <span className="font-mono text-muted-foreground">
                        Tokens: {e.token_delta > 0 ? "+" : ""}{e.token_delta}
                      </span>
                    )}
                    {e.cost_delta != null && parseFloat(e.cost_delta) !== 0 && (
                      <span className="font-mono text-muted-foreground">
                        Cost: {parseFloat(e.cost_delta) > 0 ? "+" : ""}${parseFloat(e.cost_delta).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {e.status === "survived" && !e.promoted_at && (
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Promote
                    </Button>
                  )}
                  {e.promoted_at && (
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1">
                      <RotateCcw className="h-3 w-3" /> Rollback
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function FeedbackTab({ corrections }: { corrections: any[] }) {
  if (corrections.length === 0) {
    return <EmptyState icon={<Activity className="h-10 w-10" />} title="No feedback triggers" description="The Cybernetic Loop monitors rework rate, escalation frequency, CI failures, and deploy rollbacks. Correction proposals appear here when anomalies are detected." />;
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="divide-y divide-border/30">
        {corrections.map((c: any) => {
          const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.proposed;
          const sev = SEVERITY_STYLE[c.severity] ?? SEVERITY_STYLE.info;

          return (
            <div key={c.id} className={cn("px-5 py-4 hover:bg-secondary/10 transition-colors border-l-[3px]", sev.border)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-[9px] font-bold px-1.5 py-0", st.bg, st.color)}>{c.status}</Badge>
                    <Badge className={cn("text-[9px] font-bold px-1.5 py-0", sev.bg, sev.color)}>{c.severity}</Badge>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 uppercase">{c.trigger_type}</Badge>
                  </div>
                  <p className="text-[14px] font-bold text-foreground leading-snug mb-1">{c.suggestion_summary}</p>
                  <p className="text-[12px] text-muted-foreground italic">{c.suggested_action}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">Metric: {c.trigger_metric_value} (threshold: {c.trigger_threshold})</span>
                    <span>Target: {c.target_component}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {c.status === "proposed" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 text-status-green">
                      <CheckCircle2 className="h-3 w-3" /> Apply
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 text-muted-foreground">
                      <XCircle className="h-3 w-3" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function CapabilityTab({ templates }: { templates: any[] }) {
  if (templates.length === 0) {
    return <EmptyState icon={<Copy className="h-10 w-10" />} title="No capability templates" description="High-performing, stable capabilities can be cloned as templates. A capability must have a stability score above 60 to qualify." />;
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="divide-y divide-border/30">
        {templates.map((t: any) => {
          const perf = t.performance_snapshot ?? {};
          return (
            <div key={t.id} className="px-5 py-4 hover:bg-secondary/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground leading-snug mb-1">{t.name}</p>
                  <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono">Stability: <strong className="text-foreground">{parseFloat(t.stability_score).toFixed(1)}</strong></span>
                    {perf.avg_success_rate != null && (
                      <span className="font-mono">Success: <strong className="text-foreground">{perf.avg_success_rate.toFixed(1)}%</strong></span>
                    )}
                    <span>Roles: {(t.inherited_roles ?? []).length}</span>
                    <span>Cloned: {t.cloned_count}x</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 shrink-0">
                  <Copy className="h-3 w-3" /> Clone
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: "green" | "amber" | "red" }) {
  const accentColor = accent === "green" ? "text-status-green" : accent === "amber" ? "text-status-amber" : accent === "red" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl bg-card border border-border px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground/40">{icon}</div>
      <p className={cn("text-[24px] font-bold font-mono tabular-nums", value > 0 ? accentColor : "text-muted-foreground/30")}>{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center justify-center py-20 px-8">
      <div className="text-center max-w-[400px]">
        <div className="text-muted-foreground/15 mx-auto mb-4">{icon}</div>
        <h3 className="text-[16px] font-bold text-foreground">{title}</h3>
        <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}