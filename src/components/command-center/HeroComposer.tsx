import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, MessageSquare, ArrowRight } from "lucide-react";

export function HeroComposer() {
  return (
    <div className="ds-card px-8 py-10 flex items-end justify-between gap-12">
      {/* Left — dominant typography */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[44px] font-bold tracking-[-0.02em] text-foreground leading-[1.05]">
          What do we build next?
        </h1>
        <p className="text-[16px] text-muted-foreground mt-3 leading-[1.5] max-w-[480px]">
          Launch a structured intake or direct Navigator to explore an idea.
        </p>
      </div>

      {/* Right — action cluster */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/presale/new">
          <Button
            size="lg"
            className="h-12 px-7 gap-2.5 text-[15px] font-bold bg-foreground text-background hover:bg-foreground/90 rounded-[12px] shadow-md"
          >
            <FileText className="h-4.5 w-4.5" />
            Start Structured Intake
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
        <Link to="/founder">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-7 gap-2 text-[15px] font-bold border-border-strong text-foreground hover:bg-secondary rounded-[12px]"
          >
            <MessageSquare className="h-4.5 w-4.5" />
            Talk to Navigator
          </Button>
        </Link>
      </div>
    </div>
  );
}
