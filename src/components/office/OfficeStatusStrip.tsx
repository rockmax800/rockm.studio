import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  Activity,
  Zap,
  Stamp,
  FolderKanban,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OfficeStatusStripProps {
  systemMode: string;
  activeProjects: number;
  activeTasks: number;
  runningRuns: number;
  pendingApprovals: number;
  projects: { id: string; name: string }[];
  roles: { id: string; name: string; code: string }[];
  selectedProjectId: string | null;
  selectedRoleId: string | null;
  selectedLifecycle: string | null;
  onProjectChange: (id: string | null) => void;
  onRoleChange: (id: string | null) => void;
  onLifecycleChange: (state: string | null) => void;
}

const MODE_STYLES: Record<string, string> = {
  production: "bg-status-green/15 text-status-green border-status-green/30",
  experimental: "bg-status-amber/15 text-status-amber border-status-amber/30",
};

const LIFECYCLE_OPTIONS = [
  { value: "ready", label: "Ready" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_review", label: "Review" },
  { value: "rework_required", label: "Rework" },
  { value: "blocked", label: "Blocked" },
  { value: "escalated", label: "Escalated" },
  { value: "validated", label: "Validated" },
  { value: "done", label: "Done" },
];

export function OfficeStatusStrip({
  systemMode,
  activeProjects,
  activeTasks,
  runningRuns,
  pendingApprovals,
  projects,
  roles,
  selectedProjectId,
  selectedRoleId,
  selectedLifecycle,
  onProjectChange,
  onRoleChange,
  onLifecycleChange,
}: OfficeStatusStripProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-surface-sunken border border-border/40 rounded-lg px-3 py-1.5">
      {/* Left — Status */}
      <Badge
        variant="outline"
        className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 border ${MODE_STYLES[systemMode] ?? MODE_STYLES.production}`}
      >
        {systemMode}
      </Badge>

      <Stat icon={<FolderKanban className="h-3 w-3" />} value={activeProjects} label="Projects" />
      <Stat icon={<Activity className="h-3 w-3" />} value={activeTasks} label="Tasks" />
      <Stat
        icon={<Zap className="h-3 w-3" />}
        value={runningRuns}
        label="Runs"
        color={runningRuns > 0 ? "text-status-cyan" : undefined}
      />
      <Stat
        icon={<Stamp className="h-3 w-3" />}
        value={pendingApprovals}
        label="Approvals"
        color={pendingApprovals > 0 ? "text-status-amber" : undefined}
      />

      <div className="flex-1" />

      {/* Right — Filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3 w-3 text-muted-foreground" />

        <Select
          value={selectedProjectId ?? "__all__"}
          onValueChange={(v) => onProjectChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-6 w-[120px] text-[9px] bg-transparent border-border/40">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[10px]">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-[10px]">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedRoleId ?? "__all__"}
          onValueChange={(v) => onRoleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-6 w-[110px] text-[9px] bg-transparent border-border/40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[10px]">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-[10px]">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedLifecycle ?? "__all__"}
          onValueChange={(v) => onLifecycleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-6 w-[100px] text-[9px] bg-transparent border-border/40">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[10px]">All States</SelectItem>
            {LIFECYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[10px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 ${color ?? "text-muted-foreground"}`}>
      {icon}
      <span className="text-xs font-bold font-mono leading-none">{value}</span>
      <span className="text-[8px] opacity-60 hidden xl:inline">{label}</span>
    </div>
  );
}
