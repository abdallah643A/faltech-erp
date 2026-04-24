-- Create project status enum
CREATE TYPE public.project_status AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'blocked');

-- Create task priority enum
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  status project_status DEFAULT 'planning',
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  budget NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  business_partner_id UUID REFERENCES public.business_partners(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Project members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  hourly_rate NUMERIC DEFAULT 0,
  allocated_hours NUMERIC DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Project milestones table
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Project tasks table
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours NUMERIC DEFAULT 0,
  actual_hours NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  kanban_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Task dependencies table
CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE NOT NULL,
  depends_on_task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(task_id, depends_on_task_id)
);

-- Task comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Project budget items table
CREATE TABLE public.project_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  planned_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.project_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hours NUMERIC NOT NULL CHECK (hours > 0),
  description TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies (all authenticated users can view)
CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers and admins can update projects"
  ON public.projects FOR UPDATE
  USING (manager_id = auth.uid() OR created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Only admins can delete projects"
  ON public.projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Project members RLS policies
CREATE POLICY "Authenticated users can view project members"
  ON public.project_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can manage members"
  ON public.project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_members.project_id 
      AND (p.manager_id = auth.uid() OR p.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Milestones RLS policies
CREATE POLICY "Authenticated users can view milestones"
  ON public.project_milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can manage milestones"
  ON public.project_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_milestones.project_id 
      AND (p.manager_id = auth.uid() OR p.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Tasks RLS policies
CREATE POLICY "Authenticated users can view tasks"
  ON public.project_tasks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tasks"
  ON public.project_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Task assignees and project managers can update tasks"
  ON public.project_tasks FOR UPDATE
  USING (
    assignee_id = auth.uid() 
    OR created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_tasks.project_id 
      AND (p.manager_id = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

CREATE POLICY "Project managers can delete tasks"
  ON public.project_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_tasks.project_id 
      AND (p.manager_id = auth.uid() OR p.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Task dependencies RLS
CREATE POLICY "Authenticated users can view dependencies"
  ON public.task_dependencies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage dependencies"
  ON public.task_dependencies FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Task comments RLS
CREATE POLICY "Authenticated users can view comments"
  ON public.task_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments"
  ON public.task_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments or admins"
  ON public.task_comments FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Budget items RLS
CREATE POLICY "Authenticated users can view budget items"
  ON public.project_budget_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Project managers can manage budget"
  ON public.project_budget_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_budget_items.project_id 
      AND (p.manager_id = auth.uid() OR p.created_by = auth.uid() OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]))
    )
  );

-- Time entries RLS
CREATE POLICY "Authenticated users can view time entries"
  ON public.time_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own time entries"
  ON public.time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time entries or admins"
  ON public.time_entries FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_budget_items_updated_at
  BEFORE UPDATE ON public.project_budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_manager ON public.projects(manager_id);
CREATE INDEX idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_project_tasks_assignee ON public.project_tasks(assignee_id);
CREATE INDEX idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id);