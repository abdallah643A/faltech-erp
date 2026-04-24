import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface SiteSurvey {
  id: string;
  project_id: string | null;
  sales_order_id: string | null;
  survey_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_estimate: number | null;
  survey_leader_id: string | null;
  customer_contact_name: string | null;
  customer_contact_phone: string | null;
  site_address: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  access_requirements: string | null;
  status: string;
  // Site Dimensions
  site_length: number | null;
  site_width: number | null;
  site_height: number | null;
  floor_type: string | null;
  load_bearing_capacity: number | null;
  ceiling_height: number | null;
  // Power
  voltage: number | null;
  power_phases: string | null;
  frequency: string | null;
  available_load: number | null;
  distance_to_power_source: number | null;
  // Environmental
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
  dust_level: string | null;
  corrosive_environment: boolean;
  hazardous_area_classification: string | null;
  // Infrastructure
  compressed_air_available: boolean;
  water_supply_available: boolean;
  drainage_system: boolean;
  hvac_system: boolean;
  fire_protection: boolean;
  // Access
  entry_width: number | null;
  entry_height: number | null;
  stairway_elevator: string | null;
  loading_dock: boolean;
  crane_available: boolean;
  crane_capacity: number | null;
  // Requirements
  special_requirements: string | null;
  safety_considerations: string | null;
  installation_constraints: string | null;
  existing_equipment_interface: string | null;
  compliance_requirements: string | null;
  // Report
  executive_summary: string | null;
  detailed_findings: string | null;
  recommendations: string | null;
  challenges_identified: string | null;
  proposed_solutions: string | null;
  // Approval
  completed_at: string | null;
  completed_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSurveyPhoto {
  id: string;
  survey_id: string;
  photo_type: string | null;
  file_url: string;
  file_name: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TechnicalSpecification {
  id: string;
  project_id: string | null;
  survey_id: string | null;
  spec_number: string | null;
  document_date: string | null;
  revision_number: number;
  equipment_list: any[];
  system_integration_requirements: string | null;
  performance_criteria: string | null;
  testing_commissioning_requirements: string | null;
  foundation_requirements: string | null;
  electrical_requirements: string | null;
  mechanical_requirements: string | null;
  civil_work_requirements: string | null;
  safety_systems_requirements: string | null;
  deliverables_checklist: any[];
  training_details: string | null;
  documentation_requirements: string | null;
  spare_parts_list: any[];
  warranty_details: string | null;
  review_status: string;
  customer_comments: string | null;
  customer_signatory_name: string | null;
  customer_signature_url: string | null;
  customer_approval_date: string | null;
  tech_manager_approval_by: string | null;
  tech_manager_approval_at: string | null;
  status: string;
  revision_count: number;
  max_revisions: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSiteSurveys(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: surveys, isLoading } = useQuery({
    queryKey: ['site-surveys', projectId, activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('site_surveys').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as SiteSurvey[];
    },
  });

  const createSurvey = useMutation({
    mutationFn: async (survey: Partial<SiteSurvey>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('site_surveys')
        .insert([{ ...survey, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-surveys'] });
      toast({ title: 'Site survey created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating survey', description: error.message, variant: 'destructive' });
    },
  });

  const updateSurvey = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SiteSurvey> & { id: string }) => {
      const { data, error } = await supabase
        .from('site_surveys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-surveys'] });
      toast({ title: 'Survey updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating survey', description: error.message, variant: 'destructive' });
    },
  });

  const completeSurvey = useMutation({
    mutationFn: async (surveyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      
      // Mark survey as completed and auto-approve
      const { data, error } = await supabase
        .from('site_surveys')
        .update({
          status: 'completed',
          completed_at: now,
          completed_by: user?.id,
          approved_by: user?.id,
          approved_at: now,
        })
        .eq('id', surveyId)
        .select()
        .single();
      if (error) throw error;

      // Auto-advance the technical assessment phase if project is linked
      if (data?.project_id) {
        const { error: rpcError } = await supabase.rpc('complete_technical_assessment', {
          p_project_id: data.project_id,
        });
        if (rpcError) {
          console.error('Error advancing phase:', rpcError.message);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['project-phases'] });
      queryClient.invalidateQueries({ queryKey: ['finance-alerts'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error completing survey', description: error.message, variant: 'destructive' });
    },
  });

  const approveSurvey = useMutation({
    mutationFn: async (surveyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('site_surveys')
        .update({
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', surveyId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-surveys'] });
      toast({ title: 'Survey approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error approving survey', description: error.message, variant: 'destructive' });
    },
  });

  return { surveys, isLoading, createSurvey, updateSurvey, completeSurvey, approveSurvey };
}

export function useSurveyPhotos(surveyId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery({
    queryKey: ['survey-photos', surveyId],
    queryFn: async () => {
      if (!surveyId) return [];
      const { data, error } = await supabase
        .from('site_survey_photos')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at');
      if (error) throw error;
      return data as SiteSurveyPhoto[];
    },
    enabled: !!surveyId,
  });

  const uploadPhoto = useMutation({
    mutationFn: async ({ surveyId, file, photoType, description }: {
      surveyId: string; file: File; photoType?: string; description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const fileName = `surveys/${surveyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      const { data, error } = await supabase
        .from('site_survey_photos')
        .insert([{
          survey_id: surveyId,
          photo_type: photoType || null,
          file_url: urlData?.signedUrl || fileName,
          file_name: file.name,
          description: description || null,
          uploaded_by: user?.id,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-photos', surveyId] });
      toast({ title: 'Photo uploaded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error uploading photo', description: error.message, variant: 'destructive' });
    },
  });

  return { photos, isLoading, uploadPhoto };
}

export function useTechnicalSpecifications(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: specs, isLoading } = useQuery({
    queryKey: ['technical-specs', projectId],
    queryFn: async () => {
      let query = supabase.from('technical_specifications').select('*').order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return data as TechnicalSpecification[];
    },
  });

  const createSpec = useMutation({
    mutationFn: async (spec: Partial<TechnicalSpecification>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const specNumber = `SPEC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from('technical_specifications')
        .insert([{ ...spec, spec_number: spec.spec_number || specNumber, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-specs'] });
      toast({ title: 'Specification created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating specification', description: error.message, variant: 'destructive' });
    },
  });

  const updateSpec = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TechnicalSpecification> & { id: string }) => {
      const { data, error } = await supabase
        .from('technical_specifications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-specs'] });
      toast({ title: 'Specification updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating specification', description: error.message, variant: 'destructive' });
    },
  });

  return { specs, isLoading, createSpec, updateSpec };
}
