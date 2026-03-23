// Hiring Market Dashboard — AI Model Marketplace
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useHiringMarket } from "@/hooks/use-hiring-market";
import { ShoppingBag, TrendingUp, Award, BarChart3, Zap, AlertTriangle } from "lucide-react";
import type { RankedModel, UpgradeSuggestion } from "@/services/ModelCompetitionService";

export default function HiringMarketDashboard() {
  const { data, isLoading, error } = useHiringMarket();

  return (
    <AppLayout title="AI Hiring Market">
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {error && <p className="text-destructive">Error: {(error as Error).message}</p>}
      {data && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={<ShoppingBag className="h-4 w-4" />} label="Models Available" value={data.totalModels} />
            <KpiCard icon={<BarChart3 className="h-4 w-4" />} label="Benchmarks" value={data.totalBenchmarks} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Upgrade Suggestions" value={data.upgradeSuggestions.length} variant={data.upgradeSuggestions.length > 0 ? "warn" : undefined} />
            <KpiCard icon={<Zap className="h-4 w-4" />} label="Active Experiments" value={data.experiments.length} />
          </div>

          {/* Upgrade Suggestions */}
          {data.upgradeSuggestions.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Upgrade Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.upgradeSuggestions.map((s: UpgradeSuggestion, i: number) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                    <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{s.team_name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {s.current_provider}/{s.current_model} → {s.suggested_provider}/{s.suggested_model}
                        </span>
                        <Badge className="text-[9px] bg-emerald-600">+{s.delta_percent}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">Current: {s.current_score.toFixed(3)}</span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Suggested: {s.suggested_score.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Global Model Rankings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4" /> Model Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Success %</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Reliability</TableHead>
                    <TableHead className="text-right">Quality</TableHead>
                    <TableHead className="text-right">Samples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rankedModels.map((m: RankedModel, i: number) => (
                    <TableRow key={m.model_market_id} className={i === 0 ? "bg-emerald-500/5" : ""}>
                      <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px]">{m.provider}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        {m.model_name}
                        {i === 0 && <span className="text-[8px] ml-1 text-emerald-600">👑</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        <span className={i === 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                          {m.competition_score.toFixed(3)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {m.sample_size > 0 ? `${(m.avg_success_rate * 100).toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {m.avg_cost > 0 ? `$${m.avg_cost.toFixed(4)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{m.reliability_score.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{m.avg_quality_score.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{m.sample_size}</TableCell>
                    </TableRow>
                  ))}
                  {data.rankedModels.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No models in the marketplace yet. Add models to start benchmarking.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Department Benchmarks */}
          {data.departmentBenchmarks.filter((d: any) => d.ranked.length > 0).map((dept: any) => (
            <Card key={dept.team_id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> {dept.team_name} — Department Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {dept.ranked.slice(0, 5).map((m: RankedModel, i: number) => (
                    <div key={m.model_market_id} className={`rounded-lg border p-2 text-center min-w-[100px] ${i === 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
                      <p className="text-[10px] text-muted-foreground">{m.provider}</p>
                      <p className="text-xs font-medium">{m.model_name}</p>
                      <p className={`text-sm font-mono font-bold ${i === 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {m.competition_score.toFixed(3)}
                      </p>
                      {i === 0 && <Badge className="text-[7px] bg-emerald-600 mt-1">TOP</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function KpiCard({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number | string; variant?: "warn" }) {
  return (
    <Card className={variant === "warn" && Number(value) > 0 ? "border-amber-500/40" : ""}>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={variant === "warn" && Number(value) > 0 ? "text-amber-500" : "text-muted-foreground"}>{icon}</div>
        <div>
          <p className="text-lg font-mono font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
