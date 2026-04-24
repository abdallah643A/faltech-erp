import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectTask {
  id: string;
  project_id: string;
  milestone_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number;
  actual_hours: number;
  sort_order: number;
  kanban_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string | null; email: string };
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: { full_name: string | null; email: string };
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description: string | null;
  entry_date: string;
  billable: boolean;
  created_at: string;
  user?: { full_name: string | null; email: string };
}

export function useProjectTasks(projectId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('kanban_order');

      if (error) throw error;
      
      // Fetch assignee profiles separately
      const assigneeIds = data.filter(t => t.assignee_id).map(t => t.assignee_id!);
      let profiles: Array<{ user_id: string; full_name: string | null; email: string }> = [];
      if (assigneeIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', assigneeIds);
        profiles = profileData || [];
      }
      
      return data.map(task => ({
        ...task,
        status: task.status as ProjectTask['status'],
        priority: task.priority as ProjectTask['priority'],
        assignee: task.assignee_id ? profiles.find(p => p.user_id === task.assignee_id) : undefined
      })) as ProjectTask[];
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (task: Partial<ProjectTask>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('project_tasks')
        .insert([{ 
          project_id: task.project_id!,
          title: task.title || '',
          description: task.description,
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          assignee_id: task.assignee_id,
          start_date: task.start_date,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours || 0,
          created_by: user?.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast({ title: 'Task created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating task', description: error.message, variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTask> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      delete updateData.assignee; // Remove non-db field
      if (updates.status === 'done' && !updates.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast({ title: 'Task deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting task', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
  };
}

export function useTaskComments(taskId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = data.filter(c => c.user_id).map(c => c.user_id!);
      let profiles: Array<{ user_id: string; full_name: string | null; email: string }> = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profiles = profileData || [];
      }
      
      return data.map(comment => ({
        ...comment,
        user: comment.user_id ? profiles.find(p => p.user_id === comment.user_id) : undefined
      })) as TaskComment[];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{ task_id: taskId, user_id: user?.id, content }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      toast({ title: 'Comment added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding comment', description: error.message, variant: 'destructive' });
    },
  });

  return { comments, isLoading, addComment };
}

export function useTimeEntries(taskId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('task_id', taskId)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      
      // Fetch user profiles separately
      const userIds = data.map(e => e.user_id);
      let profiles: Array<{ user_id: string; full_name: string | null; email: string }> = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profiles = profileData || [];
      }
      
      return data.map(entry => ({
        ...entry,
        user: profiles.find(p => p.user_id === entry.user_id)
      })) as TimeEntry[];
    },
    enabled: !!taskId,
  });

  const addTimeEntry = useMutation({
    mutationFn: async (entry: { task_id: string; hours: number; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{ 
          task_id: entry.task_id, 
          hours: entry.hours, 
          description: entry.description,
          user_id: user?.id! 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] });
      toast({ title: 'Time entry added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding time entry', description: error.message, variant: 'destructive' });
    },
  });

  return { timeEntries, isLoading, addTimeEntry };
}

export function useAllTasks() {
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['all-project-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return { tasks, isLoading, error };
}
