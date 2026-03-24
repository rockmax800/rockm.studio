import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  Stamp,
  FolderKanban,
  AlertTriangle,
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

const MODE_STYLES: Record<string, string> = {
  production: "bg-status-green/10 text-status-green border-status-green/30",
  experimental: "bg-status-amber/10 text-status-amber border-status-amber/30",
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
    <div className="flex items-center gap-2 h-12 bg-secondary rounded-[12px] border border-border px-4">
      {/* Left — Mode + Metrics */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border border-border">
        <div className="h-1.5 w-1.5 rounded-full bg-status-green" />
        <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
          {systemMode}
        </span>
      </div>

      <Sep />

      <Metric icon={FolderKanban} value={activeProjects} label="Projects" />
      <Metric icon={Activity} value={activeTasks} label="Tasks" />
      <Metric icon={Zap} value={runningRuns} label="Runs" color={runningRuns > 0 ? "text-status-cyan" : undefined} />
      <Metric icon={Stamp} value={pendingApprovals} label="Approvals" color={pendingApprovals > 0 ? "text-status-amber" : undefined} />
      {blockedCount > 0 && (
        <Metric icon={AlertTriangle} value={blockedCount} label="Blocked" color="text-status-red" />
      )}

      <div className="flex-1" />

      {/* Right — Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />

        <Select
          value={selectedProjectId ?? "__all__"}
          onValueChange={(v) => onProjectChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[130px] text-[12px] bg-card border-border rounded-lg">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[12px]">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-[12px]">{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedRoleId ?? "__all__"}
          onValueChange={(v) => onRoleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[120px] text-[12px] bg-card border-border rounded-lg">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[12px]">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id} className="text-[12px]">{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedLifecycle ?? "__all__"}
          onValueChange={(v) => onLifecycleChange(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 w-[110px] text-[12px] bg-card border-border rounded-lg">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-[12px]">All States</SelectItem>
            {LIFECYCLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Sep() {
  return <div className="h-5 w-px bg-border-strong/40 mx-0.5" />;
}

function Metric({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${color ?? "text-muted-foreground"}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[13px] font-bold font-mono tabular-nums">{value}</span>
      <span className="text-[11px] font-medium hidden xl:inline">{label}</span>
    </div>
  );
}
