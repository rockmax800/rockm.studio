import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type HRProposal, ROLE_OPTIONS, riskColor, riskBg, biasChipClass, strictnessLabel,
} from "@/lib/employeeConfig";
import { CheckCircle2, X, Shield, Zap, FileText, TestTube, ArrowUpRight, AlertTriangle } from "lucide-react";

interface Props {
  proposal: HRProposal;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function HRProposalCard({ proposal, onApprove, onReject }: Props) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const roleLabel = ROLE_OPTIONS.find(r => r.code === proposal.suggestedRole)?.label ?? proposal.suggestedRole;
  const t = proposal.traits;

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
            <p className="text-[15px] font-bold text-foreground">{roleLabel} · {proposal.suggestedSeniority}</p>
            <p className="text-[12px] text-muted-foreground">
              {proposal.status === "approved" ? "Approved — employee will be created" : `Rejected: ${proposal.rejectionReason || "No reason given"}`}
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
      {/* Header band */}
      <div className="px-5 py-4 bg-secondary/30 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-bold text-foreground tracking-tight">{roleLabel}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {proposal.suggestedSeniority} · {proposal.capabilityName}
            </p>
          </div>
          {proposal.riskFlag && (
            <Badge className="text-[10px] font-bold bg-destructive/10 text-destructive border-0 shrink-0 gap-1">
              <AlertTriangle className="h-3 w-3" /> Risk
            </Badge>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stack */}
        {proposal.primaryStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {proposal.primaryStack.map(s => (
              <Badge key={s} variant="secondary" className="text-[10px] font-bold">{s}</Badge>
            ))}
            {proposal.secondaryStack.map(s => (
              <Badge key={s} variant="outline" className="text-[10px] font-bold text-muted-foreground">{s}</Badge>
            ))}
          </div>
        )}

        {/* Operational traits */}
        <div className="flex flex-wrap gap-1.5">
          <TraitChip icon={<Shield className="h-3 w-3" />} label={`${t.riskTolerance} risk`}
            className={riskBg(t.riskTolerance) + " " + riskColor(t.riskTolerance)} />
          <TraitChip icon={<Zap className="h-3 w-3" />} label={`Strict: ${strictnessLabel(t.strictness)}`}
            className="bg-primary/5 text-foreground" />
          <TraitChip label={`Q:${t.speedVsQuality}%`} className="bg-primary/5 text-foreground" />
          <TraitChip label={`Eff:${t.tokenEfficiency}%`} className="bg-primary/5 text-foreground" />
          <TraitChip icon={<TestTube className="h-3 w-3" />} label={`Test: ${t.testCoverageBias}`}
            className={biasChipClass(t.testCoverageBias)} />
          <TraitChip icon={<FileText className="h-3 w-3" />} label={`Docs: ${t.documentationBias}`}
            className={biasChipClass(t.documentationBias)} />
          <TraitChip label={`Refactor: ${t.refactorBias}`} className={biasChipClass(t.refactorBias)} />
        </div>

        {/* Rationale */}
        <div className="rounded-xl bg-secondary/20 px-4 py-3">
          <p className="text-[12px] font-bold text-muted-foreground mb-1">Rationale</p>
          <p className="text-[13px] text-foreground leading-relaxed">{proposal.rationale}</p>
        </div>

        {/* Team impact */}
        <div className="rounded-xl bg-primary/5 px-4 py-3">
          <p className="text-[12px] font-bold text-primary/70 mb-1 flex items-center gap-1.5">
            <ArrowUpRight className="h-3 w-3" /> Team Balance Impact
          </p>
          <p className="text-[13px] text-foreground">{proposal.teamBalanceImpact}</p>
          <p className="text-[12px] text-muted-foreground mt-1">{proposal.expectedImprovement}</p>
        </div>

        {/* Risk flag */}
        {proposal.riskFlag && (
          <div className="rounded-xl bg-destructive/5 px-4 py-3">
            <p className="text-[12px] font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Risk Flag
            </p>
            <p className="text-[13px] text-foreground mt-0.5">{proposal.riskFlag}</p>
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
              <CheckCircle2 className="h-4 w-4" /> Approve & Create Employee
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

function TraitChip({ icon, label, className }: { icon?: React.ReactNode; label: string; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${className}`}>
      {icon}{label}
    </span>
  );
}
