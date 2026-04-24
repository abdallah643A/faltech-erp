import { useState } from 'react';
import { useCTCSnapshots, useCreateCTC } from '@/hooks/useContractorSuite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, Plus } from 'lucide-react';

export default function CTCForecastPage() {
  const { language } = useLanguage(); const isAr = language === 'ar';
  const { data = [] } = useCTCSnapshots();
  const create = useCreateCTC();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ bac: 0, pv: 0, ev: 0, ac: 0, etc: 0, committed: 0 });

  const healthBadge = (h: string) => h === 'green' ? 'default' : h === 'amber' ? 'secondary' : 'destructive';

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-primary" />{isAr ? 'تكلفة الإنجاز / EAC' : 'Cost-to-Complete (EVM)'}</h1>
          <p className="text-sm text-muted-foreground">{isAr ? 'CPI / SPI / EAC / VAC حسب AACE' : 'AACE-style EVM snapshots: CPI / SPI / EAC / VAC'}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{isAr ? 'لقطة جديدة' : 'New Snapshot'}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{isAr ? 'لقطة EVM' : 'EVM Snapshot'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project ID</Label><Input value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value })} /></div>
              <div><Label>Date</Label><Input type="date" value={form.snapshot_date || ''} onChange={e => setForm({ ...form, snapshot_date: e.target.value })} /></div>
              <div><Label>BAC</Label><Input type="number" value={form.bac} onChange={e => setForm({ ...form, bac: +e.target.value })} /></div>
              <div><Label>PV</Label><Input type="number" value={form.pv} onChange={e => setForm({ ...form, pv: +e.target.value })} /></div>
              <div><Label>EV</Label><Input type="number" value={form.ev} onChange={e => setForm({ ...form, ev: +e.target.value })} /></div>
              <div><Label>AC</Label><Input type="number" value={form.ac} onChange={e => setForm({ ...form, ac: +e.target.value })} /></div>
              <div><Label>Committed</Label><Input type="number" value={form.committed} onChange={e => setForm({ ...form, committed: +e.target.value })} /></div>
              <div><Label>ETC (manual)</Label><Input type="number" value={form.etc} onChange={e => setForm({ ...form, etc: +e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">CPI=EV/AC · SPI=EV/PV · EAC=BAC/CPI · VAC=BAC-EAC (auto).</p>
            <Button onClick={() => create.mutate(form, { onSuccess: () => setOpen(false) })} disabled={create.isPending}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle>{isAr ? 'لقطات EVM' : 'EVM Snapshots'}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">BAC</TableHead><TableHead className="text-right">EAC</TableHead><TableHead className="text-right">VAC</TableHead><TableHead className="text-right">CPI</TableHead><TableHead className="text-right">SPI</TableHead><TableHead>Health</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.snapshot_date}</TableCell>
                  <TableCell className="text-right">{Number(r.bac).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(r.eac).toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.vac < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{Number(r.vac).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{r.cpi?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className="text-right">{r.spi?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell><Badge variant={healthBadge(r.health)}>{r.health}</Badge></TableCell>
                </TableRow>
              ))}
              {!data.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">{isAr ? 'لا توجد لقطات' : 'No snapshots yet'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
