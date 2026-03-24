import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, GraduationCap, AlertTriangle, CheckCircle2,
  ChevronRight, Lightbulb, ShieldAlert, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   CalibrationSummary — shows founder how team improves
   ═══════════════════════════════════════════════════════════ */

export function CalibrationSummary() {
  // Fetch training sessions to derive calibration state
  const { data: sessions = [] } = useQuery({
    queryKey: ["calibration-sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_training_sessions" as any)
        .select("id, employee_id, status, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ["calibration-drafts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_prompt_drafts" as any)
        .select("id, session_id, is_published, version_number, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as any[];
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["calibration-materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_training_materials" as any)
        .select("id, session_id, material_type, title, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as any[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["calibration-employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_employees")
        .select("id, name, role_code")
        .limit(50);
      return data ?? [];
    },
  });

  // Derive calibration stats
  const publishedDrafts = drafts.filter((d: any) => d.is_published);
  const unpublishedDrafts = drafts.filter((d: any) => !d.is_published);
  const totalCorrections = materials.filter((m: any) => m.material_type === "rule" || m.material_type === "anti_pattern").length;
  const totalExamples = materials.filter((m: any) => m.material_type === "example").length;
  const totalNotes = materials.filter((m: any) => m.material_type === "note" || m.material_type === "reference").length;

  // Employees with published guidance vs without
  const employeeSessionMap = new Map<string, boolean>();
  for (const s of sessions) {
    const hasPublished = drafts.some((d: any) => d.session_id === s.id && d.is_published);
    if (hasPublished) employeeSessionMap.set(s.employee_id, true);
    else if (!employeeSessionMap.has(s.employee_id)) employeeSessionMap.set(s.employee_id, false);
  }

  const trainedCount = [...employeeSessionMap.values()].filter(Boolean).length;
  const untrained = employees.filter((e) => !employeeSessionMap.has(e.id));

  const SIGNAL_ROWS: { icon: React.ReactNode; label: string; value: string | number; cls?: string }[] = [
    { icon: <CheckCircle2 className="h-3 w-3" />, label: "Published guidance versions", value: publishedDrafts.length, cls: publishedDrafts.length > 0 ? "text-status-green" : "text-muted-foreground/40" },
    { icon: <ShieldAlert className="h-3 w-3" />, label: "Founder corrections (rules + anti-patterns)", value: totalCorrections, cls: totalCorrections > 0 ? "text-foreground/70" : "text-muted-foreground/40" },
    { icon: <Lightbulb className="h-3 w-3" />, label: "Examples and references added", value: totalExamples + totalNotes, cls: "text-foreground/70" },
    { icon: <MessageSquare className="h-3 w-3" />, label: "Unpublished drafts (pending review)", value: unpublishedDrafts.length, cls: unpublishedDrafts.length > 0 ? "text-status-amber" : "text-muted-foreground/40" },
  ];

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-secondary/30 border border-border/20">
        <Brain className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Coding models, review models, and your direct feedback all contribute to calibration — but only guidance you explicitly publish becomes active in delivery sessions.
          </p>
        </div>
      </div>

      {/* Signal rows */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden divide-y divide-border/15">
        {SIGNAL_ROWS.map((row, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-muted-foreground/40">{row.icon}</span>
            <span className="text-[11px] text-muted-foreground/60 flex-1">{row.label}</span>
            <span className={cn("text-[12px] font-bold font-mono tabular-nums", row.cls)}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Agent coverage */}
      <div className="rounded-xl border border-border/40 bg-card px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground/40" />
          <span className="text-[11px] font-bold text-foreground">Agent Coverage</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-auto font-mono border-border/30">
            {trainedCount}/{employees.length} trained
          </Badge>
        </div>

        {untrained.length > 0 ? (
          <div className="space-y-1">
            {untrained.slice(0, 5).map((e) => (
              <Link key={e.id} to={`/employees/${e.id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-secondary/20 transition-colors group">
                <AlertTriangle className="h-3 w-3 text-status-amber/60 shrink-0" />
                <span className="text-[11px] text-foreground/60 flex-1">{e.name}</span>
                <span className="text-[9px] text-muted-foreground/30">{e.role_code}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
            {untrained.length > 5 && (
              <p className="text-[10px] text-muted-foreground/30 px-2.5">+{untrained.length - 5} more without guidance</p>
            )}
          </div>
        ) : employees.length > 0 ? (
          <p className="text-[11px] text-status-green/60 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> All agents have published guidance
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">No agents registered yet.</p>
        )}
      </div>
    </div>
  );
}
