import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Workflow + ECM + Approvals enterprise suite
 * Covers: approval templates, task inbox, SLA/escalation, delegation,
 * ECM retention, OCR jobs, external sharing, e-sign envelopes,
 * designer versions, compliance audit trail.
 */

// ============== APPROVAL TEMPLATES ==============
export const useApprovalTemplates = () =>
  useQuery({
    queryKey: ["approval-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useApprovalTemplateSteps = (templateId?: string) =>
  useQuery({
    queryKey: ["approval-template-steps", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_template_steps" as any)
        .select("*")
        .eq("template_id", templateId!)
        .order("step_order");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertApprovalTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("approval_templates")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval-templates"] });
      toast.success("Approval template saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpsertTemplateStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase
        .from("approval_template_steps" as any)
        .upsert(payload)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars: any) => {
      qc.invalidateQueries({ queryKey: ["approval-template-steps", vars.template_id] });
    },
  });
};

// ============== TASK INBOX ==============
export interface InboxFilters {
  status?: string;
  priority?: string;
  task_type?: string;
  onlyMine?: boolean;
}

export const useTaskInbox = (filters: InboxFilters = {}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["task-inbox", filters, user?.id],
    queryFn: async () => {
      let q = (supabase.from("workflow_task_inbox" as any) as any)
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(200);
      if (filters.status) q = q.eq("status", filters.status);
      if (filters.priority) q = q.eq("priority", filters.priority);
      if (filters.task_type) q = q.eq("task_type", filters.task_type);
      if (filters.onlyMine && user?.id) q = q.eq("assigned_to", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};

export const useInboxStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["inbox-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("workflow_task_inbox" as any)
        .select("status, priority, sla_breached, due_at") as any);
      if (error) throw error;
      const arr = (data ?? []) as any[];
      const now = Date.now();
      return {
        total: arr.length,
        pending: arr.filter((t) => t.status === "pending").length,
        completed: arr.filter((t) => t.status === "completed").length,
        urgent: arr.filter((t) => t.priority === "urgent" && t.status === "pending").length,
        breached: arr.filter((t) => t.sla_breached && t.status === "pending").length,
        dueToday: arr.filter(
          (t) =>
            t.status === "pending" &&
            t.due_at &&
            new Date(t.due_at).getTime() - now < 24 * 3600 * 1000
        ).length,
      };
    },
  });
};

export const useCompleteTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: "approved" | "rejected" | "returned" | "signed";
      comment?: string;
    }) => {
      const { data, error } = await (supabase
        .from("workflow_task_inbox" as any)
        .update({
          status: "completed",
          completion_action: input.action,
          completion_comment: input.comment ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .select()
        .single() as any);
      if (error) throw error;
      // unified compliance audit
      await (supabase.from("compliance_audit_trail" as any).insert({
        module: "approvals",
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_reference: data.entity_reference,
        action: `task_${input.action}`,
        actor_id: user?.id,
        actor_name: user?.email,
        after_state: { status: "completed", action: input.action, comment: input.comment },
        risk_level: "low",
      }) as any);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-inbox"] });
      qc.invalidateQueries({ queryKey: ["inbox-stats"] });
      toast.success("Task completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDelegateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; toUserId: string; toName?: string }) => {
      const { error } = await (supabase
        .from("workflow_task_inbox" as any)
        .update({
          status: "delegated",
          delegated_at: new Date().toISOString(),
          delegated_to: input.toUserId,
          assigned_to: input.toUserId,
          assigned_to_name: input.toName ?? null,
        })
        .eq("id", input.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-inbox"] });
      toast.success("Task delegated");
    },
  });
};

export const useEscalateTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      toUserId: string;
      reason?: string;
    }) => {
      const { error } = await (supabase
        .from("workflow_task_inbox" as any)
        .update({
          status: "escalated",
          escalated_at: new Date().toISOString(),
          escalated_to: input.toUserId,
        })
        .eq("id", input.id) as any);
      if (error) throw error;
      await (supabase.from("workflow_escalation_log" as any).insert({
        task_id: input.id,
        escalated_from: user?.id,
        escalated_to: input.toUserId,
        escalation_reason: input.reason,
        triggered_by: "manual",
      }) as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-inbox"] });
      toast.success("Task escalated");
    },
  });
};

