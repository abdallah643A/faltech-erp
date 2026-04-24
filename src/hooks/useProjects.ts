import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useActiveCompany } from '@/hooks/useActiveCompany';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  budget: number;
  actual_cost: number;
  progress: number;
  business_partner_id: string | null;
  opportunity_id: string | null;
  manager_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  hourly_rate: number;
  allocated_hours: number;
  joined_at: string;
  profile?: { full_name: string | null; email: string };
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      return data as Project[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          name: project.name || '',
          description: project.description,
          code: project.code,
          status: project.status || 'planning',
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget || 0,
          created_by: user?.id, 
          manager_id: user?.id,
          ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating project', description: error.message, variant: 'destructive' });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating project', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Project deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' });
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useProjectMembers(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);
      
      return data.map(member => ({
        ...member,
        profile: profiles?.find(p => p.user_id === member.user_id)
      })) as ProjectMember[];
    },
    enabled: !!projectId,
  });

  const addMember = useMutation({
    mutationFn: async (member: { project_id: string; user_id: string; role?: string }) => {
      const { data, error } = await supabase
        .from('project_members')
        .insert([member])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast({ title: 'Member added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding member', description: error.message, variant: 'destructive' });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      toast({ title: 'Member removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error removing member', description: error.message, variant: 'destructive' });
    },
  });

  return { members, isLoading, addMember, removeMember };
}

export function useProjectMilestones(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order');

      if (error) throw error;
      return data as ProjectMilestone[];
    },
    enabled: !!projectId,
  });

  const createMilestone = useMutation({
    mutationFn: async (milestone: { project_id: string; name: string; description?: string; due_date?: string }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert([milestone])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      toast({ title: 'Milestone created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating milestone', description: error.message, variant: 'destructive' });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectMilestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      toast({ title: 'Milestone updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating milestone', description: error.message, variant: 'destructive' });
    },
  });

  return { milestones, isLoading, createMilestone, updateMilestone };
}
