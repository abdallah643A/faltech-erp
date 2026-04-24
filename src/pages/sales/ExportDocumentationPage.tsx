import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileBox, Plus } from 'lucide-react';
import { useExportDocs, useIncoterms } from '@/hooks/useQuoteToCash';

const DOC_TYPES = ['packing_list', 'commercial_invoice', 'certificate_of_origin', 'bill_of_lading'];

export default function ExportDocumentationPage() {
  const { docs, isLoading, createDoc } = useExportDocs();
  const { incoterms } = useIncoterms();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    doc_number: '', doc_type: 'packing_list', customer_name: '', destination_country: '',
    port_of_loading: 'Jeddah', port_of_discharge: '', incoterm_code: 'CIF', total_packages: 0,
  });

  const handleCreate = async () => {
    await createDoc.mutateAsync(form);
    setOpen(false);
    setForm({ doc_number: '', doc_type: 'packing_list', customer_name: '', destination_country: '', port_of_loading: 'Jeddah', port_of_discharge: '', incoterm_code: 'CIF', total_packages: 0 });
  };

  return (
    <div className="page-enter container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileBox className="h-6 w-6 text-primary" /> Export Documentation</h1>
          <p className="text-sm text-muted-foreground">Packing lists, commercial invoices, certificates of origin, B/L</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Export Document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Doc Number</Label><Input value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} /></div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Destination Country</Label><Input value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} /></div>
                <div>
                  <Label>Incoterm</Label>
                  <Select value={form.incoterm_code} onValueChange={(v) => setForm({ ...form, incoterm_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{incoterms.map((i: any) => <SelectItem key={i.code} value={i.code}>{i.code} — {i.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Port of Loading</Label><Input value={form.port_of_loading} onChange={(e) => setForm({ ...form, port_of_loading: e.target.value })} /></div>
                <div><Label>Port of Discharge</Label><Input value={form.port_of_discharge} onChange={(e) => setForm({ ...form, port_of_discharge: e.target.value })} /></div>
              </div>
              <div><Label>Total Packages</Label><Input type="number" value={form.total_packages} onChange={(e) => setForm({ ...form, total_packages: parseInt(e.target.value) || 0 })} /></div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Documents ({docs.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Type</TableHead><TableHead>Customer</TableHead><TableHead>Destination</TableHead><TableHead>Incoterm</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6">Loading...</TableCell></TableRow>}
              {!isLoading && docs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No documents</TableCell></TableRow>}
              {docs.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.doc_number}</TableCell>
                  <TableCell><Badge variant="outline">{d.doc_type?.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.destination_country || '—'}</TableCell>
                  <TableCell><Badge className="font-mono">{d.incoterm_code}</Badge></TableCell>
                  <TableCell>{d.doc_date}</TableCell>
                  <TableCell><Badge>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
