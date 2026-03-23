import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useApprovals } from "@/hooks/use-data";
import { useCostAnalytics, useRiskAnalytics, useFounderInbox } from "@/hooks/use-founder-data";
import { useSystemMode } from "@/hooks/use-system-mode";
import { Inbox, DollarSign, ShieldAlert, Bell, Settings, Crown } from "lucide-react";

export default function FounderPage() {
  const { data: approvals = [] } = useApprovals();
  const costs = useCostAnalytics();
  const risk = useRiskAnalytics();
  const { data: modeData } = useSystemMode();

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
              className="text-[10px] font-mono"
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
                  <Inbox className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-sm font-medium">All clear</p>
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
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                      <p className="text-lg font-semibold">${costs.data.total_cost_project.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Last 24h</p>
                      <p className="text-lg font-semibold">${costs.data.cost_last_24h.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">By Provider</p>
                      <div className="space-y-1 mt-1">
                        {costs.data.cost_by_provider.slice(0, 3).map(p => (
                          <p key={p.name} className="text-xs">{p.name}: ${p.cost.toFixed(2)}</p>
                        ))}
                      </div>
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-lg bg-destructive/5 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">High Risk Validations</p>
                      <p className="text-lg font-semibold text-destructive">{risk.data.high_risk_validations.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Repeated Failures</p>
                      <p className="text-lg font-semibold">{risk.data.repeated_failures}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Retry Loops</p>
                      <p className="text-lg font-semibold">{risk.data.retry_loops_detected.length}</p>
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
                <Badge
                  className="text-xs px-3 py-1 font-mono"
                >
                  {modeData?.mode === "production" ? "🛡 PRODUCTION MODE" : "🧪 EXPERIMENTAL MODE"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-3">
                  Switch between Production (safe, minimal) and Experimental (full feature set) modes
                  via the API endpoint POST /api/system/mode.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
