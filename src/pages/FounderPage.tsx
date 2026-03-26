import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApprovals, useProjects } from "@/hooks/use-data";
import { useFounderInbox, useRiskAnalytics, useBottlenecks } from "@/hooks/use-founder-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { FounderStatusStrip } from "@/components/founder/FounderStatusStrip";
import { DecisionCard, type DecisionItem } from "@/components/founder/DecisionCard";
import { ContextPreview } from "@/components/founder/ContextPreview";
import { RiskPanel } from "@/components/founder/RiskPanel";
import { CalibrationSummary } from "@/components/founder/CalibrationSummary";
import { VerificationSummary } from "@/components/founder/VerificationSummary";
import { PipelineBar, resolveStageIndex, PIPELINE_STAGES, STAGE_COLORS } from "@/components/PipelineBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Filter, ShieldCheck, ExternalLink, FolderKanban, ChevronRight, History, GraduationCap } from "lucide-react";

export default function FounderPage() {
  const navigate = useNavigate();
  const { data: approvals = [] } = useApprovals();
  const { data: projects = [] } = useProjects();
  const inbox = useFounderInbox();
  const risk = useRiskAnalytics();
  const bottlenecks = useBottlenecks();
  const { data: modeData } = useSystemMode();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const escalations = inbox.data?.escalations ?? [];
  const degradedProviders = inbox.data?.providerDegradedWarnings ?? [];
  const retryLoops = risk.data?.retry_loops_detected ?? [];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const allItems: DecisionItem[] = useMemo(() => {
    const items: DecisionItem[] = [];

    for (const a of pendingApprovals) {
      const cat = mapApprovalCategory(a.approval_type);
      items.push({
        id: `approval-${a.id}`,
        category: cat,
        projectName: projectMap[a.project_id],
        entityType: a.target_type,
        title: a.summary,
        explanation: a.recommendation ?? a.approval_type.replace(/_/g, " "),
        riskLevel: a.consequence_if_rejected ? "critical" : "normal",
        evidenceCount: 0,
        impactSummary: a.consequence_if_approved ?? undefined,
        timestamp: a.created_at,
        linkTo: `/control/approvals/${a.id}`,
      });
    }

    for (const e of escalations) {
      items.push({
        id: `escalation-${e.id}`,
        category: "review_escalation",
        projectName: projectMap[e.project_id],
        entityType: "task",
        title: e.title,
        explanation: e.escalation_reason ?? "Needs founder attention",
        riskLevel: "high",
        evidenceCount: 0,
        timestamp: e.updated_at,
        linkTo: `/control/tasks/${e.id}`,
      });
    }

    for (const loop of retryLoops) {
      items.push({
        id: `retry-${loop.taskId}`,
        category: "risk_acknowledgement",
        entityType: "task",
        title: `Retry loop: ${loop.failedCount} consecutive failures`,
        explanation: `Task ${loop.taskId.slice(0, 8)}… is stuck in a retry loop`,
        riskLevel: "critical",
        evidenceCount: loop.failedCount,
        timestamp: new Date().toISOString(),
        linkTo: `/control/tasks/${loop.taskId}`,
      });
    }

    for (const p of degradedProviders) {
      items.push({
        id: `provider-${p.id}`,
        category: "risk_acknowledgement",
        entityType: "provider",
        title: `Provider ${p.name} degraded`,
        explanation: `Status: ${p.status}`,
        riskLevel: "high",
        evidenceCount: 0,
        timestamp: new Date().toISOString(),
        linkTo: `/control/providers/${p.id}`,
      });
    }

    items.sort((a, b) => {
      const order = { critical: 0, high: 1, normal: 2 };
      const d = order[a.riskLevel] - order[b.riskLevel];
      return d !== 0 ? d : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return items;
  }, [pendingApprovals, escalations, retryLoops, degradedProviders, projectMap]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterProject) items = items.filter((i) => i.projectName === filterProject);
    if (filterRisk) items = items.filter((i) => i.riskLevel === filterRisk);
    if (filterType) items = items.filter((i) => i.category === filterType);
    return items;
  }, [allItems, filterProject, filterRisk, filterType]);

  const selectedItem = filteredItems.find((i) => i.id === selectedId) ?? null;

  const highRiskCount = allItems.filter((i) => i.riskLevel === "critical" || i.riskLevel === "high").length;
  const deployReadyCount = allItems.filter((i) => i.category === "deploy_production").length;
  const blockedCritical = bottlenecks.data?.blockedTasks?.length ?? 0;

  const escalatedItems = (bottlenecks.data?.escalationsUnresolved ?? []).map((t: any) => ({ id: t.id, title: t.title }));
  const stalledRunCount = (bottlenecks.data?.tasksStuckInProgress ?? []).length;

  const projectNames = [...new Set(allItems.map((i) => i.projectName).filter(Boolean))] as string[];
  const categoryTypes = [...new Set(allItems.map((i) => i.category))];

  /* ── Projects grouped by pipeline stage ── */
  const activeProjects = projects.filter((p) => !["archived", "cancelled"].includes(p.state));
  const projectsByStage = useMemo(() => {
    const map: Record<string, typeof activeProjects> = {};
    for (const stage of PIPELINE_STAGES) {
      map[stage.key] = [];
    }
    for (const p of activeProjects) {
      const idx = resolveStageIndex(p.state);
      if (idx >= 0) {
        map[PIPELINE_STAGES[idx].key].push(p);
      }
    }
    return map;
  }, [activeProjects]);

  const stagesWithProjects = PIPELINE_STAGES.filter((s) => (projectsByStage[s.key]?.length ?? 0) > 0);

  return (
    <AppLayout title="Decision Engine" fullHeight>
      <div className="flex flex-col gap-3 h-full px-6 py-4 overflow-hidden">

        {/* ═══ PIPELINE STAGE GROUPING — Projects by stage ═══ */}
        {stagesWithProjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <FolderKanban className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            {stagesWithProjects.map((stage) => {
              const colors = STAGE_COLORS[stage.key];
              const count = projectsByStage[stage.key]?.length ?? 0;
              return (
                <div key={stage.key} className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0",
                  colors.activeBg, colors.border,
                )}>
                  <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
                  <span className={cn("text-[12px] font-bold", colors.active)}>{stage.label}</span>
                  <span className={cn("text-[11px] font-bold font-mono", colors.active)}>{count}</span>
                  {projectsByStage[stage.key]?.slice(0, 2).map((p) => (
                    <Link key={p.id} to={`/projects/${p.id}`}>
                      <span className="text-[11px] text-foreground/60 hover:text-foreground transition-colors underline-offset-2 hover:underline truncate max-w-[100px] inline-block">
                        {p.name}
                      </span>
                    </Link>
                  ))}
                  {count > 2 && <span className="text-[10px] text-muted-foreground">+{count - 2}</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* Top Strip */}
        <FounderStatusStrip
          systemMode={modeData?.mode ?? "production"}
          pendingDecisions={allItems.length}
          highRiskCount={highRiskCount}
          deployReadyCount={deployReadyCount}
          blockedCritical={blockedCritical}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />

        {/* Filters inline */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterProject ?? "__all__"} onValueChange={(v) => setFilterProject(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-7 w-[130px] text-[11px] bg-secondary border-border rounded-lg">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[11px]">All Projects</SelectItem>
              {projectNames.map((n) => <SelectItem key={n} value={n} className="text-[11px]">{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRisk ?? "__all__"} onValueChange={(v) => setFilterRisk(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-7 w-[100px] text-[11px] bg-secondary border-border rounded-lg">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[11px]">All Risk</SelectItem>
              <SelectItem value="critical" className="text-[11px]">Critical</SelectItem>
              <SelectItem value="high" className="text-[11px]">High</SelectItem>
              <SelectItem value="normal" className="text-[11px]">Normal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType ?? "__all__"} onValueChange={(v) => setFilterType(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-7 w-[120px] text-[11px] bg-secondary border-border rounded-lg">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[11px]">All Types</SelectItem>
              {categoryTypes.map((c) => <SelectItem key={c} value={c} className="text-[11px]">{c.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-border font-mono tabular-nums">
            {filteredItems.length} decisions
          </Badge>
        </div>

        {/* Main — 8/4 Asymmetric */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left 8 cols — Decision Queue */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[14px] font-bold text-foreground tracking-tight">Decision Queue</h2>
              {filteredItems.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-mono">{highRiskCount} high risk</span>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-secondary border border-border">
                <ShieldCheck className="h-4 w-4 text-status-green" />
                <div>
                  <p className="text-[13px] font-bold text-foreground">No pending decisions.</p>
                  <p className="text-[11px] text-muted-foreground">All approvals resolved. System operating normally.</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mr-1 pr-1">
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    // Build trace link from the raw approval/entity data
                    const rawId = item.id.replace(/^(approval|escalation|retry|provider)-/, "");
                    const traceProject = projects.find((p) => p.name === item.projectName)?.id;
                    const traceParams = new URLSearchParams({ tab: "audit" });
                    if (traceProject) traceParams.set("project", traceProject);
                    if (item.entityType) traceParams.set("entityType", item.entityType);
                    const traceLink = `/system?${traceParams.toString()}`;

                    return (
                      <div key={item.id} className="relative group">
                        <DecisionCard
                          item={item}
                          isSelected={selectedId === item.id}
                          onSelect={() => setSelectedId(item.id)}
                          onNavigate={() => navigate(item.linkTo)}
                        />
                        <Link
                          to={traceLink}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Open operational trace"
                        >
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground">
                            <History className="h-3 w-3" /> Trace
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right 4 cols — Context Preview */}
          <div className="lg:col-span-4 flex flex-col min-h-0 bg-card rounded-[14px] border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-bold text-foreground tracking-tight">Context</h2>
              {selectedItem && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1 text-muted-foreground"
                  onClick={() => navigate(selectedItem.linkTo)}
                >
                  Open <ExternalLink className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ContextPreview selectedItem={selectedItem} />
            </div>
          </div>
        </div>

        {/* Bottom — System Risk Overview + Calibration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <RiskPanel
              highRiskTasks={allItems.filter((i) => i.riskLevel === "critical").map((i) => ({ id: i.id, title: i.title, linkTo: i.linkTo }))}
              escalatedItems={escalatedItems}
              stalledRuns={stalledRunCount}
              retryLoops={retryLoops}
              onNavigate={navigate}
            />
          </div>
          <div className="lg:col-span-4">
            <div className="rounded-[14px] border border-border/40 bg-card p-4">
              <VerificationSummary />
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="rounded-[14px] border border-border/40 bg-card p-4">
              <h3 className="text-[13px] font-bold text-foreground tracking-tight mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground/40" /> Team Calibration
              </h3>
              <CalibrationSummary />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function mapApprovalCategory(approvalType: string): DecisionItem["category"] {
  if (approvalType.includes("blueprint")) return "blueprint_approval";
  if (approvalType.includes("estimate")) return "estimate_approval";
  if (approvalType.includes("deploy")) return "deploy_production";
  if (approvalType.includes("domain")) return "domain_binding";
  if (approvalType.includes("learning") || approvalType.includes("promot")) return "learning_promotion";
  return "approval";
}
