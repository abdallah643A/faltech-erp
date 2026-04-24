import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  status: string | null;
}

export function useUsers(activeOnly: boolean = true) {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users-profiles', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, user_id, email, full_name, department, status')
        .order('full_name', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('status', 'active');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  return {
    users,
    isLoading,
    error,
  };
}
