import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Shield, Trash2, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const MATCH_TYPES = ['branch', 'department', 'company', 'salesperson', 'buyer', 'project', 'customer', 'vendor', 'manager_hierarchy'];
const MODULES = ['crm', 'sales', 'procurement', 'hr', 'finance', 'inventory', 'construction', 'service'];

export default function RowLevelPermissions() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ rule_name: '', module: 'sales', match_type: 'branch', match_field: '', target_role: '', can_view: true, can_edit: false, can_delete: false, description: '' });

  const { data: rules = [] } = useQuery({
    queryKey: ['row-level-permissions', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('row_level_permission_rules' as any).select('*').order('priority', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('row_level_permission_rules' as any).insert({ ...formData, company_id: activeCompanyId, created_by: user?.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['row-level-permissions'] }); setShowCreate(false); toast({ title: 'Permission rule created' }); },
  });

  const toggleRule = useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await (supabase.from('row_level_permission_rules' as any).update({ is_active: !rule.is_active }).eq('id', rule.id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['row-level-permissions'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('row_level_permission_rules' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['row-level-permissions'] }); toast({ title: 'Rule deleted' }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Row-Level Permissions</h1>
          <p className="text-muted-foreground">Control record visibility by branch, department, role, and hierarchy</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Rule</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Permission Rule</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Rule Name</Label><Input value={formData.rule_name} onChange={e => setFormData(p => ({ ...p, rule_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Module</Label>
                  <Select value={formData.module} onValueChange={v => setFormData(p => ({ ...p, module: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Match Type</Label>
                  <Select value={formData.match_type} onValueChange={v => setFormData(p => ({ ...p, match_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MATCH_TYPES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Match Field</Label><Input value={formData.match_field} onChange={e => setFormData(p => ({ ...p, match_field: e.target.value }))} placeholder="e.g., branch_id, department_id" /></div>
              <div><Label>Target Role (optional)</Label><Input value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="e.g., sales_rep, manager" /></div>
              <div><Label>{t('common.description')}</Label><Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={formData.can_view} onCheckedChange={v => setFormData(p => ({ ...p, can_view: v }))} /><Label>View</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.can_edit} onCheckedChange={v => setFormData(p => ({ ...p, can_edit: v }))} /><Label>{t('common.edit')}</Label></div>
                <div className="flex items-center gap-2"><Switch checked={formData.can_delete} onCheckedChange={v => setFormData(p => ({ ...p, can_delete: v }))} /><Label>{t('common.delete')}</Label></div>
              </div>
              <Button onClick={() => createRule.mutate()} disabled={!formData.rule_name || !formData.match_field}>Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Total Rules', value: rules.length },
          { label: 'Active', value: rules.filter((r: any) => r.is_active).length },
          { label: 'Modules', value: new Set(rules.map((r: any) => r.module)).size },
          { label: 'Match Types', value: new Set(rules.map((r: any) => r.match_type)).size },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-primary">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Permission Rules</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Rule</TableHead><TableHead>Module</TableHead><TableHead>Match</TableHead><TableHead>Role</TableHead><TableHead>Permissions</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium text-sm">{r.rule_name}</div><div className="text-xs text-muted-foreground">{r.description}</div></TableCell>
                  <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                  <TableCell><div className="text-sm">{r.match_type}</div><div className="text-xs text-muted-foreground">{r.match_field}</div></TableCell>
                  <TableCell className="text-sm">{r.target_role || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.can_view && <Badge className="text-[10px]">View</Badge>}
                      {r.can_edit && <Badge variant="secondary" className="text-[10px]">{t('common.edit')}</Badge>}
                      {r.can_delete && <Badge variant="destructive" className="text-[10px]">{t('common.delete')}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toggleRule.mutate(r)}>
                      <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Active' : 'Off'}</Badge>
                    </Button>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRule.mutate(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No permission rules defined</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
