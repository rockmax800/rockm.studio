import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBlogPosts, useApproveBlogPost, usePublishBlogPost, useExportBlogPost, type BlogPost } from "@/hooks/use-blog-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, CheckCircle, Send, Megaphone, Download, Sparkles, Copy } from "lucide-react";

export default function BlogDashboard() {
  const { data: posts, isLoading } = useBlogPosts();
  const approveMut = useApproveBlogPost();
  const publishMut = usePublishBlogPost();
  const exportMut = useExportBlogPost();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("blog");
  const [exportData, setExportData] = useState<any>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  const drafts = posts?.filter(p => p.status === "draft") ?? [];
  const approved = posts?.filter(p => p.status === "approved") ?? [];
  const published = posts?.filter(p => p.status === "published") ?? [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-blog/generate", {
        method: "POST",
        body: { tone, platform },
      });
      if (error) throw error;
      toast.success(`${data?.drafts_created ?? 0} draft(s) generated`);
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (postId: string) => {
    try {
      const result = await exportMut.mutateAsync(postId);
      setExportData(result);
    } catch {
      toast.error("Export failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <AppLayout title="Company Blog & SMM">
      <div className="space-y-6">
        {/* Generate Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Generate Blog Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={generating} size="sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {generating ? "Generating…" : "Detect Events & Draft"}
              </Button>
              <span className="text-xs text-muted-foreground">Max 3 drafts/day · Aggregates similar events</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard icon={<FileText className="h-4 w-4" />} label="Drafts" value={drafts.length} />
          <KpiCard icon={<CheckCircle className="h-4 w-4" />} label="Approved" value={approved.length} />
          <KpiCard icon={<Send className="h-4 w-4" />} label="Published" value={published.length} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="drafts">
          <TabsList>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="drafts">
            <PostTable
              posts={drafts}
              isLoading={isLoading}
              onPreview={setPreviewPost}
              actions={(post) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      approveMut.mutate(post.id, {
                        onSuccess: () => toast.success("Post approved"),
                        onError: () => toast.error("Approve failed"),
                      });
                    }}
                    disabled={approveMut.isPending}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="approved">
            <PostTable
              posts={approved}
              isLoading={isLoading}
              onPreview={setPreviewPost}
              actions={(post) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      publishMut.mutate(post.id, {
                        onSuccess: () => toast.success("Post published"),
                        onError: () => toast.error("Publish failed"),
                      });
                    }}
                    disabled={publishMut.isPending}
                  >
                    <Send className="h-3 w-3 mr-1" /> Publish
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleExport(post.id)}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="published">
            <PostTable
              posts={published}
              isLoading={isLoading}
              onPreview={setPreviewPost}
              actions={(post) => (
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleExport(post.id)}>
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
              )}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{previewPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px]">{previewPost?.platform}</Badge>
            <Badge variant="outline" className="text-[9px]">{previewPost?.tone}</Badge>
            <Badge variant="secondary" className="text-[9px]">{previewPost?.event_type}</Badge>
          </div>
          <div className="text-sm whitespace-pre-wrap mt-2">{previewPost?.content}</div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={!!exportData} onOpenChange={() => setExportData(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Export Post</DialogTitle>
          </DialogHeader>
          {exportData && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Markdown</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(exportData.markdown)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap max-h-32 overflow-auto">{exportData.markdown}</pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Short Caption</span>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => copyToClipboard(exportData.short_caption)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs bg-muted p-2 rounded">{exportData.short_caption}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Hashtags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(exportData.hashtags ?? []).map((h: string) => (
                    <Badge key={h} variant="secondary" className="text-[9px]">{h}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PostTable({
  posts,
  isLoading,
  onPreview,
  actions,
}: {
  posts: BlogPost[];
  isLoading: boolean;
  onPreview: (post: BlogPost) => void;
  actions: (post: BlogPost) => React.ReactNode;
}) {
  if (isLoading) return <p className="text-muted-foreground text-sm py-4">Loading…</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Tone</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id} className="cursor-pointer" onClick={() => onPreview(post)}>
            <TableCell className="font-medium text-xs max-w-[200px] truncate">{post.title}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[9px]">{post.event_type}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-[9px]">{post.platform}</Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{post.tone}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              {actions(post)}
            </TableCell>
          </TableRow>
        ))}
        {posts.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No posts yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-lg font-mono font-bold leading-none">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
