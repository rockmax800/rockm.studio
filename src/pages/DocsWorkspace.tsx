import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useDocuments } from "@/hooks/use-data";
import { BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DocsWorkspace() {
  const { data: docs = [], isLoading } = useDocuments();

  return (
    <AppLayout title="Docs Workspace">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{docs.length} documents</p>
          <Button size="sm" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> New document
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : docs.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No documents yet. Create a project first, then add documents.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <Card key={doc.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium truncate">{doc.title}</p>
                      <Badge variant={doc.status === "canonical" ? "green" : doc.status === "draft" ? "neutral" : "amber"}>
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.file_path} · {formatDate(doc.updated_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}