import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  MoreVertical,
  GitBranch,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialWorkflowsData = [
  {
    id: 1,
    name: 'Sales Order Approval',
    module: 'Sales Orders',
    description: 'Multi-level approval for sales orders above SAR 50,000',
    status: 'Active',
    steps: [
      { order: 1, role: 'Sales Manager', action: 'Approve', status: 'required' },
      { order: 2, role: 'Finance Manager', action: 'Approve', status: 'required' },
      { order: 3, role: 'General Manager', action: 'Final Approve', status: 'conditional', condition: 'Amount > 100,000' },
    ],
    triggerCondition: 'Amount > 50,000',
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'Asset Purchase Request',
    module: 'Assets',
    description: '4-level approval chain for asset purchases',
    status: 'Active',
    steps: [
      { order: 1, role: 'Manager', action: 'Approve', status: 'required' },
      { order: 2, role: 'Head Manager', action: 'Approve', status: 'required' },
      { order: 3, role: 'IT Manager', action: 'Technical Approve', status: 'required' },
      { order: 4, role: 'Finance Manager', action: 'Budget Approve', status: 'required' },
    ],
    triggerCondition: 'All Purchase Requests',
    createdAt: '2024-01-05',
  },
  {
    id: 3,
    name: 'Incoming Payment Verification',
    module: 'Incoming Payments',
    description: 'Verification workflow for incoming payments',
    status: 'Active',
    steps: [
      { order: 1, role: 'Accountant', action: 'Verify', status: 'required' },
      { order: 2, role: 'Finance Manager', action: 'Approve', status: 'required' },
    ],
    triggerCondition: 'Amount > 10,000',
    createdAt: '2024-01-08',
  },
  {
    id: 4,
    name: 'Lead Assignment',
    module: 'Leads',
    description: 'Auto-assignment workflow for new leads',
    status: 'Inactive',
    steps: [
      { order: 1, role: 'Sales Manager', action: 'Review & Assign', status: 'required' },
    ],
    triggerCondition: 'New Lead Created',
    createdAt: '2024-01-12',
  },
];

const modules = [
  'Leads',
  'Opportunities',
  'Business Partners',
  'Activities',
  'Tasks',
  'Targets',
  'Assets',
  'IT Service',
  'Sales Orders',
  'Incoming Payments',
];

const roles = [
  'Manager',
  'Head Manager',
  'Sales Manager',
  'Finance Manager',
  'IT Manager',
  'General Manager',
  'Accountant',
  'Admin',
];

