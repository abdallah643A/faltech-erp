import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects, useProjectMilestones, useProjectMembers } from '@/hooks/useProjects';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useUsers } from '@/hooks/useUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  useProjectPhases, 
  useProjectContracts, 
  useProjectDocuments,
  PHASE_CONFIG,
  ProjectPhase,
} from '@/hooks/useIndustrialProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  FolderKanban,
  BarChart3,
  Calendar,
  Users,
  DollarSign,
  Target,
  Clock,
  Plus,
  Trash2,
  FileSignature,
  Workflow,
  Activity,
  FileText,
  Upload,
  Loader2,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { TaskFormDialog } from '@/components/pm/TaskFormDialog';
import { MilestoneFormDialog } from '@/components/pm/MilestoneFormDialog';
import { BudgetItemDialog } from '@/components/pm/BudgetItemDialog';
import { PhaseTimeline } from '@/components/pm/PhaseTimeline';
import { PhaseApprovalPanel } from '@/components/pm/PhaseApprovalPanel';
import { ContractFormDialog } from '@/components/pm/ContractFormDialog';
import { PaymentTermsManager } from '@/components/pm/PaymentTermsManager';
import { ProjectActivityTimeline } from '@/components/pm/ProjectActivityTimeline';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  on_hold: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ProjectDetails() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks, createTask, updateTask } = useProjectTasks(projectId);
  const { milestones, createMilestone, updateMilestone } = useProjectMilestones(projectId);
  const { members, addMember, removeMember } = useProjectMembers(projectId);
  const { users } = useUsers();
  
  // Industrial project hooks
  const { phases, moveToNextPhase } = useProjectPhases(projectId);
  const { contracts, createContract, isLoading: loadingContracts } = useProjectContracts(projectId);
  const { documents, uploadDocument } = useProjectDocuments(projectId);
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isMilestoneFormOpen, setIsMilestoneFormOpen] = useState(false);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const project = projects?.find(p => p.id === projectId);
  const isIndustrialProject = (project as any)?.project_type === 'industrial';
  const currentPhase = (project as any)?.current_phase || 'sales_initiation';
  const sapSalesOrderId = (project as any)?.sap_sales_order_id;

  // Fetch linked sales order for industrial projects
  const { data: salesOrder } = useQuery({
    queryKey: ['project-sales-order', sapSalesOrderId],
    queryFn: async () => {
      if (!sapSalesOrderId) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', sapSalesOrderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sapSalesOrderId && isIndustrialProject,
  });

  // Fetch payment certificates for industrial projects
  const { data: paymentCertificates } = useQuery({
    queryKey: ['project-payment-certs', sapSalesOrderId],
    queryFn: async () => {
      if (!sapSalesOrderId) return [];
      const { data, error } = await supabase
        .from('payment_certificates')
        .select('*')
        .eq('sales_order_id', sapSalesOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sapSalesOrderId && isIndustrialProject,
  });

  // Fetch incoming payments for industrial projects
  const { data: incomingPayments } = useQuery({
    queryKey: ['project-incoming-payments', sapSalesOrderId],
    queryFn: async () => {
      if (!sapSalesOrderId) return [];
      const { data, error } = await supabase
        .from('incoming_payments')
        .select('*')
        .eq('sales_order_id', sapSalesOrderId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sapSalesOrderId && isIndustrialProject,
  });

  if (!project) {
    return (
      <div className="text-center py-8">
        <p>Project not found</p>
        <Button variant="link" onClick={() => navigate('/pm/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  const taskStats = {
    total: tasks?.length || 0,
    completed: tasks?.filter(t => t.status === 'done').length || 0,
    inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    overdue: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length || 0,
  };

  const totalHours = tasks?.reduce((sum, t) => sum + (t.actual_hours || 0), 0) || 0;
  const estimatedHours = tasks?.reduce((sum, t) => sum + (t.estimated_hours || 0), 0) || 0;

  // Calculate progress from phases for industrial projects
  const industrialProgress = (() => {
    if (!isIndustrialProject || !phases || phases.length === 0) return project.progress;
    const completedPhases = phases.filter(p => p.status === 'completed' || p.status === 'approved').length;
    return Math.round((completedPhases / phases.length) * 100);
  })();

  // Budget data for industrial projects
  const contractValue = isIndustrialProject 
    ? ((project as any)?.contract_value || salesOrder?.contract_value || salesOrder?.total || 0) 
    : project.budget;
  const totalCollected = incomingPayments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    
    await uploadDocument.mutateAsync({
      file,
      projectId,
      phase: currentPhase as ProjectPhase,
      documentType: 'general',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pm/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className={statusColors[project.status]}>
              {project.status.replace('_', ' ')}
            </Badge>
            {isIndustrialProject && (
              <Badge variant="outline" className="border-primary text-primary">
                Industrial Project
              </Badge>
            )}
          </div>
          {project.code && <p className="text-muted-foreground">{project.code}</p>}
          {isIndustrialProject && salesOrder && (
            <p className="text-sm text-muted-foreground mt-1">
              Contract #{salesOrder.contract_number || salesOrder.doc_num} • {salesOrder.customer_name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/pm/kanban/${projectId}`)}>
            <FolderKanban className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button variant="outline" onClick={() => navigate(`/pm/gantt/${projectId}`)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Gantt
          </Button>
        </div>
      </div>

      {/* Phase Timeline for Industrial Projects */}
      {isIndustrialProject && phases && phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Project Lifecycle Phases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PhaseTimeline
              phases={phases}
              currentPhase={currentPhase}
              onPhaseClick={(phase) => {
                const phaseRoutes: Record<string, string> = {
                  sales_initiation: '/sales-orders',
                  finance_verification: '/finance-gates',
                  operations_verification: '/technical-assessment',
                  design_costing: '/design-costing',
                  finance_gate_2: '/finance-gates',
                  procurement: '/material-requests',
                  production: '/manufacturing',
                  final_payment: '/finance-gates',
                  logistics: '/delivery-installation',
                  completed: `/pm/projects/${projectId}`,
                };
                const route = phaseRoutes[phase.phase];
                if (route) navigate(route);
              }}
              onAdvance={(phaseId) => moveToNextPhase.mutate(phaseId)}
              isAdvancing={moveToNextPhase.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{industrialProgress}%</p>
              </div>
            </div>
            <Progress value={industrialProgress} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-2xl font-bold">{taskStats.completed}/{taskStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isIndustrialProject ? 'Phases Done' : 'Hours Logged'}
                </p>
                <p className="text-2xl font-bold">
                  {isIndustrialProject 
                    ? `${phases?.filter(p => p.status === 'completed' || p.status === 'approved').length || 0}/${phases?.length || 0}`
                    : `${totalHours}/${estimatedHours}h`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isIndustrialProject ? 'Collected' : 'Budget Used'}
                </p>
                <p className="text-2xl font-bold">
                  {isIndustrialProject ? (
                    <>
                      {totalCollected.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{contractValue.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <>
                      ${(project.actual_cost || 0).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">
                        /${(project.budget || 0).toLocaleString()}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isIndustrialProject && (
            <>
              <TabsTrigger value="phases">Phases</TabsTrigger>
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </>
          )}
          <TabsTrigger value="tasks">Tasks ({taskStats.total})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones?.length || 0})</TabsTrigger>
          <TabsTrigger value="team">Team ({members?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('common.description')}</p>
                    <p>{project.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                    <p>{project.start_date ? format(new Date(project.start_date), 'PP') : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">End Date</p>
                    <p>{project.end_date ? format(new Date(project.end_date), 'PP') : 'Not set'}</p>
                  </div>
                </div>
                {isIndustrialProject && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Current Phase</p>
                    <Badge variant="outline" className="mt-1">
                      {PHASE_CONFIG[currentPhase as ProjectPhase]?.label || currentPhase}
                    </Badge>
                  </div>
                )}

                {/* Industrial project contract summary */}
                {isIndustrialProject && salesOrder && (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Contract Information</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Customer</span>
                        <p className="font-medium">{salesOrder.customer_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contract #</span>
                        <p className="font-medium">{salesOrder.contract_number || `SO-${salesOrder.doc_num}`}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contract Value</span>
                        <p className="font-medium">{(salesOrder.contract_value || salesOrder.total || 0).toLocaleString()} {salesOrder.currency || 'SAR'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.status')}</span>
                        <Badge variant="outline" className="mt-0.5">{salesOrder.workflow_status || salesOrder.status}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isIndustrialProject ? (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Contract Value</p>
                      <p className="text-xl font-bold">{contractValue.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Collected</p>
                      <p className="text-xl font-bold text-green-600">{totalCollected.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="text-xl font-bold text-orange-600">{(contractValue - totalCollected).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Certificates</p>
                      <p className="text-xl font-bold">{paymentCertificates?.length || 0}</p>
                    </div>
                  </div>
                  <Progress value={contractValue > 0 ? (totalCollected / contractValue) * 100 : 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {contractValue > 0 ? Math.round((totalCollected / contractValue) * 100) : 0}% collected
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks?.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            task.status === 'done' ? 'bg-green-500' : 
                            task.status === 'in_progress' ? 'bg-blue-500' : 'bg-muted-foreground/50'
                          )} />
                          <span className="text-sm">{task.title}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                    {(!tasks || tasks.length === 0) && (
                      <p className="text-muted-foreground text-sm">No tasks yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {isIndustrialProject && (
          <>
            <TabsContent value="phases">
              <div className="grid gap-6 md:grid-cols-2">
                <PhaseApprovalPanel projectId={projectId || ''} currentPhase={currentPhase} />
                <ProjectActivityTimeline projectId={projectId || ''} />
              </div>
            </TabsContent>

            <TabsContent value="contracts">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5" />
                    Contract Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salesOrder ? (
                    <div className="space-y-4">
                      {/* Main Sales Order / Contract */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-lg">
                              {salesOrder.contract_number || `Sales Order #${salesOrder.doc_num}`}
                            </p>
                            <p className="text-sm text-muted-foreground">{salesOrder.customer_name}</p>
                          </div>
                          <Badge>{salesOrder.workflow_status || salesOrder.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Contract Value</span>
                            <p className="font-medium">{(salesOrder.contract_value || salesOrder.total || 0).toLocaleString()} {salesOrder.currency || 'SAR'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Contract Date</span>
                            <p className="font-medium">{salesOrder.contract_date ? format(new Date(salesOrder.contract_date), 'PP') : salesOrder.doc_date ? format(new Date(salesOrder.doc_date), 'PP') : 'N/A'}</p>
                          </div>
                          {salesOrder.contract_signed_date && (
                            <div>
                              <span className="text-muted-foreground">Signed Date</span>
                              <p className="font-medium">{format(new Date(salesOrder.contract_signed_date), 'PP')}</p>
                            </div>
                          )}
                          {salesOrder.payment_terms && (
                            <div>
                              <span className="text-muted-foreground">Payment Terms</span>
                              <p className="font-medium">{salesOrder.payment_terms}</p>
                            </div>
                          )}
                        </div>
                        {salesOrder.scope_of_work && (
                          <div>
                            <span className="text-sm text-muted-foreground">Scope of Work</span>
                            <p className="text-sm mt-1">{salesOrder.scope_of_work}</p>
                          </div>
                        )}
                        {salesOrder.contract_file_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={salesOrder.contract_file_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-2" />
                              View Contract File
                            </a>
                          </Button>
                        )}
                      </div>

                      {/* Additional project contracts if any */}
                      {contracts && contracts.length > 0 && (
                        <>
                          <p className="text-sm font-medium text-muted-foreground mt-4">Additional Contracts</p>
                          {contracts.map((contract) => (
                            <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <p className="font-medium">{contract.contract_number || 'No Number'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {contract.contract_type?.replace('_', ' ')} • {contract.currency} {contract.contract_value.toLocaleString()}
                                </p>
                              </div>
                              {contract.contract_file_url && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={contract.contract_file_url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    View
                                  </a>
                                </Button>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No contract linked to this project.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <div className="space-y-6">
                {/* Payment Certificates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Certificates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {paymentCertificates && paymentCertificates.length > 0 ? (
                      <div className="space-y-3">
                        {paymentCertificates.map((cert: any) => (
                          <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{cert.certificate_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Amount: {(cert.amount || 0).toLocaleString()} • Collected: {(cert.collected_amount || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={
                                cert.collection_status === 'collected' ? 'default' :
                                cert.collection_status === 'partial' ? 'secondary' : 'outline'
                              }>
                                {cert.collection_status || cert.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No payment certificates yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Incoming Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Incoming Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incomingPayments && incomingPayments.length > 0 ? (
                      <div className="space-y-3">
                        {incomingPayments.map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Payment #{payment.doc_num}</p>
                              <p className="text-sm text-muted-foreground">
                                {payment.doc_date ? format(new Date(payment.doc_date), 'PP') : ''} • {payment.payment_type || 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{(payment.total_amount || 0).toLocaleString()}</p>
                              <Badge variant="outline">{payment.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No incoming payments yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </>
        )}

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Tasks</CardTitle>
              <Button size="sm" onClick={() => setIsTaskFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks?.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'in_progress' ? 'bg-blue-500' : 
                        task.status === 'blocked' ? 'bg-red-500' : 'bg-muted-foreground/50'
                      )} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {task.due_date && <span>Due: {format(new Date(task.due_date), 'MMM d')}</span>}
                          {task.assignee && <span>• {task.assignee.full_name || task.assignee.email}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{task.priority}</Badge>
                      <Badge variant="secondary">{task.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
                {(!tasks || tasks.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No tasks yet. Add your first task.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Milestones</CardTitle>
              <Button size="sm" onClick={() => setIsMilestoneFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* For industrial projects, show phases as milestones too */}
                {isIndustrialProject && phases && phases.length > 0 && (
                  <>
                    {phases.map((phase) => {
                      const config = PHASE_CONFIG[phase.phase];
                      return (
                        <div key={phase.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{config?.label || phase.phase}</p>
                            <p className="text-sm text-muted-foreground">{config?.department}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {phase.completed_at && (
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(phase.completed_at), 'MMM d, yyyy')}
                              </span>
                            )}
                            <Badge variant={phase.status === 'completed' || phase.status === 'approved' ? 'default' : 'secondary'}>
                              {phase.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                {milestones?.map((milestone) => (
                  <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{milestone.name}</p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {milestone.due_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      <Badge variant={milestone.status === 'completed' ? 'default' : 'secondary'}>
                        {milestone.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!milestones || milestones.length === 0) && !isIndustrialProject && (
                  <p className="text-center text-muted-foreground py-8">No milestones yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Button size="sm" onClick={() => {}}>
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members?.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.full_name || member.profiles?.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(member.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No team members yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Documents
              </CardTitle>
              <div>
                <input
                  type="file"
                  id="document-upload"
                  className="hidden"
                  onChange={handleDocumentUpload}
                />
                <Button size="sm" asChild>
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </label>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.document_type} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <ProjectActivityTimeline projectId={projectId || ''} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskFormDialog
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        task={null}
        projectId={projectId || ''}
        users={users || []}
        onSubmit={(data) => {
          createTask.mutate({ ...data, project_id: projectId });
          setIsTaskFormOpen(false);
        }}
      />

      <MilestoneFormDialog
        open={isMilestoneFormOpen}
        onOpenChange={setIsMilestoneFormOpen}
        projectId={projectId || ''}
        onSubmit={(data) => {
          createMilestone.mutate({ 
            name: data.name || '', 
            description: data.description, 
            due_date: data.due_date, 
            project_id: projectId || '' 
          });
          setIsMilestoneFormOpen(false);
        }}
      />

      <BudgetItemDialog
        open={isBudgetFormOpen}
        onOpenChange={setIsBudgetFormOpen}
        projectId={projectId || ''}
      />

      {isIndustrialProject && (
        <ContractFormDialog
          open={isContractFormOpen}
          onOpenChange={setIsContractFormOpen}
          projectId={projectId || ''}
          onSubmit={(data) => {
            createContract.mutate({ ...data, project_id: projectId || '' });
            setIsContractFormOpen(false);
          }}
          isSubmitting={createContract.isPending}
        />
      )}
    </div>
  );
}
