import { cn } from "@/lib/utils";
import { Shield, Eye, AlertTriangle, ArrowUpRight, BookOpen, Info } from "lucide-react";
import type { InstinctSetting, InstinctLevel, EscalationTiming, ResearchMode } from "@/types/instinct-settings";
import { synthesizeInstinctGuidance } from "@/types/instinct-settings";

const LEVEL_OPTIONS: { value: InstinctLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const ESCALATION_OPTIONS: { value: EscalationTiming; label: string }[] = [
  { value: "early", label: "Early" },
  { value: "balanced", label: "Balanced" },
  { value: "late", label: "Late" },
];

const RESEARCH_OPTIONS: { value: ResearchMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "balanced", label: "Balanced" },
  { value: "strong", label: "Strong" },
];

const SETTING_ICONS: Record<string, React.ElementType> = {
  review_strictness: Eye,
  security_sensitivity: Shield,
  edge_case_vigilance: AlertTriangle,
  escalation_timing: ArrowUpRight,
  research_before_action: BookOpen,
};

const LEVEL_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-status-amber/10 text-status-amber border-status-amber/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  early: "bg-status-amber/10 text-status-amber border-status-amber/20",
  balanced: "bg-muted text-muted-foreground",
  late: "bg-status-blue/10 text-status-blue border-status-blue/20",
  off: "bg-muted text-muted-foreground",
  strong: "bg-primary/10 text-primary border-primary/20",
};

function OptionPicker({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all",
            value === opt.value
              ? cn(LEVEL_COLORS[opt.value], "border-current/20")
              : "bg-transparent text-muted-foreground/30 border-border/20 hover:text-muted-foreground/60 hover:border-border/40"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface Props {
  settings: InstinctSetting[];
  onChange: (key: string, value: string) => void;
  showSynthesis?: boolean;
}

export function InstinctSettingsPanel({ settings, onChange, showSynthesis = true }: Props) {
  return (
    <div className="space-y-3">
      {/* Header notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/20">
        <Info className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Founder-controlled behavior settings. These shape the agent's working style — not self-adjusting.
        </p>
      </div>

      {/* Settings grid */}
      <div className="space-y-2">
        {settings.map((setting) => {
          const Icon = SETTING_ICONS[setting.key] ?? Shield;
          const options = setting.type === "escalation"
            ? ESCALATION_OPTIONS
            : setting.type === "research"
            ? RESEARCH_OPTIONS
            : LEVEL_OPTIONS;

          return (
            <div key={setting.key} className="rounded-xl border border-border/20 bg-card/60 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground/80">{setting.label}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-relaxed">{setting.description}</p>
                  </div>
                </div>
                <OptionPicker
                  options={options}
                  value={setting.value}
                  onChange={(v) => onChange(setting.key, v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthesized output */}
      {showSynthesis && (
        <div className="rounded-xl border border-border/20 bg-muted/30 px-4 py-3">
          <h4 className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2">
            Resulting Guidance (generated from settings above)
          </h4>
          <pre className="text-[11px] text-foreground/60 leading-relaxed whitespace-pre-wrap font-mono">
            {synthesizeInstinctGuidance(settings)}
          </pre>
        </div>
      )}
    </div>
  );
}
