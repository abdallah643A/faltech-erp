import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHospInvoices, useRecordPayment, useHospEncounters, useGenerateInvoice } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Receipt, DollarSign, FileText, ArrowRight } from 'lucide-react';
import { HospitalJEPreview } from '@/components/hospital/HospitalJEPreview';
import { format } from 'date-fns';

export default function HospitalBilling() {
  const navigate = useNavigate();
  const { data: openInv = [] } = useHospInvoices({ status: 'open' });
  const { data: partialInv = [] } = useHospInvoices({ status: 'partial' });
  const { data: paidInv = [] } = useHospInvoices({ status: 'paid' });
  const { data: encounters = [] } = useHospEncounters();
  const recordPayment = useRecordPayment();
  const genInvoice = useGenerateInvoice();

  const [payOpen, setPayOpen] = useState<any | null>(null);
  const [payForm, setPayForm] = useState<any>({ amount: '', method: 'cash', reference: '' });

  const totalOutstanding = [...openInv, ...partialInv].reduce((s, i: any) => s + Number(i.balance || 0), 0);

  // Encounters with no invoice yet (need invoice generated)
  const encWithoutInv = encounters.filter((e: any) => !['cancelled'].includes(e.status));

  const renderTable = (rows: any[], showPay = false) => (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead>Patient</TableHead>
        <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead>
        <TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
            <TableCell>{i.invoice_date}</TableCell>
            <TableCell>
              <span className="cursor-pointer text-primary hover:underline" onClick={() => navigate(`/hospital/patient-files/${i.patient_id}`)}>
                {i.patient?.first_name} {i.patient?.last_name}
              </span>
            </TableCell>
            <TableCell className="text-right">{Number(i.total).toFixed(2)}</TableCell>
            <TableCell className="text-right">{Number(i.paid_amount).toFixed(2)}</TableCell>
            <TableCell className="text-right font-medium">{Number(i.balance).toFixed(2)}</TableCell>
            <TableCell><Badge variant="outline" className={statusColor(i.status)}>{i.status}</Badge></TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {showPay && Number(i.balance) > 0 && (
                  <Button size="sm" onClick={() => { setPayOpen(i); setPayForm({ amount: i.balance, method: 'cash', reference: '' }); }}>
                    <DollarSign className="h-3 w-3 mr-1" />Pay
                  </Button>
                )}
                <HospitalJEPreview invoice={i} compact />
              </div>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No invoices</TableCell></TableRow>}
      </TableBody>
    </Table>
  );

  return (
    <HospitalShell title="Billing & Cashier" subtitle="Patient invoices, payments, and outstanding balances" icon={<Receipt className="h-5 w-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Invoices</p><p className="text-2xl font-semibold">{openInv.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Partial</p><p className="text-2xl font-semibold text-amber-600">{partialInv.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-2xl font-semibold text-destructive">SAR {totalOutstanding.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Paid Today</p><p className="text-2xl font-semibold text-emerald-600">{paidInv.filter((i: any) => i.invoice_date === new Date().toISOString().slice(0, 10)).length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({openInv.length})</TabsTrigger>
          <TabsTrigger value="partial">Partial ({partialInv.length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({paidInv.length})</TabsTrigger>
          <TabsTrigger value="generate">Generate Invoice</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><Card><CardContent className="pt-6">{renderTable(openInv, true)}</CardContent></Card></TabsContent>
        <TabsContent value="partial"><Card><CardContent className="pt-6">{renderTable(partialInv, true)}</CardContent></Card></TabsContent>
        <TabsContent value="paid"><Card><CardContent className="pt-6">{renderTable(paidInv)}</CardContent></Card></TabsContent>
        <TabsContent value="generate">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Encounter</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Charges</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {encWithoutInv.slice(0, 50).map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.encounter_no}</TableCell>
                    <TableCell>{e.patient?.first_name} {e.patient?.last_name}</TableCell>
                    <TableCell className="uppercase text-xs">{e.encounter_type}</TableCell>
                    <TableCell>{Number(e.total_charges || 0).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" disabled={!Number(e.total_charges)}
                        onClick={() => genInvoice.mutate({ encounterId: e.id, patientId: e.patient_id })}>
                        <FileText className="h-3 w-3 mr-1" />Generate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — {payOpen?.invoice_no}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Balance: SAR {Number(payOpen?.balance || 0).toFixed(2)}</p>
            <div><Label>Amount</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div>
              <Label>Method</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={async () => {
              await recordPayment.mutateAsync({
                invoice_id: payOpen.id, encounter_id: payOpen.encounter_id, patient_id: payOpen.patient_id,
                amount: +payForm.amount, method: payForm.method, reference: payForm.reference,
              });
              setPayOpen(null);
            }}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
