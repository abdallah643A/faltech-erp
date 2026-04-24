import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHospMedicationOrders, useDispenseMedication } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Pill, Check, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function HospitalPharmacy() {
  const navigate = useNavigate();
  const { data: pendingMeds = [] } = useHospMedicationOrders({ status: 'ordered' });
  const { data: partialMeds = [] } = useHospMedicationOrders({ status: 'partial' });
  const { data: dispensedMeds = [] } = useHospMedicationOrders({ status: 'dispensed' });
  const dispense = useDispenseMedication();

  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  const renderOrders = (orders: any[]) => (
    <div className="space-y-2">
      {orders.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-medium">{o.prescription_no} — {o.patient?.first_name} {o.patient?.last_name}
                  {o.is_stat && <Badge variant="outline" className={`ml-2 ${statusColor('critical')}`}>STAT</Badge>}
                  {o.is_controlled && <Badge variant="outline" className="ml-1">Controlled</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">By {o.prescribed_by_name} · {format(new Date(o.prescribed_at), 'PP p')}</p>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/hospital/patient-files/${o.patient_id}`)}><ArrowRight className="h-3 w-3" /></Button>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Dose</TableHead><TableHead>Freq</TableHead><TableHead>Dur</TableHead><TableHead>Qty</TableHead><TableHead>Dispensed</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {o.lines?.map((l: any) => {
                  const remaining = (l.quantity || 0) - (l.dispensed_qty || 0);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.drug_name}</TableCell>
                      <TableCell>{l.dose}</TableCell>
                      <TableCell>{l.frequency}</TableCell>
                      <TableCell>{l.duration}</TableCell>
                      <TableCell>{l.quantity}</TableCell>
                      <TableCell>{l.dispensed_qty || 0}</TableCell>
                      <TableCell>
                        {l.status !== 'dispensed' && remaining > 0 && (
                          <div className="flex gap-1">
                            <Input type="number" className="h-7 w-16" placeholder={String(remaining)}
                              value={qtyMap[l.id] || ''} onChange={(e) => setQtyMap({ ...qtyMap, [l.id]: +e.target.value })} />
                            <Button size="sm" variant="outline" className="h-7"
                              onClick={() => dispense.mutate({ orderLineId: l.id, qty: qtyMap[l.id] || remaining })}>
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {l.status === 'dispensed' && <Badge variant="outline" className={statusColor('dispensed')}>Done</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      {orders.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No prescriptions</p>}
    </div>
  );

  return (
    <HospitalShell title="Pharmacy" subtitle="Prescription queue and dispensing" icon={<Pill className="h-5 w-5" />}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-semibold">{pendingMeds.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Partial</p><p className="text-2xl font-semibold text-amber-600">{partialMeds.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Today's Dispensed</p><p className="text-2xl font-semibold text-emerald-600">{dispensedMeds.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingMeds.length})</TabsTrigger>
          <TabsTrigger value="partial">Partial ({partialMeds.length})</TabsTrigger>
          <TabsTrigger value="dispensed">Dispensed ({dispensedMeds.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{renderOrders(pendingMeds)}</TabsContent>
        <TabsContent value="partial">{renderOrders(partialMeds)}</TabsContent>
        <TabsContent value="dispensed">{renderOrders(dispensedMeds)}</TabsContent>
      </Tabs>
    </HospitalShell>
  );
}
