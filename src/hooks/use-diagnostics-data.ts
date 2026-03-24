import { useQuery } from "@tanstack/react-query";
import { fetchWorkerNodes, fetchStalledEntities, fetchResourceMetrics } from "@/lib/api";

export function useWorkerNodes() {
  return useQuery({
    queryKey: ["worker_nodes"],
    queryFn: fetchWorkerNodes,
    refetchInterval: 15_000,
  });
}

export function useStalledEntities() {
  return useQuery({
    queryKey: ["stalled_entities"],
    queryFn: fetchStalledEntities,
    refetchInterval: 30_000,
  });
}

export function useResourceMetrics() {
  return useQuery({
    queryKey: ["resource_metrics"],
    queryFn: fetchResourceMetrics,
    refetchInterval: 30_000,
  });
}
