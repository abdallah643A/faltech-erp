import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Lead {
  id: string;
  card_code: string;
  card_name: string;
  card_type: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  source: string | null;
  score: number | null;
  status: string | null;
  assigned_to: string | null;
  notes: string | null;
  last_contact: string | null;
  contact_person: string | null;
  tax_id: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  website: string | null;
  group_code: string | null;
  currency: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Aliases for backward compat
  name: string;
  company: string;
}

export interface LeadInput {
  card_name: string;
  card_type?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  source?: string;
  status?: string;
  assigned_to?: string;
  notes?: string;
  contact_person?: string;
  tax_id?: string;
  billing_address?: string;
  shipping_address?: string;
  website?: string;
  group_code?: string;
  currency?: string;
  payment_terms?: string;
  credit_limit?: number;
}

const normalizeBusinessPartnerStatus = (status?: string | null): 'active' | 'inactive' | 'blocked' => {
  const value = status?.trim().toLowerCase();

  if (!value) return 'active';
  if (['blocked', 'blacklisted'].includes(value)) return 'blocked';
  if (['inactive', 'lost', 'closed', 'rejected'].includes(value)) return 'inactive';

  return 'active';
};

/**
 * Auto-calculate lead engagement score (0-100) based on available signals.
 * Used when no AI score exists yet.
 */
const calculateEngagementScore = (bp: any, activityDates: string[]): number => {
  let score = 0;

  // Data completeness (up to 25 points)
  if (bp.email) score += 8;
  if (bp.phone || bp.mobile) score += 7;
  if (bp.contact_person) score += 5;
  if (bp.website) score += 5;

  // Activity engagement (up to 40 points)
  const activityCount = activityDates.length;
  if (activityCount >= 5) score += 25;
  else if (activityCount >= 3) score += 20;
  else if (activityCount >= 1) score += 12;

  // Activity recency (up to 15 points)
  if (activityDates.length > 0) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(activityDates[0]).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast <= 3) score += 15;
    else if (daysSinceLast <= 7) score += 12;
    else if (daysSinceLast <= 14) score += 8;
    else if (daysSinceLast <= 30) score += 4;
  }

  // Lead age freshness (up to 10 points) - newer leads get more points
  if (bp.created_at) {
    const daysOld = Math.floor(
      (Date.now() - new Date(bp.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysOld <= 7) score += 10;
    else if (daysOld <= 30) score += 7;
    else if (daysOld <= 90) score += 3;
  }

  // Source quality (up to 10 points)
  const highValueSources = ['referral', 'direct', 'linkedin'];
  const mediumValueSources = ['website', 'trade show'];
  const sourceLower = (bp.source || '').toLowerCase();
  if (highValueSources.some(s => sourceLower.includes(s))) score += 10;
  else if (mediumValueSources.some(s => sourceLower.includes(s))) score += 6;
  else if (bp.source) score += 3;

  return Math.min(score, 100);
};

export function useLeads() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('business_partners')
        .select('*, activities(created_at)')
        .eq('card_type', 'lead')
        .order('created_at', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((bp: any) => {
        // Find the latest activity date
        const activityDates = (bp.activities || [])
          .map((a: any) => a.created_at)
          .filter(Boolean)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
        const lastActivity = activityDates.length > 0 ? activityDates[0] : null;
        
        // Auto-calculate engagement score if no AI score exists
        const autoScore = calculateEngagementScore(bp, activityDates);
        
        const { activities: _, ...bpData } = bp;
        return {
          ...bpData,
          score: bp.score && bp.score > 0 ? bp.score : autoScore,
          name: bp.card_name,
          company: bp.card_name,
          last_contact: lastActivity,
        };
      }) as unknown as Lead[];
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: LeadInput) => {
      // Generate next card code by finding max existing lead code
      const { data: maxLead } = await supabase
        .from('business_partners')
        .select('card_code')
        .like('card_code', 'L%')
        .order('card_code', { ascending: false })
        .limit(1)
        .single();
      
      const lastNum = maxLead?.card_code ? parseInt(maxLead.card_code.replace('L', ''), 10) : 0;
      const nextCode = `L${String(lastNum + 1).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('business_partners')
        .insert({
          card_code: nextCode,
          card_name: lead.card_name,
          card_type: 'lead',
          email: lead.email || null,
          phone: lead.phone || null,
          mobile: lead.mobile || null,
          contact_person: lead.contact_person || null,
          tax_id: lead.tax_id || null,
          billing_address: lead.billing_address || null,
          shipping_address: lead.shipping_address || null,
          website: lead.website || null,
          group_code: lead.group_code || null,
          currency: lead.currency || 'SAR',
          payment_terms: lead.payment_terms || null,
          credit_limit: lead.credit_limit || 0,
          status: normalizeBusinessPartnerStatus(lead.status),
          assigned_to: lead.assigned_to || user?.id,
          created_by: user?.id,
          source: lead.source || null,
          notes: lead.notes || null,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({
        title: "Lead Created",
        description: "The lead has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadInput> & { id: string }) => {
      const normalizedUpdates = {
        ...updates,
        ...(updates.status !== undefined ? { status: normalizeBusinessPartnerStatus(updates.status) } : {}),
      };

      const { data, error } = await supabase
        .from('business_partners')
        .update(normalizedUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({
        title: "Lead Updated",
        description: "The lead has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_partners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      toast({
        title: "Lead Deleted",
        description: "The lead has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const convertToOpportunity = useMutation({
    mutationFn: async (lead: Lead) => {
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          name: `${lead.card_name} - Opportunity`,
          company: lead.card_name,
          business_partner_id: lead.id,
          stage: 'Discovery',
          value: 0,
          probability: 50,
          owner_id: lead.assigned_to || user?.id,
          created_by: user?.id,
          notes: `Converted from lead: ${lead.card_name}\n${lead.notes || ''}`,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        })
        .select()
        .single();
      
      if (oppError) throw oppError;

      // Update the business partner type to customer
      const { error: updateError } = await supabase
        .from('business_partners')
        .update({ card_type: 'customer', status: 'active' })
        .eq('id', lead.id);
      
      if (updateError) throw updateError;

      return opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast({
        title: "Lead Converted",
        description: "The lead has been converted to an opportunity.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    convertToOpportunity,
  };
}
