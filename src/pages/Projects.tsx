import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import {
  FolderKanban, FileText, ArrowRight, MessageSquare,
  ChevronRight, Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATE_LABELS: Record<string, string> = {
  draft: "Draft",
  intake: "Intake",
  blueprint: "Blueprint",
  active: "In Delivery",
  in_review: "In Review",
  blocked: "Blocked",
  completed: "Completed",
  archived: "Archived",
};

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <AppLayout title="Projects">
      <div className="max-w-[1280px] mx-auto space-y-6 pb-12">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight">Projects</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Active delivery programs and completed project records
              {projects.length > 0 && (
                <span className="text-muted-foreground/50 ml-2 font-mono text-[12px]">({projects.length})</span>
              )}
            </p>
          </div>
          {projects.length > 0 && (
            <Link to="/presale/new">
              <Button className="h-10 px-5 gap-2 text-[13px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-card">
                <FileText className="h-3.5 w-3.5" /> Start New Intake
              </Button>
            </Link>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-card border border-border/30 p-5 h-[160px] animate-shimmer" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* ── Empty state ─────────────────────────────────── */
          <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
            <div className="relative px-10 py-16 text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-surface-glass/50 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-surface-glass border border-border/30 flex items-center justify-center mx-auto mb-5">
                  <FolderKanban className="h-7 w-7 text-muted-foreground/25" strokeWidth={1.5} />
                </div>
                <h2 className="text-[22px] font-bold text-foreground tracking-tight">No projects yet</h2>
                <p className="text-[14px] text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                  Projects are created through the production pipeline. Start with a Company Lead consultation to define scope and get a cost estimate, then proceed to structured intake and blueprint approval.
                </p>
                <p className="text-[12px] text-muted-foreground/40 mt-1.5 max-w-sm mx-auto leading-relaxed italic">
                  Projects cannot be created directly — they are the output of the intake → blueprint → approval flow.
                </p>
                <div className="flex items-center gap-3 justify-center mt-8">
                  <Link to="/lead">
                    <Button className="h-11 px-6 gap-2.5 text-[13px] font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl shadow-elevated">
                      <MessageSquare className="h-4 w-4" />
                      Talk to Company Lead
                      <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                    </Button>
                  </Link>
                  <Link to="/presale/new">
                    <Button variant="outline" className="h-11 px-6 gap-2 text-[13px] font-semibold border-border/60 text-foreground hover:bg-surface-glass rounded-xl">
                      <FileText className="h-4 w-4 opacity-60" />
                      Start Structured Intake
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Project grid ────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="group">
                <div className="rounded-2xl bg-card border border-border/40 p-5 h-full flex flex-col transition-all duration-200 hover:shadow-elevated hover:border-border/60 hover:-translate-y-px">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-surface-glass border border-border/30 flex items-center justify-center shrink-0">
                      <FolderKanban className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.8} />
                    </div>
                    <StatusBadge state={p.state} />
                  </div>

                  {/* Name + purpose */}
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  {p.purpose && (
                    <p className="text-[12px] text-muted-foreground/60 mt-1 leading-relaxed line-clamp-2">
                      {p.purpose}
                    </p>
                  )}

                  {/* Spacer */}
                  <div className="flex-1 min-h-3" />

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 font-mono">
                      <Calendar className="h-3 w-3" />
                      {formatDate(p.updated_at)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40 group-hover:text-foreground/60 transition-colors font-medium">
                      <span>{STATE_LABELS[p.state] ?? p.state}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
