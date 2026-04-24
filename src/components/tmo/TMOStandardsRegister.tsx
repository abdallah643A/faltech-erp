import { useState } from 'react';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RequiredFieldsProvider, useRequiredFieldValidation } from '@/components/RequiredFieldsProvider';
import { RFLabel } from '@/components/ui/RFLabel';

const typeColors: Record<string, string> = {
  mandatory: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  recommended: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  deprecated: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

function TMOStandardsRegisterInner() {
  const { standards, createStandard } = useTMOPortfolio();
  const { user } = useAuth();
  const { validate } = useRequiredFieldValidation();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: 'platform', standard_type: 'mandatory',
    version: '1.0', approved_by: '', effective_date: '', review_date: '',
  });

  const handleSubmit = () => {
    if (!validate(form as Record<string, any>, {
      name: 'Name',
      description: 'Description',
      category: 'Category',
      standard_type: 'Type',
      version: 'Version',
      approved_by: 'Approved By',
    })) return;
    if (!form.name) return;
    createStandard.mutate({
      ...form,
      effective_date: form.effective_date || null,
      review_date: form.review_date || null,
      created_by: user?.id,
    } as any);
    setIsOpen(false);
    setForm({ name: '', description: '', category: 'platform', standard_type: 'mandatory', version: '1.0', approved_by: '', effective_date: '', review_date: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Technology Standards Register</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Standard</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Standard</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standards.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No standards defined</TableCell></TableRow>
              ) : standards.map(std => (
                <TableRow key={std.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{std.name}</p>
                      {std.description && <p className="text-xs text-muted-foreground line-clamp-1">{std.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{std.category}</Badge></TableCell>
                  <TableCell><Badge className={typeColors[std.standard_type] || ''}>{std.standard_type}</Badge></TableCell>
                  <TableCell className="text-sm font-mono">{std.version}</TableCell>
                  <TableCell className="text-sm">{std.approved_by || '—'}</TableCell>
                  <TableCell className="text-sm">{std.effective_date || '—'}</TableCell>
                  <TableCell className="text-sm">{std.review_date || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Technology Standard</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><RFLabel fieldName="name">Name</RFLabel><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><RFLabel fieldName="description">Description</RFLabel><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><RFLabel fieldName="category">Category</RFLabel>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['platform','vendor','integration_pattern','security','data'].map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><RFLabel fieldName="standard_type">Type</RFLabel>
                <Select value={form.standard_type} onValueChange={v => setForm({...form, standard_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['mandatory','recommended','deprecated'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><RFLabel fieldName="version">Version</RFLabel><Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} /></div>
            </div>
            <div><RFLabel fieldName="approved_by">Approved By</RFLabel><Input value={form.approved_by} onChange={e => setForm({...form, approved_by: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><RFLabel fieldName="effective_date">Effective Date</RFLabel><Input type="date" value={form.effective_date} onChange={e => setForm({...form, effective_date: e.target.value})} /></div>
              <div><RFLabel fieldName="review_date">Review Date</RFLabel><Input type="date" value={form.review_date} onChange={e => setForm({...form, review_date: e.target.value})} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name}>Add Standard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TMOStandardsRegister() {
  return (
    <RequiredFieldsProvider module="tmo_standards">
      <TMOStandardsRegisterInner />
    </RequiredFieldsProvider>
  );
}
