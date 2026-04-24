import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNeonatalRecord, useUpsertNeonatalRecord } from '@/hooks/useNeonatal';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';

export function NeonatalRecordDialog({ baby, open, onClose }: { baby: any; open: boolean; onClose: () => void }) {
  const { data: existing } = useNeonatalRecord(baby?.id);
  const upsert = useUpsertNeonatalRecord();

  const [form, setForm] = useState<any>({});
  const [motherSearch, setMotherSearch] = useState('');
  const [motherResults, setMotherResults] = useState<any[]>([]);

  useEffect(() => {
    if (existing) setForm(existing);
    else setForm({ baby_patient_id: baby?.id, resuscitation_required: false });
  }, [existing, baby]);

  const searchMother = async () => {
    if (motherSearch.length < 2) return;
    const sb: any = supabase;
    const { data } = await sb.from('hosp_patients')
      .select('id,mrn,first_name,last_name,date_of_birth,gender')
      .or(`mrn.ilike.%${motherSearch}%,first_name.ilike.%${motherSearch}%,last_name.ilike.%${motherSearch}%`)
      .neq('id', baby?.id).eq('gender', 'female').limit(8);
    setMotherResults(data || []);
  };

  const linkMother = (m: any) => {
    setForm((f: any) => ({ ...f, mother_patient_id: m.id, mother_mrn: m.mrn, mother_name: `${m.first_name} ${m.last_name}` }));
    setMotherResults([]);
  };

  const save = () => {
    upsert.mutate({ ...form, baby_patient_id: baby.id }, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neonatal Record — {baby?.first_name} {baby?.last_name} ({baby?.mrn})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 bg-muted/30">
            <Label className="text-xs font-semibold">Mother (link to existing patient)</Label>
            {form.mother_name ? (
              <div className="flex items-center justify-between mt-1">
                <div className="text-sm">{form.mother_name} <span className="text-muted-foreground">({form.mother_mrn})</span></div>
                <Button size="sm" variant="ghost" onClick={() => setForm((f: any) => ({ ...f, mother_patient_id: null, mother_mrn: null, mother_name: null }))}>Unlink</Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mt-1">
                  <Input placeholder="Search mother by MRN/name…" value={motherSearch} onChange={(e) => setMotherSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchMother()} className="h-8" />
                  <Button size="sm" variant="outline" onClick={searchMother}><Search className="h-3 w-3" /></Button>
                </div>
                {motherResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {motherResults.map((m: any) => (
                      <button key={m.id} onClick={() => linkMother(m)} className="w-full text-left text-xs p-2 rounded hover:bg-accent border">
                        <b>{m.first_name} {m.last_name}</b> <span className="text-muted-foreground">— {m.mrn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Birth time</Label>
              <Input type="datetime-local" value={form.birth_time?.slice(0, 16) || ''} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Delivery type</Label>
              <Select value={form.delivery_type || ''} onValueChange={(v) => setForm({ ...form, delivery_type: v })}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vaginal">Vaginal</SelectItem>
                  <SelectItem value="c_section">C-Section</SelectItem>
                  <SelectItem value="assisted">Assisted</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Birth weight (g)</Label>
              <Input type="number" value={form.birth_weight_grams || ''} onChange={(e) => setForm({ ...form, birth_weight_grams: e.target.value ? parseInt(e.target.value) : null })} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Gestational age (weeks)</Label>
              <Input type="number" step="0.1" value={form.gestational_age_weeks || ''} onChange={(e) => setForm({ ...form, gestational_age_weeks: e.target.value ? parseFloat(e.target.value) : null })} className="h-8" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">APGAR 1 min</Label>
              <Input type="number" min="0" max="10" value={form.apgar_1min ?? ''} onChange={(e) => setForm({ ...form, apgar_1min: e.target.value ? parseInt(e.target.value) : null })} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">APGAR 5 min</Label>
              <Input type="number" min="0" max="10" value={form.apgar_5min ?? ''} onChange={(e) => setForm({ ...form, apgar_5min: e.target.value ? parseInt(e.target.value) : null })} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">APGAR 10 min</Label>
              <Input type="number" min="0" max="10" value={form.apgar_10min ?? ''} onChange={(e) => setForm({ ...form, apgar_10min: e.target.value ? parseInt(e.target.value) : null })} className="h-8" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={!!form.resuscitation_required} onCheckedChange={(v) => setForm({ ...form, resuscitation_required: v })} />
            <Label className="text-xs">Resuscitation required</Label>
          </div>

          <div>
            <Label className="text-xs">Complications</Label>
            <Textarea rows={2} value={form.complications || ''} onChange={(e) => setForm({ ...form, complications: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
