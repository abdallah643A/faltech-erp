import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, CheckCircle, Clock, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PeriodEndClosing() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [form, setForm] = useState({ fiscalYear: new Date().getFullYear(), periodNumber: new Date().getMonth() + 1, closeType: 'monthly' });

  const { data: checklists = [] } = useQuery({
    queryKey: ['period-close-checklists', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('period_close_checklists' as any).select('*').order('fiscal_year', { ascending: false }) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['period-close-tasks', selectedChecklist],
    queryFn: async () => {
      if (!selectedChecklist) return [];
      const { data, error } = await (supabase.from('period_close_tasks' as any).select('*').eq('checklist_id', selectedChecklist).order('task_order') as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedChecklist,
  });

  const createChecklist = useMutation({
    mutationFn: async (f: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from('period_close_checklists' as any).insert({
        fiscal_year: f.fiscalYear, period_number: f.periodNumber, close_type: f.closeType,
        created_by: user?.id, ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }).select().single() as any);
      if (error) throw error;
      // Seed default tasks
      const defaultTasks = [
        'Review and post all pending journal entries', 'Reconcile bank accounts',
        'Review accounts receivable aging', 'Review accounts payable aging',
        'Run depreciation', 'Review intercompany balances',
        'Accrue expenses', 'Verify tax calculations',
        'Review profit and loss', 'Manager sign-off',
      ];
      await (supabase.from('period_close_tasks' as any).insert(
        defaultTasks.map((t, i) => ({ checklist_id: data.id, task_order: i + 1, task_name: t, category: 'general' }))
      ) as any);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-close-checklists'] }); toast.success('Checklist created with default tasks'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('period_close_tasks' as any).update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: user?.id }).eq('id', taskId) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['period-close-tasks'] }); toast.success('Task completed'); },
  });

  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Period-End Closing</h1>
          <p className="text-muted-foreground">Manage monthly, quarterly and yearly close checklists</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Checklist</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Closing Checklist</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Fiscal Year</Label><Input type="number" value={form.fiscalYear} onChange={e => setForm(f => ({ ...f, fiscalYear: parseInt(e.target.value) }))} /></div>
              <div><Label>Period</Label><Input type="number" min={1} max={12} value={form.periodNumber} onChange={e => setForm(f => ({ ...f, periodNumber: parseInt(e.target.value) }))} /></div>
              <div><Label>Close Type</Label>
                <Select value={form.closeType} onValueChange={v => setForm(f => ({ ...f, closeType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createChecklist.mutate(form)} disabled={createChecklist.isPending} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h2 className="font-semibold">Checklists</h2>
          {checklists.map((cl: any) => (
            <Card key={cl.id} className={`cursor-pointer transition-colors ${selectedChecklist === cl.id ? 'border-primary' : ''}`} onClick={() => setSelectedChecklist(cl.id)}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{cl.fiscal_year} - Period {cl.period_number}</p>
                    <p className="text-sm text-muted-foreground capitalize">{cl.close_type} close</p>
                  </div>
                  <Badge variant={cl.status === 'closed' ? 'default' : 'outline'}>{cl.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {checklists.length === 0 && <p className="text-muted-foreground text-sm">No checklists yet</p>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedChecklist ? (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">Progress</p>
                    <p className="text-sm text-muted-foreground">{completedCount}/{tasks.length} tasks</p>
                  </div>
                  <Progress value={progress} className="h-3" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Tasks</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Task</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.actions')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {tasks.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.task_order}</TableCell>
                          <TableCell>{task.task_name}</TableCell>
                          <TableCell><Badge variant={task.status === 'completed' ? 'default' : 'outline'}>{task.status}</Badge></TableCell>
                          <TableCell>
                            {task.status !== 'completed' && (
                              <Button size="sm" variant="ghost" onClick={() => completeTask.mutate(task.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : <Card><CardContent className="py-12 text-center text-muted-foreground">Select a checklist to view tasks</CardContent></Card>}
        </div>
      </div>
    </div>
  );
}
