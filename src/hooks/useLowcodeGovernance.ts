import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ArtifactType = "form" | "report" | "dashboard" | "workflow";

export const usePublishRequests = (status?: string) => {
  return useQuery({
    queryKey: ["lowcode-publish-requests", status],
    queryFn: async () => {
      let q = (supabase.from("lowcode_publish_requests" as any) as any)
        .select("*")
        .order("requested_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useRequestPublish = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      artifact_type: ArtifactType;
      artifact_id: string;
      artifact_name?: string;
      from_version?: number;
      to_version?: number;
      diff_summary?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("lowcode_publish_requests" as any) as any)
        .insert({
          ...req,
          requested_by: user?.id,
          requested_by_name: user?.email,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lowcode-publish-requests"] });
      toast.success("Publish request submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDecidePublish = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
    }: {
      id: string;
      decision: "approved" | "rejected";
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("lowcode_publish_requests" as any) as any)
        .update({
          status: decision,
          decided_by: user?.id,
          decided_by_name: user?.email,
          decided_at: new Date().toISOString(),
          decision_notes: notes ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lowcode-publish-requests"] });
      toast.success("Decision recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
