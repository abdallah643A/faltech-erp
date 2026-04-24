import { useState } from 'react';
import { useProjects, Project } from '@/hooks/useProjects';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  FolderKanban, 
  Calendar,
  Users,
  DollarSign,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Factory,
} from 'lucide-react';
import { format } from 'date-fns';
import { ProjectFormDialog } from '@/components/pm/ProjectFormDialog';
import { IndustrialProjectFormDialog } from '@/components/pm/IndustrialProjectFormDialog';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function Projects() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isIndustrialFormOpen, setIsIndustrialFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateIndustrial = () => {
    setSelectedProject(null);
    setIsIndustrialFormOpen(true);
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    if ((project as any).project_type === 'industrial') {
      setIsIndustrialFormOpen(true);
    } else {
      setIsFormOpen(true);
    }
  };

  const handleSubmit = (data: Partial<Project>) => {
    if (selectedProject) {
      updateProject.mutate({ id: selectedProject.id, ...data });
    } else {
      createProject.mutate(data);
    }
    setIsFormOpen(false);
  };

  const handleIndustrialSubmit = (data: Partial<Project>) => {
    if (selectedProject) {
      updateProject.mutate({ id: selectedProject.id, ...data });
    } else {
      createProject.mutate(data);
    }
    setIsIndustrialFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(id);
    }
  };

  const stats = {
    total: projects?.length || 0,
    active: projects?.filter(p => p.status === 'in_progress').length || 0,
    completed: projects?.filter(p => p.status === 'completed').length || 0,
    totalBudget: projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.projects')}</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('pm'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/cpms/projects?action=add')}>
                <FolderKanban className="h-4 w-4 mr-2" />
                Standard Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreateIndustrial}>
                <Factory className="h-4 w-4 mr-2" />
                Industrial Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">${stats.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects?.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.code && (
                      <p className="text-sm text-muted-foreground">{project.code}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/pm/projects/${project.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/pm/kanban/${project.id}`)}>
                        <FolderKanban className="h-4 w-4 mr-2" />
                        Kanban Board
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[project.status]}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                      {(project as any).project_type === 'industrial' && (
                        <Badge variant="outline" className="text-[10px]">
                          <Factory className="h-3 w-3 mr-1" />
                          Industrial
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{project.progress}%</span>
                  </div>
                  
                  <Progress value={project.progress} className="h-2" />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {project.start_date && format(new Date(project.start_date), 'MMM d')}
                      {project.start_date && project.end_date && ' - '}
                      {project.end_date && format(new Date(project.end_date), 'MMM d, yyyy')}
                    </span>
                    {project.budget > 0 && <span>${project.budget.toLocaleString()}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredProjects?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No projects found. Create your first project to get started.
            </div>
          )}
        </div>
      )}

      <ProjectFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        project={selectedProject}
        onSubmit={handleSubmit}
      />

      <IndustrialProjectFormDialog
        open={isIndustrialFormOpen}
        onOpenChange={setIsIndustrialFormOpen}
        project={selectedProject}
        onSubmit={handleIndustrialSubmit}
        isSubmitting={createProject.isPending || updateProject.isPending}
      />
    </div>
  );
}
