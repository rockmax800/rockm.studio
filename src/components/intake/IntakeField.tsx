import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface IntakeFieldProps {
  label: string;
  hint?: string;
  type?: "text" | "textarea";
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}

export function IntakeField({ label, hint, type = "text", placeholder, value, onChange, rows = 3, mono }: IntakeFieldProps) {
  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      {hint && <p className="text-[8px] text-muted-foreground/60 mb-1">{hint}</p>}
      {type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`bg-surface-sunken border-border/30 text-[11px] ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`bg-surface-sunken border-border/30 text-[11px] h-8 ${mono ? "font-mono" : ""}`}
        />
      )}
    </div>
  );
}
