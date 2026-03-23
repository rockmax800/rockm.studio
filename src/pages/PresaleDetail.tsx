import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { usePresale, useUpdatePresale } from "@/hooks/use-department-data";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  FileText,
  Calculator,
  AlertTriangle,
  Rocket,
  Save,
} from "lucide-react";

export default function PresaleDetail() {
  const { slug = "", id = "" } = useParams();
  const { data: presale, isLoading } = usePresale(id);
  const updatePresale = useUpdatePresale();

  const [specContent, setSpecContent] = useState("");
  const [riskNotes, setRiskNotes] = useState("");
  const [clientBrief, setClientBrief] = useState("");

  useEffect(() => {
    if (presale) {
      setSpecContent(presale.spec_content || "");
      setRiskNotes(presale.risk_notes || "");
      setClientBrief(presale.client_brief || "");
    }
  }, [presale]);

  const handleSave = async (field: string, value: string) => {
    try {
      await updatePresale.mutateAsync({ id, [field]: value });
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  if (isLoading) {
    return <AppLayout title="Presale"><p className="text-muted-foreground">Loading…</p></AppLayout>;
  }

  if (!presale) {
    return <AppLayout title="Presale"><p className="text-muted-foreground">Presale not found.</p></AppLayout>;
  }

  return (
    <AppLayout title={presale.client_name || "Presale Session"}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/departments" className="hover:text-foreground transition-colors">Departments</Link>
          <span>/</span>
          <Link to={`/departments/${slug}`} className="hover:text-foreground transition-colors">{slug}</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{presale.client_name || "Presale"}</span>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{presale.client_name || "Untitled Presale"}</h1>
          <Badge variant={presale.status === "approved" ? "default" : "secondary"} className="text-xs">
            {presale.status}
          </Badge>
        </div>

        <Tabs defaultValue="context" className="space-y-4">
          <TabsList>
            <TabsTrigger value="context" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Client Context
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Team Lead Chat
            </TabsTrigger>
            <TabsTrigger value="spec" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Spec Draft
            </TabsTrigger>
            <TabsTrigger value="estimate" className="gap-1.5">
              <Calculator className="h-3.5 w-3.5" /> Estimate
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Risk
            </TabsTrigger>
            <TabsTrigger value="convert" className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" /> Convert
            </TabsTrigger>
          </TabsList>

          {/* CLIENT CONTEXT */}
          <TabsContent value="context">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Client Name</label>
                  <Input value={presale.client_name} readOnly className="bg-muted/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Brief</label>
                  <Textarea
                    value={clientBrief}
                    onChange={e => setClientBrief(e.target.value)}
                    rows={6}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 gap-1.5 text-xs"
                    onClick={() => handleSave("client_brief", clientBrief)}
                  >
                    <Save className="h-3 w-3" /> Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM LEAD CHAT */}
          <TabsContent value="chat">
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Team Lead AI chat for scope refinement
                </p>
                <p className="text-xs text-muted-foreground">
                  This feature will enable structured conversations with an AI team lead
                  to refine requirements, ask clarifying questions, and shape the project scope.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SPEC DRAFT */}
          <TabsContent value="spec">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Specification Draft</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleSave("spec_content", specContent)}
                  >
                    <Save className="h-3 w-3" /> Save
                  </Button>
                </div>
                <Textarea
                  value={specContent}
                  onChange={e => setSpecContent(e.target.value)}
                  placeholder="Write or paste the project specification here…"
                  rows={16}
                  className="font-mono text-xs"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ESTIMATE */}
          <TabsContent value="estimate">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-4">Cost & Timeline Estimate</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Token Range</p>
                    <p className="text-lg font-semibold">
                      {presale.estimate_tokens_min.toLocaleString()} — {presale.estimate_tokens_max.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">avg: {presale.estimate_tokens_avg.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Cost Range (USD)</p>
                    <p className="text-lg font-semibold">
                      ${Number(presale.estimate_cost_min).toFixed(2)} — ${Number(presale.estimate_cost_max).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                    <p className="text-lg font-semibold">{presale.estimate_timeline_days} days</p>
                  </div>
                </div>
                {presale.estimate_tokens_avg === 0 && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Estimates will be generated after the spec is drafted and reviewed by the team lead.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISK */}
          <TabsContent value="risk">
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Risk Assessment</h3>
                  <Badge variant={presale.risk_level === "high" ? "destructive" : presale.risk_level === "medium" ? "secondary" : "default"} className="text-xs">
                    {presale.risk_level} risk
                  </Badge>
                </div>
                <Textarea
                  value={riskNotes}
                  onChange={e => setRiskNotes(e.target.value)}
                  placeholder="Risk notes and complexity indicators…"
                  rows={6}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => handleSave("risk_notes", riskNotes)}
                >
                  <Save className="h-3 w-3" /> Save
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONVERT */}
          <TabsContent value="convert">
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Rocket className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold mb-2">Convert to Project</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                  Once the spec is approved and estimate reviewed, the founder can convert
                  this presale into a real project with auto-generated tasks and team assignments.
                </p>
                {presale.converted_project_id ? (
                  <div className="space-y-2">
                    <Badge variant="default" className="text-xs">Already Converted</Badge>
                    <br />
                    <Link to={`/projects/${presale.converted_project_id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 mt-2">
                        View Project <Rocket className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button size="sm" className="gap-1.5" disabled={presale.status !== "approved"}>
                    <Rocket className="h-3.5 w-3.5" />
                    {presale.status === "approved" ? "Convert to Project" : "Requires Approval First"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
