import { Badge } from "@/components/ui/badge";

interface IntakeSectionProps {
  number: number;
  title: string;
  subtitle: string;
  status?: "empty" | "partial" | "complete";
  children: React.ReactNode;
}

const STATUS_DOT: Record<string, string> = {
  empty: "bg-muted-foreground/30",
  partial: "bg-status-amber",
  complete: "bg-status-green",
};

export function IntakeSection({ number, title, subtitle, status = "empty", children }: IntakeSectionProps) {
  return (
    <div className="border border-border/30 rounded-lg bg-card/30">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
        <Badge variant="outline" className="text-[8px] font-mono px-1.5 py-0 h-4 border-border/40 text-muted-foreground">
          {String(number).padStart(2, "0")}
        </Badge>
        <h3 className="text-[11px] font-semibold tracking-tight">{title}</h3>
        <span className="text-[8px] text-muted-foreground hidden sm:inline">{subtitle}</span>
        <div className="flex-1" />
        <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
      </div>
      <div className="p-3 space-y-3">
        {children}
      </div>
    </div>
  );
}
