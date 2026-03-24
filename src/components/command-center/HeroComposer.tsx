import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, FolderOpen, ArrowRight, Zap } from "lucide-react";

export function HeroComposer() {
  return (
    <div className="rounded-2xl bg-card border border-border px-8 py-8 shadow-sm relative overflow-hidden">
      {/* Subtle accent gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />

      <div className="relative flex items-end justify-between gap-8">
        {/* Left — dominant text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary/40" />
            <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
              Launch Pad
            </span>
          </div>
          <h1 className="text-[36px] font-bold tracking-[-0.025em] text-foreground leading-[1.1]">
            What are we launching next?
          </h1>
          <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed max-w-[440px]">
            Start with structured intake or resume an active project.
          </p>
        </div>

        {/* Right — action cluster */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/presale/new">
            <Button
              size="lg"
              className="h-12 px-7 gap-2.5 text-[15px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-md"
            >
              <FileText className="h-4.5 w-4.5" />
              Start Intake
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link to="/projects">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 gap-2 text-[15px] font-bold border-border-strong text-foreground hover:bg-secondary rounded-xl"
            >
              <FolderOpen className="h-4.5 w-4.5" />
              Resume Project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
