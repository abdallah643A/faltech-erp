import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ECMVersion {
  id: string;
  document_id: string;
  version_number: string;
  version_type: "major" | "minor";
  file_path: string;
  file_size: number;
  comment: string | null;
  created_by: string | null;
  created_at: string;
}

export function useECMVersions(documentId?: string) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const versions = useQuery({
    queryKey: ["ecm-versions", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecm_document_versions")
        .select("*")
        .eq("document_id", documentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ECMVersion[];
    },
  });

  const uploadVersion = useMutation({
    mutationFn: async (params: {
      file: File;
      versionType: "major" | "minor";
      comment?: string;
    }) => {
      if (!documentId) throw new Error("documentId required");
      const { data: existing } = await supabase
        .from("ecm_document_versions")
        .select("version_number")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(1);

      const last = existing?.[0]?.version_number ?? "1.0";
      const [maj, min] = last.split(".").map((n) => parseInt(n) || 0);
      const next =
        params.versionType === "major" ? `${maj + 1}.0` : `${maj}.${min + 1}`;

      const path = `${documentId}/v${next}-${Date.now()}-${params.file.name}`;
      const { error: upErr } = await supabase.storage
        .from("ecm-documents")
        .upload(path, params.file);
      if (upErr) throw upErr;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insErr } = await supabase.from("ecm_document_versions").insert({
        document_id: documentId,
        version_number: next,
        version_type: params.versionType,
        file_path: path,
        file_size: params.file.size,
        comment: params.comment ?? null,
        created_by: user?.id ?? null,
      });
      if (insErr) throw insErr;

      await supabase
        .from("ecm_documents")
        .update({ current_version_number: next, file_path: path, file_size: params.file.size })
        .eq("id", documentId);

      await supabase.from("ecm_document_audit").insert({
        document_id: documentId,
        action: "version_uploaded",
        user_id: user?.id ?? null,
        details: { version: next, type: params.versionType, comment: params.comment },
      });

      return next;
    },
    onSuccess: (next) => {
      qc.invalidateQueries({ queryKey: ["ecm-versions", documentId] });
      qc.invalidateQueries({ queryKey: ["ecm-document", documentId] });
      toast({ title: `Version ${next} uploaded` });
    },
    onError: (e: Error) =>
      toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const downloadVersion = async (filePath: string) => {
    const { data, error } = await supabase.storage.from("ecm-documents").createSignedUrl(filePath, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank");
  };

  return { versions, uploadVersion, downloadVersion };
}
