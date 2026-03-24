import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { generateEmployeeName } from "@/services/EmployeeNamingService";
import { getPersona } from "@/lib/personas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2, Users, CheckCircle2, ArrowRight, ArrowLeft,
  Plus, Trash2, Sparkles, Zap, AlertTriangle, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  ROLE_OPTIONS, STACK_OPTIONS, FOCUS_OPTIONS, SENIORITY_OPTIONS,
  RISK_TOLERANCE_OPTIONS, BIAS_LEVEL_OPTIONS,
  getDefaultConfig, validateTeamBalance, riskColor,
  type EmployeeConfig, type RiskTolerance, type Seniority, type BiasLevel,
} from "@/lib/employeeConfig";
import { refreshTeamViews } from "@/lib/teamSync";

const STEPS = [
  { label: "Create Capability", icon: Building2 },
  { label: "Add Members", icon: Users },
  { label: "Review & Activate", icon: CheckCircle2 },
];

interface NewEmployee extends EmployeeConfig {
  id: string;
  showAdvanced?: boolean;
}

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

export function TeamSetupWizard({ onComplete, onCancel }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [capName, setCapName] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capStack, setCapStack] = useState<string[]>([]);
  const [capFocus, setCapFocus] = useState("");
  const [members, setMembers] = useState<NewEmployee[]>([]);

  const toggleStack = (s: string) =>
    setCapStack((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addMember = useCallback(() => {
    const roleCode = ROLE_OPTIONS[members.length % ROLE_OPTIONS.length].code;
    const name = generateEmployeeName(roleCode, members.filter((m) => m.roleCode === roleCode).length);
    const defaults = getDefaultConfig(roleCode);
    setMembers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(), name, roleCode,
        seniority: "Middle" as Seniority,
        primaryStack: [...capStack], secondaryStack: [],
        riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
        strictness: defaults.strictness ?? 3,
        refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
        escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
        speedVsQuality: defaults.speedVsQuality ?? 50,
        tokenEfficiency: defaults.tokenEfficiency ?? 50,
        testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
        documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
        mayDeploy: false, showAdvanced: false,
      },
    ]);
  }, [members, capStack]);

  const updateMember = (id: string, p: Partial<NewEmployee>) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m)));
  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const changeRole = (id: string, code: string) => {
    const defaults = getDefaultConfig(code);
    const idx = members.filter((x) => x.roleCode === code).length + Math.floor(Math.random() * 20);
    updateMember(id, {
      roleCode: code, name: generateEmployeeName(code, idx),
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

  const regenerateName = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    updateMember(id, { name: generateEmployeeName(m.roleCode, Math.floor(Math.random() * 30)) });
  };

  const canProceed = () => {
    if (step === 0) return capName.trim().length > 0 && capFocus.length > 0;
    if (step === 1) return members.length > 0;
    return true;
  };

  const balanceWarnings = validateTeamBalance(members);

  const handleActivate = async () => {
    setSaving(true);
    try {
      const slug = capName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: dept, error: deptErr } = await supabase
        .from("departments").insert({ name: capName, slug, description: capDesc, icon: "Building2" }).select().single();
      if (deptErr) throw deptErr;

      // Sync to teams table so FK on ai_employees.team_id works
      const { error: teamErr } = await supabase
        .from("teams").insert({ id: dept.id, name: capName, focus_domain: capDesc || "mixed" });
      if (teamErr) console.error("[TeamSetup] teams sync error:", teamErr);
      console.log("[TeamSetup] Capability created:", dept.id, capName);

      for (const m of members) {
        const { data: existingRole } = await supabase.from("agent_roles").select("id").eq("code", m.roleCode).eq("team_id", dept.id).maybeSingle();
        let roleId = existingRole?.id;
        if (!roleId) {
          const roleLabel = ROLE_OPTIONS.find((r) => r.code === m.roleCode)?.label ?? m.roleCode;
          const { data: newRole } = await supabase.from("agent_roles").insert({
            code: m.roleCode, name: roleLabel, description: `${roleLabel} for ${capName}`, team_id: dept.id,
            skill_profile: {
              primaryStack: m.primaryStack, secondaryStack: m.secondaryStack, seniority: m.seniority,
              riskTolerance: m.riskTolerance, strictness: m.strictness, refactorBias: m.refactorBias,
              escalationThreshold: m.escalationThreshold, speedVsQuality: m.speedVsQuality,
              tokenEfficiency: m.tokenEfficiency, testCoverageBias: m.testCoverageBias,
              documentationBias: m.documentationBias, mayDeploy: m.mayDeploy,
            },
          }).select("id").single();
          roleId = newRole?.id;
        }
        await supabase.from("ai_employees").insert({
          name: m.name, role_code: m.roleCode, role_id: roleId ?? null, team_id: dept.id,
          status: "active", model_name: "gpt-4o", provider: "openai",
        });
      }

      await refreshTeamViews(qc, "Capability created with initial members");
      toast.success(`${capName} activated with ${members.length} members`);
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to create capability");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-[860px] mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold transition-all w-full ${
                active ? "bg-foreground text-background" : done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{s.label}</span>
                {done && <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0" />}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
            </div>
          );
        })}
      </div>

      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-[24px] font-bold text-foreground tracking-tight">Create Capability Pool</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Define a production capability to organize your AI team.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Capability Name *</label>
              <Input value={capName} onChange={(e) => setCapName(e.target.value)} placeholder="e.g. Mobile Studio" className="h-11" />
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Description</label>
              <Input value={capDesc} onChange={(e) => setCapDesc(e.target.value)} placeholder="What does this team produce?" className="h-11" />
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Primary Focus *</label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => (
                  <button key={f} onClick={() => setCapFocus(f)} className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                    capFocus === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30"
                  }`}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Default Stack</label>
              <div className="flex flex-wrap gap-2">
                {STACK_OPTIONS.map((s) => (
                  <button key={s} onClick={() => toggleStack(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                    capStack.includes(s) ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:border-foreground/20"
                  }`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-bold text-foreground tracking-tight">Add Team Members</h2>
              <p className="text-[14px] text-muted-foreground mt-1">Configure AI employees for <span className="font-bold text-foreground">{capName}</span>.</p>
            </div>
            <Button onClick={addMember} className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </div>

          {balanceWarnings.length > 0 && (
            <div className="space-y-1.5">
              {balanceWarnings.map((w, i) => (
                <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold ${
                  w.type === "error" ? "bg-destructive/10 text-destructive" : "bg-status-amber/10 text-status-amber"
                }`}><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{w.message}</div>
              ))}
            </div>
          )}

          {members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-foreground">No members yet</p>
              <Button onClick={addMember} className="mt-4 h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background">
                <Plus className="h-4 w-4" /> Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => {
                const persona = getPersona(m.roleCode);
                return (
                  <div key={m.id} className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <img src={persona.avatar} alt={m.name} className={`h-14 w-14 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card shrink-0`} width={56} height={56} />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                          <Input value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} className="h-9 text-[15px] font-bold flex-1" />
                          <button onClick={() => regenerateName(m.id)} className="text-muted-foreground hover:text-foreground transition-colors"><Sparkles className="h-4 w-4" /></button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLE_OPTIONS.map((r) => (
                            <button key={r.code} onClick={() => changeRole(m.id, r.code)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              m.roleCode === r.code ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/20"
                            }`}>{r.label}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {SENIORITY_OPTIONS.map((s) => (
                            <button key={s} onClick={() => updateMember(m.id, { seniority: s as Seniority })} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              m.seniority === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}>{s}</button>
                          ))}
                          <span className="w-px h-4 bg-border" />
                          {RISK_TOLERANCE_OPTIONS.map((r) => (
                            <button key={r} onClick={() => updateMember(m.id, { riskTolerance: r as RiskTolerance })} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              m.riskTolerance === r ? riskColor(r) : "text-muted-foreground hover:text-foreground"
                            }`}>{r}</button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">S:{m.strictness}</Badge>
                          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">Q:{m.speedVsQuality}%</Badge>
                          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">Eff:{m.tokenEfficiency}%</Badge>
                          {m.mayDeploy && <Badge className="text-[9px] bg-lifecycle-deploy/10 text-lifecycle-deploy border-0">Deploy</Badge>}
                        </div>
                        <button onClick={() => updateMember(m.id, { showAdvanced: !m.showAdvanced })}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                          {m.showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} Operational Traits
                        </button>
                        {m.showAdvanced && (
                          <div className="space-y-3 pt-1">
                            <MiniSlider label="Strictness" value={m.strictness} min={1} max={5} display={`${m.strictness}/5`} onChange={(v) => updateMember(m.id, { strictness: v })} />
                            <MiniSlider label="Speed↔Quality" value={m.speedVsQuality} min={0} max={100} step={5} display={`${m.speedVsQuality}%`} onChange={(v) => updateMember(m.id, { speedVsQuality: v })} />
                            <MiniSlider label="Token Eff." value={m.tokenEfficiency} min={0} max={100} step={5} display={`${m.tokenEfficiency}%`} onChange={(v) => updateMember(m.id, { tokenEfficiency: v })} />
                            <MiniSelect label="Refactor" value={m.refactorBias} options={BIAS_LEVEL_OPTIONS} onChange={(v) => updateMember(m.id, { refactorBias: v as BiasLevel })} />
                            <MiniSelect label="Escalation" value={m.escalationThreshold} options={RISK_TOLERANCE_OPTIONS} onChange={(v) => updateMember(m.id, { escalationThreshold: v as RiskTolerance })} />
                            <MiniSelect label="Test Coverage" value={m.testCoverageBias} options={BIAS_LEVEL_OPTIONS} onChange={(v) => updateMember(m.id, { testCoverageBias: v as BiasLevel })} />
                            <MiniSelect label="Documentation" value={m.documentationBias} options={BIAS_LEVEL_OPTIONS} onChange={(v) => updateMember(m.id, { documentationBias: v as BiasLevel })} />
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                              <input type="checkbox" checked={m.mayDeploy} onChange={(e) => updateMember(m.id, { mayDeploy: e.target.checked })} className="rounded border-border" />
                              <span className="text-[12px] font-bold text-muted-foreground">May deploy</span>
                            </label>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeMember(m.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0 mt-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
              <button onClick={addMember} className="w-full rounded-2xl border-2 border-dashed border-border/50 py-4 text-[13px] font-bold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
                <Plus className="h-4 w-4 inline mr-2" /> Add Another Member
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-[24px] font-bold text-foreground tracking-tight">Review & Activate</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Confirm your capability setup.</p>
          </div>
          {balanceWarnings.length > 0 && (
            <div className="space-y-1.5">
              {balanceWarnings.map((w, i) => (
                <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold ${
                  w.type === "error" ? "bg-destructive/10 text-destructive" : "bg-status-amber/10 text-status-amber"
                }`}><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {w.message}</div>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
              <div><h3 className="text-[18px] font-bold text-foreground">{capName}</h3><p className="text-[13px] text-muted-foreground">{capFocus} · {capStack.length} stack items</p></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capStack.map((s) => <Badge key={s} variant="secondary" className="text-[10px] font-bold">{s}</Badge>)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {members.length} Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {members.map((m) => {
                const persona = getPersona(m.roleCode);
                const roleLabel = ROLE_OPTIONS.find((r) => r.code === m.roleCode)?.label ?? m.roleCode;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                    <img src={persona.avatar} alt={m.name} className={`h-10 w-10 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-1 ring-offset-card`} width={40} height={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{m.name}</p>
                      <p className="text-[12px] text-muted-foreground">{roleLabel} · {m.seniority}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{m.riskTolerance} risk</Badge>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">Q:{m.speedVsQuality}%</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
        <div>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-10 gap-2 text-[13px] font-bold rounded-xl"><ArrowLeft className="h-4 w-4" /> Back</Button>
          ) : onCancel ? (
            <Button variant="outline" onClick={onCancel} className="h-10 text-[13px] font-bold rounded-xl">Cancel</Button>
          ) : null}
        </div>
        <div>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleActivate} disabled={saving} className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
              <Zap className="h-4 w-4" /> {saving ? "Activating…" : "Activate Capability"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniSlider({ label, value, min, max, step = 1, display, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; display: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-muted-foreground w-24 shrink-0">{label}</span>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1" />
      <span className="text-[10px] font-mono font-bold text-primary w-10 text-right">{display}</span>
    </div>
  );
}

function MiniSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-bold text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
            value === o ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
