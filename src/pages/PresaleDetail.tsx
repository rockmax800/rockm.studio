import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePresale, useUpdatePresale } from "@/hooks/use-department-data";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { IntakeSection } from "@/components/intake/IntakeSection";
import { IntakeField } from "@/components/intake/IntakeField";
import { ListEditor } from "@/components/intake/ListEditor";
import { ImpactPreview } from "@/components/intake/ImpactPreview";
import { Save, FileCheck, ArrowLeft } from "lucide-react";

interface IntakeForm {
  clientName: string;
  businessGoal: string;
  targetUsers: string;
  successMetrics: string;
  inScope: string[];
  outOfScope: string[];
  nonFunctional: string[];
  stackConstraints: string;
  deadline: string;
  riskClass: string;
  budgetMode: string;
  acceptanceCriteria: string[];
}

function parseJsonArray(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default function PresaleDetail() {
  const { slug = "", id = "" } = useParams();
  const navigate = useNavigate();
  const { data: presale, isLoading } = usePresale(id);
  const updatePresale = useUpdatePresale();

  const [form, setForm] = useState<IntakeForm>({
    clientName: "",
    businessGoal: "",
    targetUsers: "",
    successMetrics: "",
    inScope: [],
    outOfScope: [],
    nonFunctional: [],
    stackConstraints: "",
    deadline: "",
    riskClass: "low",
    budgetMode: "fixed",
    acceptanceCriteria: [],
  });

  useEffect(() => {
    if (!presale) return;
    const spec = presale.spec_content || "";
    setForm({
      clientName: presale.client_name || "",
      businessGoal: presale.client_brief || "",
      targetUsers: "",
      successMetrics: "",
      inScope: parseJsonArray(spec),
      outOfScope: [],
      nonFunctional: [],
      stackConstraints: "",
      deadline: "",
      riskClass: presale.risk_level || "low",
      budgetMode: "fixed",
      acceptanceCriteria: [],
    });
  }, [presale]);

  const set = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const sectionStatus = (fields: (string | string[])[]): "empty" | "partial" | "complete" => {
    const filled = fields.filter((f) => (Array.isArray(f) ? f.length > 0 : f.trim().length > 0)).length;
    if (filled === 0) return "empty";
    return filled === fields.length ? "complete" : "partial";
  };

  const handleSave = async () => {
    try {
      await updatePresale.mutateAsync({
        id,
        client_name: form.clientName,
        client_brief: form.businessGoal,
        risk_level: form.riskClass,
        spec_content: JSON.stringify(form.inScope),
        risk_notes: JSON.stringify({
          targetUsers: form.targetUsers,
          successMetrics: form.successMetrics,
          outOfScope: form.outOfScope,
          nonFunctional: form.nonFunctional,
          stackConstraints: form.stackConstraints,
          deadline: form.deadline,
          budgetMode: form.budgetMode,
          acceptanceCriteria: form.acceptanceCriteria,
        }),
      });
      toast.success("Intake saved");
    } catch {
      toast.error("Save failed");
    }
  };

  const completeness = useMemo(() => {
    const total = 10;
    let filled = 0;
    if (form.clientName) filled++;
    if (form.businessGoal) filled++;
    if (form.targetUsers) filled++;
    if (form.successMetrics) filled++;
    if (form.inScope.length > 0) filled++;
    if (form.outOfScope.length > 0) filled++;
    if (form.stackConstraints) filled++;
    if (form.deadline) filled++;
    if (form.acceptanceCriteria.length > 0) filled++;
    if (form.riskClass) filled++;
    return Math.round((filled / total) * 100);
  }, [form]);

  if (isLoading) {
    return <AppLayout title="Intake"><p className="text-muted-foreground text-xs">Loading…</p></AppLayout>;
  }
  if (!presale) {
    return <AppLayout title="Intake"><p className="text-muted-foreground text-xs">Not found.</p></AppLayout>;
  }

  return (
    <AppLayout title="Intake Composer">
      <div className="max-w-4xl mx-auto flex flex-col gap-2 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/departments/${slug}`)}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
            <Link to="/departments" className="hover:text-foreground transition-colors">Departments</Link>
            <span>/</span>
            <Link to={`/departments/${slug}`} className="hover:text-foreground transition-colors">{slug}</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Intake</span>
          </div>
          <div className="flex-1" />
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-5 border-border/40 font-mono">
            {completeness}% complete
          </Badge>
          <Badge variant={presale.status === "approved" ? "default" : "secondary"} className="text-[8px] px-1.5 py-0 h-5">
            {presale.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full bg-surface-sunken rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${completeness}%` }}
          />
        </div>

        {/* SECTION 1 — Business Goal */}
        <IntakeSection
          number={1}
          title="Business Goal"
          subtitle="Define the problem and desired outcome"
          status={sectionStatus([form.clientName, form.businessGoal, form.targetUsers, form.successMetrics])}
        >
          <IntakeField
            label="Client / Project Name"
            value={form.clientName}
            onChange={(v) => set("clientName", v)}
            placeholder="Client or initiative name"
          />
          <IntakeField
            label="What problem are we solving?"
            hint="Clear business problem statement — not a feature list"
            type="textarea"
            value={form.businessGoal}
            onChange={(v) => set("businessGoal", v)}
            placeholder="Describe the core business problem…"
            rows={3}
          />
          <IntakeField
            label="Who are the target users?"
            hint="Primary user segments and their needs"
            type="textarea"
            value={form.targetUsers}
            onChange={(v) => set("targetUsers", v)}
            placeholder="Define target user segments…"
            rows={2}
          />
          <IntakeField
            label="What does success look like?"
            hint="Measurable outcomes that define project success"
            type="textarea"
            value={form.successMetrics}
            onChange={(v) => set("successMetrics", v)}
            placeholder="E.g., 95% uptime, 50% faster onboarding…"
            rows={2}
          />
        </IntakeSection>

        {/* SECTION 2 — Scope Boundaries */}
        <IntakeSection
          number={2}
          title="Scope Boundaries"
          subtitle="What's in, what's out"
          status={sectionStatus([form.inScope, form.outOfScope])}
        >
          <ListEditor
            label="In Scope"
            hint="Features, deliverables, and capabilities included"
            items={form.inScope}
            onChange={(v) => set("inScope", v)}
            placeholder="Add scope item…"
          />
          <ListEditor
            label="Out of Scope"
            hint="Explicitly excluded work — prevents scope creep"
            items={form.outOfScope}
            onChange={(v) => set("outOfScope", v)}
            placeholder="Add exclusion…"
          />
          <ListEditor
            label="Non-Functional Requirements"
            hint="Performance, security, accessibility, compliance"
            items={form.nonFunctional}
            onChange={(v) => set("nonFunctional", v)}
            placeholder="Add requirement…"
          />
        </IntakeSection>

        {/* SECTION 3 — Constraints */}
        <IntakeSection
          number={3}
          title="Constraints"
          subtitle="Technical, timeline, and budget boundaries"
          status={sectionStatus([form.stackConstraints, form.deadline])}
        >
          <IntakeField
            label="Stack Constraints"
            hint="Required technologies, integrations, or platform requirements"
            type="textarea"
            value={form.stackConstraints}
            onChange={(v) => set("stackConstraints", v)}
            placeholder="E.g., Must use React, PostgreSQL, deploy to AWS…"
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <IntakeField
              label="Deadline"
              value={form.deadline}
              onChange={(v) => set("deadline", v)}
              placeholder="E.g., 2026-06-01"
            />
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Risk Class
              </label>
              <Select value={form.riskClass} onValueChange={(v) => set("riskClass", v)}>
                <SelectTrigger className="h-8 text-[11px] bg-surface-sunken border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-[11px]">Low</SelectItem>
                  <SelectItem value="medium" className="text-[11px]">Medium</SelectItem>
                  <SelectItem value="high" className="text-[11px]">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                Budget Mode
              </label>
              <Select value={form.budgetMode} onValueChange={(v) => set("budgetMode", v)}>
                <SelectTrigger className="h-8 text-[11px] bg-surface-sunken border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed" className="text-[11px]">Fixed Budget</SelectItem>
                  <SelectItem value="time_material" className="text-[11px]">Time & Material</SelectItem>
                  <SelectItem value="token_cap" className="text-[11px]">Token Cap</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </IntakeSection>

        {/* SECTION 4 — Acceptance Criteria */}
        <IntakeSection
          number={4}
          title="Acceptance Criteria"
          subtitle="Measurable pass/fail conditions"
          status={sectionStatus([form.acceptanceCriteria])}
        >
          <ListEditor
            label="Criteria"
            hint="Each criterion must be independently verifiable"
            items={form.acceptanceCriteria}
            onChange={(v) => set("acceptanceCriteria", v)}
            placeholder="Add acceptance criterion…"
          />
        </IntakeSection>

        {/* SECTION 5 — System Impact Preview */}
        <IntakeSection
          number={5}
          title="System Impact Preview"
          subtitle="Auto-calculated from inputs above"
          status={form.inScope.length > 0 || form.acceptanceCriteria.length > 0 ? "complete" : "empty"}
        >
          <ImpactPreview
            scopeCount={form.inScope.length}
            constraintsCount={form.nonFunctional.length + (form.stackConstraints ? 1 : 0) + (form.deadline ? 1 : 0)}
            criteriaCount={form.acceptanceCriteria.length}
            riskClass={form.riskClass}
          />
        </IntakeSection>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-[10px] h-7 border-border/40"
            onClick={handleSave}
            disabled={updatePresale.isPending}
          >
            <Save className="h-3 w-3" /> Save Draft
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-[10px] h-7"
            disabled={completeness < 60 || presale.status === "approved"}
          >
            <FileCheck className="h-3 w-3" /> Submit for Blueprint
          </Button>
          <div className="flex-1" />
          {presale.converted_project_id && (
            <Link to={`/projects/${presale.converted_project_id}`}>
              <Badge variant="default" className="text-[8px] cursor-pointer">View Project →</Badge>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
