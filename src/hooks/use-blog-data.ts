import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  event_type: string;
  event_reference_id: string | null;
  tone: string;
  platform: string;
  status: string;
  created_at: string;
  approved_at: string | null;
}

export function useBlogPosts(status?: string) {
  return useQuery({
    queryKey: ["blog-posts", status],
    queryFn: async () => {
      let query = supabase.from("blog_posts" as any).select("*").order("created_at", { ascending: false });
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as BlogPost[];
    },
  });
}

export function useGenerateDrafts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tone, platform }: { tone?: string; platform?: string }) => {
      const { data, error } = await supabase.functions.invoke("company-blog", {
        method: "POST",
        body: { tone: tone ?? "professional", platform: platform ?? "blog" },
        headers: { "x-action": "generate" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog-posts"] }),
  });
}

export function useApproveBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke(`company-blog/${postId}/approve`, {
        method: "POST",
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog-posts"] }),
  });
}

export function usePublishBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke(`company-blog/${postId}/publish`, {
        method: "POST",
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blog-posts"] }),
  });
}

export function useExportBlogPost() {
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke(`company-blog/${postId}/export`, {
        method: "GET",
      });
      if (error) throw error;
      return data;
    },
  });
}
