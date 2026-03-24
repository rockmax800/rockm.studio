import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBlogPosts, useApproveBlogPost, usePublishBlogPost, type BlogPost } from "@/hooks/use-blog-data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPersona } from "@/lib/personas";
import {
  Megaphone, FileText, CheckCircle2, Send, Sparkles, Eye,
  Clock, TrendingUp, BarChart3, Users, ArrowRight, X,
  AlertTriangle, Hash, Linkedin, MessageSquare, Globe,
  GraduationCap, BookOpen, ShieldCheck, Zap,
} from "lucide-react";

const PLATFORM_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  linkedin:  { icon: Linkedin,      label: "LinkedIn",  color: "text-blue-600" },
  blog:      { icon: Globe,         label: "Blog",      color: "text-foreground" },
  telegram:  { icon: MessageSquare, label: "Telegram",  color: "text-cyan-500" },
  twitter:   { icon: Hash,          label: "Twitter/X", color: "text-foreground" },
};

const TONE_COLOR: Record<string, string> = {
  professional: "bg-primary/5 text-primary",
  casual: "bg-status-amber/10 text-status-amber",
  technical: "bg-status-blue/10 text-status-blue",
};

// SMM role personas (reuse existing avatars as fallback)
const SMM_ROLES = [
  { code: "content_lead", label: "Content Lead" },
  { code: "technical_writer", label: "Technical Writer" },
  { code: "growth_editor", label: "Growth Editor" },
];

