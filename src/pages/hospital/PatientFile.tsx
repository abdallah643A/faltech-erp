import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useHospPatient, useHospEncounters, useHospVitals, useHospNotes,
  useHospDiagnoses, useHospMedicationOrders, useHospInvoices, useEncounterCharges,
} from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { VitalsPanel } from '@/components/hospital/VitalsPanel';
import { User, FileText, Activity, Pill, Receipt, Stethoscope, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientFile() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading } = useHospPatient(patientId);
  const { data: encounters = [] } = useHospEncounters({ patient_id: patientId });
  const activeEncounter = encounters.find((e: any) => !['discharged', 'cancelled'].includes(e.status));
  const { data: vitals = [] } = useHospVitals(activeEncounter?.id);
  const { data: notes = [] } = useHospNotes(activeEncounter?.id);
  const { data: diagnoses = [] } = useHospDiagnoses(activeEncounter?.id);
  const { data: meds = [] } = useHospMedicationOrders({ encounterId: activeEncounter?.id });
  const { data: invoices = [] } = useHospInvoices({ patient_id: patientId });
  const { data: charges = [] } = useEncounterCharges(activeEncounter?.id);

  if (isLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!patient) return <div className="p-6">Patient not found</div>;

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / 31557600000)
    : '—';

  return (
    <HospitalShell
      title={`${patient.first_name} ${patient.last_name}`}
      subtitle={`MRN ${patient.mrn} · ${patient.gender || ''} · ${age} y/o`}
      icon={<User className="h-5 w-5" />}
      actions={
        <>
          {patient.is_vip && <Badge variant="outline" className={statusColor('urgent')}>VIP</Badge>}
          {patient.is_deceased && <Badge variant="outline" className={statusColor('critical')}>Deceased</Badge>}
          {activeEncounter && (
            <Badge variant="outline" className={statusColor(activeEncounter.status)}>
              Active: {activeEncounter.encounter_no} · {activeEncounter.status}
            </Badge>
          )}
        </>
      }
    >
      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Demographics</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">DOB:</span> {patient.date_of_birth || '—'}</p>
            <p><span className="text-muted-foreground">National ID:</span> {patient.national_id || '—'}</p>
            <p><span className="text-muted-foreground">Phone:</span> {patient.phone || '—'}</p>
            <p><span className="text-muted-foreground">Email:</span> {patient.email || '—'}</p>
            <p><span className="text-muted-foreground">Address:</span> {patient.address || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Insurance & Emergency</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Insurance:</span> {patient.insurance_provider || '—'}</p>
            <p><span className="text-muted-foreground">Policy #:</span> {patient.insurance_policy_no || '—'}</p>
            <p><span className="text-muted-foreground">Expires:</span> {patient.insurance_expiry || '—'}</p>
            <p><span className="text-muted-foreground">Emergency Contact:</span> {patient.emergency_contact_name || '—'}</p>
            <p><span className="text-muted-foreground">Emergency Phone:</span> {patient.emergency_contact_phone || '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Clinical Alerts</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Allergies</p>
              {patient.allergies?.length ?
                patient.allergies.map((a, i) => <Badge key={i} variant="outline" className={`mr-1 ${statusColor('critical')}`}>{a}</Badge>) :
                <p className="text-xs">None recorded</p>}
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Chronic Conditions</p>
              {patient.chronic_conditions?.length ?
                patient.chronic_conditions.map((c, i) => <Badge key={i} variant="outline" className={`mr-1 ${statusColor('urgent')}`}>{c}</Badge>) :
                <p className="text-xs">None recorded</p>}
            </div>
            <p><span className="text-muted-foreground">Blood Group:</span> {patient.blood_group || '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline"><Activity className="h-3.5 w-3.5 mr-1" />Timeline</TabsTrigger>
          <TabsTrigger value="encounters">Encounters ({encounters.length})</TabsTrigger>
          <TabsTrigger value="vitals">Vitals ({vitals.length})</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses ({diagnoses.length})</TabsTrigger>
          <TabsTrigger value="meds"><Pill className="h-3.5 w-3.5 mr-1" />Medications ({meds.length})</TabsTrigger>
          <TabsTrigger value="notes"><FileText className="h-3.5 w-3.5 mr-1" />Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="charges">Charges ({charges.length})</TabsTrigger>
          <TabsTrigger value="billing"><Receipt className="h-3.5 w-3.5 mr-1" />Billing ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card><CardContent className="pt-6 space-y-2">
            {encounters.length === 0 && <p className="text-sm text-muted-foreground">No history yet</p>}
            {encounters.map((e: any) => (
              <div key={e.id} className="border-l-2 border-primary pl-3 py-1">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.encounter_no} — {e.encounter_type?.toUpperCase()} · {e.department || '—'}</p>
                    <p className="text-xs text-muted-foreground">{e.chief_complaint || 'No chief complaint'}</p>
                    <p className="text-xs text-muted-foreground">{e.arrival_time ? format(new Date(e.arrival_time), 'PPp') : '—'}</p>
                  </div>
                  <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="encounters">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Type</TableHead><TableHead>Dept</TableHead><TableHead>Doctor</TableHead><TableHead>Arrival</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {encounters.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.encounter_no}</TableCell>
                    <TableCell className="uppercase">{e.encounter_type}</TableCell>
                    <TableCell>{e.department || '—'}</TableCell>
                    <TableCell>{e.doctor_name || '—'}</TableCell>
                    <TableCell>{e.arrival_time ? format(new Date(e.arrival_time), 'PP p') : '—'}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-3">
          <VitalsPanel patientId={patientId!} encounterId={activeEncounter?.id} />
          <Card><CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-2">Legacy nursing vitals log</p>
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>BP</TableHead><TableHead>HR</TableHead><TableHead>Temp</TableHead><TableHead>SpO2</TableHead><TableHead>RR</TableHead><TableHead>Pain</TableHead></TableRow></TableHeader>
              <TableBody>
                {vitals.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>{format(new Date(v.recorded_at), 'PP p')}</TableCell>
                    <TableCell>{v.bp_systolic}/{v.bp_diastolic}</TableCell>
                    <TableCell>{v.pulse}</TableCell>
                    <TableCell>{v.temperature}°</TableCell>
                    <TableCell>{v.spo2}%</TableCell>
                    <TableCell>{v.respiration}</TableCell>
                    <TableCell>{v.pain_score}/10</TableCell>
                  </TableRow>
                ))}
                {vitals.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No legacy vitals</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="diagnoses">
          <Card><CardContent className="pt-6">
            {diagnoses.length === 0 && <p className="text-sm text-muted-foreground">No diagnoses</p>}
            {diagnoses.map((d: any) => (
              <div key={d.id} className="border-b py-2">
                <p className="text-sm font-medium">{d.diagnosis} <span className="text-xs font-mono text-muted-foreground">{d.icd10_code}</span></p>
                <p className="text-xs text-muted-foreground">{d.diagnosis_type} · {d.diagnosed_at ? format(new Date(d.diagnosed_at), 'PP') : ''}</p>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="meds">
          <Card><CardContent className="pt-6">
            {meds.length === 0 && <p className="text-sm text-muted-foreground">No prescriptions</p>}
            {meds.map((m: any) => (
              <div key={m.id} className="border rounded p-3 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">{m.prescription_no} <span className="text-xs text-muted-foreground">by {m.prescribed_by_name}</span></p>
                  <Badge variant="outline" className={statusColor(m.status)}>{m.status}</Badge>
                </div>
                {m.lines?.map((l: any) => (
                  <p key={l.id} className="text-xs">• {l.drug_name} — {l.dose} {l.frequency} × {l.duration} ({l.dispensed_qty || 0}/{l.quantity})</p>
                ))}
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardContent className="pt-6 space-y-2">
            {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes</p>}
            {notes.map((n: any) => (
              <div key={n.id} className="border-l-2 border-primary pl-3 py-1">
                <p className="text-sm font-medium">{n.title} <Badge variant="outline" className="ml-1 text-xs">{n.note_type}</Badge></p>
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-muted-foreground">{n.author_name} · {format(new Date(n.created_at), 'PP p')}</p>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="charges">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Source</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {charges.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{format(new Date(c.charged_at), 'PP')}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="capitalize text-xs">{c.source_type}</TableCell>
                    <TableCell>{c.qty}</TableCell>
                    <TableCell className="text-right">{Number(c.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {charges.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No charges</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((i: any) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate('/hospital/billing')}>
                    <TableCell className="font-mono text-xs">{i.invoice_no}</TableCell>
                    <TableCell>{i.invoice_date}</TableCell>
                    <TableCell className="text-right">{Number(i.total).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(i.paid_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(i.balance).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColor(i.status)}>{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No invoices</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </HospitalShell>
  );
}
