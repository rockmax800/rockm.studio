import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch, Server, Globe, CheckCircle2, AlertTriangle,
  ExternalLink, CircleDot, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface RepoInfo {
  hasRepo: boolean;
  repoName?: string;
  provider?: string;
  prCount?: number;
  ciStatus?: "passed" | "failed" | "pending" | null;
}

interface DeployInfo {
  hasStaging: boolean;
  hasProduction: boolean;
  stagingStatus?: string;
  productionStatus?: string;
  environmentCount: number;
}

interface DomainInfo {
  hasDomain: boolean;
  domains: { domain: string; status: string }[];
}

interface ProjectSetupPanelProps {
  repo: RepoInfo;
  deploy: DeployInfo;
  domain: DomainInfo;
  projectId: string;
}

/* ═══════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════ */

type SetupStatus = "connected" | "partial" | "not_connected";

function resolveStatus(connected: boolean, partial?: boolean): SetupStatus {
  if (connected) return partial ? "partial" : "connected";
  return "not_connected";
}

const STATUS_CONFIG: Record<SetupStatus, { label: string; dotCls: string; badgeCls: string }> = {
  connected:     { label: "Connected",     dotCls: "bg-status-green",        badgeCls: "bg-status-green/10 text-status-green border-status-green/20" },
  partial:       { label: "Partial",       dotCls: "bg-status-amber",        badgeCls: "bg-status-amber/10 text-status-amber border-status-amber/20" },
  not_connected: { label: "Not connected", dotCls: "bg-muted-foreground/20", badgeCls: "bg-muted/40 text-muted-foreground border-border/30" },
};

function StatusChip({ status }: { status: SetupStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border", cfg.badgeCls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotCls)} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function ProjectSetupPanel({ repo, deploy, domain, projectId }: ProjectSetupPanelProps) {
  const repoStatus = resolveStatus(repo.hasRepo);
  const deployStatus = resolveStatus(deploy.hasStaging || deploy.hasProduction, (deploy.hasStaging && !deploy.hasProduction) || (!deploy.hasStaging && deploy.hasProduction));
  const domainStatus = resolveStatus(domain.hasDomain);

  const allConnected = repoStatus === "connected" && deployStatus === "connected" && domainStatus === "connected";
  const missingCount = [repoStatus, deployStatus, domainStatus].filter((s) => s === "not_connected").length;

  return (
    <div className="space-y-3">
      {/* Summary banner */}
      {!allConnected && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-status-amber/[0.04] border border-status-amber/15">
          <AlertTriangle className="h-3.5 w-3.5 text-status-amber shrink-0" />
          <p className="text-[11px] text-foreground font-medium">
            {missingCount === 3
              ? "Setup required before release — no infrastructure connected yet."
              : `${missingCount} setup step${missingCount > 1 ? "s" : ""} remaining before production release.`}
          </p>
        </div>
      )}
      {allConnected && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-status-green/[0.04] border border-status-green/15">
          <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0" />
          <p className="text-[11px] text-foreground font-medium">
            All infrastructure connected — project is release-ready from a setup perspective.
          </p>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* ── GitHub Repository ── */}
        <SetupCard
          icon={<GitBranch className="h-4 w-4" />}
          title="GitHub Repository"
          status={repoStatus}
        >
          {repo.hasRepo ? (
            <div className="space-y-2">
              <InfoRow label="Repository" value={repo.repoName ?? "Connected"} />
              <InfoRow label="Provider" value={repo.provider ?? "GitHub"} />
              {repo.prCount !== undefined && <InfoRow label="Pull Requests" value={String(repo.prCount)} />}
              {repo.ciStatus && (
                <InfoRow label="CI Status" value={
                  repo.ciStatus === "passed" ? "✓ Passing" : repo.ciStatus === "failed" ? "✗ Failing" : "Pending"
                } alert={repo.ciStatus === "failed"} />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                Attach a repository to sync code output, enable PR visibility, and connect CI pipelines.
              </p>
              <div className="space-y-1 text-[10px] text-muted-foreground/40">
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> Code artifacts push to repo branches</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> PRs created per task for review</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> CI results feed back into release readiness</p>
              </div>
            </div>
          )}
          <HonestAction connected={repo.hasRepo} actionLabel="Connect Repository" pendingLabel="Repository integration is configured at the system level." />
        </SetupCard>

        {/* ── Deployment Target ── */}
        <SetupCard
          icon={<Server className="h-4 w-4" />}
          title="Deployment Target"
          status={deployStatus}
        >
          {deploy.hasStaging || deploy.hasProduction ? (
            <div className="space-y-2">
              <InfoRow label="Environments" value={`${deploy.environmentCount} configured`} />
              <InfoRow label="Staging" value={deploy.hasStaging ? (deploy.stagingStatus === "live" ? "● Live" : deploy.stagingStatus ?? "Configured") : "Not set"} alert={!deploy.hasStaging} />
              <InfoRow label="Production" value={deploy.hasProduction ? (deploy.productionStatus === "live" ? "● Live" : deploy.productionStatus ?? "Configured") : "Not set"} alert={!deploy.hasProduction} />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                Define where this project deploys — staging and production targets for the delivery pipeline.
              </p>
              <div className="space-y-1 text-[10px] text-muted-foreground/40">
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> Server / VPS target for each environment</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> Deploy path and credentials</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> Staging must be live before production deploy</p>
              </div>
            </div>
          )}
          <HonestAction connected={deploy.hasStaging || deploy.hasProduction} actionLabel="Configure Deployment" pendingLabel="Deployment targets are managed through system infrastructure settings." />
        </SetupCard>

        {/* ── Domain Binding ── */}
        <SetupCard
          icon={<Globe className="h-4 w-4" />}
          title="Domain Binding"
          status={domainStatus}
        >
          {domain.hasDomain ? (
            <div className="space-y-2">
              {domain.domains.map((d, i) => (
                <InfoRow key={i} label={d.domain} value={d.status === "active" ? "● Active" : d.status} alert={d.status !== "active"} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                Bind a domain to make the project accessible at a public URL after production deploy.
              </p>
              <div className="space-y-1 text-[10px] text-muted-foreground/40">
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> Custom domain (e.g. app.example.com)</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> DNS / A record configuration</p>
                <p className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> SSL provisioned automatically on validation</p>
              </div>
            </div>
          )}
          <HonestAction connected={domain.hasDomain} actionLabel="Bind Domain" pendingLabel="Domain binding is configured through domain management settings." />
        </SetupCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function SetupCard({ icon, title, status, children }: {
  icon: React.ReactNode;
  title: string;
  status: SetupStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2.5">
        <span className="text-muted-foreground/40">{icon}</span>
        <span className="text-[12px] font-bold text-foreground flex-1">{title}</span>
        <StatusChip status={status} />
      </div>
      {/* Body */}
      <div className="px-4 py-3 flex-1 flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground/50">{label}</span>
      <span className={cn("font-medium font-mono", alert ? "text-status-amber" : "text-foreground/70")}>{value}</span>
    </div>
  );
}

function HonestAction({ connected, actionLabel, pendingLabel }: { connected: boolean; actionLabel: string; pendingLabel: string }) {
  if (connected) return null;
  return (
    <div className="mt-auto pt-2 border-t border-border/15">
      <div className="flex items-start gap-2">
        <Info className="h-3 w-3 text-muted-foreground/30 mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">{pendingLabel}</p>
      </div>
    </div>
  );
}
