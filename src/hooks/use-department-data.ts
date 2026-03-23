import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface ProductBlueprint {
  id: string;
  department_slug: string;
  name: string;
  scope_template: string;
  required_roles: string[];
  default_autonomy_level: string;
  estimate_profile: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface PresaleSession {
  id: string;
  department_slug: string;
  blueprint_id: string | null;
  client_name: string;
  client_brief: string;
  status: string;
  spec_content: string;
  estimate_tokens_min: number;
  estimate_tokens_avg: number;
  estimate_tokens_max: number;
  estimate_cost_min: number;
  estimate_cost_max: number;
  estimate_timeline_days: number;
  risk_level: string;
  risk_notes: string;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useDepartment(slug: string) {
  return useQuery({
    queryKey: ["departments", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as Department;
    },
    enabled: !!slug,
  });
}

export function useBlueprints(departmentSlug?: string) {
  return useQuery({
    queryKey: ["blueprints", departmentSlug],
    queryFn: async () => {
      let q = supabase.from("product_blueprints").select("*").order("name");
      if (departmentSlug) q = q.eq("department_slug", departmentSlug);
      const { data, error } = await q;
      if (error) throw error;
      return data as ProductBlueprint[];
    },
  });
}

export function usePresales(departmentSlug?: string) {
  return useQuery({
    queryKey: ["presales", departmentSlug],
    queryFn: async () => {
      let q = supabase.from("presale_sessions").select("*").order("created_at", { ascending: false });
      if (departmentSlug) q = q.eq("department_slug", departmentSlug);
      const { data, error } = await q;
      if (error) throw error;
      return data as PresaleSession[];
    },
  });
}

export function usePresale(id: string) {
  return useQuery({
    queryKey: ["presales", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presale_sessions")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as PresaleSession;
    },
    enabled: !!id,
  });
}

export function useDepartmentStats(slug: string) {
  return useQuery({
    queryKey: ["department_stats", slug],
    queryFn: async () => {
      const [projectsRes, presalesRes, rolesRes] = await Promise.all([
        supabase.from("projects").select("id, state").not("state", "eq", "archived"),
        supabase.from("presale_sessions").select("id, status").eq("department_slug", slug),
        supabase.from("agent_roles").select("id, performance_score, total_runs, capacity_score, status"),
      ]);
      const activeProjects = (projectsRes.data ?? []).filter(p => ["active", "in_review", "scoped"].includes(p.state)).length;
      const activePresales = (presalesRes.data ?? []).filter(p => p.status !== "converted" && p.status !== "cancelled").length;
      const roles = rolesRes.data ?? [];
      const activeRoles = roles.filter(r => r.status === "active");
      const avgPerformance = activeRoles.length > 0
        ? activeRoles.reduce((s, r) => s + (r.performance_score ?? 0), 0) / activeRoles.length
        : 0;
      const totalCapacity = activeRoles.reduce((s, r) => s + (r.capacity_score ?? 0), 0);
      const usedCapacity = activeRoles.reduce((s, r) => s + Math.min(r.total_runs ?? 0, r.capacity_score ?? 1), 0);
      const loadPct = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

      return { activeProjects, activePresales, avgPerformance: Math.round(avgPerformance * 100), loadPct };
    },
    enabled: !!slug,
  });
}

export function useCreatePresale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { department_slug: string; client_name: string; client_brief: string; blueprint_id?: string }) => {
      const { data: result, error } = await supabase
        .from("presale_sessions")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presales"] }),
  });
}

export function useUpdatePresale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PresaleSession> & { id: string }) => {
      const { error } = await supabase
        .from("presale_sessions")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presales"] }),
  });
}

export function useCreateBlueprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { department_slug: string; name: string; scope_template?: string }) => {
      const { data: result, error } = await supabase
        .from("product_blueprints")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blueprints"] }),
  });
}
