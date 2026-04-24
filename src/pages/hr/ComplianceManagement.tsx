import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  useHRPolicies, usePolicyVersions, useComplianceChecklists,
  useEmployeeChecklistProgress
} from '@/hooks/useCompliance';
import { useEmployees } from '@/hooks/useEmployees';
import {
  FileText, Plus, Shield, CheckSquare, History, Loader2,
  Eye, Upload, BookOpen, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const POLICY_CATEGORIES = ['general', 'attendance', 'leave', 'compensation', 'safety', 'conduct', 'data_privacy', 'remote_work'];
const CHECKLIST_TYPES = ['onboarding', 'offboarding', 'compliance_audit', 'safety', 'annual_review'];

export default function ComplianceManagement() {
  const { t } = useLanguage();
  const { policies, isLoading: policiesLoading, createPolicy, updatePolicy, publishPolicy } = useHRPolicies();
  const { checklists, isLoading: checklistsLoading, createChecklist } = useComplianceChecklists();
  const { employees } = useEmployees();

  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);

  // Policy form
  const [policyForm, setPolicyForm] = useState({
    title: '', category: 'general', description: '', content: '', effective_date: '', review_date: '',
  });

  // Checklist form
  const [checklistForm, setChecklistForm] = useState({
    name: '', description: '', checklist_type: 'onboarding',
    items: [{ title: '', description: '', is_required: true }],
  });

  const handleCreatePolicy = () => {
    createPolicy.mutate({
      title: policyForm.title,
      category: policyForm.category,
      description: policyForm.description || undefined,
      content: policyForm.content || undefined,
      effective_date: policyForm.effective_date || undefined,
      review_date: policyForm.review_date || undefined,
    }, {
      onSuccess: () => {
        setPolicyDialogOpen(false);
        setPolicyForm({ title: '', category: 'general', description: '', content: '', effective_date: '', review_date: '' });
      },
    });
  };

  const handleCreateChecklist = () => {
    const validItems = checklistForm.items.filter(i => i.title.trim());
    createChecklist.mutate({
      name: checklistForm.name,
      description: checklistForm.description || undefined,
      checklist_type: checklistForm.checklist_type,
      items: validItems,
    }, {
      onSuccess: () => {
        setChecklistDialogOpen(false);
        setChecklistForm({ name: '', description: '', checklist_type: 'onboarding', items: [{ title: '', description: '', is_required: true }] });
      },
    });
  };

  const addChecklistItem = () => {
    setChecklistForm(f => ({ ...f, items: [...f.items, { title: '', description: '', is_required: true }] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Published</Badge>;
      case 'archived': return <Badge variant="secondary">Archived</Badge>;
      case 'under_review': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Under Review</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Compliance & Document Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage policies, checklists, and compliance documents</p>
        </div>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList className="flex overflow-x-auto h-auto gap-1">
          <TabsTrigger value="policies" className="gap-1.5 shrink-0"><Shield className="h-3.5 w-3.5" /> Policies</TabsTrigger>
          <TabsTrigger value="checklists" className="gap-1.5 shrink-0"><CheckSquare className="h-3.5 w-3.5" /> Checklists</TabsTrigger>
          <TabsTrigger value="employee-compliance" className="gap-1.5 shrink-0"><CheckCircle2 className="h-3.5 w-3.5" /> Employee Compliance</TabsTrigger>
        </TabsList>

        {/* ── Policies Tab ── */}
        <TabsContent value="policies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> HR Policies</CardTitle>
              <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Policy</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create New Policy</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Title *</Label>
                        <Input value={policyForm.title} onChange={e => setPolicyForm(f => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select value={policyForm.category} onValueChange={v => setPolicyForm(f => ({ ...f, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {POLICY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>{t('common.description')}</Label>
                      <Input value={policyForm.description} onChange={e => setPolicyForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Policy Content</Label>
                      <Textarea value={policyForm.content} onChange={e => setPolicyForm(f => ({ ...f, content: e.target.value }))} className="min-h-[200px]" placeholder="Enter the full policy text..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Effective Date</Label>
                        <Input type="date" value={policyForm.effective_date} onChange={e => setPolicyForm(f => ({ ...f, effective_date: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Review Date</Label>
                        <Input type="date" value={policyForm.review_date} onChange={e => setPolicyForm(f => ({ ...f, review_date: e.target.value }))} />
                      </div>
                    </div>
                    <Button onClick={handleCreatePolicy} disabled={!policyForm.title || createPolicy.isPending} className="w-full">
                      {createPolicy.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Create Policy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {policiesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No policies created yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden md:table-cell">Version</TableHead>
                        <TableHead className="hidden md:table-cell">Effective</TableHead>
                        <TableHead className="hidden lg:table-cell">Review</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="w-20">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((policy: any) => (
                        <TableRow key={policy.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{policy.title}</p>
                            {policy.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{policy.description}</p>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{policy.category?.replace('_', ' ')}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell text-sm">v{policy.version}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{policy.effective_date ? format(new Date(policy.effective_date), 'PP') : '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {policy.review_date ? (
                              <span className={new Date(policy.review_date) < new Date() ? 'text-destructive' : ''}>
                                {format(new Date(policy.review_date), 'PP')}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>{getStatusBadge(policy.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {policy.status === 'draft' && (
                                <Button size="icon" variant="ghost" title="Publish"
                                  onClick={() => publishPolicy.mutate({ id: policy.id, content: policy.content || '', title: policy.title })}>
                                  <Upload className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" title="View versions"
                                onClick={() => { setSelectedPolicy(policy.id); setVersionDialogOpen(true); }}>
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Checklists Tab ── */}
        <TabsContent value="checklists">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Compliance Checklists</CardTitle>
              <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Checklist</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Create Compliance Checklist</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Name *</Label>
                        <Input value={checklistForm.name} onChange={e => setChecklistForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('common.type')}</Label>
                        <Select value={checklistForm.checklist_type} onValueChange={v => setChecklistForm(f => ({ ...f, checklist_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CHECKLIST_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>{t('common.description')}</Label>
                      <Textarea value={checklistForm.description} onChange={e => setChecklistForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="flex items-center justify-between">
                        Checklist Items
                        <Button variant="outline" size="sm" onClick={addChecklistItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                      </Label>
                      <div className="space-y-2 mt-2">
                        {checklistForm.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              placeholder={`Item ${i + 1}`}
                              value={item.title}
                              onChange={e => {
                                const items = [...checklistForm.items];
                                items[i] = { ...items[i], title: e.target.value };
                                setChecklistForm(f => ({ ...f, items }));
                              }}
                              className="flex-1"
                            />
                            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                              <Checkbox
                                checked={item.is_required}
                                onCheckedChange={(checked) => {
                                  const items = [...checklistForm.items];
                                  items[i] = { ...items[i], is_required: !!checked };
                                  setChecklistForm(f => ({ ...f, items }));
                                }}
                              />
                              Required
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateChecklist} disabled={!checklistForm.name || createChecklist.isPending} className="w-full">
                      {createChecklist.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Create Checklist
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {checklistsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : checklists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No checklists created yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {checklists.map((cl: any) => (
                    <Card key={cl.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedChecklist(cl.id === selectedChecklist ? null : cl.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{cl.name}</p>
                            <Badge variant="outline" className="text-xs mt-1">{cl.checklist_type?.replace('_', ' ')}</Badge>
                          </div>
                          <Badge variant={cl.is_active ? 'default' : 'secondary'} className="text-xs">
                            {cl.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {cl.description && <p className="text-xs text-muted-foreground mt-1">{cl.description}</p>}
                        <p className="text-xs text-muted-foreground mt-2">{cl.items?.length || 0} items</p>
                        {selectedChecklist === cl.id && cl.items && (
                          <div className="mt-3 pt-3 border-t space-y-1.5">
                            {cl.items.sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs">
                                <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{item.title}</span>
                                {item.is_required && <Badge variant="outline" className="text-[10px] px-1">Required</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Employee Compliance Tab ── */}
        <TabsContent value="employee-compliance">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Employee Compliance Tracking</CardTitle>
              <CardDescription>Track checklist completion for each employee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Select Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee ? (
                <EmployeeComplianceView employeeId={selectedEmployee} checklists={checklists} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Select an employee to view compliance status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Version History Dialog */}
      <PolicyVersionsDialog
        policyId={selectedPolicy}
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
      />
    </div>
  );
}

function EmployeeComplianceView({ employeeId, checklists }: { employeeId: string; checklists: any[] }) {
  const { progress, toggleItem } = useEmployeeChecklistProgress(employeeId);

  return (
    <div className="space-y-4">
      {checklists.filter((cl: any) => cl.is_active).map((cl: any) => {
        const items = cl.items || [];
        const completedItems = items.filter((item: any) =>
          progress.find((p: any) => p.item_id === item.id && p.completed)
        );
        const pct = items.length > 0 ? (completedItems.length / items.length) * 100 : 0;

        return (
          <Card key={cl.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">{cl.name}</p>
                  <Badge variant="outline" className="text-xs">{cl.checklist_type?.replace('_', ' ')}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{completedItems.length}/{items.length}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(pct)}% complete</p>
                </div>
              </div>
              <Progress value={pct} className="h-2 mb-3" />
              <div className="space-y-2">
                {items.sort((a: any, b: any) => a.sort_order - b.sort_order).map((item: any) => {
                  const isCompleted = progress.find((p: any) => p.item_id === item.id && p.completed);
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={!!isCompleted}
                        onCheckedChange={(checked) => {
                          toggleItem.mutate({
                            employee_id: employeeId,
                            checklist_id: cl.id,
                            item_id: item.id,
                            completed: !!checked,
                          });
                        }}
                      />
                      <span className={`text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {item.title}
                      </span>
                      {item.is_required && !isCompleted && (
                        <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PolicyVersionsDialog({ policyId, open, onOpenChange }: { policyId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { versions, isLoading } = usePolicyVersions(policyId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Policy Version History</DialogTitle></DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : versions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No version history yet</p>
        ) : (
          <div className="space-y-3">
            {versions.map((v: any) => (
              <Card key={v.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">v{v.version}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(v.created_at), 'PPp')}</span>
                  </div>
                  <p className="text-sm font-medium">{v.title}</p>
                  {v.change_notes && <p className="text-xs text-muted-foreground mt-1">{v.change_notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
