import {
  Activity, Zap, Stamp, FolderKanban, AlertTriangle, Filter,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface OfficeStatusStripProps {
  systemMode: string;
  activeProjects: number;
  activeTasks: number;
  runningRuns: number;
  pendingApprovals: number;
  blockedCount: number;
  projects: { id: string; name: string }[];
  roles: { id: string; name: string; code: string }[];
  selectedProjectId: string | null;
  selectedRoleId: string | null;
  selectedLifecycle: string | null;
  onProjectChange: (id: string | null) => void;
  onRoleChange: (id: string | null) => void;
  onLifecycleChange: (state: string | null) => void;
}

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
  blockedCount,
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
    <div className="flex items-center gap-2 h-11 bg-card rounded-[12px] border border-border px-4">
      {/* Mode badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border">
        <div className={`h-1.5 w-1.5 rounded-full ${systemMode === "production" ? "bg-status-green" : "bg-status-amber"}`} />
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">{systemMode}</span>
      </div>

      <div className="h-5 w-px bg-border mx-0.5" />

      <Metric icon={FolderKanban} value={activeProjects} label="Projects" />
      <Metric icon={Activity} value={activeTasks} label="Tasks" />
      <Metric icon={Zap} value={runningRuns} label="Runs" warn={runningRuns > 0} warnColor="text-status-cyan" />
      <Metric icon={Stamp} value={pendingApprovals} label="Approvals" warn={pendingApprovals > 0} warnColor="text-status-amber" />
      {blockedCount > 0 && (
        <Metric icon={AlertTriangle} value={blockedCount} label="Blocked" warn warnColor="text-status-red" />
      )}

      <div className="flex-1" />

      {/* Filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3 w-3 text-muted-foreground" />

        <Select
          value={selectedProjectId ?? "__all__"}
          onValueChange={(v) => onProjectChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[120px] text-[11px] bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[11px]">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedRoleId ?? "__all__"}
          onValueChange={(v) => onRoleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[100px] text-[11px] bg-secondary border-border rounded-lg">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[11px]">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-[11px]">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedLifecycle ?? "__all__"}
          onValueChange={(v) => onLifecycleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[100px] text-[11px] bg-secondary border-border rounded-lg">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[11px]">All States</SelectItem>
            {LIFECYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[11px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  warn,
  warnColor,
}: {
  icon: any;
  value: number;
  label: string;
  warn?: boolean;
  warnColor?: string;
}) {
  const color = warn && warnColor ? warnColor : "text-muted-foreground";
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[13px] font-bold font-mono tabular-nums">{value}</span>
      <span className="text-[11px] font-medium hidden xl:inline">{label}</span>
    </div>
  );
}
