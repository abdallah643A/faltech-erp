import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Calendar } from 'lucide-react';

interface RateCard {
  id: string;
  name: string;
  version: string;
  effective_from: string;
  effective_to: string;
  category: string;
  status: string;
  rates: Rate[];
}

interface Rate {
  description: string;
  unit: string;
  rate: number;
  currency: string;
}

export function RateCardManager() {
  const [cards, setCards] = useState<RateCard[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', version: '1.0', effective_from: '', effective_to: '', category: 'labor', status: 'active',
  });
  const [rateForm, setRateForm] = useState({ description: '', unit: 'hour', rate: '', currency: 'SAR' });
  const [tempRates, setTempRates] = useState<Rate[]>([]);

  const handleAddRate = () => {
    setTempRates(prev => [...prev, { description: rateForm.description, unit: rateForm.unit, rate: Number(rateForm.rate), currency: rateForm.currency }]);
    setRateForm({ description: '', unit: 'hour', rate: '', currency: 'SAR' });
  };

  const handleSaveCard = () => {
    setCards(prev => [...prev, { id: crypto.randomUUID(), ...form, rates: tempRates }]);
    setDialogOpen(false);
    setTempRates([]);
  };

  const activeCard = cards.find(c => c.id === selectedCard);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" /> Rate Card Management</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Rate Card</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Rate Cards</p>
          <p className="text-2xl font-bold">{cards.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold">{cards.filter(c => c.status === 'active').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{new Set(cards.map(c => c.category)).size}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rate Cards</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cards.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No rate cards yet</p>}
            {cards.map(c => (
              <div key={c.id} onClick={() => setSelectedCard(c.id)} className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedCard === c.id ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 hover:bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{c.name}</p>
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">v{c.version} · {c.category} · {c.rates.length} rates</p>
                <div className="flex items-center gap-1 mt-1"><Calendar className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{c.effective_from} → {c.effective_to}</span></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{activeCard ? `${activeCard.name} — Rates` : 'Select a rate card'}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {activeCard ? (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Description</TableHead><TableHead>Unit</TableHead><TableHead>Rate</TableHead><TableHead>Currency</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {activeCard.rates.map((r, i) => (
                    <TableRow key={i}><TableCell>{r.description}</TableCell><TableCell>{r.unit}</TableCell><TableCell className="font-bold">{r.rate.toLocaleString()}</TableCell><TableCell>{r.currency}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm">Select a rate card to view rates</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Rate Card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Rate Card Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Version" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
              <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
              <Input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} />
            </div>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['labor', 'material', 'equipment', 'subcontractor', 'overhead'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            
            <div className="border-t pt-3 space-y-2">
              <p className="text-sm font-medium">Add Rates</p>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Description" value={rateForm.description} onChange={e => setRateForm(f => ({ ...f, description: e.target.value }))} className="col-span-2" />
                <Input placeholder="Unit" value={rateForm.unit} onChange={e => setRateForm(f => ({ ...f, unit: e.target.value }))} />
                <Input type="number" placeholder="Rate" value={rateForm.rate} onChange={e => setRateForm(f => ({ ...f, rate: e.target.value }))} />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddRate} disabled={!rateForm.description || !rateForm.rate}>Add Rate</Button>
              {tempRates.length > 0 && (
                <div className="text-xs text-muted-foreground">{tempRates.length} rate(s) added</div>
              )}
            </div>

            <Button onClick={handleSaveCard} disabled={!form.name} className="w-full">Save Rate Card</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
