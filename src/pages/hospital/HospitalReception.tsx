import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHospPatients, useCreatePatient, useCreateEncounter } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { UserPlus, Search, FileText, Activity } from 'lucide-react';

export default function HospitalReception() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [encounterOpen, setEncounterOpen] = useState<{ patientId: string; name: string } | null>(null);
  const { data: patients = [] } = useHospPatients(search || undefined);
  const createPatient = useCreatePatient();
  const createEncounter = useCreateEncounter();

  const [form, setForm] = useState<any>({
    first_name: '', last_name: '', gender: 'male', date_of_birth: '',
    phone: '', national_id: '', insurance_provider: '', insurance_policy_no: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  });
  const [encForm, setEncForm] = useState<any>({ encounter_type: 'opd', department: 'General Medicine', chief_complaint: '', visit_priority: 'standard' });

  const handleRegister = async () => {
    if (!form.first_name || !form.last_name) return;
    const p = await createPatient.mutateAsync(form);
    setRegisterOpen(false);
    setForm({ first_name: '', last_name: '', gender: 'male', date_of_birth: '', phone: '', national_id: '', insurance_provider: '', insurance_policy_no: '', emergency_contact_name: '', emergency_contact_phone: '' });
    setEncounterOpen({ patientId: p.id, name: `${p.first_name} ${p.last_name}` });
  };

  const handleStartEncounter = async () => {
    if (!encounterOpen) return;
    await createEncounter.mutateAsync({
      patient_id: encounterOpen.patientId, ...encForm,
    });
    const dest = encForm.encounter_type === 'er' ? '/hospital/er' : '/hospital/opd';
    setEncounterOpen(null);
    navigate(dest);
  };

  return (
    <HospitalShell
      title="Reception / Front Desk"
      subtitle="Patient registration, check-in, and visit creation"
      icon={<UserPlus className="h-5 w-5" />}
      actions={<Button onClick={() => setRegisterOpen(true)}><UserPlus className="h-4 w-4 mr-2" />New Patient</Button>}
    >
      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Patient Search</TabsTrigger>
          <TabsTrigger value="register">Quick Register</TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, MRN, phone or national ID…" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/hospital/patient-files/${p.id}`)}>
                      <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                      <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                      <TableCell className="capitalize">{p.gender}</TableCell>
                      <TableCell>{p.date_of_birth || '—'}</TableCell>
                      <TableCell>{p.phone || '—'}</TableCell>
                      <TableCell>{p.insurance_provider || '—'}</TableCell>
                      <TableCell>
                        {p.is_vip && <Badge variant="outline" className={statusColor('urgent')}>VIP</Badge>}
                        {p.allergies?.length ? <Badge variant="outline" className={statusColor('critical')}>Allergy</Badge> : null}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEncounterOpen({ patientId: p.id, name: `${p.first_name} ${p.last_name}` }); }}>
                          <Activity className="h-3.5 w-3.5 mr-1" />Check-in
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/hospital/patient-files/${p.id}`); }}>
                          <FileText className="h-3.5 w-3.5 mr-1" />File
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {patients.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
            <CardHeader><CardTitle>Quick Patient Registration</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={() => setRegisterOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Open Form</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Register New Patient</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            <div><Label>National ID</Label><Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })} /></div>
            <div><Label>Insurance Policy #</Label><Input value={form.insurance_policy_no} onChange={(e) => setForm({ ...form, insurance_policy_no: e.target.value })} /></div>
            <div><Label>Emergency Contact</Label><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
            <div><Label>Emergency Phone</Label><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={createPatient.isPending}>Register & Check-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encounter Dialog */}
      <Dialog open={!!encounterOpen} onOpenChange={(o) => !o && setEncounterOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Encounter — {encounterOpen?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Visit Type</Label>
              <Select value={encForm.encounter_type} onValueChange={(v) => setEncForm({ ...encForm, encounter_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opd">OPD / Outpatient</SelectItem>
                  <SelectItem value="er">Emergency (ER)</SelectItem>
                  <SelectItem value="lab_only">Lab Only</SelectItem>
                  <SelectItem value="radiology_only">Radiology Only</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Department / Clinic</Label><Input value={encForm.department} onChange={(e) => setEncForm({ ...encForm, department: e.target.value })} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={encForm.visit_priority} onValueChange={(v) => setEncForm({ ...encForm, visit_priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Chief Complaint / Reason</Label><Textarea rows={3} value={encForm.chief_complaint} onChange={(e) => setEncForm({ ...encForm, chief_complaint: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncounterOpen(null)}>Cancel</Button>
            <Button onClick={handleStartEncounter} disabled={createEncounter.isPending}>Create & Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalShell>
  );
}
