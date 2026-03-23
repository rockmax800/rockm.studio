import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { mockDocs } from "@/data/mock";
import { BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DocsWorkspace() {
  return (
    <AppLayout title="Docs Workspace">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{mockDocs.length} documents</p>
          <Button size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> New document
          </Button>
        </div>
        <div className="space-y-2">
          {mockDocs.map((doc) => (
            <Card key={doc.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium truncate">{doc.name}</p>
                    <Badge variant={doc.status === "canonical" ? "green" : doc.status === "draft" ? "neutral" : "amber"}>
                      {doc.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    v{doc.version} · {doc.updatedBy} · {formatDate(doc.updatedAt)}
                    {doc.linkedTasks > 0 && ` · ${doc.linkedTasks} linked tasks`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}