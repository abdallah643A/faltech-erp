import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Radar } from 'lucide-react';

interface RadarItem {
  id: string;
  name: string;
  quadrant: string;
  ring: string;
  description: string;
  moved: 'up' | 'down' | 'none';
}

const RINGS = ['adopt', 'trial', 'assess', 'hold'] as const;
const QUADRANTS = ['Languages & Frameworks', 'Platforms', 'Tools', 'Techniques'] as const;

const RING_COLORS = {
  adopt: 'bg-emerald-500 text-white',
  trial: 'bg-blue-500 text-white',
  assess: 'bg-amber-500 text-white',
  hold: 'bg-muted text-muted-foreground',
};

const RING_DESCRIPTIONS = {
  adopt: 'Strong confidence to use in production',
  trial: 'Worth pursuing. Understand how to build capability',
  assess: 'Worth exploring to understand how it will affect you',
  hold: 'Proceed with caution',
};

export function TechnologyRadar({ techAssets = [] }: { techAssets: any[] }) {
  const [items, setItems] = useState<RadarItem[]>(() => {
    // Seed from tech assets
    return techAssets.slice(0, 8).map(a => ({
      id: a.id,
      name: a.name,
      quadrant: a.category === 'infrastructure' ? 'Platforms' : a.category === 'application' ? 'Tools' : 'Languages & Frameworks',
      ring: a.lifecycle_status === 'active' ? 'adopt' : a.lifecycle_status === 'pilot' ? 'trial' : a.lifecycle_status === 'end_of_life' ? 'hold' : 'assess',
      description: a.description || '',
      moved: 'none' as const,
    }));
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', quadrant: 'Tools', ring: 'assess', description: '', moved: 'none' as const });

  const handleAdd = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), ...form }]);
    setDialogOpen(false);
    setForm({ name: '', quadrant: 'Tools', ring: 'assess', description: '', moved: 'none' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Radar className="h-5 w-5" /> Technology Radar</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
      </div>

      {/* Ring Legend */}
      <div className="flex gap-2 flex-wrap">
        {RINGS.map(ring => (
          <div key={ring} className="flex items-center gap-1.5">
            <div className={`h-3 w-8 rounded-full ${RING_COLORS[ring]}`} />
            <span className="text-xs font-medium capitalize">{ring}</span>
            <span className="text-xs text-muted-foreground">— {RING_DESCRIPTIONS[ring]}</span>
          </div>
        ))}
      </div>

      {/* Radar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map(quad => {
          const quadItems = items.filter(i => i.quadrant === quad);
          return (
            <Card key={quad}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{quad}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {RINGS.map(ring => {
                  const ringItems = quadItems.filter(i => i.ring === ring);
                  if (ringItems.length === 0) return null;
                  return (
                    <div key={ring}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{ring}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ringItems.map(item => (
                          <Badge key={item.id} className={`${RING_COLORS[ring]} text-xs`}>
                            {item.moved === 'up' ? '↑ ' : item.moved === 'down' ? '↓ ' : ''}{item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {quadItems.length === 0 && <p className="text-xs text-muted-foreground">No entries</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        {RINGS.map(ring => (
          <Card key={ring}>
            <CardContent className="pt-3 pb-2 px-3 text-center">
              <p className="text-xs text-muted-foreground capitalize">{ring}</p>
              <p className="text-xl font-bold">{items.filter(i => i.ring === ring).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Radar Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Technology Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.quadrant} onValueChange={v => setForm(f => ({ ...f, quadrant: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUADRANTS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.ring} onValueChange={v => setForm(f => ({ ...f, ring: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RINGS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Select value={form.moved} onValueChange={v => setForm(f => ({ ...f, moved: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No movement</SelectItem>
                <SelectItem value="up">↑ Moved up</SelectItem>
                <SelectItem value="down">↓ Moved down</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Button onClick={handleAdd} disabled={!form.name} className="w-full">Add to Radar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
