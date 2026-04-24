import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SimStep {
  id: string;
  type: "condition" | "action" | "approval" | "notify" | "delay";
  name?: string;
  config?: Record<string, unknown>;
  next?: string | null;
  branches?: { when: "true" | "false"; next: string }[];
}

export interface SimulateInput {
  workflow_key: string;
  workflow_version?: number;
  scenario_name?: string;
  steps: SimStep[];
  input: Record<string, unknown>;
  start_step_id?: string;
}

export const useWorkflowSimulationRuns = (workflowKey?: string) => {
  return useQuery({
    queryKey: ["workflow-simulation-runs", workflowKey],
    queryFn: async () => {
      let q = (supabase.from("workflow_simulation_runs" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (workflowKey) q = q.eq("workflow_key", workflowKey);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useRunWorkflowSimulation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SimulateInput) => {
      const { data, error } = await supabase.functions.invoke("workflow-simulate", {
        body: input,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-simulation-runs"] });
      toast.success("Simulation completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
