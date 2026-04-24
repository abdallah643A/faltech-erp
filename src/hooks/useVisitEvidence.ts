import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VisitEvidenceFile {
  id: string;
  visit_id: string;
  file_url: string;
  file_type?: string;
  file_name?: string;
  captured_lat?: number;
  captured_lng?: number;
  captured_at: string;
}

export const useVisitEvidence = (visitId?: string) => {
  return useQuery({
    queryKey: ["visit-evidence", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("visit_evidence_files" as any) as any)
        .select("*")
        .eq("visit_id", visitId)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return data as VisitEvidenceFile[];
    },
    enabled: !!visitId,
  });
};

export const useUploadVisitEvidence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      file,
      fileType,
      lat,
      lng,
    }: {
      visitId: string;
      file: File;
      fileType?: string;
      lat?: number;
      lng?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${visitId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("visit-evidence")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("visit-evidence")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      const { data, error } = await (supabase.from("visit_evidence_files" as any) as any)
        .insert({
          visit_id: visitId,
          file_url: signed?.signedUrl ?? path,
          file_type: fileType ?? (file.type.startsWith("image/") ? "photo" : "document"),
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          captured_lat: lat ?? null,
          captured_lng: lng ?? null,
          uploaded_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit-evidence"] });
      toast.success("Evidence uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useGeoCheckIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      visitId,
      lat,
      lng,
      accuracy,
      direction,
    }: {
      visitId: string;
      lat: number;
      lng: number;
      accuracy?: number;
      direction: "in" | "out";
    }) => {
      const update: Record<string, unknown> = {
        accuracy_meters: accuracy ?? null,
      };
      if (direction === "in") {
        update.check_in_time = new Date().toISOString();
        update.check_in_lat = lat;
        update.check_in_lng = lng;
        update.status = "in_progress";
      } else {
        update.check_out_time = new Date().toISOString();
        update.check_out_lat = lat;
        update.check_out_lng = lng;
        update.status = "completed";
      }
      const { error } = await supabase.from("visits").update(update).eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      toast.success(`Checked ${vars.direction}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
