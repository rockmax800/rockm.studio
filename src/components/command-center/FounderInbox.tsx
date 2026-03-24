import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Stamp,
  AlertTriangle,
  Shield,
  Rocket,
  ChevronRight,
  Plus,
} from "lucide-react";

interface InboxItem {
  id: string;
  type: "approval" | "escalation" | "risk";
  category: string;
  title: string;
  riskLevel: "high" | "normal";
  evidenceCount?: number;
  timestamp: string;
  linkTo: string;
}

interface FounderInboxProps {
  items: InboxItem[];
}

const TYPE_ICONS = {
  approval: Stamp,
  escalation: AlertTriangle,
  risk: Shield,
};

export function FounderInbox({ items }: FounderInboxProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Founder Inbox
        </h2>
        <Link to="/founder">
          <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5 text-muted-foreground px-1.5">
            All <ChevronRight className="h-2.5 w-2.5" />
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 border border-dashed border-border/50 rounded-lg p-6">
          <Rocket className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-[10px] text-muted-foreground text-center">No pending decisions</p>
          <Link to="/presale/new">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-border/50">
              <Plus className="h-3 w-3" /> Create Intake
            </Button>
          </Link>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-1 pr-1">
          <div className="space-y-1.5">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <Link key={item.id} to={item.linkTo}>
                  <Card
                    className={`border-border/40 hover:border-primary/30 transition-all cursor-pointer group ${
                      item.riskLevel === "high"
                        ? "border-l-2 border-l-status-red"
                        : ""
                    }`}
                  >
                    <CardContent className="p-2.5">
                      <div className="flex items-start gap-2">
                        <div
                          className={`h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            item.riskLevel === "high"
                              ? "bg-status-red/10 text-status-red"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">
                              {item.category}
                            </span>
                            {item.riskLevel === "high" && (
                              <Badge
                                variant="destructive"
                                className="text-[7px] px-1 py-0 h-3"
                              >
                                HIGH
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] font-medium leading-tight line-clamp-2">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[8px] font-mono text-muted-foreground">
                              {formatDistanceToNow(new Date(item.timestamp), {
                                addSuffix: true,
                              })}
                            </span>
                            {item.evidenceCount !== undefined &&
                              item.evidenceCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[7px] px-1 py-0 h-3 border-border/50"
                                >
                                  {item.evidenceCount} evidence
                                </Badge>
                              )}
                          </div>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary transition-colors shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
