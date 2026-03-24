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
      <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-status-blue/[0.015] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

        <div className="relative px-10 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-glass border border-border/30 mb-5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.8} />
              <span className="text-[11px] font-semibold text-muted-foreground/60 tracking-[0.02em]">
                AI Production Studio
              </span>
            </div>

            <h1 className="text-[36px] font-bold tracking-[-0.03em] text-foreground leading-[1.1]">
              What are we building?
            </h1>
            <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed max-w-lg mx-auto">
              Every project starts here. Begin with a Company Lead consultation to define scope and get a cost estimate, then proceed to structured intake.
            </p>

            <div className="flex items-center gap-3 justify-center mt-8">
              <Button
                onClick={() => setLeadOpen(true)}
                className="h-12 px-7 gap-2.5 text-[14px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-elevated"
              >
                <MessageSquare className="h-4 w-4" />
                Talk to Company Lead
                <ArrowRight className="h-3.5 w-3.5 ml-0.5 opacity-60" />
              </Button>
              <Link to="/presale/new">
                <Button variant="outline" className="h-12 px-6 gap-2.5 text-[14px] font-semibold border-border/60 text-foreground hover:bg-surface-glass rounded-xl">
                  <FileText className="h-4 w-4 opacity-60" />
                  Skip to Structured Intake
                </Button>
              </Link>
            </div>

            {/* Path explanation */}
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40 font-medium">
              <span className="px-2 py-0.5 rounded bg-foreground/5">Consultation</span>
              <ArrowRight className="h-3 w-3" />
              <span className="px-2 py-0.5 rounded bg-foreground/5">Structured Intake</span>
              <ArrowRight className="h-3 w-3" />
              <span className="px-2 py-0.5 rounded bg-foreground/5">Blueprint</span>
              <ArrowRight className="h-3 w-3" />
              <span className="px-2 py-0.5 rounded bg-foreground/5">Project</span>
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
