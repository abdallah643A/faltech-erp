import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserRound, Search } from 'lucide-react';
import { usePatients } from '@/hooks/useHISEnhanced';

export default function PatientMasterPage() {
  const { data: patients = [], upsert } = usePatients();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<any>({ preferred_language: 'en', gender: 'male' });

  const filtered = patients.filter((p: any) => {
    const s = search.toLowerCase();
    return !s || p.mrn?.toLowerCase().includes(s) || `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) || p.national_id?.includes(s);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserRound className="h-6 w-6 text-primary" />Patient Master Records</h1>
          <p className="text-muted-foreground">MRN registry with NPHIES & CCHI integration</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />New Patient</Button>
      </div>

      <Card><CardContent className="pt-6">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search MRN, name, ID…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>MRN</TableHead><TableHead>Name</TableHead><TableHead dir="rtl">الاسم</TableHead>
            <TableHead>National ID</TableHead><TableHead>Gender</TableHead><TableHead>DOB</TableHead>
            <TableHead>Mobile</TableHead><TableHead>Insurance</TableHead><TableHead>VIP</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.mrn}</TableCell>
                <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                <TableCell dir="rtl" className="text-xs">{p.full_name_ar || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{p.national_id || p.iqama_number || '—'}</TableCell>
                <TableCell><Badge variant="outline">{p.gender}</Badge></TableCell>
                <TableCell className="text-xs">{p.date_of_birth || '—'}</TableCell>
                <TableCell className="text-xs">{p.mobile || '—'}</TableCell>
                <TableCell className="text-xs">{p.insurance_payer || '—'}</TableCell>
                <TableCell>{p.vip_status && <Badge>VIP</Badge>}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No patients</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Patient</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>MRN *</Label><Input value={draft.mrn || ''} onChange={(e) => setDraft({ ...draft, mrn: e.target.value })} /></div>
            <div><Label>National ID</Label><Input value={draft.national_id || ''} onChange={(e) => setDraft({ ...draft, national_id: e.target.value })} /></div>
            <div><Label>First Name *</Label><Input value={draft.first_name || ''} onChange={(e) => setDraft({ ...draft, first_name: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={draft.last_name || ''} onChange={(e) => setDraft({ ...draft, last_name: e.target.value })} /></div>
            <div className="col-span-2"><Label dir="rtl">الاسم بالعربي</Label><Input dir="rtl" value={draft.full_name_ar || ''} onChange={(e) => setDraft({ ...draft, full_name_ar: e.target.value })} /></div>
            <div>
              <Label>Gender</Label>
              <Select value={draft.gender} onValueChange={(v) => setDraft({ ...draft, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['male', 'female', 'other'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date of Birth</Label><Input type="date" value={draft.date_of_birth || ''} onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })} /></div>
            <div><Label>Blood Group</Label><Input value={draft.blood_group || ''} onChange={(e) => setDraft({ ...draft, blood_group: e.target.value })} placeholder="A+, O−…" /></div>
            <div><Label>Nationality</Label><Input value={draft.nationality || ''} onChange={(e) => setDraft({ ...draft, nationality: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input value={draft.mobile || ''} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={draft.email || ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={draft.address || ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
            <div><Label>Insurance Payer</Label><Input value={draft.insurance_payer || ''} onChange={(e) => setDraft({ ...draft, insurance_payer: e.target.value })} placeholder="Bupa, Tawuniya, MedGulf…" /></div>
            <div><Label>Policy Number</Label><Input value={draft.insurance_policy_no || ''} onChange={(e) => setDraft({ ...draft, insurance_policy_no: e.target.value })} /></div>
            <div><Label>NPHIES Patient ID</Label><Input value={draft.nphies_patient_id || ''} onChange={(e) => setDraft({ ...draft, nphies_patient_id: e.target.value })} /></div>
            <div><Label>CCHI Member ID</Label><Input value={draft.cchi_member_id || ''} onChange={(e) => setDraft({ ...draft, cchi_member_id: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await upsert.mutateAsync(draft); setOpen(false); setDraft({ preferred_language: 'en', gender: 'male' }); }} disabled={!draft.mrn || !draft.first_name || !draft.last_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
