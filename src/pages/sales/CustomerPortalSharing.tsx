import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Share2, Plus, Copy, Trash2, Eye } from 'lucide-react';
import { usePortalShares } from '@/hooks/useQuoteToCash';
import { useToast } from '@/hooks/use-toast';

const DOC_TYPES = ['invoice', 'statement', 'quote', 'contract', 'credit_memo'];

export default function CustomerPortalSharing() {
  const { shares, isLoading, createShare, revokeShare } = usePortalShares();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ customer_email: '', doc_type: 'invoice', doc_number: '', expires_at: '' });

  const handleCreate = async () => {
    const expiresAt = form.expires_at ? new Date(form.expires_at).toISOString() : null;
    await createShare.mutateAsync({ ...form, expires_at: expiresAt });
    setOpen(false);
    setForm({ customer_email: '', doc_type: 'invoice', doc_number: '', expires_at: '' });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: url });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Share2 className="h-6 w-6 text-primary" /> Customer Portal Sharing</h1>
          <p className="text-sm text-muted-foreground">Secure token-based document sharing with customers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Share</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Share Document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Customer Email</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Document Type</Label>
                  <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Doc Number</Label><Input value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} /></div>
              </div>
              <div><Label>Expires At (optional)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              <Button onClick={handleCreate} className="w-full">Generate Link</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Shared Documents ({shares.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Doc Type</TableHead><TableHead>Doc</TableHead><TableHead>Views</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && shares.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No shared documents</TableCell></TableRow>}
              {shares.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>{s.customer_email}</TableCell>
                  <TableCell><Badge variant="outline">{s.doc_type}</Badge></TableCell>
                  <TableCell>{s.doc_number || '—'}</TableCell>
                  <TableCell><Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />{s.view_count}</Badge></TableCell>
                  <TableCell className="text-xs">{s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}</TableCell>
                  <TableCell><Badge variant={s.is_active ? 'default' : 'outline'}>{s.is_active ? 'Active' : 'Revoked'}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    {s.is_active && <Button size="sm" variant="ghost" onClick={() => copyLink(s.share_token)}><Copy className="h-4 w-4" /></Button>}
                    {s.is_active && <Button size="sm" variant="ghost" onClick={() => revokeShare.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
