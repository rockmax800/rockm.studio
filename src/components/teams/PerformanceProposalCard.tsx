import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  type HRPerformanceProposal, ROLE_OPTIONS, STATUS_META,
} from "@/lib/employeeConfig";
import { getPersona } from "@/lib/personas";
import {
  CheckCircle2, X, AlertTriangle, ArrowUpRight, TrendingDown,
  Shield, UserMinus, RefreshCw, ArrowRightLeft, Sparkles,
} from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  probation:              { label: "Move to Probation",    icon: Shield,          color: "text-status-amber",     bg: "bg-status-amber/10" },
  role_adjustment:        { label: "Role Adjustment",      icon: ArrowRightLeft,  color: "text-status-blue",      bg: "bg-status-blue/10" },
  stack_adjustment:       { label: "Stack Adjustment",     icon: RefreshCw,       color: "text-status-blue",      bg: "bg-status-blue/10" },
  replacement:            { label: "Replacement",          icon: UserMinus,       color: "text-destructive",      bg: "bg-destructive/10" },
  remove_from_capability: { label: "Remove from Team",     icon: UserMinus,       color: "text-destructive",      bg: "bg-destructive/10" },
  restore_active:         { label: "Restore to Active",    icon: Sparkles,        color: "text-status-green",     bg: "bg-status-green/10" },
};

interface Props {
  proposal: HRPerformanceProposal;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function PerformanceProposalCard({ proposal, onApprove, onReject }: Props) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const persona = getPersona(proposal.roleCode);
  const roleLabel = ROLE_OPTIONS.find(r => r.code === proposal.roleCode)?.label ?? proposal.roleCode;
  const tm = TYPE_META[proposal.type] ?? TYPE_META.probation;
  const Icon = tm.icon;
  const m = proposal.metrics;
  const perfPct = Math.round(proposal.performanceScore * 100);
  const perfColor = perfPct >= 65 ? "text-status-green" : perfPct >= 40 ? "text-status-amber" : "text-destructive";

