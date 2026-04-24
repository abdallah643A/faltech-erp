import { useState } from 'react';
import type { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { OpportunitySAPDialog } from '@/components/opportunities/OpportunitySAPDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function ConvertToOpportunityDialog({ open, onOpenChange, lead }: Props) {
  const { user, profile } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: allBPs = [] } = useQuery({
    queryKey: ['bp-for-convert-lead'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_partners').select('*').order('card_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['sales-employees-for-convert'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales_employees').select('id, slp_name, slp_code').eq('is_active', true).order('slp_name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; slp_name: string; slp_code: number }>;
    },
    enabled: open,
  });

  // Build a pre-populated opportunity object from the lead
  const prefilledOpportunity = lead ? {
    id: '',
    name: `${lead.card_name} - Opportunity`,
    company: lead.card_name,
    business_partner_id: lead.id,
    value: 0,
    probability: 20,
    stage: 'Discovery',
    expected_close: null,
    owner_id: lead.assigned_to || user?.id || null,
    owner_name: profile?.full_name || null,
    notes: `Converted from lead: ${lead.card_name}`,
    created_by: user?.id || null,
    created_at: '',
    updated_at: '',
    contact_person: lead.contact_person || null,
    industry: (lead as any).industry || null,
    source: (lead as any).source || null,
    territory: null,
    interest_field: null,
    closing_type: null,
    reason: null,
    remarks: null,
    start_date: new Date().toISOString().split('T')[0],
    project_code: null,
    customer_code: null,
    sales_employee_code: null,
    sap_doc_entry: null,
    sync_status: null,
    last_synced_at: null,
    weighted_amount: null,
    max_local_total: null,
    current_stage_no: null,
    branch_id: null,
    company_id: activeCompanyId || null,
  } : null;

  const handleSave = async (formData: any) => {
    if (!lead) return;
    setSaving(true);
    try {
      const { error: oppError } = await supabase.from('opportunities').insert({
        name: formData.name,
        company: formData.company,
        business_partner_id: lead.id,
        stage: formData.stage,
        value: parseFloat(formData.value) || 0,
        probability: parseInt(formData.probability) || 20,
        expected_close: formData.expected_close || null,
        owner_id: lead.assigned_to || user?.id,
        owner_name: formData.owner_name || profile?.full_name || null,
        created_by: user?.id,
        notes: formData.notes || `Converted from lead: ${lead.card_name}`,
        contact_person: formData.contact_person || lead.contact_person,
        ...(formData.industry ? { industry: formData.industry } : {}),
        ...(formData.source ? { source: formData.source } : {}),
        ...(formData.interest_field ? { interest_field: formData.interest_field } : {}),
        ...(formData.closing_type ? { closing_type: formData.closing_type } : {}),
        ...(formData.start_date ? { start_date: formData.start_date } : {}),
        ...(formData.remarks ? { remarks: formData.remarks } : {}),
        ...(formData.sales_employee_code ? { sales_employee_code: parseInt(formData.sales_employee_code) } : {}),
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      });
      if (oppError) throw oppError;

      await supabase.from('business_partners').update({ card_type: 'customer', status: 'active' }).eq('id', lead.id);

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({ title: 'Lead Converted', description: `${lead.card_name} converted to opportunity successfully.` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <OpportunitySAPDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="edit"
      opportunity={prefilledOpportunity as any}
      allBPs={allBPs}
      salesEmployees={salesEmployees}
      onSave={handleSave}
      isPending={saving}
      defaultOwnerName={profile?.full_name}
    />
  );
}