export default function SMMCapability() {
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useBlogPosts();
  const approveMut = useApproveBlogPost();
  const publishMut = usePublishBlogPost();
  const [generating, setGenerating] = useState(false);
  const [tone, setTone] = useState("professional");
  const [platform, setPlatform] = useState("blog");
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [activeTab, setActiveTab] = useState<"drafts" | "approved" | "published" | "training">("drafts");

  const { data: smmTeam = [] } = useQuery({
    queryKey: ["smm-team"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_employees")
        .select("id, name, role_code, status, success_rate, reputation_score, model_name")
        .in("role_code", ["content_lead", "technical_writer", "growth_editor"])
        .order("reputation_score", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ["smm-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
      const { data } = await supabase.from("event_log")
        .select("id, event_type, aggregate_type, aggregate_id, created_at, payload_json")
        .in("event_type", [
          "project.completed", "project.launched", "deployment.live",
          "milestone.achieved", "learning.promoted", "department.created",
          "state_change",
        ])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const drafts = posts.filter(p => p.status === "draft");
  const approved = posts.filter(p => p.status === "approved");
  const published = posts.filter(p => p.status === "published");

  const avgApprovalRate = posts.length > 0
    ? Math.round((approved.length + published.length) / posts.length * 100) : 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-blog", {
        method: "POST",
        body: { tone, platform },
        headers: { "x-action": "generate" },
      });
      if (error) throw error;
      toast.success(`${data?.drafts_created ?? 0} draft(s) generated from real events`);
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const tabs = [
    { key: "drafts" as const, label: "Drafts", count: drafts.length, icon: FileText },
    { key: "approved" as const, label: "Approved", count: approved.length, icon: CheckCircle2 },
    { key: "published" as const, label: "Published", count: published.length, icon: Send },
    { key: "training" as const, label: "Training", count: null, icon: GraduationCap },
  ];

  const activePosts = activeTab === "drafts" ? drafts : activeTab === "approved" ? approved : published;

  return (
    <AppLayout title="Content & Media">
      <ScrollArea className="h-full">
        <div className="px-8 py-6 space-y-8 max-w-[1400px]">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
                <Megaphone className="h-7 w-7 text-primary/60" />
              </div>
              <div>
                <h1 className="text-[28px] font-bold text-foreground tracking-tight">Content & Media</h1>
                <p className="text-[14px] text-muted-foreground mt-0.5">
                  AI-generated content from real production events · Founder approval required
                </p>
              </div>
            </div>
          </div>

          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard icon={<FileText className="h-4 w-4" />} label="Drafts" value={drafts.length} />
            <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Approved" value={approved.length} />
            <KpiCard icon={<Send className="h-4 w-4" />} label="Published" value={published.length} />
            <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Approval Rate" value={`${avgApprovalRate}%`} />
            <KpiCard icon={<Users className="h-4 w-4" />} label="Team" value={smmTeam.length} />
          </div>

          {/* ── Team Strip ── */}
          <section>
            <SectionHeader icon={<Users className="h-5 w-5" />} title="SMM Team" />
            <div className="mt-3 flex gap-3 flex-wrap">
              {smmTeam.map((emp) => {
                const persona = getPersona(emp.role_code);
                const roleLabel = SMM_ROLES.find(r => r.code === emp.role_code)?.label ?? emp.role_code;
                return (
                  <div key={emp.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 min-w-[220px]">
                    <img src={persona.avatar} alt={emp.name}
                      className={`h-10 w-10 rounded-lg object-cover ring-2 ${persona.ringClass} ring-offset-2 ring-offset-card`}
                      width={40} height={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{emp.name}</p>
                      <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-status-green">
                      {Math.round((emp.success_rate ?? 0) * 100)}%
                    </span>
                  </div>
                );
              })}
              {smmTeam.length === 0 && (
                <p className="text-[13px] text-muted-foreground/50">No SMM agents assigned yet.</p>
              )}
            </div>
          </section>

          {/* ── Generate Controls ── */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-[18px] font-bold text-foreground">Generate Content from Events</h2>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-36 h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-36 h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={generating}
                className="h-9 gap-2 text-[13px] font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90">
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Scanning events…" : "Detect & Draft"}
              </Button>
              <span className="text-[12px] text-muted-foreground">Max 3 drafts/day · Only real events</span>
            </div>

            {/* Recent detectable events */}
            {recentEvents.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-[11px] font-bold text-muted-foreground mb-2">Recent Significant Events ({recentEvents.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {recentEvents.slice(0, 8).map((ev) => (
                    <Badge key={ev.id} variant="secondary" className="text-[10px] font-bold gap-1">
                      <Zap className="h-2.5 w-2.5" />
                      {ev.event_type}
                    </Badge>
                  ))}
                  {recentEvents.length > 8 && (
                    <span className="text-[10px] text-muted-foreground/50">+{recentEvents.length - 8} more</span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Tabs ── */}
          <div className="flex items-center gap-1 border-b border-border pb-px">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-t-lg transition-colors ${
                    isActive ? "bg-card text-foreground border border-border border-b-card -mb-px" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {t.count !== null && (
                    <Badge variant="secondary" className="text-[10px] font-mono ml-1 px-1.5 py-0">{t.count}</Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Content Area ── */}
          {activeTab === "training" ? (
            <TrainingSection />
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-[13px] text-muted-foreground py-8 text-center">Loading content…</p>
              ) : activePosts.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/10 p-10 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
                  <p className="text-[16px] font-bold text-foreground">No {activeTab} content</p>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    {activeTab === "drafts" ? "Generate drafts from recent production events." : "Approve drafts to see them here."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {activePosts.map((post) => (
                    <ContentDraftCard
                      key={post.id}
                      post={post}
                      onPreview={() => setPreviewPost(post)}
                      onApprove={activeTab === "drafts" ? () => {
                        approveMut.mutate(post.id, {
                          onSuccess: () => { toast.success("Content approved"); qc.invalidateQueries({ queryKey: ["blog-posts"] }); },
                          onError: () => toast.error("Approve failed"),
                        });
                      } : undefined}
                      onPublish={activeTab === "approved" ? () => {
                        publishMut.mutate(post.id, {
                          onSuccess: () => { toast.success("Content marked as published"); qc.invalidateQueries({ queryKey: ["blog-posts"] }); },
                          onError: () => toast.error("Publish failed"),
                        });
                      } : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-8" />
        </div>
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={() => setPreviewPost(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">{previewPost?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap mt-1">
            {previewPost?.platform && (() => {
              const pm = PLATFORM_META[previewPost.platform];
              const Icon = pm?.icon ?? Globe;
              return <Badge variant="outline" className={`text-[10px] font-bold gap-1 ${pm?.color ?? ""}`}><Icon className="h-3 w-3" />{pm?.label ?? previewPost.platform}</Badge>;
            })()}
            <Badge className={`text-[10px] font-bold border-0 ${TONE_COLOR[previewPost?.tone ?? ""] ?? "bg-secondary text-muted-foreground"}`}>{previewPost?.tone}</Badge>
            <Badge variant="secondary" className="text-[10px] font-bold">{previewPost?.event_type}</Badge>
          </div>
          <div className="mt-4 text-[14px] leading-relaxed whitespace-pre-wrap text-foreground">{previewPost?.content}</div>
          {previewPost?.event_reference_id && (
            <div className="mt-4 rounded-lg bg-secondary/20 px-3 py-2">
              <p className="text-[10px] font-bold text-muted-foreground">Event Reference</p>
              <p className="text-[12px] font-mono text-foreground/70 mt-0.5">{previewPost.event_reference_id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

/* ═══ Content Draft Card ═══ */
function ContentDraftCard({ post, onPreview, onApprove, onPublish }: {
  post: BlogPost;
  onPreview: () => void;
  onApprove?: () => void;
  onPublish?: () => void;
}) {
  const pm = PLATFORM_META[post.platform];
  const PlatformIcon = pm?.icon ?? Globe;
  const statusColor = post.status === "draft" ? "bg-status-amber/10 text-status-amber"
    : post.status === "approved" ? "bg-status-blue/10 text-status-blue"
    : "bg-status-green/10 text-status-green";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-all group">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/30">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            post.status === "draft" ? "bg-status-amber/10" : post.status === "approved" ? "bg-status-blue/10" : "bg-status-green/10"
          }`}>
            <PlatformIcon className={`h-5 w-5 ${pm?.color ?? "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-foreground leading-tight line-clamp-2">{post.title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge className={`text-[9px] font-bold border-0 px-1.5 py-0 ${statusColor}`}>{post.status}</Badge>
              <Badge className={`text-[9px] font-bold border-0 px-1.5 py-0 ${TONE_COLOR[post.tone] ?? "bg-secondary text-muted-foreground"}`}>{post.tone}</Badge>
              <Badge variant="secondary" className="text-[9px] font-bold">{post.event_type}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Body preview */}
      <div className="px-5 py-3">
        <p className="text-[13px] text-muted-foreground line-clamp-3 leading-relaxed">{post.content}</p>
      </div>

      {/* Event evidence */}
      {post.event_reference_id && (
        <div className="px-5 pb-3">
          <div className="rounded-lg bg-secondary/20 px-3 py-2 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-status-green shrink-0" />
            <span className="text-[10px] font-bold text-muted-foreground">Evidence:</span>
            <span className="text-[10px] font-mono text-foreground/60 truncate">{post.event_reference_id}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/30 bg-secondary/10 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1 flex-1">
          <Clock className="h-3 w-3" />
          {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
        <Button size="sm" variant="outline" className="h-8 text-[12px] gap-1.5 rounded-lg" onClick={onPreview}>
          <Eye className="h-3 w-3" /> Preview
        </Button>
        {onApprove && (
          <Button size="sm" className="h-8 text-[12px] gap-1.5 font-bold rounded-lg bg-foreground text-background hover:bg-foreground/90" onClick={onApprove}>
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
        )}
        {onPublish && (
          <Button size="sm" className="h-8 text-[12px] gap-1.5 font-bold rounded-lg bg-status-green text-white hover:bg-status-green/90" onClick={onPublish}>
            <Send className="h-3 w-3" /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══ Training Section ═══ */
function TrainingSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" /> Brand Voice Training
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrainingField label="Tone Guidelines" placeholder="Professional but approachable. Technical depth without jargon. Focus on engineering decisions and real outcomes." rows={4} />
          <TrainingField label="Forbidden Phrases" placeholder="• 'Revolutionary'\n• 'Game-changing'\n• 'Cutting-edge'\n• Any revenue claims\n• Unverified metrics" rows={4} />
          <TrainingField label="Target Audience" placeholder="Technical founders, CTOs, engineering leads interested in AI-assisted software development." rows={3} />
          <TrainingField label="Content Rules" placeholder="• Always reference real event_log entries\n• No fabricated numbers\n• No hype tone\n• Max 280 chars for Twitter\n• Include technical insight" rows={3} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-[18px] font-bold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-muted-foreground" /> Tone Examples
        </h3>
        <div className="space-y-3">
          <ExampleBlock label="Good Example"
            text="We completed a major architecture refactor this week — migrating from monolithic state management to domain-isolated event sourcing. 47 tests passing, zero regressions."
            good />
          <ExampleBlock label="Bad Example (forbidden)"
            text="🚀 Revolutionary AI breakthrough! Our game-changing platform is disrupting the industry! 10x faster than competitors!"
            good={false} />
        </div>
      </div>
    </div>
  );
}

function TrainingField({ label, placeholder, rows }: { label: string; placeholder: string; rows: number }) {
  return (
    <div>
      <p className="text-[12px] font-bold text-muted-foreground mb-1.5">{label}</p>
      <Textarea placeholder={placeholder} rows={rows} className="text-[13px] resize-none" />
    </div>
  );
}

function ExampleBlock({ label, text, good }: { label: string; text: string; good: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${good ? "bg-status-green/5 border border-status-green/20" : "bg-destructive/5 border border-destructive/20"}`}>
      <p className={`text-[11px] font-bold mb-1 flex items-center gap-1.5 ${good ? "text-status-green" : "text-destructive"}`}>
        {good ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />} {label}
      </p>
      <p className="text-[13px] text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

/* ═══ Helpers ═══ */
function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <span className="text-muted-foreground/50">{icon}</span>
      <div>
        <p className="text-[20px] font-mono font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-[20px] font-bold text-foreground tracking-tight">{title}</h2>
    </div>
  );
}
