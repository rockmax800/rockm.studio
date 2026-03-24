import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { generateEmployeeName } from "@/services/EmployeeNamingService";
import { getPersona } from "@/lib/personas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2, Users, Layers, CheckCircle2, ArrowRight, ArrowLeft,
  Plus, Trash2, Sparkles, Zap, X,
} from "lucide-react";

const STEPS = [
  { label: "Create Capability", icon: Building2 },
  { label: "Add Members", icon: Users },
  { label: "Review & Activate", icon: CheckCircle2 },
];

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
const FOCUS_OPTIONS = ["Web Application", "Mobile App", "SaaS Platform", "API / Backend", "Bot / Automation", "Data Pipeline"];
const SENIORITY_OPTIONS = ["Junior", "Middle", "Senior", "Lead"];

interface NewEmployee {
  id: string;
  name: string;
  roleCode: string;
  stack: string[];
  seniority: string;
  mayDeploy: boolean;
}

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

export function TeamSetupWizard({ onComplete, onCancel }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [capName, setCapName] = useState("");
  const [capDesc, setCapDesc] = useState("");
  const [capStack, setCapStack] = useState<string[]>([]);
  const [capFocus, setCapFocus] = useState("");

  // Step 2 state
  const [members, setMembers] = useState<NewEmployee[]>([]);

  const toggleStack = (s: string) =>
    setCapStack((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addMember = useCallback(() => {
    const roleCode = ROLE_OPTIONS[members.length % ROLE_OPTIONS.length].code;
    const name = generateEmployeeName(roleCode, members.filter((m) => m.roleCode === roleCode).length);
    setMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, roleCode, stack: [...capStack], seniority: "Middle", mayDeploy: false },
    ]);
  }, [members, capStack]);

  const updateMember = (id: string, patch: Partial<NewEmployee>) =>
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const removeMember = (id: string) => setMembers((prev) => prev.filter((m) => m.id !== id));

  const regenerateName = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (!m) return;
    const idx = members.filter((x) => x.roleCode === m.roleCode).length + Math.floor(Math.random() * 20);
    updateMember(id, { name: generateEmployeeName(m.roleCode, idx) });
  };

  const canProceed = () => {
    if (step === 0) return capName.trim().length > 0 && capFocus.length > 0;
    if (step === 1) return members.length > 0;
    return true;
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      // 1. Create department
      const slug = capName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: dept, error: deptErr } = await supabase
        .from("departments")
        .insert({ name: capName, slug, description: capDesc, icon: "Building2" })
        .select()
        .single();
      if (deptErr) throw deptErr;

      // 2. Create employees
      for (const m of members) {
        // Find or create agent_role
        const { data: existingRole } = await supabase
          .from("agent_roles")
          .select("id")
          .eq("code", m.roleCode)
          .eq("team_id", dept.id)
          .maybeSingle();

        let roleId = existingRole?.id;
        if (!roleId) {
          const roleLabel = ROLE_OPTIONS.find((r) => r.code === m.roleCode)?.label ?? m.roleCode;
          const { data: newRole } = await supabase
            .from("agent_roles")
            .insert({
              code: m.roleCode,
              name: roleLabel,
              description: `${roleLabel} for ${capName}`,
              team_id: dept.id,
              skill_profile: { stack: m.stack, seniority: m.seniority },
            })
            .select("id")
            .single();
          roleId = newRole?.id;
        }

        await supabase.from("ai_employees").insert({
          name: m.name,
          role_code: m.roleCode,
          role_id: roleId ?? null,
          team_id: dept.id,
          status: "active",
          model_name: "gpt-4o",
          provider: "openai",
        });
      }

      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["all-employees-full"] });
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      qc.invalidateQueries({ queryKey: ["office"] });
      toast.success(`${capName} activated with ${members.length} members`);
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to create capability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[820px] mx-auto">
      {/* Progress strip */}
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
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{s.label}</span>
                {done && <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0" />}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Create Capability */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-[24px] font-bold text-foreground tracking-tight">Create Capability Pool</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Define a production capability to organize your AI team.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Capability Name *</label>
              <Input value={capName} onChange={(e) => setCapName(e.target.value)} placeholder="e.g. Mobile Studio, Web Platform, Bot Factory" className="h-11" />
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Description</label>
              <Input value={capDesc} onChange={(e) => setCapDesc(e.target.value)} placeholder="What does this team produce?" className="h-11" />
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Primary Focus *</label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => (
                  <button key={f} onClick={() => setCapFocus(f)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                      capFocus === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30"
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[13px] font-bold text-foreground mb-1.5 block">Default Stack</label>
              <div className="flex flex-wrap gap-2">
                {STACK_OPTIONS.map((s) => (
                  <button key={s} onClick={() => toggleStack(s)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                      capStack.includes(s) ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground border-border hover:border-foreground/20"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Add Members */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-bold text-foreground tracking-tight">Add Team Members</h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                Create AI employees for <span className="font-bold text-foreground">{capName}</span>.
              </p>
            </div>
            <Button onClick={addMember} className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0">
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-foreground">No members yet</p>
              <p className="text-[13px] text-muted-foreground mt-1">Click "Add Member" to create your first AI employee.</p>
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
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <img src={persona.avatar} alt={m.name}
                          className={`h-14 w-14 rounded-xl object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                          width={56} height={56} />
                      </div>

                      {/* Fields */}
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Name + role row */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <Input value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })}
                              className="h-9 text-[15px] font-bold" />
                          </div>
                          <button onClick={() => regenerateName(m.id)} className="text-muted-foreground hover:text-foreground transition-colors" title="Regenerate name">
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Role selector */}
                        <div className="flex flex-wrap gap-1.5">
                          {ROLE_OPTIONS.map((r) => (
                            <button key={r.code} onClick={() => {
                              updateMember(m.id, { roleCode: r.code });
                              regenerateName(m.id);
                            }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                m.roleCode === r.code ? "bg-foreground text-background border-foreground" : "text-muted-foreground border-border hover:border-foreground/20"
                              }`}>
                              {r.label}
                            </button>
                          ))}
                        </div>

                        {/* Seniority */}
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-muted-foreground shrink-0">Seniority:</span>
                          {SENIORITY_OPTIONS.map((s) => (
                            <button key={s} onClick={() => updateMember(m.id, { seniority: s })}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                m.seniority === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                              }`}>
                              {s}
                            </button>
                          ))}

                          <span className="mx-2 w-px h-4 bg-border" />

                          <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
                            <input type="checkbox" checked={m.mayDeploy}
                              onChange={(e) => updateMember(m.id, { mayDeploy: e.target.checked })}
                              className="rounded border-border" />
                            <span className="font-bold text-muted-foreground">May deploy</span>
                          </label>
                        </div>

                        {/* Stack badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {m.stack.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px] font-bold gap-1 px-2 py-0.5">
                              {s}
                              <button onClick={() => updateMember(m.id, { stack: m.stack.filter((x) => x !== s) })}>
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                          {STACK_OPTIONS.filter((s) => !m.stack.includes(s)).length > 0 && (
                            <select className="text-[11px] font-bold text-muted-foreground bg-secondary border-0 rounded-lg px-2 py-0.5 cursor-pointer"
                              value="" onChange={(e) => { if (e.target.value) updateMember(m.id, { stack: [...m.stack, e.target.value] }); }}>
                              <option value="">+ Stack</option>
                              {STACK_OPTIONS.filter((s) => !m.stack.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Remove */}
                      <button onClick={() => removeMember(m.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors shrink-0 mt-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <button onClick={addMember}
                className="w-full rounded-2xl border-2 border-dashed border-border/50 py-4 text-[13px] font-bold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
                <Plus className="h-4 w-4 inline mr-2" /> Add Another Member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Review & Activate */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-[24px] font-bold text-foreground tracking-tight">Review & Activate</h2>
            <p className="text-[14px] text-muted-foreground mt-1">Confirm your capability setup before activation.</p>
          </div>

          {/* Capability summary */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-foreground">{capName}</h3>
                <p className="text-[13px] text-muted-foreground">{capFocus} · {capStack.length} stack items</p>
              </div>
            </div>
            {capDesc && <p className="text-[14px] text-muted-foreground mb-3">{capDesc}</p>}
            <div className="flex flex-wrap gap-1.5">
              {capStack.map((s) => <Badge key={s} variant="secondary" className="text-[10px] font-bold">{s}</Badge>)}
            </div>
          </div>

          {/* Members summary */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-[16px] font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> {members.length} Team Members
            </h3>
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
                    </div>
                    {m.mayDeploy && <Badge className="text-[9px] bg-lifecycle-deploy/10 text-lifecycle-deploy border-0">Deploy</Badge>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
        <div>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="h-10 gap-2 text-[13px] font-bold rounded-xl">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : onCancel ? (
            <Button variant="outline" onClick={onCancel} className="h-10 text-[13px] font-bold rounded-xl">Cancel</Button>
          ) : null}
        </div>
        <div>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleActivate} disabled={saving}
              className="h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
              <Zap className="h-4 w-4" /> {saving ? "Activating…" : "Activate Capability"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
