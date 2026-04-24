import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useBidManagement } from '@/hooks/useBidManagement';
import { Plus, Search } from 'lucide-react';

export default function BidLaborRates() {
  const { laborRates, createLaborRate } = useBidManagement();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = (laborRates.data || []).filter(r =>
    !search || r.trade.toLowerCase().includes(search.toLowerCase()) ||
    (r.classification || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (formData: FormData) => {
    await createLaborRate.mutateAsync({
      trade: formData.get('trade') as string,
      classification: formData.get('classification') as string,
      region: formData.get('region') as string,
      hourly_rate: Number(formData.get('hourly_rate')) || 0,
      overtime_multiplier: Number(formData.get('overtime_multiplier')) || 1.5,
      productivity_factor: Number(formData.get('productivity_factor')) || 1.0,
    } as any);
    setShowAdd(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Labor Rate Tables</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades..." className="pl-9 w-64" />
            </div>
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Rate</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Labor Rate</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); handleAdd(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Trade *</Label><Input name="trade" required placeholder="Electrician, Plumber..." /></div>
                    <div className="space-y-2"><Label>Classification</Label><Input name="classification" placeholder="Journeyman, Foreman..." /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Hourly Rate *</Label><Input name="hourly_rate" type="number" step="0.01" required /></div>
                    <div className="space-y-2"><Label>OT Multiplier</Label><Input name="overtime_multiplier" type="number" step="0.1" defaultValue="1.5" /></div>
                    <div className="space-y-2"><Label>Productivity Factor</Label><Input name="productivity_factor" type="number" step="0.1" defaultValue="1.0" /></div>
                  </div>
                  <div className="space-y-2"><Label>Region</Label><Input name="region" placeholder="Riyadh, Jeddah..." /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button type="submit">Add</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trade</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="text-right">Hourly Rate</TableHead>
              <TableHead className="text-right">OT Multiplier</TableHead>
              <TableHead className="text-right">Productivity</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No labor rates found</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.trade}</TableCell>
                <TableCell>{r.classification || '-'}</TableCell>
                <TableCell>{r.region || '-'}</TableCell>
                <TableCell className="text-right font-medium">{r.hourly_rate.toLocaleString()} {r.currency}/hr</TableCell>
                <TableCell className="text-right">{r.overtime_multiplier}x</TableCell>
                <TableCell className="text-right">{r.productivity_factor}</TableCell>
                <TableCell className="text-xs">{r.effective_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
