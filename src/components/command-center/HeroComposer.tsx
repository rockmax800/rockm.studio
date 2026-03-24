import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MessageSquare, FileText, FolderOpen, Monitor, Crown,
  ArrowRight, Sparkles,
} from "lucide-react";
import { CompanyLeadWorkspace } from "./CompanyLeadWorkspace";

/* ── StatusStrip ─────────────────────────────────────────── */

interface StatusStripProps {
  mode: string;
  metrics: { label: string; value: number; icon: any; danger?: boolean }[];
}

export function StatusStrip({ mode, metrics }: StatusStripProps) {
  return (
    <div className="flex items-center gap-5 px-5 py-3 rounded-xl bg-surface-raised border border-border/40">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40 font-mono shrink-0">
        {mode}
      </span>
      <div className="h-4 w-px bg-border/40" />
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-1.5">
          <m.icon className={cn(
            "h-3.5 w-3.5",
            m.danger && m.value > 0 ? "text-destructive" : "text-muted-foreground/40",
          )} strokeWidth={1.8} />
          <span className={cn(
            "text-[14px] font-bold font-mono tabular-nums",
            m.danger && m.value > 0 ? "text-destructive" : "text-foreground",
          )}>{m.value}</span>
          <span className="text-[11px] text-muted-foreground/45 font-medium">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── HeroComposer ────────────────────────────────────────── */

export function HeroComposer() {
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <>
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative px-8 py-10 lg:px-12 lg:py-14">
          <div className="max-w-xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border/50 mb-5">
              <Sparkles className="h-3 w-3 text-muted-foreground/60" strokeWidth={1.8} />
              <span className="text-[10px] font-bold text-muted-foreground/60 tracking-[0.06em] uppercase">
                Production Studio
              </span>
            </div>

            <h1 className="text-[28px] lg:text-[34px] font-bold tracking-[-0.025em] text-foreground leading-[1.15]">
              What are we building?
            </h1>
            <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed max-w-md mx-auto">
              Start with a Company Lead consultation to define scope, then proceed to structured intake.
            </p>

            <div className="flex items-center gap-3 justify-center mt-8">
              <Button
                onClick={() => setLeadOpen(true)}
                className="h-11 px-6 gap-2 text-[13px] font-bold bg-secondary border border-border-strong text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Talk to Company Lead
                <ArrowRight className="h-3.5 w-3.5 ml-0.5 text-muted-foreground/50" />
              </Button>
              <Link to="/presale/new">
                <Button variant="outline" className="h-11 px-5 gap-2 text-[13px] font-medium border-border text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                  <FileText className="h-4 w-4 opacity-50" />
                  Structured Intake
                </Button>
              </Link>
            </div>

            {/* Path explanation */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/35 font-medium">
              <span className="px-2 py-0.5 rounded bg-secondary border border-border/30">Consultation</span>
              <ArrowRight className="h-2.5 w-2.5" />
              <span className="px-2 py-0.5 rounded bg-secondary border border-border/30">Intake</span>
              <ArrowRight className="h-2.5 w-2.5" />
              <span className="px-2 py-0.5 rounded bg-secondary border border-border/30">Blueprint</span>
              <ArrowRight className="h-2.5 w-2.5" />
              <span className="px-2 py-0.5 rounded bg-secondary border border-border/30">Project</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded workspace sheet */}
      <CompanyLeadWorkspace open={leadOpen} onOpenChange={setLeadOpen} />
    </>
  );
}

/* ── QuickActions ─────────────────────────────────────────── */

export function QuickActions() {
  const actions = [
    { label: "Resume Project", to: "/projects", icon: FolderOpen },
    { label: "Open Office", to: "/office", icon: Monitor },
    { label: "Founder Queue", to: "/founder", icon: Crown },
  ];

  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-medium text-muted-foreground/35 tracking-[0.04em] uppercase px-1">
        Shortcuts
      </span>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.to}>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface-raised border border-border/30 hover:border-border/60 hover:bg-surface-glass transition-all duration-180 group cursor-pointer">
              <a.icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" strokeWidth={1.8} />
              <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
