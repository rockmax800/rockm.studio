import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, ShieldCheck, Rocket } from "lucide-react";

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

  // Build decision items
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

    // Sort: critical → high → normal, then by time
    items.sort((a, b) => {
      const order = { critical: 0, high: 1, normal: 2 };
      const d = order[a.riskLevel] - order[b.riskLevel];
      return d !== 0 ? d : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return items;
  }, [pendingApprovals, escalations, retryLoops, degradedProviders, projectMap]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterProject) items = items.filter((i) => i.projectName === filterProject);
    if (filterRisk) items = items.filter((i) => i.riskLevel === filterRisk);
    if (filterType) items = items.filter((i) => i.category === filterType);
    return items;
  }, [allItems, filterProject, filterRisk, filterType]);

  const selectedItem = filteredItems.find((i) => i.id === selectedId) ?? null;

  // Stats
  const highRiskCount = allItems.filter((i) => i.riskLevel === "critical" || i.riskLevel === "high").length;
  const deployReadyCount = allItems.filter((i) => i.category === "deploy_production").length;
  const blockedCritical = bottlenecks.data?.blockedTasks?.length ?? 0;

  // Risk panel data
  const escalatedItems = (bottlenecks.data?.escalationsUnresolved ?? []).map((t: any) => ({ id: t.id, title: t.title }));
  const stalledRunCount = (bottlenecks.data?.tasksStuckInProgress ?? []).length;

  // Unique project names for filter
  const projectNames = [...new Set(allItems.map((i) => i.projectName).filter(Boolean))] as string[];
  const categoryTypes = [...new Set(allItems.map((i) => i.category))];

  return (
    <AppLayout title="Founder">
      <div className="max-w-[1800px] mx-auto flex flex-col gap-2 h-[calc(100vh-4rem)]">
        {/* Status Strip */}
        <FounderStatusStrip
          systemMode={modeData?.mode ?? "production"}
          pendingDecisions={allItems.length}
          highRiskCount={highRiskCount}
          deployReadyCount={deployReadyCount}
          blockedCritical={blockedCritical}
        />

        {/* Risk Panel */}
        <RiskPanel
          highRiskTasks={allItems.filter((i) => i.riskLevel === "critical").map((i) => ({ id: i.id, title: i.title }))}
          escalatedItems={escalatedItems}
          stalledRuns={stalledRunCount}
          retryLoops={retryLoops}
        />

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <Select value={filterProject ?? "__all__"} onValueChange={(v) => setFilterProject(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-6 w-[130px] text-[9px] bg-transparent border-border/40">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[10px]">All Projects</SelectItem>
              {projectNames.map((n) => <SelectItem key={n} value={n} className="text-[10px]">{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRisk ?? "__all__"} onValueChange={(v) => setFilterRisk(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-6 w-[100px] text-[9px] bg-transparent border-border/40">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[10px]">All Risk</SelectItem>
              <SelectItem value="critical" className="text-[10px]">Critical</SelectItem>
              <SelectItem value="high" className="text-[10px]">High</SelectItem>
              <SelectItem value="normal" className="text-[10px]">Normal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType ?? "__all__"} onValueChange={(v) => setFilterType(v === "__all__" ? null : v)}>
            <SelectTrigger className="h-6 w-[120px] text-[9px] bg-transparent border-border/40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-[10px]">All Types</SelectItem>
              {categoryTypes.map((c) => <SelectItem key={c} value={c} className="text-[10px]">{c.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-5 border-border/40 font-mono">
            {filteredItems.length} items
          </Badge>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-2 flex-1 min-h-0">
          {/* Left — Decision Queue */}
          <div className="border border-border/30 rounded-lg bg-card/20 p-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Decision Queue
              </h2>
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <ShieldCheck className="h-6 w-6 text-status-green/30" />
                <p className="text-[10px] text-muted-foreground">All clear — no pending decisions</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mr-1 pr-1">
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <DecisionCard
                      key={item.id}
                      item={item}
                      isSelected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onNavigate={() => navigate(item.linkTo)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Right — Context Preview */}
          <div className="border border-border/30 rounded-lg bg-card/20 p-2.5 flex flex-col min-h-0">
            <h2 className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Context Preview
            </h2>
            <div className="flex-1 min-h-0">
              <ContextPreview selectedItem={selectedItem} />
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
