import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current logged-in user's employee record.
 */
export function useMyEmployeeProfile() {
  const { user } = useAuth();

  const { data: myEmployee, isLoading } = useQuery({
    queryKey: ['my-employee-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:positions(id, title),
          branch:branches(id, name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  return { myEmployee, isLoading };
}

/**
 * Hook to get employee documents from the employee-documents storage bucket.
 */
export function useMyDocuments(employeeId?: string) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['my-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  return { documents, isLoading };
}
