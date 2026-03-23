import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useDepartment,
  useBlueprints,
  usePresales,
  useCreatePresale,
  useCreateBlueprint,
} from "@/hooks/use-department-data";
import { useProjects } from "@/hooks/use-data";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, FileText, FolderKanban, Users, Layers, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const PRESALE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  estimating: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  converted: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function DepartmentDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: dept, isLoading: deptLoading } = useDepartment(slug);
  const { data: blueprints = [] } = useBlueprints(slug);
  const { data: presales = [] } = usePresales(slug);
  const { data: projects = [] } = useProjects();
  const createPresale = useCreatePresale();
  const createBlueprint = useCreateBlueprint();

  const [newPresaleOpen, setNewPresaleOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientBrief, setClientBrief] = useState("");
  const [newBlueprintOpen, setNewBlueprintOpen] = useState(false);
  const [blueprintName, setBlueprintName] = useState("");
  const [blueprintScope, setBlueprintScope] = useState("");

  const handleCreatePresale = async () => {
    if (!clientName.trim()) return;
    try {
      const result = await createPresale.mutateAsync({
        department_slug: slug,
        client_name: clientName,
        client_brief: clientBrief,
      });
      toast.success("Presale session created");
      setNewPresaleOpen(false);
      setClientName("");
      setClientBrief("");
      navigate(`/departments/${slug}/presales/${result.id}`);
    } catch (e) {
      toast.error("Failed to create presale");
    }
  };

  const handleCreateBlueprint = async () => {
    if (!blueprintName.trim()) return;
    try {
      await createBlueprint.mutateAsync({
        department_slug: slug,
        name: blueprintName,
        scope_template: blueprintScope,
      });
      toast.success("Blueprint created");
      setNewBlueprintOpen(false);
      setBlueprintName("");
      setBlueprintScope("");
    } catch (e) {
      toast.error("Failed to create blueprint");
    }
  };

  if (deptLoading) {
    return <AppLayout title="Department"><p className="text-muted-foreground">Loading…</p></AppLayout>;
  }

  if (!dept) {
    return <AppLayout title="Department"><p className="text-muted-foreground">Department not found.</p></AppLayout>;
  }

  const activePresales = presales.filter(p => p.status !== "converted" && p.status !== "cancelled");

  return (
    <AppLayout title={dept.name}>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/departments" className="hover:text-foreground transition-colors">Departments</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{dept.name}</span>
        </div>

        <Tabs defaultValue="presales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="blueprints" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Blueprints
            </TabsTrigger>
            <TabsTrigger value="presales" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Presales
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderKanban className="h-3.5 w-3.5" /> Projects
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Team
            </TabsTrigger>
          </TabsList>

          {/* BLUEPRINTS */}
          <TabsContent value="blueprints" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Product Blueprints</h2>
              <Dialog open={newBlueprintOpen} onOpenChange={setNewBlueprintOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Blueprint
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Product Blueprint</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Blueprint name (e.g. iOS App, CRM Module)" value={blueprintName} onChange={e => setBlueprintName(e.target.value)} />
                    <Textarea placeholder="Default scope template…" value={blueprintScope} onChange={e => setBlueprintScope(e.target.value)} rows={4} />
                    <Button onClick={handleCreateBlueprint} disabled={!blueprintName.trim()} className="w-full">Create Blueprint</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {blueprints.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No blueprints yet. Add product templates to speed up presale creation.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setNewBlueprintOpen(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Blueprint
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blueprints.map(bp => (
                  <Card key={bp.id} className="border-none shadow-sm">
                    <CardContent className="p-4">
                      <h3 className="font-medium text-sm">{bp.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {bp.scope_template || "No template defined"}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="secondary" className="text-[10px]">{bp.default_autonomy_level}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {(bp.required_roles as string[])?.length ?? 0} roles
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PRESALES */}
          <TabsContent value="presales" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Active Presales</h2>
              <Dialog open={newPresaleOpen} onOpenChange={setNewPresaleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> New Presale
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Start New Presale</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)} />
                    <Textarea placeholder="Client brief / idea description…" value={clientBrief} onChange={e => setClientBrief(e.target.value)} rows={4} />
                    <Button onClick={handleCreatePresale} disabled={!clientName.trim()} className="w-full">Create Presale Session</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {activePresales.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No active presales. Start a new presale session with a client.
                  </p>
                  <Button size="sm" onClick={() => setNewPresaleOpen(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> New Presale
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {presales.map(ps => (
                  <Link key={ps.id} to={`/departments/${slug}/presales/${ps.id}`}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{ps.client_name || "Untitled Presale"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ps.client_brief || "No brief"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] ${PRESALE_STATUS_COLORS[ps.status] ?? ""}`}>
                            {ps.status}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROJECTS */}
          <TabsContent value="projects" className="space-y-4">
            <h2 className="text-sm font-semibold">Active Projects</h2>
            {projects.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="p-8 text-center">
                  <FolderKanban className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No projects yet. Convert a presale to launch your first project.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {projects.filter(p => p.state !== "archived").slice(0, 10).map(p => (
                  <Link key={p.id} to={`/projects/${p.id}`}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.purpose}</p>
                        </div>
                        <StatusBadge state={p.state} />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team" className="space-y-4">
            <h2 className="text-sm font-semibold">Team Overview</h2>
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Team roles and performance metrics will appear here once agents are assigned.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
