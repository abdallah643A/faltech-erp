import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Questionnaire {
  id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  description_ar: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  questionnaire_id: string;
  question_text: string;
  question_text_ar: string | null;
  question_type: string;
  options: string[];
  sort_order: number;
  is_required: boolean;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  questionnaire_id: string;
  token: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_phone: string | null;
  customer_code: string | null;
  sent_by: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface SurveyAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_rating: number | null;
  answer_choice: string | null;
  created_at: string;
}

export function useQuestionnaires() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const questionnairesQuery = useQuery({
    queryKey: ['survey_questionnaires', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('survey_questionnaires')
        .select('*')
        .order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Questionnaire[];
    },
  });

  const createQuestionnaire = useMutation({
    mutationFn: async (q: Partial<Questionnaire>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('survey_questionnaires')
        .insert({ ...q, created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}) } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questionnaires'] });
      toast({ title: 'Questionnaire created' });
    },
  });

  const updateQuestionnaire = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Questionnaire> & { id: string }) => {
      const { error } = await supabase
        .from('survey_questionnaires')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questionnaires'] });
      toast({ title: 'Questionnaire updated' });
    },
  });

  const deleteQuestionnaire = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('survey_questionnaires').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questionnaires'] });
      toast({ title: 'Questionnaire deleted' });
    },
  });

  return { questionnairesQuery, createQuestionnaire, updateQuestionnaire, deleteQuestionnaire };
}

export function useQuestions(questionnaireId: string | null) {
  const queryClient = useQueryClient();

  const questionsQuery = useQuery({
    queryKey: ['survey_questions', questionnaireId],
    queryFn: async () => {
      if (!questionnaireId) return [];
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('sort_order');
      if (error) throw error;
      return data as SurveyQuestion[];
    },
    enabled: !!questionnaireId,
  });

  const saveQuestion = useMutation({
    mutationFn: async (q: Partial<SurveyQuestion> & { questionnaire_id: string }) => {
      if (q.id) {
        const { id, ...rest } = q;
        const { error } = await supabase.from('survey_questions').update(rest as any).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('survey_questions').insert(q as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions', questionnaireId] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('survey_questions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_questions', questionnaireId] });
    },
  });

  return { questionsQuery, saveQuestion, deleteQuestion };
}

export function useSurveyResponses(questionnaireId: string | null) {
  const queryClient = useQueryClient();

  const responsesQuery = useQuery({
    queryKey: ['survey_responses', questionnaireId],
    queryFn: async () => {
      if (!questionnaireId) return [];
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SurveyResponse[];
    },
    enabled: !!questionnaireId,
  });

  const createResponse = useMutation({
    mutationFn: async (r: { questionnaire_id: string; respondent_name?: string; respondent_email?: string; respondent_phone?: string; customer_code?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('survey_responses')
        .insert({ ...r, sent_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as SurveyResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey_responses', questionnaireId] });
      toast({ title: 'Survey link created' });
    },
  });

  return { responsesQuery, createResponse };
}

export function useSurveyAnswers(responseIds: string[]) {
  return useQuery({
    queryKey: ['survey_answers', responseIds],
    queryFn: async () => {
      if (!responseIds.length) return [];
      const { data, error } = await supabase
        .from('survey_answers')
        .select('*')
        .in('response_id', responseIds);
      if (error) throw error;
      return data as SurveyAnswer[];
    },
    enabled: responseIds.length > 0,
  });
}
