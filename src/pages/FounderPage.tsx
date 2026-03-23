import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useApprovals, useActivityEvents } from "@/hooks/use-data";
import { useBottlenecks, useCostAnalytics, useRiskAnalytics, useFounderInbox } from "@/hooks/use-founder-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { useNavigate } from "react-router-dom";
import { Inbox, DollarSign, ShieldAlert, Bell, Settings, Crown } from "lucide-react";

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FounderPage() {
  const { data: approvals = [] } = useApprovals();
  const inbox = useFounderInbox();
  const costs = useCostAnalytics();
  const risk = useRiskAnalytics();
  const { data: modeData } = useSystemMode();
  const navigate = useNavigate();

  const pendingApprovals = approvals.filter(a => a.state === "pending");

  return (
    <AppLayout title="Founder">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Founder Dashboard</h1>
          {modeData && (
            <Badge
              variant={modeData.mode === "production" ? "default" : "destructive"}
              className={`text-[10px] font-mono ${
                modeData.mode === "production"
                  ? "bg-emerald-600/90 text-white"
                  : "bg-amber-500/90 text-black"
              }`}
            >
              {modeData.mode === "production" ? "🛡 PRODUCTION" : "🧪 EXPERIMENTAL"}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="inbox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" /> Inbox
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[9px]">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Budget
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Risk
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="mode" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Mode
            </TabsTrigger>
          </TabsList>

          {/* INBOX */}
          <TabsContent value="inbox" className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Inbox className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">All clear</p>
                  <p className="text-xs text-muted-foreground">No pending decisions.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {pendingApprovals.map(a => (
                  <Card key={a.id} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {a.approval_type.replace(/_/g, " ")}
                      </span>
                      <p className="text-sm font-medium mt-1">{a.summary}</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="h-7 text-xs">Approve</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs">Inspect</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BUDGET */}
          <TabsContent value="budget">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Budget & Token Spend</h3>
                {costs.data ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                      <p className="text-lg font-semibold">${costs.data.totalCost?.toFixed(2) ?? "0.00"}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                      <p className="text-lg font-semibold">{(costs.data.totalTokens ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Avg Cost/Run</p>
                      <p className="text-lg font-semibold">${costs.data.avgCostPerRun?.toFixed(4) ?? "0.00"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading cost analytics…</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISK */}
          <TabsContent value="risk">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Risk Overview</h3>
                {risk.data ? (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="rounded-lg bg-destructive/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Escalated</p>
                      <p className="text-lg font-semibold text-destructive">{risk.data.escalatedCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Blocked</p>
                      <p className="text-lg font-semibold text-amber-600">{risk.data.blockedCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Failed Runs</p>
                      <p className="text-lg font-semibold">{risk.data.failedRunCount ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                      <p className="text-lg font-semibold">{risk.data.overallRiskScore ?? "—"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading risk analytics…</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALERTS */}
          <TabsContent value="alerts">
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  System alerts and suggestions will appear here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODE */}
          <TabsContent value="mode">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">System Mode Control</h3>
                <div className="flex items-center gap-4">
                  <Badge
                    className={`text-xs px-3 py-1 font-mono ${
                      modeData?.mode === "production"
                        ? "bg-emerald-600/90 text-white"
                        : "bg-amber-500/90 text-black"
                    }`}
                  >
                    {modeData?.mode === "production" ? "🛡 PRODUCTION MODE" : "🧪 EXPERIMENTAL MODE"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Switch between Production (safe, minimal) and Experimental (full feature set) modes.
                  Use the API endpoint POST /api/system/mode to change modes.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
