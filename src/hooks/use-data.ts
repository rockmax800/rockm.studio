import { useQuery } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  fetchTasks,
  fetchDocuments,
  fetchApprovals,
  fetchActivityEvents,
  fetchAgentRoles,
  fetchDashboardCounts,
  fetchRuns,
  fetchArtifacts,
  fetchReviews,
} from "@/lib/api";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: fetchProjects });
}

export function useProject(id: string) {
  return useQuery({ queryKey: ["projects", id], queryFn: () => fetchProject(id), enabled: !!id });
}

export function useTasks(projectId?: string) {
  return useQuery({ queryKey: ["tasks", projectId], queryFn: () => fetchTasks(projectId) });
}

export function useDocuments(projectId?: string) {
  return useQuery({ queryKey: ["documents", projectId], queryFn: () => fetchDocuments(projectId) });
}

export function useApprovals(projectId?: string) {
  return useQuery({ queryKey: ["approvals", projectId], queryFn: () => fetchApprovals(projectId) });
}

export function useActivityEvents(projectId?: string, limit = 20) {
  return useQuery({ queryKey: ["activity_events", projectId, limit], queryFn: () => fetchActivityEvents(projectId, limit) });
}

export function useAgentRoles() {
  return useQuery({ queryKey: ["agent_roles"], queryFn: fetchAgentRoles });
}

export function useDashboardCounts() {
  return useQuery({ queryKey: ["dashboard_counts"], queryFn: fetchDashboardCounts });
}

export function useRuns(taskId?: string) {
  return useQuery({ queryKey: ["runs", taskId], queryFn: () => fetchRuns(taskId) });
}

export function useArtifacts(projectId?: string) {
  return useQuery({ queryKey: ["artifacts", projectId], queryFn: () => fetchArtifacts(projectId) });
}

export function useReviews(projectId?: string) {
  return useQuery({ queryKey: ["reviews", projectId], queryFn: () => fetchReviews(projectId) });
}