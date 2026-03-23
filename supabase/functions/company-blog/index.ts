// PART 3, 4, 5, 6, 8 — Blog edge function
// GET: list posts (drafts/approved/published)
// POST /generate: detect events & generate drafts via Lovable AI
// POST /[id]/approve: approve a draft
// POST /[id]/publish: publish an approved post
// GET /[id]/export: export in multiple formats

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // pathParts: ["company-blog"] or ["company-blog", id, action]

    const action = pathParts[1] ?? null;
    const subAction = pathParts[2] ?? null;

    // GET /company-blog — list posts
    if (req.method === "GET" && !action) {
      const status = url.searchParams.get("status");
      let query = supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return json({ posts: data });
    }

    // GET /company-blog/[id]/export
    if (req.method === "GET" && action && subAction === "export") {
      const { data: post, error } = await supabase.from("blog_posts").select("*").eq("id", action).single();
      if (error || !post) return json({ error: "Post not found" }, 404);

      const hashtags = generateHashtags(post.event_type, post.platform);
      const shortCaption = post.content.split("\n")[0]?.slice(0, 280) ?? post.title;

      return json({
        plain_text: post.content,
        markdown: `# ${post.title}\n\n${post.content}`,
        short_caption: shortCaption,
        hashtags,
      });
    }

    // POST /company-blog/generate — detect events & create drafts
    if (req.method === "POST" && action === "generate") {
      const body = await req.json().catch(() => ({}));
      const tone = body.tone ?? "professional";
      const platform = body.platform ?? "blog";

      // Check daily limit (PART 6)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString());

      if ((todayCount ?? 0) >= 3) {
        return json({ error: "Daily draft limit reached (3/day)", drafts_created: 0 });
      }

      // Detect significant events from last 24h
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: recentEvents } = await supabase
        .from("activity_events")
        .select("id, event_type, entity_type, entity_id, event_payload, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100);

      const significantEvents = detectSignificantEvents(recentEvents ?? []);

      // Filter already-drafted event types today (PART 6 — aggregate)
      const { data: existingDrafts } = await supabase
        .from("blog_posts")
        .select("event_type")
        .gte("created_at", todayStart.toISOString());

      const draftedTypes = new Set((existingDrafts ?? []).map((d: any) => d.event_type));
      const newEvents = significantEvents.filter(e => !draftedTypes.has(e.event_type));

      const remaining = 3 - (todayCount ?? 0);
      const toProcess = newEvents.slice(0, remaining);

      const drafts: any[] = [];
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      for (const evt of toProcess) {
        // Enrich context from DB
        const context = await enrichEventContext(supabase, evt);

        let content = `[Draft] ${evt.context}`;

        // PART 3 — Generate via Lovable AI if key available
        if (LOVABLE_API_KEY) {
          try {
            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  {
                    role: "system",
                    content: "You are a company copywriter for an AI-first software company. Write concise, authentic posts about real company events. No hype, no fictional metrics, no financial claims, no promises. Focus on real progress.",
                  },
                  {
                    role: "user",
                    content: `Write a concise but engaging post about the following company event:\n\nEvent Type: ${evt.event_type}\nContext: ${context}\nTone: ${tone}\nTarget platform: ${platform}\n\nKeep it authentic, avoid hype, focus on real progress. Output only the post text, no meta-commentary.`,
                  },
                ],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const generated = aiData.choices?.[0]?.message?.content;
              if (generated) content = generated;
            } else if (aiResponse.status === 429) {
              console.error("Rate limited by AI gateway");
            } else if (aiResponse.status === 402) {
              console.error("AI credits exhausted");
            }
          } catch (err) {
            console.error("AI generation failed:", err);
          }
        }

        const title = generateTitle(evt.event_type, evt.context);

        const { data: post, error } = await supabase.from("blog_posts").insert({
          title,
          content,
          event_type: evt.event_type,
          event_reference_id: evt.event_reference_id,
          tone,
          platform,
          status: "draft",
        }).select().single();

        if (!error && post) drafts.push(post);
      }

      return json({ drafts_created: drafts.length, drafts });
    }

    // POST /company-blog/[id]/approve
    if (req.method === "POST" && action && subAction === "approve") {
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", action)
        .eq("status", "draft")
        .select()
        .single();

      if (error || !data) return json({ error: "Post not found or not in draft status" }, 400);
      return json({ post: data });
    }

    // POST /company-blog/[id]/publish
    if (req.method === "POST" && action && subAction === "publish") {
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ status: "published" })
        .eq("id", action)
        .eq("status", "approved")
        .select()
        .single();

      if (error || !data) return json({ error: "Post not found or not approved" }, 400);
      return json({ post: data });
    }

    return json({ error: "Not found" }, 404);
  } catch (error: any) {
    console.error("company-blog error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SignificantEvent {
  event_type: string;
  event_reference_id: string;
  context: string;
}

function detectSignificantEvents(events: any[]): SignificantEvent[] {
  const results: SignificantEvent[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    let mapped: SignificantEvent | null = null;
    const t = e.event_type;
    const payload = e.event_payload as any;

    if (t === "state_change" && e.entity_type === "project" && payload?.to === "active") {
      mapped = { event_type: "project.activated", event_reference_id: e.entity_id, context: "Project activated" };
    } else if (t === "state_change" && e.entity_type === "project" && payload?.to === "completed") {
      mapped = { event_type: "project.completed", event_reference_id: e.entity_id, context: "Project completed" };
    } else if (t === "state_change" && e.entity_type === "task" && payload?.to === "done") {
      mapped = { event_type: "task.done", event_reference_id: e.entity_id, context: "Major task completed" };
    } else if (t === "employee_hired" || t === "hire") {
      mapped = { event_type: "employee.hired", event_reference_id: e.entity_id, context: "New AI employee hired" };
    } else if (t === "employee_replaced" || t === "replacement_executed") {
      mapped = { event_type: "employee.replaced", event_reference_id: e.entity_id, context: "AI employee replaced" };
    } else if (t === "prompt_version_created" || t === "prompt_updated") {
      mapped = { event_type: "prompt.updated", event_reference_id: e.entity_id, context: "Prompt version updated" };
    } else if (t === "team_created" || t === "department_created") {
      mapped = { event_type: "department.created", event_reference_id: e.entity_id, context: "New department created" };
    }

    if (mapped) {
      const dedup = `${mapped.event_type}`;
      if (!seen.has(dedup)) {
        seen.add(dedup);
        results.push(mapped);
      }
    }
  }

  return results;
}

async function enrichEventContext(supabase: any, evt: SignificantEvent): Promise<string> {
  try {
    if (evt.event_type.startsWith("project.")) {
      const { data } = await supabase.from("projects").select("name, purpose").eq("id", evt.event_reference_id).single();
      if (data) return `Project "${data.name}": ${data.purpose}`;
    }
    if (evt.event_type === "task.done") {
      const { data } = await supabase.from("tasks").select("title, purpose").eq("id", evt.event_reference_id).single();
      if (data) return `Task "${data.title}": ${data.purpose}`;
    }
    if (evt.event_type.startsWith("employee.")) {
      const { data } = await supabase.from("ai_employees").select("name, role_code, model_name, provider").eq("id", evt.event_reference_id).single();
      if (data) return `Employee ${data.name} (${data.role_code}) using ${data.provider}/${data.model_name}`;
    }
  } catch { /* best-effort enrichment */ }
  return evt.context;
}

function generateTitle(eventType: string, context: string): string {
  const titles: Record<string, string> = {
    "project.activated": "New Project Launched",
    "project.completed": "Project Successfully Delivered",
    "task.done": "Key Milestone Achieved",
    "employee.hired": "Team Expansion: New AI Hire",
    "employee.replaced": "Team Upgrade: Model Improvement",
    "model.upgrade": "Infrastructure: Model Upgrade",
    "prompt.updated": "Engineering: Prompt Optimization",
    "department.created": "Company Growth: New Department",
    "release.completed": "Release Shipped",
  };
  return titles[eventType] ?? `Company Update: ${context}`;
}

function generateHashtags(eventType: string, platform: string): string[] {
  const base = ["#AICompany", "#BuildInPublic", "#AI"];
  const specific: Record<string, string[]> = {
    "project.activated": ["#NewProject", "#Innovation"],
    "project.completed": ["#ProjectDelivery", "#Milestone"],
    "task.done": ["#Progress", "#Engineering"],
    "employee.hired": ["#AITeam", "#Growth"],
    "employee.replaced": ["#Optimization", "#ModelUpgrade"],
    "model.upgrade": ["#MLOps", "#Infrastructure"],
    "prompt.updated": ["#PromptEngineering"],
    "department.created": ["#Scaling", "#TeamGrowth"],
    "release.completed": ["#Release", "#Shipping"],
  };
  return [...base, ...(specific[eventType] ?? [])];
}
