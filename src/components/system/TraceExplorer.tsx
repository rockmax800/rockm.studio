import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Search, ExternalLink, Info, Clock, Database, AlertTriangle, Cpu, Zap, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useOperationalTrace, useProjectsForFilter, type TraceItem, type TraceFilters } from "@/hooks/use-operational-trace";
import { cn } from "@/lib/utils";
import { ExecutionTraceLegend } from "@/components/system/ExecutionTraceLegend";

const ENTITY_TYPES = [
  { value: "all", label: "All entities" },
  { value: "project", label: "Project" },
  { value: "task", label: "Task" },
  { value: "run", label: "Run" },
  { value: "artifact", label: "Artifact" },
  { value: "review", label: "Review" },
  { value: "approval", label: "Approval" },
  { value: "office", label: "Office" },
];

const SOURCE_COLORS: Record<string, string> = {
  activity_events: "bg-primary/10 text-primary",
  office_events: "bg-accent/30 text-accent-foreground",
  approvals: "bg-destructive/10 text-destructive",
  runs: "bg-secondary text-secondary-foreground",
  reviews: "bg-muted text-muted-foreground",
};

function deepLinkFor(item: TraceItem): string | null {
  const raw = item.raw as any;
  if (item.source_table === "approvals") return `/control/approvals/${item.entity_id}`;
  if (item.source_table === "runs" && raw.task_id) return `/control/tasks/${raw.task_id}`;
  if (item.entity_type === "task") return `/control/tasks/${item.entity_id}`;
  if (item.entity_type === "project" || item.source_table === "activity_events" && item.entity_type === "project")
    return `/control/projects/${item.entity_id}`;
  if (item.project_id) return `/control/projects/${item.project_id}`;
  return null;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface TraceExplorerProps {
  initialFilters?: Partial<TraceFilters>;
}

export default function TraceExplorer({ initialFilters }: TraceExplorerProps = {}) {
  const [filters, setFilters] = useState<TraceFilters>(() => initialFilters ?? {});
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: projects = [] } = useProjectsForFilter();
  const { data: items = [], isLoading } = useOperationalTrace(filters);

  const filtered = useMemo(() => {
    if (!searchText) return items;
    const q = searchText.toLowerCase();
    return items.filter(
      (i) =>
        i.summary.toLowerCase().includes(q) ||
        i.event_type.toLowerCase().includes(q) ||
        i.entity_id.toLowerCase().includes(q)
    );
  }, [items, searchText]);

  const selected = useMemo(() => filtered.find((i) => i.id === selectedId) ?? null, [filtered, selectedId]);
  const deepLink = selected ? deepLinkFor(selected) : null;

  return (
    <div className="space-y-3">
      {/* Honesty banner */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Operational Trace (current branch)</strong> — assembled from activity_events, office_events, approvals, runs, and reviews.
          This is not a canonical immutable event log. It reflects currently available data sources in the frontend runtime.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.projectId ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, projectId: v === "all" ? undefined : v }))}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.entityType ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, entityType: v === "all" ? undefined : v }))}
        >
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[160px] max-w-[280px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search events..."
            className="h-8 pl-7 text-xs"
          />
        </div>

        <Badge variant="outline" className="text-[10px] ml-auto">
          {filtered.length} events
        </Badge>

        <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
          <Shield className="h-3 w-3" /> Export Audit Log
        </Button>
      </div>

      {/* List-detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3" style={{ minHeight: 420 }}>
        {/* Left: event list */}
        <Card className="border-none shadow-sm lg:col-span-3">
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-muted-foreground">Loading trace…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-1.5">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No events match filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors",
                        selectedId === item.id && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 shrink-0", SOURCE_COLORS[item.source_table] ?? "")}
                        >
                          {item.source_table.replace("_events", "").replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-foreground truncate flex-1">{item.summary}</span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 font-mono">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{item.entity_id.slice(0, 8)}</span>
                        <Badge variant="outline" className="text-[9px]">{item.event_type}</Badge>
                        {item.actor_type && (
                          <span className="text-[9px] text-muted-foreground/40">{item.actor_type}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: detail panel */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Event Detail</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-48 gap-1.5">
                <Database className="h-5 w-5 text-muted-foreground/20" />
                <p className="text-[11px] text-muted-foreground/50">Select an event to inspect</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <DetailRow label="Timestamp" value={new Date(selected.timestamp).toLocaleString()} />
                  <DetailRow label="Source table" value={selected.source_table} />
                  <DetailRow label="Entity type" value={selected.entity_type} />
                  <DetailRow label="Entity ID" value={selected.entity_id} mono />
                  {selected.project_id && <DetailRow label="Project ID" value={selected.project_id} mono />}
                  <DetailRow label="Event type" value={selected.event_type} />
                  {selected.actor_type && <DetailRow label="Actor type" value={selected.actor_type} />}
                  {selected.actor_ref && <DetailRow label="Actor ref" value={selected.actor_ref} mono />}
                  <DetailRow label="Summary" value={selected.summary} />
                </div>

                {deepLink && (
                  <Link to={deepLink}>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 w-full">
                      <ExternalLink className="h-3 w-3" /> Open in detail view
                    </Button>
                  </Link>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <details className="mt-2">
                        <summary className="text-[10px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">
                          Raw payload
                        </summary>
                        <pre className="mt-1 text-[10px] font-mono bg-muted/30 rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap break-all text-muted-foreground">
                          {JSON.stringify(selected.raw, null, 2)}
                        </pre>
                      </details>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-[10px] max-w-[200px]">
                      Raw record from {selected.source_table}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-muted-foreground/60 w-20 shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-[11px] text-foreground break-all", mono && "font-mono")}>{value}</span>
    </div>
  );
}
