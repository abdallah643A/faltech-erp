import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCoaOverrides } from '@/hooks/useFinanceEnhanced';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Plus, Trash2, Building2 } from 'lucide-react';

export default function CoaByEntity() {
  const { activeCompany } = useActiveCompany();
  const { data, isLoading, upsert, remove } = useCoaOverrides();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    account_code: '', custom_name: '', custom_name_ar: '', is_active: true,
    is_blocked_for_posting: false, require_cost_center: false, require_project: false,
    require_dimension_1: false, default_tax_code: '', notes: '',
  });

  const handleSave = async () => {
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ account_code: '', custom_name: '', is_active: true });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" /> COA by Entity</h1>
          <p className="text-muted-foreground">
            Per-company chart of accounts overrides {activeCompany ? `· ${(activeCompany as any).company_name}` : ''}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Override</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Account Override</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Account Code *</Label><Input value={form.account_code} onChange={e => setForm({ ...form, account_code: e.target.value })} /></div>
              <div><Label>Default Tax Code</Label><Input value={form.default_tax_code} onChange={e => setForm({ ...form, default_tax_code: e.target.value })} /></div>
              <div><Label>Custom Name</Label><Input value={form.custom_name} onChange={e => setForm({ ...form, custom_name: e.target.value })} /></div>
              <div><Label>Custom Name (AR)</Label><Input dir="rtl" value={form.custom_name_ar} onChange={e => setForm({ ...form, custom_name_ar: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_blocked_for_posting} onCheckedChange={v => setForm({ ...form, is_blocked_for_posting: v })} /><Label>Block Posting</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.require_cost_center} onCheckedChange={v => setForm({ ...form, require_cost_center: v })} /><Label>Require Cost Center</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.require_project} onCheckedChange={v => setForm({ ...form, require_project: v })} /><Label>Require Project</Label></div>
            </div>
            <DialogFooter><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Overrides ({data.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Account</TableHead><TableHead>Custom Name</TableHead><TableHead>Tax</TableHead>
              <TableHead>Required Dimensions</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center">Loading…</TableCell></TableRow> :
                data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No overrides yet.</TableCell></TableRow> :
                data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono">{r.account_code}</TableCell>
                    <TableCell>{r.custom_name || '—'} {r.custom_name_ar && <span className="text-xs text-muted-foreground"> · {r.custom_name_ar}</span>}</TableCell>
                    <TableCell>{r.default_tax_code || '—'}</TableCell>
                    <TableCell className="space-x-1">
                      {r.require_cost_center && <Badge variant="outline">CC</Badge>}
                      {r.require_project && <Badge variant="outline">Project</Badge>}
                      {r.require_dimension_1 && <Badge variant="outline">Dim1</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.is_blocked_for_posting ? <Badge variant="destructive">Blocked</Badge> :
                        r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