  if (proposal.status !== "pending") {
    return (
      <div className={`rounded-2xl border p-5 transition-all ${
        proposal.status === "approved" ? "border-status-green/30 bg-status-green/5" : "border-border bg-secondary/20 opacity-60"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            proposal.status === "approved" ? "bg-status-green/10" : "bg-secondary"
          }`}>
            {proposal.status === "approved" ? <CheckCircle2 className="h-5 w-5 text-status-green" /> : <X className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-foreground">{tm.label}: {proposal.employeeName}</p>
            <p className="text-[12px] text-muted-foreground">
              {proposal.status === "approved" ? "Approved — action will be applied" : `Rejected: ${proposal.rejectionReason || "No reason"}`}
            </p>
          </div>
          <Badge variant="outline" className={`text-[10px] font-bold ${
            proposal.status === "approved" ? "text-status-green border-status-green/30" : "text-muted-foreground"
          }`}>{proposal.status}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all">
      {/* Header */}
      <div className="px-5 py-4 bg-secondary/30 border-b border-border/30">
        <div className="flex items-start gap-3">
          <img src={persona.avatar} alt={proposal.employeeName}
            className={`h-12 w-12 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card shrink-0`}
            width={48} height={48} />
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-bold text-foreground tracking-tight">{proposal.employeeName}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">{roleLabel} · {proposal.capabilityName}</p>
          </div>
          <Badge className={`text-[10px] font-bold border-0 gap-1 shrink-0 ${tm.bg} ${tm.color}`}>
            <Icon className="h-3 w-3" /> {tm.label}
          </Badge>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Metrics snapshot */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCell label="Success" value={`${Math.round(m.successRate * 100)}%`}
            bad={m.successRate < 0.6} />
          <MetricCell label="Review Pass" value={`${Math.round(m.reviewPassRate * 100)}%`}
            bad={m.reviewPassRate < 0.65} />
          <MetricCell label="Rework" value={`${Math.round(m.reworkRate * 100)}%`}
            bad={m.reworkRate > 0.25} invert />
          <MetricCell label="Bug Rate" value={`${Math.round(m.bugRate * 100)}%`}
            bad={m.bugRate > 0.25} invert />
          <MetricCell label="Escalation" value={`${Math.round(m.escalationRate * 100)}%`}
            bad={m.escalationRate > 0.3} invert />
          <MetricCell label="Perf Score" value={`${perfPct}%`}
            bad={perfPct < 50} className={perfColor} />
        </div>

        {/* Performance bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-muted-foreground">Performance Score</span>
            <span className={`text-[12px] font-mono font-bold ${perfColor}`}>{perfPct}%</span>
          </div>
          <Progress value={perfPct} className="h-2" />
        </div>

        {/* Issue */}
        <div className="rounded-xl bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-bold text-destructive flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3 w-3" /> Identified Issue
          </p>
          <p className="text-[13px] text-foreground leading-relaxed">{proposal.issue}</p>
        </div>

        {/* Suggested action */}
        <div className="rounded-xl bg-secondary/20 px-4 py-3">
          <p className="text-[12px] font-bold text-muted-foreground mb-1">Suggested Action</p>
          <p className="text-[13px] text-foreground leading-relaxed">{proposal.suggestedAction}</p>
        </div>

        {/* Team impact */}
        <div className="rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-[12px] font-bold text-primary/70 mb-1 flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3" /> Projected Team Impact
          </p>
          <p className="text-[13px] text-foreground">{proposal.projectedTeamImpact}</p>
        </div>

        {/* Risk if ignored */}
        <div className="rounded-xl bg-status-amber/5 px-4 py-3">
          <p className="text-[12px] font-bold text-status-amber flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-3 w-3" /> Risk If Ignored
          </p>
          <p className="text-[13px] text-foreground">{proposal.riskIfIgnored}</p>
        </div>

        {/* Replacement comparison */}
        {proposal.replacementConfig && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[12px] font-bold text-foreground mb-3 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 text-muted-foreground" /> Replacement Configuration
            </p>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <span className="text-muted-foreground font-bold block mb-1">Current</span>
                <p className="text-foreground">{roleLabel}</p>
                <p className="text-muted-foreground/70 text-[11px]">Perf: {perfPct}%</p>
              </div>
              <div>
                <span className="text-status-green font-bold block mb-1">Proposed</span>
                <p className="text-foreground">
                  {ROLE_OPTIONS.find(r => r.code === proposal.replacementConfig!.suggestedRole)?.label}
                  {" · "}{proposal.replacementConfig!.suggestedSeniority}
                </p>
                <p className="text-status-green/70 text-[11px]">{proposal.replacementConfig!.projectedImprovement}</p>
              </div>
            </div>
            {proposal.replacementConfig.primaryStack.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {proposal.replacementConfig.primaryStack.map(s => (
                  <Badge key={s} variant="secondary" className="text-[9px] font-bold">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showReject ? (
          <div className="flex items-center gap-2 pt-1">
            <Input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Rejection reason…" className="h-9 text-[13px] flex-1" />
            <Button size="sm" variant="outline" onClick={() => setShowReject(false)} className="h-9 text-[12px] rounded-lg">Cancel</Button>
            <Button size="sm" onClick={() => onReject(proposal.id, reason)}
              className="h-9 text-[12px] font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={() => onApprove(proposal.id)}
              className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 flex-1">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </Button>
            <Button variant="outline" onClick={() => setShowReject(true)}
              className="h-10 text-[13px] rounded-xl shrink-0">
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCell({ label, value, bad, invert, className }: {
  label: string; value: string; bad: boolean; invert?: boolean; className?: string;
}) {
  const color = className ?? (bad ? "text-destructive" : "text-status-green");
  return (
    <div className="rounded-lg bg-secondary/30 px-3 py-2 text-center">
      <p className="text-[10px] font-bold text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-[14px] font-mono font-bold ${color}`}>{value}</p>
    </div>
  );
}
