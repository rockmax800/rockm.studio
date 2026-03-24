import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { generateEmployeeName } from "@/services/EmployeeNamingService";
import { getPersona } from "@/lib/personas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import {
  ROLE_OPTIONS, STACK_OPTIONS, SENIORITY_OPTIONS, RISK_TOLERANCE_OPTIONS, BIAS_LEVEL_OPTIONS,
  getDefaultConfig, strictnessLabel,
  type EmployeeConfig, type RiskTolerance, type Seniority, type BiasLevel,
} from "@/lib/employeeConfig";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nameIdx, setNameIdx] = useState(0);

  const [config, setConfig] = useState<EmployeeConfig>({
    name: "", roleCode: "frontend_builder", seniority: "Middle",
    primaryStack: [], secondaryStack: [],
    riskTolerance: "medium", strictness: 3, refactorBias: "balanced",
    escalationThreshold: "medium", speedVsQuality: 50, tokenEfficiency: 50,
    testCoverageBias: "balanced", documentationBias: "balanced", mayDeploy: false,
  });

  const persona = getPersona(config.roleCode);
  const patch = (p: Partial<EmployeeConfig>) => setConfig((c) => ({ ...c, ...p }));

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const idx = Math.floor(Math.random() * 30);
      setNameIdx(idx);
      const roleCode = "frontend_builder";
      const defaults = getDefaultConfig(roleCode);
      setConfig({
        name: generateEmployeeName(roleCode, idx),
        roleCode, seniority: "Middle",
        primaryStack: [], secondaryStack: [],
        riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
        strictness: defaults.strictness ?? 3,
        refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
        escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
        speedVsQuality: defaults.speedVsQuality ?? 50,
        tokenEfficiency: defaults.tokenEfficiency ?? 50,
        testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
        documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
        mayDeploy: false,
      });
      setShowAdvanced(false);
    }
    setOpen(isOpen);
  };

  const changeRole = (code: string) => {
    const defaults = getDefaultConfig(code);
    const newIdx = nameIdx + 1;
    setNameIdx(newIdx);
    patch({
      roleCode: code,
      name: generateEmployeeName(code, newIdx),
      riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
      strictness: defaults.strictness ?? 3,
      refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
      escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
      speedVsQuality: defaults.speedVsQuality ?? 50,
      tokenEfficiency: defaults.tokenEfficiency ?? 50,
      testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
      documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
    });
  };

  const regenerate = () => {
    const idx = nameIdx + 1;
    setNameIdx(idx);
    patch({ name: generateEmployeeName(config.roleCode, idx) });
  };

  const handleSave = async () => {
    if (!config.name.trim()) return;
    setSaving(true);
    try {
      let roleId: string | null = null;
      if (teamId) {
        const { data: existingRole } = await supabase
          .from("agent_roles").select("id")
          .eq("code", config.roleCode).eq("team_id", teamId).maybeSingle();
        roleId = existingRole?.id ?? null;
        if (!roleId) {
          const label = ROLE_OPTIONS.find((r) => r.code === config.roleCode)?.label ?? config.roleCode;
          const { data: newRole } = await supabase
            .from("agent_roles")
            .insert({
              code: config.roleCode, name: label, description: label,
              team_id: teamId,
              skill_profile: {
                primaryStack: config.primaryStack, secondaryStack: config.secondaryStack,
                seniority: config.seniority, riskTolerance: config.riskTolerance,
                strictness: config.strictness, refactorBias: config.refactorBias,
                escalationThreshold: config.escalationThreshold, speedVsQuality: config.speedVsQuality,
                tokenEfficiency: config.tokenEfficiency, testCoverageBias: config.testCoverageBias,
                documentationBias: config.documentationBias, mayDeploy: config.mayDeploy,
              },
            })
            .select("id").single();
          roleId = newRole?.id ?? null;
        }
      }

      await supabase.from("ai_employees").insert({
        name: config.name.trim(),
        role_code: config.roleCode,
        role_id: roleId, team_id: teamId ?? null,
        status: "onboarding", model_name: "gpt-4o", provider: "openai",
      });

      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      qc.invalidateQueries({ queryKey: ["team-room-employees"] });
      qc.invalidateQueries({ queryKey: ["office"] });
      toast.success(`${config.name} added to ${teamName ?? "team"} — status: Onboarding`);
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
      <DialogContent className="max-w-[580px] max-h-[90vh] rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-[20px] font-bold">Configure Team Member</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-5 px-6 pt-4 pb-6">
            <div className="flex items-center gap-4">
              <img src={persona.avatar} alt={config.name}
                className={`h-14 w-14 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                width={56} height={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Input value={config.name} onChange={(e) => patch({ name: e.target.value })}
                    className="h-10 text-[15px] font-bold flex-1" placeholder="Employee name" />
                  <button onClick={regenerate} className="text-muted-foreground hover:text-foreground transition-colors p-2" title="Regenerate">
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <FieldGroup label="Role">
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <Chip key={r.code} active={config.roleCode === r.code}
                    onClick={() => changeRole(r.code)}>{r.label}</Chip>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Seniority">
              <div className="flex gap-2">
                {SENIORITY_OPTIONS.map((s) => (
                  <Chip key={s} active={config.seniority === s} variant="soft"
                    onClick={() => patch({ seniority: s as Seniority })}>{s}</Chip>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Primary Stack">
              <div className="flex flex-wrap gap-1.5">
                {STACK_OPTIONS.map((s) => (
                  <Chip key={s} active={config.primaryStack.includes(s)} variant="soft"
                    onClick={() => patch({
                      primaryStack: config.primaryStack.includes(s)
                        ? config.primaryStack.filter((x) => x !== s)
                        : [...config.primaryStack, s],
                      secondaryStack: config.secondaryStack.filter((x) => x !== s),
                    })}>{s}</Chip>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Risk Tolerance">
              <div className="flex gap-2">
                {RISK_TOLERANCE_OPTIONS.map((r) => (
                  <Chip key={r} active={config.riskTolerance === r} variant="soft"
                    onClick={() => patch({ riskTolerance: r as RiskTolerance })}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Chip>
                ))}
              </div>
            </FieldGroup>

            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors w-full">
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Operational Traits
              <span className="flex-1 h-px bg-border ml-2" />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-foreground">Strictness</span>
                    <span className="text-[11px] font-mono font-bold text-primary">{config.strictness}/5 — {strictnessLabel(config.strictness)}</span>
                  </div>
                  <Slider value={[config.strictness]} onValueChange={([v]) => patch({ strictness: v })} min={1} max={5} step={1} className="w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-foreground">Speed ↔ Quality</span>
                    <span className="text-[11px] font-mono font-bold text-primary">{config.speedVsQuality}%</span>
                  </div>
                  <Slider value={[config.speedVsQuality]} onValueChange={([v]) => patch({ speedVsQuality: v })} min={0} max={100} step={5} className="w-full" />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50">Speed first</span>
                    <span className="text-[10px] text-muted-foreground/50">Quality first</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-foreground">Token Efficiency</span>
                    <span className="text-[11px] font-mono font-bold text-primary">{config.tokenEfficiency}%</span>
                  </div>
                  <Slider value={[config.tokenEfficiency]} onValueChange={([v]) => patch({ tokenEfficiency: v })} min={0} max={100} step={5} className="w-full" />
                </div>
                <BiasSelect label="Refactor Bias" value={config.refactorBias} onChange={(v) => patch({ refactorBias: v })} />
                <BiasSelect label="Escalation Threshold" value={config.escalationThreshold}
                  onChange={(v) => patch({ escalationThreshold: v as RiskTolerance })} options={RISK_TOLERANCE_OPTIONS as unknown as readonly string[]} />
                <BiasSelect label="Test Coverage" value={config.testCoverageBias} onChange={(v) => patch({ testCoverageBias: v })} />
                <BiasSelect label="Documentation" value={config.documentationBias} onChange={(v) => patch({ documentationBias: v })} />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={config.mayDeploy}
                onChange={(e) => patch({ mayDeploy: e.target.checked })} className="rounded border-border" />
              <span className="text-[13px] font-bold text-muted-foreground">May deploy to production</span>
            </label>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
              <Button variant="outline" onClick={() => setOpen(false)} className="h-10 text-[13px] rounded-xl">Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !config.name.trim()}
                className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-4 w-4" /> {saving ? "Adding…" : "Add Employee"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Chip({ active, variant = "solid", onClick, children }: {
  active: boolean; variant?: "solid" | "soft"; onClick: () => void; children: React.ReactNode;
}) {
  const cls = variant === "solid"
    ? active ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/20"
    : active ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-foreground/20";
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${cls}`}>
      {children}
    </button>
  );
}

function BiasSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: BiasLevel) => void; options?: readonly string[];
}) {
  const opts = options ?? BIAS_LEVEL_OPTIONS;
  return (
    <div>
      <span className="text-[12px] font-bold text-foreground block mb-1">{label}</span>
      <div className="flex gap-1.5">
        {opts.map((o) => (
          <button key={o} onClick={() => onChange(o as BiasLevel)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              value === o ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-foreground/20"
            }`}>{o.charAt(0).toUpperCase() + o.slice(1)}</button>
        ))}
      </div>
    </div>
  );
}