export const useMarkSlaBreaches = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc("mark_sla_breaches" as any) as any);
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["task-inbox"] });
      qc.invalidateQueries({ queryKey: ["inbox-stats"] });
      toast.success(`${n ?? 0} task(s) marked as SLA-breached`);
    },
  });
};

// ============== DELEGATIONS ==============
export const useDelegations = () =>
  useQuery({
    queryKey: ["workflow-delegations"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("workflow_delegations" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase
        .from("workflow_delegations" as any)
        .upsert(payload)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-delegations"] });
      toast.success("Delegation saved");
    },
  });
};

// ============== RETENTION ==============
export const useRetentionRules = () =>
  useQuery({
    queryKey: ["ecm-retention-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_retention_rules" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useUpsertRetentionRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase
        .from("ecm_retention_rules" as any)
        .upsert(payload)
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-retention-rules"] });
      toast.success("Retention rule saved");
    },
  });
};

export const useRetentionHolds = () =>
  useQuery({
    queryKey: ["ecm-retention-holds"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_retention_holds" as any)
        .select("*")
        .order("placed_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

// ============== OCR JOBS ==============
export const useOcrJobs = () =>
  useQuery({
    queryKey: ["ecm-ocr-jobs"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_ocr_jobs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 5000,
  });

export const useEnqueueOcr = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      file_path: string;
      file_name?: string;
      mime_type?: string;
      document_id?: string;
      priority?: number;
    }) => {
      const { data, error } = await (supabase
        .from("ecm_ocr_jobs" as any)
        .insert({
          file_path: input.file_path,
          file_name: input.file_name,
          mime_type: input.mime_type,
          document_id: input.document_id,
          priority: input.priority ?? 5,
          status: "queued",
          requested_by: user?.id,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-ocr-jobs"] });
      toast.success("OCR job queued");
    },
  });
};

export const useRunOcrWorker = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ocr-worker", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["ecm-ocr-jobs"] });
      toast.success(`Processed ${d?.processed ?? 0} OCR job(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ============== EXTERNAL SHARES ==============
export const useExternalShares = () =>
  useQuery({
    queryKey: ["ecm-external-shares"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_external_shares" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

function genToken(len = 28) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, len);
}

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const useCreateExternalShare = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      document_id?: string;
      entity_type?: string;
      entity_id?: string;
      recipient_email?: string;
      recipient_name?: string;
      password?: string;
      expires_at?: string;
      max_views?: number;
      download_allowed?: boolean;
      watermark_enabled?: boolean;
    }) => {
      const token = genToken(32);
      const password_hash = input.password ? await sha256(input.password) : null;
      const { data, error } = await (supabase
        .from("ecm_external_shares" as any)
        .insert({
          ...input,
          password: undefined,
          share_token: token,
          password_hash,
          created_by: user?.id,
          created_by_name: user?.email,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-external-shares"] });
      toast.success("Share link created");
    },
  });
};

export const useRevokeShare = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("ecm_external_shares" as any)
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
        })
        .eq("id", id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-external-shares"] });
      toast.success("Share revoked");
    },
  });
};

export const useShareAccessLog = (shareId?: string) =>
  useQuery({
    queryKey: ["share-access-log", shareId],
    enabled: !!shareId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_external_share_access_log" as any)
        .select("*")
        .eq("share_id", shareId!)
        .order("accessed_at", { ascending: false })
        .limit(200) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

// ============== E-SIGNATURE ENVELOPES ==============
export const useSignatureEnvelopes = () =>
  useQuery({
    queryKey: ["ecm-envelopes"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_signature_envelopes" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useEnvelopeRecipients = (envelopeId?: string) =>
  useQuery({
    queryKey: ["envelope-recipients", envelopeId],
    enabled: !!envelopeId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("ecm_signature_recipients" as any)
        .select("*")
        .eq("envelope_id", envelopeId!)
        .order("recipient_order") as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useCreateEnvelope = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      envelope_name: string;
      document_id?: string;
      entity_type?: string;
      entity_id?: string;
      signing_order?: "parallel" | "sequential";
      message_to_signers?: string;
      expires_at?: string;
      recipients: Array<{
        recipient_name: string;
        recipient_email: string;
        recipient_role?: string;
        recipient_order?: number;
      }>;
    }) => {
      const { recipients, ...env } = input;
      const certHash = await sha256(`${env.envelope_name}|${Date.now()}`);
      const { data: envelope, error } = await (supabase
        .from("ecm_signature_envelopes" as any)
        .insert({
          ...env,
          status: "sent",
          certificate_hash: certHash,
          created_by: user?.id,
          created_by_name: user?.email,
        })
        .select()
        .single() as any);
      if (error) throw error;

      const rows = recipients.map((r, i) => ({
        ...r,
        envelope_id: envelope.id,
        recipient_order: r.recipient_order ?? i + 1,
        status: "sent",
      }));
      const { error: rErr } = await (supabase
        .from("ecm_signature_recipients" as any)
        .insert(rows) as any);
      if (rErr) throw rErr;

      await (supabase.from("ecm_signature_envelope_audit" as any).insert({
        envelope_id: envelope.id,
        event_type: "envelope_sent",
        event_data: { recipients: recipients.length },
        actor_id: user?.id,
        actor_name: user?.email,
      }) as any);

      return envelope;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-envelopes"] });
      toast.success("Envelope sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useVoidEnvelope = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("ecm_signature_envelopes" as any)
        .update({ status: "voided" })
        .eq("id", id) as any);
      if (error) throw error;
      await (supabase.from("ecm_signature_envelope_audit" as any).insert({
        envelope_id: id,
        event_type: "envelope_voided",
        actor_id: user?.id,
        actor_name: user?.email,
      }) as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecm-envelopes"] });
      toast.success("Envelope voided");
    },
  });
};

// ============== DESIGNER VERSIONS ==============
export const useDesignerVersions = (workflowKey?: string) =>
  useQuery({
    queryKey: ["designer-versions", workflowKey],
    queryFn: async () => {
      let q = (supabase.from("workflow_designer_versions" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (workflowKey) q = q.eq("workflow_key", workflowKey);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useSaveDesignerVersion = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      workflow_key: string;
      definition: any;
      change_summary?: string;
      changed_fields?: string[];
      version_label?: string;
      publish?: boolean;
    }) => {
      const { data: existing } = await (supabase
        .from("workflow_designer_versions" as any)
        .select("version_number")
        .eq("workflow_key", input.workflow_key)
        .order("version_number", { ascending: false })
        .limit(1) as any);
      const next = ((existing?.[0]?.version_number as number) ?? 0) + 1;
      const { data, error } = await (supabase
        .from("workflow_designer_versions" as any)
        .insert({
          workflow_key: input.workflow_key,
          version_number: next,
          version_label: input.version_label ?? `v${next}`,
          definition: input.definition,
          change_summary: input.change_summary,
          changed_fields: input.changed_fields,
          status: input.publish ? "published" : "draft",
          published_at: input.publish ? new Date().toISOString() : null,
          published_by: input.publish ? user?.id : null,
          created_by: user?.id,
          created_by_name: user?.email,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["designer-versions"] });
      toast.success("Workflow version saved");
    },
  });
};

// ============== COMPLIANCE AUDIT TRAIL ==============
export interface AuditFilters {
  module?: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  risk_level?: string;
  from?: string;
  to?: string;
}

export const useComplianceAudit = (filters: AuditFilters = {}) =>
  useQuery({
    queryKey: ["compliance-audit", filters],
    queryFn: async () => {
      let q = (supabase.from("compliance_audit_trail" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.module) q = q.eq("module", filters.module);
      if (filters.entity_type) q = q.eq("entity_type", filters.entity_type);
      if (filters.entity_id) q = q.eq("entity_id", filters.entity_id);
      if (filters.actor_id) q = q.eq("actor_id", filters.actor_id);
      if (filters.risk_level) q = q.eq("risk_level", filters.risk_level);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

export const useLogCompliance = () => {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (entry: {
      module: string;
      entity_type: string;
      entity_id?: string;
      entity_reference?: string;
      action: string;
      before_state?: any;
      after_state?: any;
      changed_fields?: string[];
      reason?: string;
      risk_level?: "low" | "medium" | "high" | "critical";
      compliance_tags?: string[];
    }) => {
      const { error } = await (supabase.from("compliance_audit_trail" as any).insert({
        ...entry,
        actor_id: user?.id,
        actor_name: user?.email,
      }) as any);
      if (error) throw error;
    },
  });
};
