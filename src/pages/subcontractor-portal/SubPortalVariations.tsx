import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { SubPortalSubcontractor } from '@/hooks/useSubcontractorPortalAuth';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subcontractor: SubPortalSubcontractor; }

export default function SubPortalVariations({ subcontractor }: Props) {
  const [variations, setVariations] = useState<any[]>([]);
  const [respondOpen, setRespondOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState({ sub_response: '', sub_response_notes: '', sub_counter_amount: '', sub_counter_days: '' });

  useEffect(() => { load(); }, [subcontractor.id]);

  const load = async () => {
    const { data } = await supabase.from('sub_variation_instructions').select('*').eq('subcontractor_id', subcontractor.id).order('issued_at', { ascending: false }) as any;
    setVariations(data || []);
  };

  const openRespond = (v: any) => {
    setSelected(v);
    setResponse({ sub_response: v.sub_response || '', sub_response_notes: v.sub_response_notes || '', sub_counter_amount: v.sub_counter_amount?.toString() || '', sub_counter_days: v.sub_counter_days?.toString() || '' });
    setRespondOpen(true);
  };

  const handleRespond = async () => {
    if (!response.sub_response) { toast.error('Please select a response'); return; }
    const updates: any = {
      sub_response: response.sub_response,
      sub_response_notes: response.sub_response_notes,
      sub_responded_at: new Date().toISOString(),
      status: response.sub_response === 'accepted' ? 'accepted' : response.sub_response === 'rejected' ? 'rejected' : 'negotiating',
    };
    if (response.sub_response === 'counter_proposed') {
      updates.sub_counter_amount = response.sub_counter_amount ? parseFloat(response.sub_counter_amount) : null;
      updates.sub_counter_days = response.sub_counter_days ? parseInt(response.sub_counter_days) : null;
    }
    await supabase.from('sub_variation_instructions').update(updates).eq('id', selected.id);
    toast.success('Response submitted');
    setRespondOpen(false);
    load();
  };

  const statusColor = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      issued: 'default', acknowledged: 'secondary', accepted: 'outline', rejected: 'destructive',
      negotiating: 'default', approved: 'outline', cancelled: 'secondary'
    };
    return map[s] || 'secondary';
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Variation Instructions</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variation #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Cost Impact</TableHead>
                <TableHead className="text-right">Time Impact</TableHead>
                <TableHead>Your Response</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No variations yet</TableCell></TableRow>
              ) : variations.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-sm">{v.variation_number}</TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate">{v.title}</TableCell>
                  <TableCell className="capitalize text-xs">{v.instruction_type}</TableCell>
                  <TableCell className="text-right text-sm">{(v.cost_impact || 0).toLocaleString()} SAR</TableCell>
                  <TableCell className="text-right text-sm">{v.time_impact_days || 0} days</TableCell>
                  <TableCell className="capitalize text-xs">{v.sub_response?.replace('_', ' ') || '—'}</TableCell>
                  <TableCell><Badge variant={statusColor(v.status)} className="text-[10px] capitalize">{v.status}</Badge></TableCell>
                  <TableCell>
                    {(v.status === 'issued' || v.status === 'acknowledged' || v.status === 'negotiating') && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openRespond(v)}>
                        <MessageSquare className="h-3 w-3" /> Respond
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Variation</DialogTitle>
            <DialogDescription>{selected?.variation_number} — {selected?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded bg-muted/50 p-3 text-sm">{selected?.description}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>Cost Impact: <strong>{(selected?.cost_impact || 0).toLocaleString()} SAR</strong></div>
              <div>Time Impact: <strong>{selected?.time_impact_days || 0} days</strong></div>
            </div>
            <div className="space-y-1">
              <Label>Your Response *</Label>
              <Select value={response.sub_response} onValueChange={v => setResponse(r => ({ ...r, sub_response: v }))}>
                <SelectTrigger><SelectValue placeholder="Select response" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Accept</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="counter_proposed">Counter Proposal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {response.sub_response === 'counter_proposed' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Counter Amount (SAR)</Label><Input type="number" value={response.sub_counter_amount} onChange={e => setResponse(r => ({ ...r, sub_counter_amount: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Counter Days</Label><Input type="number" value={response.sub_counter_days} onChange={e => setResponse(r => ({ ...r, sub_counter_days: e.target.value }))} /></div>
              </div>
            )}
            <div className="space-y-1"><Label>Notes</Label><Textarea value={response.sub_response_notes} onChange={e => setResponse(r => ({ ...r, sub_response_notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>Cancel</Button>
            <Button onClick={handleRespond}>Submit Response</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}