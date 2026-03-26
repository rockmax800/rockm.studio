import { useProjects } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Info } from "lucide-react";

export function VerificationStatusPanel() {
  const { data: projects = [] } = useProjects();
  const activeProjects = projects.filter((p) => !["archived", "cancelled"].includes(p.state));

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Verification Telemetry
          <Badge variant="outline" className="text-[10px] ml-auto">
            {activeProjects.length} active project(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30">
          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-[12px] text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">Verification Rail</span> derives status from existing
              delivery entities — tasks, runs, artifacts, reviews, approvals, CI suites, and deployments.
            </p>
            <p>
              On this branch, verification is <span className="font-semibold text-foreground">partial</span>:
              data depends on active project delivery pipelines producing evidence.
              No synthetic pass/fail is reported — only what the system can actually observe.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Data Sources</p>
            <p className="font-mono font-semibold text-foreground">7 entity types</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Rail Sections</p>
            <p className="font-mono font-semibold text-foreground">4 (Impl / QA / Sec / Release)</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Coverage</p>
            <p className="font-mono font-semibold text-foreground">Evidence-based only</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">Auto-pass</p>
            <p className="font-mono font-semibold text-destructive">Disabled</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 pt-1">
          Verification status is visible per-project in the Project Cockpit and summarized in the Founder Decision Engine.
          No verification check passes without observable evidence.
        </p>
      </CardContent>
    </Card>
  );
}