export default function Workflow() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState(initialWorkflowsData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    module: '',
    description: '',
    triggerCondition: '',
    steps: [{ order: 1, role: '', action: 'Approve', status: 'required' }],
  });

  const handleAddStep = () => {
    setNewWorkflow({
      ...newWorkflow,
      steps: [
        ...newWorkflow.steps,
        { order: newWorkflow.steps.length + 1, role: '', action: 'Approve', status: 'required' },
      ],
    });
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = newWorkflow.steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      order: i + 1,
    }));
    setNewWorkflow({ ...newWorkflow, steps: updatedSteps });
  };

  const handleUpdateStep = (index: number, field: string, value: string) => {
    const updatedSteps = newWorkflow.steps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    );
    setNewWorkflow({ ...newWorkflow, steps: updatedSteps });
  };

  const handleAddWorkflow = () => {
  const { t } = useLanguage();

    if (!newWorkflow.name || !newWorkflow.module || newWorkflow.steps.some((s) => !s.role)) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const workflow = {

      id: workflows.length + 1,
      name: newWorkflow.name,
      module: newWorkflow.module,
      description: newWorkflow.description,
      status: 'Active',
      steps: newWorkflow.steps,
      triggerCondition: newWorkflow.triggerCondition || 'All Records',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setWorkflows([workflow, ...workflows]);
    setNewWorkflow({
      name: '',
      module: '',
      description: '',
      triggerCondition: '',
      steps: [{ order: 1, role: '', action: 'Approve', status: 'required' }],
    });
    setIsDialogOpen(false);

    toast({
      title: language === 'ar' ? 'تم بنجاح' : 'Success',
      description: language === 'ar' ? 'تم إنشاء سير العمل بنجاح' : 'Workflow created successfully',
    });
  };

  const handleToggleStatus = (id: number) => {
    setWorkflows(workflows.map((w) =>
      w.id === id ? { ...w, status: w.status === 'Active' ? 'Inactive' : 'Active' } : w
    ));
  };

  const handleDeleteWorkflow = (id: number) => {
    setWorkflows(workflows.filter((w) => w.id !== id));
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Deleted',
      description: language === 'ar' ? 'تم حذف سير العمل' : 'Workflow deleted',
    });
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'إدارة سير العمل' : 'Workflow Management'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تكوين وإدارة عمليات الموافقة والأتمتة' : 'Configure and manage approval processes and automation'}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إنشاء سير عمل' : 'Create Workflow'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'إنشاء سير عمل جديد' : 'Create New Workflow'}</DialogTitle>
              <DialogDescription>
                {language === 'ar' ? 'حدد خطوات الموافقة والشروط' : 'Define approval steps and conditions'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {language === 'ar' ? 'الاسم' : 'Name'} *
                </Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="module" className="text-right">
                  {language === 'ar' ? 'الوحدة' : 'Module'} *
                </Label>
                <Select
                  value={newWorkflow.module}
                  onValueChange={(value) => setNewWorkflow({ ...newWorkflow, module: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={language === 'ar' ? 'اختر الوحدة' : 'Select module'} />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="trigger" className="text-right">
                  {language === 'ar' ? 'الشرط' : 'Trigger'}
                </Label>
                <Input
                  id="trigger"
                  value={newWorkflow.triggerCondition}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, triggerCondition: e.target.value })}
                  className="col-span-3"
                  placeholder={language === 'ar' ? 'مثال: المبلغ > 50000' : 'e.g., Amount > 50000'}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  {language === 'ar' ? 'الوصف' : 'Description'}
                </Label>
                <Textarea
                  id="description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  className="col-span-3"
                />
              </div>

              {/* Approval Steps */}
              <div className="col-span-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>{language === 'ar' ? 'خطوات الموافقة' : 'Approval Steps'}</Label>
                  <Button variant="outline" size="sm" onClick={handleAddStep}>
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'إضافة خطوة' : 'Add Step'}
                  </Button>
                </div>
                <div className="space-y-3">
                  {newWorkflow.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Badge variant="outline">{step.order}</Badge>
                      <Select
                        value={step.role}
                        onValueChange={(value) => handleUpdateStep(index, 'role', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={language === 'ar' ? 'اختر الدور' : 'Select role'} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={step.action}
                        onValueChange={(value) => handleUpdateStep(index, 'action', value)}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Approve">{language === 'ar' ? 'موافقة' : 'Approve'}</SelectItem>
                          <SelectItem value="Review">{language === 'ar' ? 'مراجعة' : 'Review'}</SelectItem>
                          <SelectItem value="Verify">{language === 'ar' ? 'تحقق' : 'Verify'}</SelectItem>
                        </SelectContent>
                      </Select>
                      {newWorkflow.steps.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStep(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddWorkflow}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-info mt-0.5" />
            <div>
              <p className="font-medium text-info">
                {language === 'ar' ? 'كيف يعمل سير العمل' : 'How Workflows Work'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'عند تفعيل سير العمل على وحدة معينة، ستكون جميع السجلات الجديدة في وضع المسودة حتى اكتمال جميع الموافقات المطلوبة.'
                  : 'When a workflow is active on a module, all new records will be in draft mode until all required approvals are completed.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className={workflow.status === 'Active' ? 'border-primary/30' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <Badge variant="outline">{workflow.module}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={workflow.status === 'Active'}
                    onCheckedChange={() => handleToggleStatus(workflow.id)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                      >
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardTitle className="text-lg">{workflow.name}</CardTitle>
              <CardDescription>{workflow.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <p className="text-sm text-muted-foreground mb-1">
                  {language === 'ar' ? 'الشرط:' : 'Trigger:'} <span className="text-foreground">{workflow.triggerCondition}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {workflow.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
                      <span className="font-medium">{step.order}.</span>
                      <span>{step.role}</span>
                    </div>
                    {index < workflow.steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>{language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'} {workflow.createdAt}</span>
                <Badge className={workflow.status === 'Active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                  {workflow.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
