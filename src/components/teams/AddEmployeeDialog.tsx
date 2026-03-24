import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { generateEmployeeName } from "@/services/EmployeeNamingService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles, User, Brain, Wrench, Gauge, Info, Bot, CheckCircle2, UserPlus, ArrowRight } from "lucide-react";
import {
  ROLE_OPTIONS, STACK_OPTIONS, SENIORITY_OPTIONS, RISK_TOLERANCE_OPTIONS, BIAS_LEVEL_OPTIONS,
  getDefaultConfig, strictnessLabel,
  type EmployeeConfig, type RiskTolerance, type Seniority, type BiasLevel,
} from "@/lib/employeeConfig";
import { MBTI_TYPES, getMBTI, type MBTIType } from "@/lib/mbtiData";
import { NATIONALITIES, getNationality } from "@/lib/nationalityData";
import { getPersona } from "@/lib/personas";

interface Props {
  teamId?: string;
  teamName?: string;
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

interface ExtendedConfig extends EmployeeConfig {
  mbtiCode: string;
  nationalityCode: string;
  devopsKnowledge: "low" | "medium" | "high";
  securityAwareness: "low" | "medium" | "high";
  skillLevels: Record<string, number>;
}

export function AddEmployeeDialog({ teamId, teamName, trigger, onCreated }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"assign" | "create">("assign");
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  const [nameIdx, setNameIdx] = useState(0);
  const [aiGenerated, setAiGenerated] = useState(false);

  // Fetch all employees for assignment
  const { data: allEmployeesForAssign = [] } = useQuery({
    queryKey: ["employees-for-assign"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, team_id, status, reputation_score, success_rate")
        .not("status", "eq", "terminated")
        .order("name");
      return data ?? [];
    },
    enabled: open,
  });

  // Fetch departments for capability names
  const { data: allDepartments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, slug").order("name");
      return data ?? [];
    },
    enabled: open,
  });

  // Employees that can be assigned to this team (not already in it)
  const assignableEmployees = useMemo(() => {
    if (!teamId) return allEmployeesForAssign;
    return allEmployeesForAssign.filter(e => e.team_id !== teamId);
  }, [allEmployeesForAssign, teamId]);

  const [config, setConfig] = useState<ExtendedConfig>({
    name: "", roleCode: "frontend_builder", seniority: "Middle",
    primaryStack: [], secondaryStack: [],
    riskTolerance: "medium", strictness: 3, refactorBias: "balanced",
    escalationThreshold: "medium", speedVsQuality: 50, tokenEfficiency: 50,
    testCoverageBias: "balanced", documentationBias: "balanced", mayDeploy: false,
    mbtiCode: "", nationalityCode: "", devopsKnowledge: "medium", securityAwareness: "medium",
    skillLevels: {},
  });

  const patch = (p: Partial<ExtendedConfig>) => setConfig((c) => ({ ...c, ...p }));

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["all-employees-full"] });
    qc.invalidateQueries({ queryKey: ["all-roles-teams"] });
    qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
    qc.invalidateQueries({ queryKey: ["team-room-employees"] });
    qc.invalidateQueries({ queryKey: ["office"] });
    qc.invalidateQueries({ queryKey: ["office-roles-profile"] });
    qc.invalidateQueries({ queryKey: ["employees-for-assign"] });
    qc.invalidateQueries({ queryKey: ["departments"] });
    console.log("[AddEmployee] All queries invalidated");
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const idx = Math.floor(Math.random() * 30);
      setNameIdx(idx);
      const roleCode = "frontend_builder";
      const defaults = getDefaultConfig(roleCode);
      setConfig({
        name: generateEmployeeName(roleCode, idx), roleCode, seniority: "Middle",
        primaryStack: [], secondaryStack: [],
        riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
        strictness: defaults.strictness ?? 3,
        refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
        escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
        speedVsQuality: defaults.speedVsQuality ?? 50, tokenEfficiency: defaults.tokenEfficiency ?? 50,
        testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
        documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
        mayDeploy: false, mbtiCode: "", nationalityCode: "",
        devopsKnowledge: "medium", securityAwareness: "medium", skillLevels: {},
      });
      setMode("assign");
      setTab("manual");
      setAiGenerated(false);
    }
    setOpen(isOpen);
  };

  const handleAssign = async (empId: string, empName: string) => {
    if (!teamId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ai_employees")
        .update({ team_id: teamId })
        .eq("id", empId);
      if (error) throw error;
      console.log("[AddEmployee] Employee assigned:", empId, "→ team:", teamId);
      invalidateAll();
      toast.success(`${empName} assigned to ${teamName ?? "team"}`);
      setOpen(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign employee");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = (code: string) => {
    const defaults = getDefaultConfig(code);
    const newIdx = nameIdx + 1;
    setNameIdx(newIdx);
    patch({
      roleCode: code, name: generateEmployeeName(code, newIdx),
      riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
      strictness: defaults.strictness ?? 3,
      refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
      escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
      speedVsQuality: defaults.speedVsQuality ?? 50, tokenEfficiency: defaults.tokenEfficiency ?? 50,
      testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
      documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
    });
  };

  const regenerateName = () => {
    const idx = nameIdx + 1;
    setNameIdx(idx);
    patch({ name: generateEmployeeName(config.roleCode, idx) });
  };

  const generateByAI = () => {
    const roles = ROLE_OPTIONS.map(r => r.code);
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const seniorities: Seniority[] = ["Junior", "Middle", "Senior", "Lead"];
    const randomSeniority = seniorities[Math.floor(Math.random() * seniorities.length)];
    const stacks = STACK_OPTIONS.slice(0, 5);
    const randomStack = stacks.sort(() => Math.random() - 0.5).slice(0, 2);
    const mbtis = MBTI_TYPES.map(m => m.code);
    const randomMbti = mbtis[Math.floor(Math.random() * mbtis.length)];
    const nations = NATIONALITIES.map(n => n.code);
    const randomNation = nations[Math.floor(Math.random() * nations.length)];
    const defaults = getDefaultConfig(randomRole);
    const idx = nameIdx + 1;
    setNameIdx(idx);
    setConfig({
      name: generateEmployeeName(randomRole, idx), roleCode: randomRole, seniority: randomSeniority,
      primaryStack: randomStack, secondaryStack: [],
      riskTolerance: (defaults.riskTolerance as RiskTolerance) ?? "medium",
      strictness: defaults.strictness ?? 3,
      refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
      escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
      speedVsQuality: defaults.speedVsQuality ?? 50, tokenEfficiency: defaults.tokenEfficiency ?? 50,
      testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "balanced",
      documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
      mayDeploy: false, mbtiCode: randomMbti, nationalityCode: randomNation,
      devopsKnowledge: "medium", securityAwareness: "medium",
      skillLevels: Object.fromEntries(randomStack.map(s => [s, Math.floor(Math.random() * 3) + 3])),
    });
    setAiGenerated(true);
  };

  const handleSave = async () => {
    if (!config.name.trim()) return;
    if (!teamId) {
      toast.error("Capability must be selected");
      return;
    }
    setSaving(true);
    try {
      let roleId: string | null = null;
      const { data: existingRole } = await supabase
        .from("agent_roles").select("id")
        .eq("code", config.roleCode).eq("team_id", teamId).maybeSingle();
      roleId = existingRole?.id ?? null;
      if (!roleId) {
        const label = ROLE_OPTIONS.find((r) => r.code === config.roleCode)?.label ?? config.roleCode;
        const { data: newRole } = await supabase.from("agent_roles").insert({
          code: config.roleCode, name: label, description: label, team_id: teamId,
          skill_profile: {
            primaryStack: config.primaryStack, secondaryStack: config.secondaryStack,
            seniority: config.seniority, riskTolerance: config.riskTolerance,
            strictness: config.strictness, refactorBias: config.refactorBias,
            escalationThreshold: config.escalationThreshold, speedVsQuality: config.speedVsQuality,
            tokenEfficiency: config.tokenEfficiency, testCoverageBias: config.testCoverageBias,
            documentationBias: config.documentationBias, mayDeploy: config.mayDeploy,
            mbtiCode: config.mbtiCode, nationalityCode: config.nationalityCode,
            devopsKnowledge: config.devopsKnowledge, securityAwareness: config.securityAwareness,
            skillLevels: config.skillLevels,
          },
        }).select("id").single();
        roleId = newRole?.id ?? null;
      }

      const { error } = await supabase.from("ai_employees").insert({
        name: config.name.trim(), role_code: config.roleCode,
        role_id: roleId, team_id: teamId,
        status: "onboarding", model_name: "gpt-4o", provider: "openai",
      });
      if (error) throw error;

      console.log("[AddEmployee] Employee created:", config.name, "team:", teamId, "role:", roleId);
      invalidateAll();
      toast.success(`${config.name} added to ${teamName ?? "team"} — status: Onboarding`);
      setOpen(false);
      onCreated?.();
    } catch (e: any) {
      console.error("[AddEmployee] Creation failed:", e);
      toast.error(e.message || "Failed to add employee");
    } finally {
      setSaving(false);
    }
  };

  const selectedMBTI = getMBTI(config.mbtiCode);
  const selectedNation = getNationality(config.nationalityCode);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-3.5 w-3.5" /> Add Team Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[680px] max-h-[92vh] rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-[22px] font-bold tracking-tight">Add Team Member</DialogTitle>
          {teamName && <p className="text-[13px] text-muted-foreground mt-0.5">Adding to <strong>{teamName}</strong></p>}
          {!teamId && <p className="text-[12px] text-destructive mt-0.5 font-bold">⚠ No capability selected — employee will be unassigned</p>}
        </DialogHeader>

        {/* Mode selector — assign existing vs create new */}
        {teamId && (
          <div className="px-6 pt-3 flex gap-1">
            <TabBtn active={mode === "assign"} onClick={() => setMode("assign")} icon={<UserPlus className="h-3.5 w-3.5" />} label="Assign Existing" />
            <TabBtn active={mode === "create"} onClick={() => setMode("create")} icon={<Plus className="h-3.5 w-3.5" />} label="Create New" />
          </div>
        )}

        <ScrollArea className="max-h-[72vh]">
          <div className="px-6 pt-4 pb-6 space-y-6">

            {/* ═══ ASSIGN EXISTING MODE ═══ */}
            {mode === "assign" && teamId && (
              <div className="space-y-3">
                {assignableEmployees.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-8 w-8 text-muted-foreground/15 mx-auto mb-3" />
                    <p className="text-[15px] font-bold text-foreground">No employees available to assign</p>
                    <p className="text-[13px] text-muted-foreground mt-1">Create a new employee instead.</p>
                    <Button onClick={() => setMode("create")} className="mt-4 h-10 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                      <Plus className="h-3.5 w-3.5" /> Create New Employee
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-muted-foreground">Select an employee to assign to <strong className="text-foreground">{teamName}</strong>:</p>
                    <div className="rounded-xl border border-border overflow-hidden">
                      {assignableEmployees.map((emp) => {
                        const persona = getPersona(emp.role_code);
                        const roleName = ROLE_OPTIONS.find(r => r.code === emp.role_code)?.label ?? emp.role_code;
                        const currentTeamName = allDepartments.find(d => d.id === emp.team_id)?.name ?? (emp.team_id ? "Unknown" : "Unassigned");
                        const successPct = Math.round((emp.success_rate ?? 0) * 100);

                        return (
                          <div key={emp.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                            <img src={persona.avatar} alt={emp.name}
                              className={`h-9 w-9 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-1 ring-offset-card`}
                              width={36} height={36} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-foreground truncate">{emp.name}</p>
                              <p className="text-[12px] text-muted-foreground">{roleName} · {currentTeamName}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 shrink-0">{emp.status}</Badge>
                            <span className="text-[12px] font-mono font-bold text-foreground shrink-0">{successPct}%</span>
                            <Button size="sm" onClick={() => handleAssign(emp.id, emp.name)} disabled={saving}
                              className="h-8 px-3 gap-1.5 text-[12px] font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90 shrink-0">
                              <ArrowRight className="h-3 w-3" /> Assign
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ CREATE NEW MODE ═══ */}
            {(mode === "create" || !teamId) && (
              <>
                {/* Tab bar for manual vs AI */}
                <div className="flex gap-1">
                  <TabBtn active={tab === "manual"} onClick={() => setTab("manual")} icon={<User className="h-3.5 w-3.5" />} label="Manual Configuration" />
                  <TabBtn active={tab === "ai"} onClick={() => { setTab("ai"); if (!aiGenerated) generateByAI(); }} icon={<Bot className="h-3.5 w-3.5" />} label="Generate by AI" />
                </div>

                {tab === "ai" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-[13px] font-bold text-foreground">AI-Generated Configuration</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      HR agent analyzed team composition and generated a suggested configuration. Review and edit before creating.
                    </p>
                    <Button size="sm" variant="outline" onClick={generateByAI} className="mt-3 h-8 text-[12px] gap-1.5 rounded-lg">
                      <Sparkles className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                )}

                {/* ════ GROUP A — IDENTITY ════ */}
                <FormGroup icon={<User className="h-4 w-4" />} title="Identity">
                  <FieldLabel label="Name">
                    <div className="flex items-center gap-2">
                      <Input value={config.name} onChange={(e) => patch({ name: e.target.value })}
                        className="h-10 text-[15px] font-bold flex-1" placeholder="Employee name" />
                      <button onClick={regenerateName} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary" title="Regenerate name">
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Role">
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_OPTIONS.map((r) => (
                        <Chip key={r.code} active={config.roleCode === r.code} onClick={() => changeRole(r.code)}>{r.label}</Chip>
                      ))}
                    </div>
                  </FieldLabel>
                  <FieldLabel label="Seniority">
                    <div className="flex gap-2">
                      {SENIORITY_OPTIONS.map((s) => (
                        <Chip key={s} active={config.seniority === s} variant="soft" onClick={() => patch({ seniority: s as Seniority })}>{s}</Chip>
                      ))}
                    </div>
                  </FieldLabel>
                </FormGroup>

                {/* ════ GROUP B — PERSONALITY & COGNITIVE PROFILE ════ */}
                <FormGroup icon={<Brain className="h-4 w-4" />} title="Personality & Cognitive Profile">
                  <FieldLabel label="MBTI Type" tooltip="Cognitive style indicator influencing agent decision patterns, communication preferences, and problem-solving approach.">
                    <div className="flex flex-wrap gap-1.5">
                      {MBTI_TYPES.map((m) => (
                        <TooltipProvider key={m.code} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => patch({ mbtiCode: config.mbtiCode === m.code ? "" : m.code })}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  config.mbtiCode === m.code
                                    ? "bg-foreground text-background border-foreground"
                                    : "text-muted-foreground border-border hover:border-foreground/20"
                                }`}>
                                {m.code}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[320px] p-4">
                              <p className="text-[13px] font-bold text-foreground">{m.label}</p>
                              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{m.shortDesc}</p>
                              <div className="mt-2 space-y-1">
                                <p className="text-[11px] font-bold text-status-green">Strengths: {m.strengths.join(", ")}</p>
                                <p className="text-[11px] font-bold text-status-amber">Weaknesses: {m.weaknesses.join(", ")}</p>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-2 italic">{m.collaborationStyle}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                    {selectedMBTI && (
                      <div className="mt-2.5 rounded-lg bg-secondary/30 px-3 py-2.5">
                        <p className="text-[13px] font-bold text-foreground">{selectedMBTI.label}</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{selectedMBTI.shortDesc}</p>
                      </div>
                    )}
                  </FieldLabel>

                  <FieldLabel label="Nationality" tooltip="Work culture influence — affects communication style, process preferences, and collaboration patterns.">
                    <div className="flex flex-wrap gap-1.5">
                      {NATIONALITIES.map((n) => (
                        <TooltipProvider key={n.code} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => patch({ nationalityCode: config.nationalityCode === n.code ? "" : n.code })}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  config.nationalityCode === n.code
                                    ? "bg-foreground text-background border-foreground"
                                    : "text-muted-foreground border-border hover:border-foreground/20"
                                }`}>
                                <span className="text-[14px]">{n.flag}</span>
                                {n.code}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px] p-3">
                              <p className="text-[13px] font-bold">{n.flag} {n.label}</p>
                              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{n.workStyle}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                    {selectedNation && (
                      <div className="mt-2.5 rounded-lg bg-secondary/30 px-3 py-2.5 flex items-start gap-2.5">
                        <span className="text-[24px] leading-none mt-0.5">{selectedNation.flag}</span>
                        <div>
                          <p className="text-[13px] font-bold text-foreground">{selectedNation.label}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{selectedNation.workStyle}</p>
                        </div>
                      </div>
                    )}
                  </FieldLabel>
                </FormGroup>

                {/* ════ GROUP C — TECHNICAL PROFILE ════ */}
                <FormGroup icon={<Wrench className="h-4 w-4" />} title="Technical Profile">
                  <FieldLabel label="Primary Stack">
                    <div className="flex flex-wrap gap-1.5">
                      {STACK_OPTIONS.map((s) => (
                        <Chip key={s} active={config.primaryStack.includes(s)} variant="soft"
                          onClick={() => {
                            const newPrimary = config.primaryStack.includes(s)
                              ? config.primaryStack.filter((x) => x !== s)
                              : [...config.primaryStack, s];
                            patch({ primaryStack: newPrimary, secondaryStack: config.secondaryStack.filter((x) => x !== s) });
                          }}>{s}</Chip>
                      ))}
                    </div>
                  </FieldLabel>

                  <FieldLabel label="Secondary Stack">
                    <div className="flex flex-wrap gap-1.5">
                      {STACK_OPTIONS.filter(s => !config.primaryStack.includes(s)).map((s) => (
                        <Chip key={s} active={config.secondaryStack.includes(s)} variant="soft"
                          onClick={() => patch({
                            secondaryStack: config.secondaryStack.includes(s)
                              ? config.secondaryStack.filter((x) => x !== s)
                              : [...config.secondaryStack, s],
                          })}>{s}</Chip>
                      ))}
                    </div>
                  </FieldLabel>

                  {config.primaryStack.length > 0 && (
                    <FieldLabel label="Skill Levels">
                      <div className="space-y-2.5">
                        {config.primaryStack.map((stack) => (
                          <div key={stack} className="flex items-center gap-3">
                            <span className="text-[12px] font-bold text-foreground w-[100px] truncate shrink-0">{stack}</span>
                            <Slider
                              value={[config.skillLevels[stack] ?? 3]}
                              onValueChange={([v]) => patch({ skillLevels: { ...config.skillLevels, [stack]: v } })}
                              min={1} max={5} step={1} className="flex-1"
                            />
                            <span className="text-[12px] font-mono font-bold text-primary w-8 text-right">{config.skillLevels[stack] ?? 3}/5</span>
                          </div>
                        ))}
                      </div>
                    </FieldLabel>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FieldLabel label="DevOps Knowledge">
                      <div className="flex gap-1.5">
                        {(["low", "medium", "high"] as const).map((l) => (
                          <Chip key={l} active={config.devopsKnowledge === l} variant="soft"
                            onClick={() => patch({ devopsKnowledge: l })}>{l.charAt(0).toUpperCase() + l.slice(1)}</Chip>
                        ))}
                      </div>
                    </FieldLabel>
                    <FieldLabel label="Security Awareness">
                      <div className="flex gap-1.5">
                        {(["low", "medium", "high"] as const).map((l) => (
                          <Chip key={l} active={config.securityAwareness === l} variant="soft"
                            onClick={() => patch({ securityAwareness: l })}>{l.charAt(0).toUpperCase() + l.slice(1)}</Chip>
                        ))}
                      </div>
                    </FieldLabel>
                  </div>
                </FormGroup>

                {/* ════ GROUP D — OPERATIONAL TRAITS ════ */}
                <FormGroup icon={<Gauge className="h-4 w-4" />} title="Operational Traits">
                  <FieldLabel label="Risk Tolerance">
                    <div className="flex gap-2">
                      {RISK_TOLERANCE_OPTIONS.map((r) => (
                        <Chip key={r} active={config.riskTolerance === r} variant="soft"
                          onClick={() => patch({ riskTolerance: r as RiskTolerance })}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Chip>
                      ))}
                    </div>
                  </FieldLabel>

                  <div className="space-y-4">
                    <SliderField label="Strictness" value={config.strictness} min={1} max={5} step={1}
                      display={`${config.strictness}/5 — ${strictnessLabel(config.strictness)}`}
                      onChange={(v) => patch({ strictness: v })} />
                    <SliderField label="Speed ↔ Quality" value={config.speedVsQuality} min={0} max={100} step={5}
                      display={`${config.speedVsQuality}%`} onChange={(v) => patch({ speedVsQuality: v })}
                      minLabel="Speed first" maxLabel="Quality first" />
                    <SliderField label="Token Efficiency" value={config.tokenEfficiency} min={0} max={100} step={5}
                      display={`${config.tokenEfficiency}%`} onChange={(v) => patch({ tokenEfficiency: v })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <BiasSelect label="Refactor Bias" value={config.refactorBias} onChange={(v) => patch({ refactorBias: v })} />
                    <BiasSelect label="Escalation Threshold" value={config.escalationThreshold}
                      onChange={(v) => patch({ escalationThreshold: v as RiskTolerance })} options={RISK_TOLERANCE_OPTIONS as unknown as readonly string[]} />
                    <BiasSelect label="Test Coverage" value={config.testCoverageBias} onChange={(v) => patch({ testCoverageBias: v })} />
                    <BiasSelect label="Documentation" value={config.documentationBias} onChange={(v) => patch({ documentationBias: v })} />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input type="checkbox" checked={config.mayDeploy}
                      onChange={(e) => patch({ mayDeploy: e.target.checked })} className="rounded border-border h-4 w-4" />
                    <span className="text-[13px] font-bold text-muted-foreground">May deploy to production</span>
                  </label>
                </FormGroup>

                {/* ════ AVATAR NOTE ════ */}
                <div className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3">
                  <p className="text-[12px] text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    Avatar will be generated after creation based on role, MBTI, and nationality configuration.
                  </p>
                </div>

                {/* ════ ACTIONS ════ */}
                <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
                  <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-5 text-[13px] rounded-xl">Cancel</Button>
                  <Button onClick={handleSave} disabled={saving || !config.name.trim() || !teamId}
                    className="h-11 px-6 gap-2 text-[14px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                    <CheckCircle2 className="h-4 w-4" /> {saving ? "Creating…" : "Create Team Member"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Sub-components ═══ */

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"
      }`}>
      {icon} {label}
    </button>
  );
}

function FormGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 pb-1">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-[16px] font-bold text-foreground tracking-tight">{title}</h3>
        <span className="flex-1 h-px bg-border" />
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[13px] font-bold text-foreground mb-2 flex items-center gap-1.5">
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px]">
                <p className="text-[12px]">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </label>
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
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${cls}`}>
      {children}
    </button>
  );
}

function SliderField({ label, value, min, max, step, display, onChange, minLabel, maxLabel }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void; minLabel?: string; maxLabel?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-bold text-foreground">{label}</span>
        <span className="text-[12px] font-mono font-bold text-primary">{display}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="w-full" />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-muted-foreground/50">{minLabel}</span>
          <span className="text-[10px] text-muted-foreground/50">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function BiasSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: BiasLevel) => void; options?: readonly string[];
}) {
  const opts = options ?? BIAS_LEVEL_OPTIONS;
  return (
    <div>
      <span className="text-[13px] font-bold text-foreground block mb-1.5">{label}</span>
      <div className="flex gap-1.5">
        {opts.map((o) => (
          <button key={o} onClick={() => onChange(o as BiasLevel)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all flex-1 ${
              value === o ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-foreground/20"
            }`}>{o.charAt(0).toUpperCase() + o.slice(1)}</button>
        ))}
      </div>
    </div>
  );
}
