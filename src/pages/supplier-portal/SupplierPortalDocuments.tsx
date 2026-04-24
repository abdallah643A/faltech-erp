import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

const DOC_TYPES = ['trade_license', 'insurance', 'iso_cert', 'tax_cert', 'bank_guarantee', 'safety_cert', 'other'];

export default function SupplierPortalDocuments({ account }: { account: any }) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ document_type: 'trade_license', document_name: '', issue_date: '', expiry_date: '' });

  const { data: docs = [] } = useQuery({
    queryKey: ['sp-docs-list', account.id],
    queryFn: async () => {
      const { data } = await supabase.from('supplier_portal_documents' as any).select('*').eq('portal_account_id', account.id).order('expiry_date', { ascending: true });
      return data || [];
    },
  });

  const uploadDoc = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_portal_documents' as any).insert({
        portal_account_id: account.id, company_id: account.company_id, vendor_id: account.vendor_id,
        document_type: form.document_type, document_name: form.document_name,
        issue_date: form.issue_date || null, expiry_date: form.expiry_date || null,
        status: 'pending_review',
      });
      if (error) throw error;
      await supabase.from('supplier_portal_interactions' as any).insert({ portal_account_id: account.id, company_id: account.company_id, interaction_type: 'document_upload', entity_type: 'document', entity_reference: form.document_name });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sp-docs-list'] }); setUploadOpen(false); toast.success('Document uploaded'); setForm({ document_type: 'trade_license', document_name: '', issue_date: '', expiry_date: '' }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Documents & Compliance</h2>
        <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4 mr-2" />Upload Document</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Issue Date</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead><TableHead>Version</TableHead></TableRow></TableHeader>
          <TableBody>
            {docs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No documents uploaded</TableCell></TableRow> :
             docs.map((d: any) => {
               const daysLeft = d.expiry_date ? differenceInDays(new Date(d.expiry_date), new Date()) : null;
               return (
                 <TableRow key={d.id}>
                   <TableCell className="font-medium">{d.document_name}</TableCell>
                   <TableCell><Badge variant="outline">{d.document_type?.replace(/_/g, ' ')}</Badge></TableCell>
                   <TableCell className="text-sm">{d.issue_date ? format(new Date(d.issue_date), 'dd MMM yyyy') : '-'}</TableCell>
                   <TableCell className="text-sm">{d.expiry_date ? format(new Date(d.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                   <TableCell className={`font-medium ${daysLeft !== null ? (daysLeft < 0 ? 'text-red-400' : daysLeft <= 30 ? 'text-orange-400' : 'text-green-400') : ''}`}>
                     {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : '-'}
                   </TableCell>
                   <TableCell><Badge variant="outline">{d.status?.replace(/_/g, ' ')}</Badge></TableCell>
                   <TableCell>v{d.version || 1}</TableCell>
                 </TableRow>
               );
             })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Document Type</Label>
              <Select value={form.document_type} onValueChange={v => setForm(p => ({ ...p, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Document Name</Label><Input value={form.document_name} onChange={e => setForm(p => ({ ...p, document_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button onClick={() => uploadDoc.mutate()} disabled={!form.document_name || uploadDoc.isPending}>Upload</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
