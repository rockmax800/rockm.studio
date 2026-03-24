import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, MessageSquare } from "lucide-react";

export function HeroComposer() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-r from-surface-overlay via-surface-raised to-surface-overlay px-6 py-5">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            What do we build next?
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Start with structured intake or talk to Navigator.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/presale/new">
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-medium"
            >
              <FileText className="h-3.5 w-3.5" />
              Start Structured Intake
            </Button>
          </Link>
          <Link to="/founder">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Talk to Navigator
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
