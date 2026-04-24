import { useMemo, useState } from 'react';
import { Activity, Plus, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useVitalsSnapshots, useRecordVitals, type VitalsSnapshot } from '@/hooks/useVitals';

function Sparkline({ values, color = 'hsl(var(--primary))', height = 28 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <div className="text-[10px] text-muted-foreground">—</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

const METRICS: Array<{ key: keyof VitalsSnapshot; label: string; unit: string; color: string }> = [
  { key: 'hr',     label: 'HR',    unit: 'bpm',   color: 'hsl(0 75% 55%)' },
  { key: 'sbp',    label: 'SBP',   unit: 'mmHg',  color: 'hsl(220 75% 55%)' },
  { key: 'spo2',   label: 'SpO₂',  unit: '%',     color: 'hsl(160 65% 45%)' },
  { key: 'rr',     label: 'RR',    unit: '/min',  color: 'hsl(280 60% 55%)' },
  { key: 'temp_c', label: 'Temp',  unit: '°C',    color: 'hsl(35 85% 55%)' },
];

export function VitalsPanel({ patientId, encounterId, bedId, compact }: { patientId: string; encounterId?: string | null; bedId?: string | null; compact?: boolean }) {
  const { data: snapshots = [], isLoading } = useVitalsSnapshots(patientId);
  const [open, setOpen] = useState(false);
  const record = useRecordVitals();
  const [form, setForm] = useState<any>({});

  const series = useMemo(() => {
    const map: Record<string, number[]> = {};
    METRICS.forEach((m) => {
      map[m.key as string] = snapshots.map((s) => s[m.key] as number).filter((v) => v != null) as number[];
    });
    return map;
  }, [snapshots]);

  const latest = snapshots[snapshots.length - 1];
  const criticalCount = snapshots.filter((s) => s.is_critical).length;

  const submit = () => {
    record.mutate({
      patient_id: patientId,
      encounter_id: encounterId || undefined,
      bed_id: bedId || undefined,
      source: 'manual',
      hr: form.hr ? parseInt(form.hr) : null,
      sbp: form.sbp ? parseInt(form.sbp) : null,
      dbp: form.dbp ? parseInt(form.dbp) : null,
      spo2: form.spo2 ? parseFloat(form.spo2) : null,
      rr: form.rr ? parseInt(form.rr) : null,
      temp_c: form.temp_c ? parseFloat(form.temp_c) : null,
      gcs: form.gcs ? parseInt(form.gcs) : null,
      pain_score: form.pain_score ? parseInt(form.pain_score) : null,
      notes: form.notes || null,
    } as any, { onSuccess: () => { setOpen(false); setForm({}); } });
  };

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Vitals — last 24h</span>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />{criticalCount} critical
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Record
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : snapshots.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center p-4 border-dashed border rounded">No vitals recorded yet</div>
      ) : (
        <div className={`grid ${compact ? 'grid-cols-5' : 'grid-cols-2 md:grid-cols-5'} gap-3`}>
          {METRICS.map((m) => {
            const v = latest?.[m.key] as number | null;
            const isAbnormal = latest?.is_critical && latest.critical_reasons?.includes(m.label.replace('SpO₂', 'SpO2'));
            return (
              <div key={String(m.key)} className={`p-2 rounded border ${isAbnormal ? 'border-destructive bg-destructive/5' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase">{m.label}</span>
                  <span className="text-[9px] text-muted-foreground">{m.unit}</span>
                </div>
                <div className={`text-lg font-semibold ${isAbnormal ? 'text-destructive' : ''}`}>
                  {v ?? '—'}
                </div>
                <Sparkline values={series[m.key as string]} color={m.color} />
              </div>
            );
          })}
        </div>
      )}

      {latest && (
        <div className="text-[10px] text-muted-foreground mt-2">
          Last: {new Date(latest.recorded_at).toLocaleString()} • Source: {latest.source}
          {latest.device_label && ` (${latest.device_label})`}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Vitals Snapshot</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              ['hr', 'HR (bpm)'], ['sbp', 'SBP (mmHg)'], ['dbp', 'DBP (mmHg)'],
              ['spo2', 'SpO₂ (%)'], ['rr', 'RR (/min)'], ['temp_c', 'Temp (°C)'],
              ['gcs', 'GCS (3–15)'], ['pain_score', 'Pain (0–10)'],
            ].map(([k, lbl]) => (
              <div key={k}>
                <Label className="text-xs">{lbl}</Label>
                <Input type="number" step="0.1" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-8" />
              </div>
            ))}
            <div className="col-span-2">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={record.isPending}>{record.isPending ? 'Saving…' : 'Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
