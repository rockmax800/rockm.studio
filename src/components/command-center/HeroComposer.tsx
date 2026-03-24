import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, MessageSquare } from "lucide-react";

export function HeroComposer() {
  return (
    <div className="ds-card px-8 py-8 flex items-center justify-between gap-8">
      {/* Left — 8 columns worth */}
      <div className="flex-1 min-w-0">
        <h2 className="text-[32px] font-semibold tracking-tight text-foreground leading-[110%]">
          What do we build next?
        </h2>
        <p className="text-[15px] text-muted-foreground mt-2 leading-[150%]">
          Start with a structured brief or talk to Navigator.
        </p>
      </div>

      {/* Right — 4 columns worth */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/presale/new">
          <Button
            size="lg"
            className="h-11 px-6 gap-2 text-[14px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-[12px]"
          >
            <FileText className="h-4 w-4" />
            Start Structured Intake
          </Button>
        </Link>
        <Link to="/founder">
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-6 gap-2 text-[14px] font-semibold border-border-strong text-foreground hover:bg-secondary rounded-[12px]"
          >
            <MessageSquare className="h-4 w-4" />
            Talk to Navigator
          </Button>
        </Link>
      </div>
    </div>
  );
}
