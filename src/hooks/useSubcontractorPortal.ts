import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============== PACKAGES ==============
export function useSubcontractorPackages(subcontractorId?: string) {
  return useQuery({
    queryKey: ["subcon-packages", subcontractorId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_packages").select("*").order("created_at", { ascending: false });
      if (subcontractorId) q = q.eq("subcontractor_id", subcontractorId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await supabase.from("subcontractor_packages").upsert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-packages"] }); toast.success("Package saved"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============== PROGRESS ==============
export function useProgressSubmissions(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-progress", packageId],
    queryFn: async () => {
      if (!packageId) return [];
      const { data, error } = await supabase.from("subcontractor_progress_submissions")
        .select("*, photos:subcontractor_progress_photos(*)")
        .eq("package_id", packageId).order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!packageId,
  });
}

export function useSubmitProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { submission: any; photos?: { url: string; lat?: number; lng?: number; takenAt?: string }[] }) => {
      const { data: sub, error } = await supabase.from("subcontractor_progress_submissions")
        .insert(payload.submission).select().single();
      if (error) throw error;
      if (payload.photos?.length) {
        await supabase.from("subcontractor_progress_photos").insert(
          payload.photos.map(p => ({ submission_id: sub.id, photo_url: p.url, exif_lat: p.lat, exif_lng: p.lng, taken_at: p.takenAt }))
        );
      }
      return sub;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-progress"] }); toast.success("Progress submitted"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReviewProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: "approved" | "rejected"; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("subcontractor_progress_submissions")
        .update({ status: p.status, review_notes: p.notes, reviewed_at: new Date().toISOString(), reviewed_by: u.user?.id })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-progress"] }); toast.success("Reviewed"); },
  });
}

// ============== VARIATIONS ==============
export function useVariationRequests(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-vrs", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_variation_requests").select("*").order("created_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVRMessages(vrId?: string) {
  return useQuery({
    queryKey: ["subcon-vr-msgs", vrId],
    queryFn: async () => {
      if (!vrId) return [];
      const { data, error } = await supabase.from("subcontractor_vr_messages").select("*").eq("vr_id", vrId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!vrId,
  });
}

export function useVRActions() {
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: async (vr: any) => {
      const { data, error } = await supabase.from("subcontractor_variation_requests")
        .upsert({ ...vr, status: "submitted", submitted_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-vrs"] }); toast.success("VR submitted"); },
  });
  const reply = useMutation({
    mutationFn: async (m: { vr_id: string; message: string; sender_role?: string; sender_name?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("subcontractor_vr_messages").insert({ ...m, sender_id: u.user?.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["subcon-vr-msgs", v.vr_id] }),
  });
  const decide = useMutation({
    mutationFn: async (p: { id: string; status: "approved" | "rejected" | "needs_info"; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("subcontractor_variation_requests")
        .update({ status: p.status, decision_notes: p.notes, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;
      // Auto-link to PCN if approved
      if (p.status === "approved") {
        await supabase.functions.invoke("subcontractor-vr-to-pcn", { body: { vr_id: p.id } });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-vrs"] }); toast.success("Decision saved"); },
  });
  return { submit, reply, decide };
}

// ============== QA / HSE ==============
export function useQASubmissions(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-qa", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_qa_submissions").select("*").order("submitted_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHSESubmissions(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-hse", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_hse_submissions").select("*").order("submitted_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmitQA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qa: any) => {
      const { error } = await supabase.from("subcontractor_qa_submissions").insert(qa);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-qa"] }); toast.success("QA submitted"); },
  });
}

export function useSubmitHSE() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hse: any) => {
      const { error } = await supabase.from("subcontractor_hse_submissions").insert(hse);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-hse"] }); toast.success("HSE submitted"); },
  });
}

// ============== IPC / RETENTION ==============
export function useIPCs(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-ipc", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_ipc").select("*").order("created_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertIPC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ipc: any) => {
      const { data, error } = await supabase.from("subcontractor_ipc").upsert(ipc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-ipc"] }); toast.success("IPC saved"); },
  });
}

// ============== DOCUMENTS ==============
export function useSubconDocuments(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-docs", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_documents").select("*").order("uploaded_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadSubconDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { package_id: string; doc_type: string; title: string; file: File; revision?: string; direction?: string }) => {
      const path = `${p.package_id}/${Date.now()}_${p.file.name}`;
      const { error: upErr } = await supabase.storage.from("subcontractor-docs").upload(path, p.file);
      if (upErr) throw upErr;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("subcontractor_documents").insert({
        package_id: p.package_id, doc_type: p.doc_type, title: p.title, file_url: path,
        file_size: p.file.size, revision: p.revision, direction: p.direction ?? "subcontractor_to_main",
        uploaded_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-docs"] }); toast.success("Document uploaded"); },
  });
}

// ============== TASKS / MESSAGING ==============
export function useSubconTasks(packageId?: string) {
  return useQuery({
    queryKey: ["subcon-tasks", packageId],
    queryFn: async () => {
      let q = supabase.from("subcontractor_tasks").select("*").order("created_at", { ascending: false });
      if (packageId) q = q.eq("package_id", packageId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTaskMessages(taskId?: string) {
  return useQuery({
    queryKey: ["subcon-task-msgs", taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase.from("subcontractor_task_messages").select("*").eq("task_id", taskId).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!taskId,
  });
}

export function useTaskActions() {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (t: any) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("subcontractor_tasks").insert({ ...t, created_by: u.user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcon-tasks"] }); toast.success("Task created"); },
  });
  const send = useMutation({
    mutationFn: async (m: { task_id: string; message: string; sender_role?: string; sender_name?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("subcontractor_task_messages").insert({ ...m, sender_id: u.user?.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["subcon-task-msgs", v.task_id] }),
  });
  const close = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcontractor_tasks").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subcon-tasks"] }),
  });
  return { create, send, close };
}
