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
  ROLE_OPTIONS, STACK_OPTIONS, SENIORITY_OPTIONS, RISK_TOLERANCE_OPTIONS,
  MBTI_TYPES, MBTI_TRAITS, NATIONALITY_TRAITS,
  getDefaultConfig, biasLabel,
  type EmployeeConfig, type MbtiType, type NationalityCode, type RiskTolerance, type Seniority,
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

  // Config state
  const [config, setConfig] = useState<EmployeeConfig>({
    name: "", roleCode: "frontend_builder", seniority: "Middle",
    mbtiType: "INTJ", nationalityCode: "anglo_saxon",
    primaryStack: [], secondaryStack: [],
    riskTolerance: "medium", strictnessLevel: 5, refactorBias: 5,
    escalationThreshold: 5, speedQualityWeight: 5, tokenEfficiency: 5,
    testCoverageBias: 5, documentationBias: 5, mayDeploy: false,
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
        roleCode,
        seniority: "Middle",
        mbtiType: defaults.mbtiType ?? "INTJ",
        nationalityCode: defaults.nationalityCode ?? "anglo_saxon",
        primaryStack: [], secondaryStack: [],
        riskTolerance: defaults.riskTolerance ?? "medium",
        strictnessLevel: defaults.strictnessLevel ?? 5,
        refactorBias: defaults.refactorBias ?? 5,
        escalationThreshold: defaults.escalationThreshold ?? 5,
        speedQualityWeight: defaults.speedQualityWeight ?? 5,
        tokenEfficiency: defaults.tokenEfficiency ?? 5,
        testCoverageBias: defaults.testCoverageBias ?? 5,
        documentationBias: defaults.documentationBias ?? 5,
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
      mbtiType: defaults.mbtiType as MbtiType,
      nationalityCode: defaults.nationalityCode as NationalityCode,
      riskTolerance: defaults.riskTolerance as RiskTolerance,
      strictnessLevel: defaults.strictnessLevel,
      refactorBias: defaults.refactorBias,
      escalationThreshold: defaults.escalationThreshold,
      speedQualityWeight: defaults.speedQualityWeight,
      tokenEfficiency: defaults.tokenEfficiency,
      testCoverageBias: defaults.testCoverageBias,
      documentationBias: defaults.documentationBias,
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
                seniority: config.seniority, mbtiType: config.mbtiType,
                nationalityCode: config.nationalityCode, riskTolerance: config.riskTolerance,
                strictnessLevel: config.strictnessLevel, refactorBias: config.refactorBias,
                escalationThreshold: config.escalationThreshold, speedQualityWeight: config.speedQualityWeight,
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
        status: "active", model_name: "gpt-4o", provider: "openai",
      });

      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      qc.invalidateQueries({ queryKey: ["team-room-employees"] });
      qc.invalidateQueries({ queryKey: ["office"] });
      toast.success(`${config.name} added to ${teamName ?? "team"}`);
      setOpen(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  const natTrait = NATIONALITY_TRAITS.find((n) => n.code === config.nationalityCode);
  const mbtiInfo = MBTI_TRAITS[config.mbtiType];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 gap-2 text-[12px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-3.5 w-3.5" /> Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[600px] max-h-[90vh] rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-[20px] font-bold">Configure Team Member</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-5 px-6 pt-4 pb-6">

            {/* ── Avatar + Name ── */}
            <div className="flex items-center gap-4">
              <img src={persona.avatar} alt={config.name}
                className={`h-16 w-16 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                width={64} height={64} />
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

            {/* ── Role ── */}
            <FieldGroup label="Role">
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <Chip key={r.code} active={config.roleCode === r.code}
                    onClick={() => changeRole(r.code)}>{r.label}</Chip>
                ))}
              </div>
            </FieldGroup>

            {/* ── Seniority ── */}
            <FieldGroup label="Seniority">
              <div className="flex gap-2">
                {SENIORITY_OPTIONS.map((s) => (
                  <Chip key={s} active={config.seniority === s} variant="soft"
                    onClick={() => patch({ seniority: s as Seniority })}>{s}</Chip>
                ))}
              </div>
            </FieldGroup>

            {/* ── MBTI Type ── */}
            <FieldGroup label="Cognitive Type (MBTI)" hint={mbtiInfo ? `${mbtiInfo.label} — ${mbtiInfo.bias}` : undefined}>
              <div className="flex flex-wrap gap-1.5">
                {MBTI_TYPES.map((t) => (
                  <Chip key={t} active={config.mbtiType === t} variant="soft"
                    onClick={() => patch({ mbtiType: t as MbtiType })}>{t}</Chip>
                ))}
              </div>
            </FieldGroup>

            {/* ── Nationality Trait ── */}
            <FieldGroup label="Work Culture Profile" hint={natTrait ? natTrait.bias : undefined}>
              <div className="flex flex-wrap gap-1.5">
                {NATIONALITY_TRAITS.map((n) => (
                  <Chip key={n.code} active={config.nationalityCode === n.code} variant="soft"
                    onClick={() => patch({
                      nationalityCode: n.code as NationalityCode,
                      strictnessLevel: n.defaultStrictness,
                      refactorBias: n.defaultRefactorBias,
                    })}>{n.label}</Chip>
                ))}
              </div>
            </FieldGroup>

            {/* ── Primary Stack ── */}
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

            {/* ── Secondary Stack ── */}
            <FieldGroup label="Secondary Stack">
              <div className="flex flex-wrap gap-1.5">
                {STACK_OPTIONS.filter((s) => !config.primaryStack.includes(s)).map((s) => (
                  <Chip key={s} active={config.secondaryStack.includes(s)} variant="soft"
                    onClick={() => patch({
                      secondaryStack: config.secondaryStack.includes(s)
                        ? config.secondaryStack.filter((x) => x !== s)
                        : [...config.secondaryStack, s],
                    })}>{s}</Chip>
                ))}
              </div>
            </FieldGroup>

            {/* ── Risk Tolerance ── */}
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

            {/* ── Advanced Operational Biases ── */}
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors w-full">
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Operational Biases
              <span className="flex-1 h-px bg-border ml-2" />
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-1">
                <BiasSlider label="Strictness" value={config.strictnessLevel} low="Lenient" high="Strict"
                  onChange={(v) => patch({ strictnessLevel: v })} />
                <BiasSlider label="Refactor Bias" value={config.refactorBias} low="Leave as-is" high="Always refactor"
                  onChange={(v) => patch({ refactorBias: v })} />
                <BiasSlider label="Escalation Threshold" value={config.escalationThreshold} low="Escalate often" high="Handle alone"
                  onChange={(v) => patch({ escalationThreshold: v })} />
                <BiasSlider label="Speed ↔ Quality" value={config.speedQualityWeight} low="Speed first" high="Quality first"
                  onChange={(v) => patch({ speedQualityWeight: v })} />
                <BiasSlider label="Token Efficiency" value={config.tokenEfficiency} low="Verbose" high="Minimal tokens"
                  onChange={(v) => patch({ tokenEfficiency: v })} />
                <BiasSlider label="Test Coverage" value={config.testCoverageBias} low="Skip tests" high="Full coverage"
                  onChange={(v) => patch({ testCoverageBias: v })} />
                <BiasSlider label="Documentation" value={config.documentationBias} low="No docs" high="Document all"
                  onChange={(v) => patch({ documentationBias: v })} />
              </div>
            )}

            {/* ── Deploy Permission ── */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={config.mayDeploy}
                onChange={(e) => patch({ mayDeploy: e.target.checked })} className="rounded border-border" />
              <span className="text-[13px] font-bold text-muted-foreground">May deploy to production</span>
            </label>

            {/* ── Actions ── */}
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

/* ── Reusable sub-components ── */

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground/60 mb-2 italic">{hint}</p>}
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

function BiasSlider({ label, value, low, high, onChange }: {
  label: string; value: number; low: string; high: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold text-foreground">{label}</span>
        <span className="text-[11px] font-mono font-bold text-primary">{value}/10</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={1} max={10} step={1} className="w-full" />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-muted-foreground/50">{low}</span>
        <span className="text-[10px] text-muted-foreground/50">{high}</span>
      </div>
    </div>
  );
}
