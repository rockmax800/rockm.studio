import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { generateEmployeeName } from "@/services/EmployeeNamingService";
import { getPersona } from "@/lib/personas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, X } from "lucide-react";

const ROLE_OPTIONS = [
  { code: "product_strategist", label: "Product Strategist" },
  { code: "solution_architect", label: "Solution Architect" },
  { code: "backend_architect", label: "Backend Architect" },
  { code: "backend_implementer", label: "Backend Implementer" },
  { code: "frontend_builder", label: "Frontend Builder" },
  { code: "reviewer", label: "Reviewer" },
  { code: "qa_agent", label: "QA Agent" },
  { code: "release_coordinator", label: "Release Coordinator" },
];

const STACK_OPTIONS = ["React", "TypeScript", "Node.js", "Supabase", "PostgreSQL", "Python", "Go", "Rust", "Swift", "Kotlin", "Flutter", "Docker", "AWS", "GCP", "Tailwind CSS"];
const SENIORITY_OPTIONS = ["Junior", "Middle", "Senior", "Lead"];

interface Props {
  teamId?: string;
  teamName?: string;
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

export function AddEmployeeDialog({ teamId, teamName, trigger, onCreated }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [roleCode, setRoleCode] = useState("frontend_builder");
  const [seniority, setSeniority] = useState("Middle");
  const [stack, setStack] = useState<string[]>([]);
  const [mayDeploy, setMayDeploy] = useState(false);
  const [nameIdx, setNameIdx] = useState(0);

  const persona = getPersona(roleCode);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const idx = Math.floor(Math.random() * 30);
      setNameIdx(idx);
      setName(generateEmployeeName(roleCode, idx));
      setStack([]);
      setSeniority("Middle");
      setMayDeploy(false);
    }
    setOpen(isOpen);
  };

  const regenerate = () => {
    const idx = nameIdx + 1;
    setNameIdx(idx);
    setName(generateEmployeeName(roleCode, idx));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Find or create role for team
      let roleId: string | null = null;
      if (teamId) {
        const { data: existingRole } = await supabase
          .from("agent_roles")
          .select("id")
          .eq("code", roleCode)
          .eq("team_id", teamId)
          .maybeSingle();
        roleId = existingRole?.id ?? null;
        if (!roleId) {
          const label = ROLE_OPTIONS.find((r) => r.code === roleCode)?.label ?? roleCode;
          const { data: newRole } = await supabase
            .from("agent_roles")
            .insert({ code: roleCode, name: label, description: `${label}`, team_id: teamId, skill_profile: { stack, seniority } })
            .select("id")
            .single();
          roleId = newRole?.id ?? null;
        }
      }

      await supabase.from("ai_employees").insert({
        name: name.trim(),
        role_code: roleCode,
        role_id: roleId,
        team_id: teamId ?? null,
        status: "active",
        model_name: "gpt-4o",
        provider: "openai",
      });

      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      qc.invalidateQueries({ queryKey: ["team-room-employees"] });
      qc.invalidateQueries({ queryKey: ["office"] });
      toast.success(`${name} added to ${teamName ?? "team"}`);
      setOpen(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 gap-2 text-[12px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-3.5 w-3.5" /> Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-bold">Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Avatar preview + name */}
          <div className="flex items-center gap-4">
            <img src={persona.avatar} alt={name}
              className={`h-16 w-16 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
              width={64} height={64} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 text-[15px] font-bold flex-1" placeholder="Employee name" />
                <button onClick={regenerate} className="text-muted-foreground hover:text-foreground transition-colors p-2" title="Regenerate name">
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-[12px] font-bold text-muted-foreground mb-2 block">Role</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTIONS.map((r) => (
                <button key={r.code} onClick={() => { setRoleCode(r.code); setName(generateEmployeeName(r.code, nameIdx)); }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                    roleCode === r.code ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/20"
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seniority */}
          <div>
            <label className="text-[12px] font-bold text-muted-foreground mb-2 block">Seniority</label>
            <div className="flex gap-2">
              {SENIORITY_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSeniority(s)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    seniority === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Stack */}
          <div>
            <label className="text-[12px] font-bold text-muted-foreground mb-2 block">Stack</label>
            <div className="flex flex-wrap gap-1.5">
              {STACK_OPTIONS.map((s) => (
                <button key={s} onClick={() => setStack((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    stack.includes(s) ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-foreground/20"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Deploy checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mayDeploy} onChange={(e) => setMayDeploy(e.target.checked)} className="rounded border-border" />
            <span className="text-[13px] font-bold text-muted-foreground">May deploy to production</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="h-10 text-[13px] rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}
              className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
              <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add Employee"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
