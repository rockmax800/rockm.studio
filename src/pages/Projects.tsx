import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useProjects } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createProject } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!name.trim() || !purpose.trim()) return;
    setCreating(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await createProject({ name: name.trim(), slug, purpose: purpose.trim() });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_counts"] });
      setOpen(false);
      setName("");
      setPurpose("");
      toast.success("Project created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout title="Projects">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {projects.length} projects
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Project name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="AI Workshop OS" />
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Short description of the project's intent" rows={3} />
                </div>
                <Button onClick={handleCreate} disabled={creating || !name.trim() || !purpose.trim()} className="w-full">
                  {creating ? "Creating..." : "Create project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Create your first project to start structuring your internal AI delivery workflow.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`}>
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{p.name}</p>
                          <StatusBadge state={p.state} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{p.purpose}</p>
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground shrink-0">
                        {formatDate(p.updated_at)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}