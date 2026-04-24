import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const c = supabase as any;

/* ======= RECRUITMENT ======= */
export const useRequisitions = () => useQuery({
  queryKey: ["hr-requisitions"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_job_requisitions").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useCandidates = (requisitionId?: string) => useQuery({
  queryKey: ["hr-candidates", requisitionId],
  queryFn: async () => {
    let q = c.from("hr_candidates").select("*").order("created_at", { ascending: false });
    if (requisitionId) q = q.eq("requisition_id", requisitionId);
    const { data, error } = await q;
    if (error) throw error;
    return data as any[];
  },
});

export const useCreateRequisition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await c.from("hr_job_requisitions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-requisitions"] }); toast.success("Requisition created"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMoveCandidateStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, status }: { id: string; stage: string; status?: string }) => {
      const { error } = await c.from("hr_candidates").update({ current_stage: stage, ...(status ? { status } : {}) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-candidates"] }),
  });
};

/* ======= ONBOARDING ======= */
export const useOnboardingInstances = () => useQuery({
  queryKey: ["hr-onboarding-instances"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_onboarding_instances")
      .select("*, employees(first_name, last_name, employee_code), hr_onboarding_templates(template_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useOnboardingTasks = (instanceId?: string) => useQuery({
  queryKey: ["hr-onboarding-tasks", instanceId],
  enabled: !!instanceId,
  queryFn: async () => {
    const { data, error } = await c.from("hr_onboarding_tasks").select("*")
      .eq("instance_id", instanceId).order("task_order");
    if (error) throw error;
    return data as any[];
  },
});

export const useCompleteOnboardingTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await c.from("hr_onboarding_tasks").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
        notes,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-onboarding-tasks"] }); toast.success("Task completed"); },
  });
};

/* ======= ATTENDANCE EXCEPTIONS ======= */
export const useAttendanceExceptions = (status?: string) => useQuery({
  queryKey: ["hr-attendance-exceptions", status],
  queryFn: async () => {
    let q = c.from("hr_attendance_exceptions")
      .select("*, employees(first_name, last_name, employee_code)")
      .order("exception_date", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data as any[];
  },
});

export const useResolveException = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "approved" | "rejected"; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await c.from("hr_attendance_exceptions").update({
        status, resolution_notes: notes, resolved_at: new Date().toISOString(), resolved_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-attendance-exceptions"] }); toast.success("Exception resolved"); },
  });
};

/* ======= PAYROLL ======= */
export const usePayrollRuns = () => useQuery({
  queryKey: ["hr-payroll-runs"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_payroll_runs").select("*").order("pay_date", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const usePayrollAuditLog = (runId?: string) => useQuery({
  queryKey: ["hr-payroll-audit", runId],
  enabled: !!runId,
  queryFn: async () => {
    const { data, error } = await c.from("hr_payroll_audit_log").select("*")
      .eq("payroll_run_id", runId).order("performed_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useUpdatePayrollStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const update: any = { status };
      if (status === "approved") { update.approved_at = new Date().toISOString(); update.approved_by = user?.id; }
      if (status === "posted") { update.posted_at = new Date().toISOString(); update.posted_by = user?.id; }
      const { error } = await c.from("hr_payroll_runs").update(update).eq("id", id);
      if (error) throw error;
      if (reason) {
        await c.from("hr_payroll_audit_log").insert({
          payroll_run_id: id, action: "note", performed_by: user?.id, reason,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["hr-payroll-audit"] });
      toast.success("Payroll status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ======= ESS / MSS ======= */
export const useMyESSRequests = (employeeId?: string) => useQuery({
  queryKey: ["hr-ess-requests", employeeId],
  enabled: !!employeeId,
  queryFn: async () => {
    const { data, error } = await c.from("hr_self_service_requests").select("*")
      .eq("employee_id", employeeId).order("submitted_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useMSSPendingApprovals = (approverId?: string) => useQuery({
  queryKey: ["hr-mss-pending", approverId],
  enabled: !!approverId,
  queryFn: async () => {
    const { data, error } = await c.from("hr_self_service_requests")
      .select("*, employees(first_name, last_name, employee_code)")
      .eq("current_approver_id", approverId)
      .in("status", ["submitted", "in_review"])
      .order("submitted_at");
    if (error) throw error;
    return data as any[];
  },
});

export const useSubmitESSRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data, error } = await c.from("hr_self_service_requests").insert({ ...input, status: "submitted" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-ess-requests"] }); toast.success("Request submitted"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDecideESSRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, remarks }: { id: string; decision: "approved" | "rejected"; remarks?: string }) => {
      const { error } = await c.from("hr_self_service_requests").update({
        status: decision, remarks, completed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-mss-pending"] }); toast.success("Decision recorded"); },
  });
};

/* ======= LEAVE ENCASHMENT ======= */
export const useLeaveEncashments = () => useQuery({
  queryKey: ["hr-leave-encashments"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_leave_encashments")
      .select("*, employees(first_name, last_name, employee_code)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

/* ======= APPRAISALS / 9-BOX ======= */
export const useAppraisalCycles = () => useQuery({
  queryKey: ["hr-appraisal-cycles"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_appraisal_cycles").select("*").order("fiscal_year", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useAppraisals = (cycleId?: string) => useQuery({
  queryKey: ["hr-appraisals", cycleId],
  enabled: !!cycleId,
  queryFn: async () => {
    const { data, error } = await c.from("hr_appraisals")
      .select("*, employees(first_name, last_name, employee_code, department_id)")
      .eq("cycle_id", cycleId);
    if (error) throw error;
    return data as any[];
  },
});

export const useCalibrationAdjust = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      session_id: string; appraisal_id: string;
      original_rating?: number; adjusted_rating?: number;
      original_nine_box?: number; adjusted_nine_box: number;
      rationale: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // 1. record the adjustment
      const { error: e1 } = await c.from("hr_appraisal_calibration_adjustments").insert({
        ...params, adjusted_by: user?.id,
      });
      if (e1) throw e1;
      // 2. apply to appraisal
      const { error: e2 } = await c.from("hr_appraisals").update({
        calibrated_nine_box_cell: params.adjusted_nine_box,
        ...(params.adjusted_rating != null ? { final_rating: params.adjusted_rating } : {}),
      }).eq("id", params.appraisal_id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-appraisals"] });
      toast.success("Calibration recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ======= STATUTORY ======= */
export const useStatutoryConfigs = () => useQuery({
  queryKey: ["hr-statutory-configs"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_statutory_configs").select("*").order("country_code");
    if (error) throw error;
    return data as any[];
  },
});

export const useStatutoryFilings = () => useQuery({
  queryKey: ["hr-statutory-filings"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_statutory_filings").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

/* ======= WORKFORCE PLANNING ======= */
export const useWorkforcePlans = () => useQuery({
  queryKey: ["hr-workforce-plans"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_workforce_plans").select("*").order("fiscal_year", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});

export const useWorkforceGap = (planId?: string) => useQuery({
  queryKey: ["hr-workforce-gap", planId],
  enabled: !!planId,
  queryFn: async () => {
    const { data, error } = await c.from("v_hr_workforce_gap").select("*").eq("plan_id", planId);
    if (error) throw error;
    return data as any[];
  },
});

/* ======= COMPETENCY MATRICES ======= */
export const useCompetencyMatrices = () => useQuery({
  queryKey: ["hr-competency-matrices"],
  queryFn: async () => {
    const { data, error } = await c.from("hr_competency_matrices")
      .select("*, hr_competency_matrix_requirements(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },
});
