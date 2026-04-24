import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, X, BellRing, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminAlert {
  id: string;
  alert_name: string;
  alert_type: string;
  frequency: string;
  priority: string;
  is_active: boolean;
  conditions: any[];
  recipients: any[];
}

const FREQUENCIES = ['once', 'daily', 'weekly', 'always'];
const PRIORITIES = ['low', 'medium', 'high'];
const ALERT_TYPES = ['system', 'user_defined'];

export default function AlertsManagement() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ alert_name: '', alert_type: 'user_defined', frequency: 'always', priority: 'medium' });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['admin-alerts', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_alerts').select('*').eq('company_id', activeCompanyId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as AdminAlert[];
    },
    enabled: !!activeCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('admin_alerts').insert({
        ...form, company_id: activeCompanyId, conditions: [], recipients: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      setIsAdding(false);
      setForm({ alert_name: '', alert_type: 'user_defined', frequency: 'always', priority: 'medium' });
      toast.success('Alert created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await (supabase as any).from('admin_alerts').update({ is_active: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-alerts'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('admin_alerts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] });
      setSelectedId(null);
      toast.success('Alert deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedAlert = alerts.find(a => a.id === selectedId);

  const priorityColor = (p: string) => {
    if (p === 'high') return 'bg-destructive/10 text-destructive';
    if (p === 'medium') return 'bg-yellow-500/10 text-yellow-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BellRing className="h-6 w-6" />
            {language === 'ar' ? 'إدارة التنبيهات' : 'Alerts Management'}
          </h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إنشاء وإدارة تنبيهات النظام' : 'Create and manage system alerts'}</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
          <Plus className="h-4 w-4 mr-1" /> {language === 'ar' ? 'تنبيه جديد' : 'New Alert'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Alert List */}
        <div className="lg:col-span-2 rounded-lg border bg-card">
          {isAdding && (
            <div className="p-4 border-b bg-muted/30 space-y-3">
              <Input placeholder="Alert Name" value={form.alert_name} onChange={e => setForm({ ...form, alert_name: e.target.value })} className="h-9" />
              <div className="flex gap-3">
                <select className="rounded-md border border-input bg-background px-2 py-1 text-sm flex-1"
                  value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })}>
                  {ALERT_TYPES.map(t => <option key={t} value={t}>{t === 'system' ? 'System' : 'User Defined'}</option>)}
                </select>
                <select className="rounded-md border border-input bg-background px-2 py-1 text-sm flex-1"
                  value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
                <select className="rounded-md border border-input bg-background px-2 py-1 text-sm flex-1"
                  value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addMutation.mutate()} disabled={!form.alert_name}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'اسم التنبيه' : 'Alert Name'}</TableHead>
                <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{language === 'ar' ? 'التكرار' : 'Frequency'}</TableHead>
                <TableHead>{language === 'ar' ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead className="text-center">{language === 'ar' ? 'نشط' : 'Active'}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : alerts.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No alerts configured</TableCell></TableRow>
              ) : alerts.map(a => (
                <TableRow key={a.id} className={selectedId === a.id ? 'bg-accent' : 'cursor-pointer'} onClick={() => setSelectedId(a.id)}>
                  <TableCell className="font-medium">{a.alert_name}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{a.alert_type === 'system' ? 'System' : 'User Defined'}</span></TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted capitalize">{a.frequency}</span></TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityColor(a.priority)}`}>{a.priority}</span></TableCell>
                  <TableCell className="text-center">
                    <Switch checked={a.is_active} onCheckedChange={v => toggleMutation.mutate({ id: a.id, value: v })} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate(a.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Right: Detail Panel */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          {selectedAlert ? (
            <>
              <h3 className="font-semibold text-lg">{selectedAlert.alert_name}</h3>
              <div className="space-y-3 text-sm">
                <div><Label className="text-muted-foreground">Type</Label><p className="capitalize">{selectedAlert.alert_type.replace('_', ' ')}</p></div>
                <div><Label className="text-muted-foreground">Frequency</Label><p className="capitalize">{selectedAlert.frequency}</p></div>
                <div><Label className="text-muted-foreground">Priority</Label>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityColor(selectedAlert.priority)}`}>{selectedAlert.priority}</span>
                </div>
                <div><Label className="text-muted-foreground">Status</Label><p>{selectedAlert.is_active ? '✅ Active' : '⏸ Inactive'}</p></div>
                <div>
                  <Label className="text-muted-foreground">Conditions</Label>
                  <p className="text-muted-foreground italic">{selectedAlert.conditions?.length ? `${selectedAlert.conditions.length} condition(s)` : 'No conditions set'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Recipients</Label>
                  <p className="text-muted-foreground italic">{selectedAlert.recipients?.length ? `${selectedAlert.recipients.length} recipient(s)` : 'No recipients set'}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <BellRing className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{language === 'ar' ? 'اختر تنبيه لعرض التفاصيل' : 'Select an alert to view details'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
