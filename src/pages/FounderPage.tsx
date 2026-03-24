import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApprovals } from "@/hooks/use-data";
import { useFounderInbox, useCostAnalytics, useRiskAnalytics } from "@/hooks/use-founder-data";
import { Link } from "react-router-dom";
import {
  Stamp,
  AlertTriangle,
  Rocket,
  ShieldAlert,
  DollarSign,
  ChevronRight,
  Flame,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActionItem = {
  id: string;
  category: "approval" | "escalation" | "risk" | "deploy" | "budget";
  title: string;
  subtitle: string;
  timestamp: string;
  urgency: "critical" | "high" | "normal";
  linkTo: string;
  actionLabel: string;
};

export default function FounderPage() {
  const { data: approvals = [] } = useApprovals();
  const inbox = useFounderInbox();
  const costs = useCostAnalytics();
  const risk = useRiskAnalytics();

  const pendingApprovals = approvals.filter((a) => a.state === "pending");
  const escalations = inbox.data?.escalations ?? [];
  const degradedProviders = inbox.data?.providerDegradedWarnings ?? [];

  // Build unified action feed
  const actions: ActionItem[] = [];

  for (const a of pendingApprovals) {
    actions.push({
      id: `approval-${a.id}`,
      category: "approval",
      title: a.summary,
      subtitle: a.approval_type.replace(/_/g, " "),
      timestamp: a.created_at,
      urgency: a.consequence_if_rejected ? "critical" : "normal",
      linkTo: `/control/approvals/${a.id}`,
      actionLabel: "Review & Decide",
    });
  }

  for (const e of escalations) {
    actions.push({
      id: `escalation-${e.id}`,
      category: "escalation",
      title: e.title,
      subtitle: `Escalated task · ${e.escalation_reason ?? "needs attention"}`,
      timestamp: e.updated_at,
      urgency: "high",
      linkTo: `/control/tasks/${e.id}`,
      actionLabel: "Investigate",
    });
  }

  if (risk.data) {
    for (const loop of risk.data.retry_loops_detected) {
      actions.push({
        id: `retry-${loop.taskId}`,
        category: "risk",
        title: `Retry loop detected (${loop.failedCount} failures)`,
        subtitle: `Task ${loop.taskId.slice(0, 8)}…`,
        timestamp: new Date().toISOString(),
        urgency: "critical",
        linkTo: `/control/tasks/${loop.taskId}`,
        actionLabel: "Investigate",
      });
    }
  }

  for (const p of degradedProviders) {
    actions.push({
      id: `provider-${p.id}`,
      category: "risk",
      title: `Provider ${p.name} degraded`,
      subtitle: `Status: ${p.status}`,
      timestamp: new Date().toISOString(),
      urgency: "high",
      linkTo: `/control/providers/${p.id}`,
      actionLabel: "Check",
    });
  }

  // Sort: critical first, then by time
  actions.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, normal: 2 };
    const diff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (diff !== 0) return diff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const CATEGORY_CONFIG: Record<string, { icon: typeof Stamp; color: string }> = {
    approval: { icon: Stamp, color: "text-status-amber" },
    escalation: { icon: AlertTriangle, color: "text-status-red" },
    risk: { icon: ShieldAlert, color: "text-status-red" },
    deploy: { icon: Rocket, color: "text-status-cyan" },
    budget: { icon: DollarSign, color: "text-status-amber" },
  };

  return (
    <AppLayout title="Founder">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Summary strip */}
        <div className="flex items-center gap-3 flex-wrap">
          <MetricChip label="Pending Decisions" value={pendingApprovals.length} color="amber" />
          <MetricChip label="Escalations" value={escalations.length} color="red" />
          <MetricChip label="Retry Loops" value={risk.data?.retry_loops_detected.length ?? 0} color="red" />
          {costs.data && (
            <MetricChip label="24h Spend" value={`$${costs.data.cost_last_24h.toFixed(2)}`} color="cyan" />
          )}
        </div>

        {/* Action Feed */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-status-amber" />
            Action Feed
            {actions.length > 0 && (
              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4 border-status-amber/30 text-status-amber">
                {actions.length}
              </Badge>
            )}
          </h2>

          {actions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <div className="h-8 w-8 rounded-full bg-status-green/10 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="h-4 w-4 text-status-green" />
                </div>
                <p className="text-xs font-medium">All clear</p>
                <p className="text-[10px] text-muted-foreground">No pending actions required.</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="space-y-1.5 pr-2">
                {actions.map((action) => {
                  const config = CATEGORY_CONFIG[action.category] ?? CATEGORY_CONFIG.approval;
                  const Icon = config.icon;
                  return (
                    <Link key={action.id} to={action.linkTo}>
                      <div className={`group flex items-center gap-3 px-3 py-3 rounded-md bg-card border border-border/50 hover:border-primary/30 hover:bg-surface-glass transition-all cursor-pointer ${
                        action.urgency === "critical" ? "border-l-2 border-l-status-red" : ""
                      }`}>
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                          action.urgency === "critical"
                            ? "bg-status-red/15"
                            : action.urgency === "high"
                            ? "bg-status-amber/15"
                            : "bg-muted"
                        }`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              {action.category}
                            </span>
                            {action.urgency === "critical" && (
                              <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">CRITICAL</Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium mt-0.5 truncate">{action.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{action.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                          </span>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/50">
                            {action.actionLabel}
                          </Button>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MetricChip({ label, value, color }: { label: string; value: number | string; color: "amber" | "red" | "cyan" | "green" }) {
  const colorMap = {
    amber: "bg-status-amber/10 text-status-amber border-status-amber/20",
    red: "bg-status-red/10 text-status-red border-status-red/20",
    cyan: "bg-status-cyan/10 text-status-cyan border-status-cyan/20",
    green: "bg-status-green/10 text-status-green border-status-green/20",
  };
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded border ${colorMap[color]}`}>
      <span className="text-sm font-bold font-mono">{value}</span>
      <span className="text-[9px] opacity-70">{label}</span>
    </div>
  );
}
