import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { CheckCircle2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalPunchList({ subcontractor }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ response_status: '', response_notes: '', completion_percentage: '', completion_date: '', disputed_reason: '' });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const { data } = await supabase.from('sub_punch_list_responses').select('*').eq('subcontractor_id', subcontractor.id).order('created_at', { ascending: false }) as any;
    setItems(data || []);
  };

  const openUpdate = (item: any) => {
    setSelected(item);
    setForm({
      response_status: item.response_status || 'pending',
      response_notes: item.response_notes || '',
      completion_percentage: item.completion_percentage?.toString() || '0',
      completion_date: item.completion_date || '',
      disputed_reason: item.disputed_reason || '',
    });
    setUpdateOpen(true);
  };

  const handleUpdate = async () => {
    const updates: any = {
      response_status: form.response_status,
      response_notes: form.response_notes,
      completion_percentage: parseFloat(form.completion_percentage) || 0,
      completion_date: form.completion_date || null,
      disputed_reason: form.response_status === 'disputed' ? form.disputed_reason : null,
    };
    await supabase.from('sub_punch_list_responses').update(updates).eq('id', selected.id);
    toast.success('Punch list item updated');
    setUpdateOpen(false);
    load();
  };

  const priorityColor = (p: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'outline', medium: 'secondary', high: 'default', critical: 'destructive'
    };
    return map[p] || 'secondary';
  };

  const statusColor = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary', acknowledged: 'default', in_progress: 'default', completed: 'outline', disputed: 'destructive'
    };
    return map[s] || 'secondary';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Punch List Items</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No punch list items</TableCell></TableRow>
              ) : items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{item.item_title}</p>
                      {item.item_description && <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{item.item_description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{item.location || '—'}</TableCell>
                  <TableCell><Badge variant={priorityColor(item.priority)} className="text-[10px] capitalize">{item.priority}</Badge></TableCell>
                  <TableCell className="text-xs">{item.original_due_date || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.completion_percentage || 0} className="h-2 w-14" />
                      <span className="text-xs">{item.completion_percentage || 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={statusColor(item.response_status)} className="text-[10px] capitalize">{item.response_status?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-xs capitalize">{item.verification_status || 'pending'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openUpdate(item)}>
                      <Edit className="h-3 w-3" /> Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Punch List Item</DialogTitle>
            <DialogDescription>{selected?.item_title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selected?.item_description && <div className="rounded bg-muted/50 p-3 text-sm">{selected.item_description}</div>}
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={form.response_status} onValueChange={v => setForm(f => ({ ...f, response_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Completion %</Label><Input type="number" max={100} value={form.completion_percentage} onChange={e => setForm(f => ({ ...f, completion_percentage: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Completion Date</Label><Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} /></div>
            </div>
            {form.response_status === 'disputed' && (
              <div className="space-y-1"><Label>Dispute Reason *</Label><Textarea value={form.disputed_reason} onChange={e => setForm(f => ({ ...f, disputed_reason: e.target.value }))} rows={2} /></div>
            )}
            <div className="space-y-1"><Label>Notes</Label><Textarea value={form.response_notes} onChange={e => setForm(f => ({ ...f, response_notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}