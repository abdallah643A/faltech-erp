import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

function calcGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function calcOverall(f: any): number {
  const delivery = ((f.delivery_on_time_score || 3) + (f.delivery_quantity_score || 3) + (f.delivery_condition_score || 3)) / 3;
  const quality = ((f.quality_spec_compliance_score || 3) + (f.quality_defect_score || 3) + (f.quality_packaging_score || 3)) / 3;
  const prof = ((f.prof_communication_score || 3) + (f.prof_behavior_score || 3) + (f.prof_responsiveness_score || 3)) / 3;
  return Math.round(((delivery * 0.4 + quality * 0.35 + prof * 0.25) / 5) * 100);
}

export function useSupplierFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['supplier-feedback', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_feedback' as any).select('*').order('feedback_date', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const createFeedback = useMutation({
    mutationFn: async (data: any) => {
      const overall = calcOverall(data);
      const grade = calcGrade(overall);
      const needsEscalation = data.is_critical || data.is_safety_related || overall < 40;
      const { data: result, error } = await (supabase.from('supplier_feedback' as any).insert({
        ...data,
        overall_score: overall,
        overall_grade: grade,
        requires_escalation: needsEscalation,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;

      // Auto-escalate critical issues
      if (needsEscalation && result) {
        const escType = data.is_safety_related ? 'safety' : data.is_critical ? 'critical_issue' : 'threshold_breach';
        await (supabase.from('supplier_escalation_log' as any).insert({
          feedback_id: result.id,
          vendor_name: data.vendor_name,
          project_id: data.project_id || null,
          escalation_type: escType,
          severity: data.is_safety_related ? 'critical' : 'high',
          title: `${escType === 'safety' ? '⚠️ SAFETY: ' : '🔴 '}${data.vendor_name} - Score ${overall}/100`,
          description: data.quality_notes || data.delivery_notes || 'Auto-escalated due to low score or critical flag',
          escalated_by: data.submitted_by,
          escalated_by_name: data.submitted_by_name,
          escalated_to: 'procurement_manager',
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        }) as any);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-escalations'] });
      toast({ title: 'Feedback submitted successfully' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { feedbacks, isLoading, createFeedback, calcOverall, calcGrade };
}

export function useSupplierEscalations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ['supplier-escalations', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_escalation_log' as any).select('*').order('created_at', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const updateEscalation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await (supabase.from('supplier_escalation_log' as any).update(data).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-escalations'] });
      toast({ title: 'Escalation updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { escalations, isLoading, updateEscalation };
}

export function useFeedbackResponses(feedbackId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ['feedback-responses', feedbackId],
    enabled: !!feedbackId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('supplier_feedback_responses' as any)
        .select('*').eq('feedback_id', feedbackId).order('responded_at', { ascending: false }) as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const addResponse = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase.from('supplier_feedback_responses' as any).insert(data) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-responses'] });
      toast({ title: 'Response added' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { responses, isLoading, addResponse };
}

export function useMonthlyScoreCards() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['monthly-scorecards', activeCompanyId],
    queryFn: async () => {
      let q = (supabase.from('supplier_monthly_scorecards' as any).select('*')
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const generateScorecard = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      // Fetch all feedbacks for the period
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

      let q = (supabase.from('supplier_feedback' as any).select('*')
        .gte('feedback_date', startDate).lt('feedback_date', endDate) as any);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data: fbs = [] } = await q;

      // Group by vendor+project
      const groups: Record<string, any[]> = {};
      (fbs as any[]).forEach(fb => {
        const key = `${fb.vendor_name}||${fb.project_id || 'all'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(fb);
      });

      // Get previous month scorecards for trend
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      let prevQ = (supabase.from('supplier_monthly_scorecards' as any).select('*')
        .eq('period_month', prevMonth).eq('period_year', prevYear) as any);
      if (activeCompanyId) prevQ = prevQ.eq('company_id', activeCompanyId);
      const { data: prevCards = [] } = await prevQ;
      const prevMap: Record<string, number> = {};
      (prevCards as any[]).forEach(c => { prevMap[c.vendor_name] = c.overall_score; });

      for (const [key, items] of Object.entries(groups)) {
        const [vendorName, projectId] = key.split('||');
        const deliveryAvg = items.reduce((s, f) => s + ((f.delivery_on_time_score + f.delivery_quantity_score + f.delivery_condition_score) / 3), 0) / items.length;
        const qualityAvg = items.reduce((s, f) => s + ((f.quality_spec_compliance_score + f.quality_defect_score + f.quality_packaging_score) / 3), 0) / items.length;
        const profAvg = items.reduce((s, f) => s + ((f.prof_communication_score + f.prof_behavior_score + f.prof_responsiveness_score) / 3), 0) / items.length;
        const overall = Math.round(((deliveryAvg * 0.4 + qualityAvg * 0.35 + profAvg * 0.25) / 5) * 100);
        const prevScore = prevMap[vendorName] || 0;
        const change = prevScore ? overall - prevScore : 0;

        const record = {
          vendor_name: vendorName,
          vendor_code: items[0]?.vendor_code,
          project_id: projectId === 'all' ? null : projectId,
          period_month: month,
          period_year: year,
          delivery_score: Math.round((deliveryAvg / 5) * 100),
          quality_score: Math.round((qualityAvg / 5) * 100),
          professionalism_score: Math.round((profAvg / 5) * 100),
          overall_score: overall,
          grade: calcGrade(overall),
          total_feedbacks: items.length,
          critical_issues: items.filter(f => f.is_critical).length,
          safety_issues: items.filter(f => f.is_safety_related).length,
          escalations: items.filter(f => f.requires_escalation).length,
          score_change_from_prev: change,
          trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
          is_top_performer: overall >= 85,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        };

        // Upsert
        const { data: existing } = await (supabase.from('supplier_monthly_scorecards' as any)
          .select('id').eq('vendor_name', vendorName).eq('period_month', month).eq('period_year', year)
          .maybeSingle() as any);

        if (existing) {
          await (supabase.from('supplier_monthly_scorecards' as any).update(record).eq('id', existing.id) as any);
        } else {
          await (supabase.from('supplier_monthly_scorecards' as any).insert(record) as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-scorecards'] });
      toast({ title: 'Monthly scorecards generated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { scorecards, isLoading, generateScorecard };
}
