import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface ListEditorProps {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function ListEditor({ label, hint, items, onChange, placeholder = "Add item…" }: ListEditorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) {
      onChange([...items, v]);
      setDraft("");
    }
  };

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </label>
      {hint && <p className="text-[8px] text-muted-foreground/60 mb-1">{hint}</p>}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {items.map((item, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[9px] px-1.5 py-0.5 h-auto border-border/40 gap-1 group"
            >
              <span className="text-foreground/80">{item}</span>
              <button onClick={() => remove(i)} className="opacity-40 group-hover:opacity-100 transition-opacity">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-surface-sunken border-border/30 text-[11px] h-7 flex-1"
        />
        <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-border/30" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
