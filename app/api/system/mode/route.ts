// PART 8 — Founder Mode Switch Endpoint
// POST /api/system/mode

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, experimental_features } = body;

    if (!mode || !["production", "experimental"].includes(mode)) {
      return Response.json(
        { error: "Invalid mode. Must be 'production' or 'experimental'." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current settings
    const { data: current } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1)
      .single();

    if (!current) {
      return Response.json({ error: "System settings not found" }, { status: 404 });
    }

    const previousMode = current.mode;

    // Update mode
    const updatePayload: Record<string, unknown> = {
      mode,
      updated_at: new Date().toISOString(),
    };

    // If switching to production, force all experimental features off
    if (mode === "production") {
      updatePayload.experimental_features = {
        enable_autonomy: false,
        enable_dual_verification: false,
        enable_self_review: false,
        enable_context_compression: false,
        enable_model_competition: false,
        enable_prompt_experiments: false,
        enable_blog: false,
      };
    } else if (experimental_features) {
      updatePayload.experimental_features = experimental_features;
    }

    const { error: updateError } = await supabase
      .from("system_settings")
      .update(updatePayload)
      .eq("id", current.id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    // Log ActivityEvent for mode change
    // Use first project as reference (system-wide event)
    const { data: firstProject } = await supabase
      .from("projects")
      .select("id")
      .limit(1)
      .single();

    if (firstProject) {
      await supabase.from("activity_events").insert({
        project_id: firstProject.id,
        entity_type: "project" as const,
        entity_id: current.id,
        event_type: "system.mode_changed",
        actor_type: "founder" as const,
        event_payload: {
          previous_mode: previousMode,
          new_mode: mode,
          experimental_features: updatePayload.experimental_features,
        },
      });
    }

    return Response.json({
      success: true,
      mode,
      previous_mode: previousMode,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .limit(1)
      .single();

    if (error || !data) {
      return Response.json({ mode: "production", experimental_features: {} });
    }

    return Response.json(data);
  } catch {
    return Response.json({ mode: "production", experimental_features: {} });
  }
}
