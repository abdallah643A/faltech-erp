import { useState } from 'react';
import { useTMOPortfolio } from '@/hooks/useTMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const domains = ['core_network', 'oss_bss', 'digital', 'enterprise_it', 'security'];
const domainColors: Record<string, string> = {
  core_network: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  oss_bss: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  digital: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  enterprise_it: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};
const statusColors: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  deferred: 'bg-muted text-muted-foreground',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function TechRoadmap() {
  const { roadmapItems, techAssets, createRoadmapItem } = useTMOPortfolio();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [horizonFilter, setHorizonFilter] = useState('all');
  const [form, setForm] = useState({
    title: '', description: '', domain: 'enterprise_it', item_type: 'upgrade',
    priority: 'medium', start_date: '', end_date: '', budget: 0,
    strategic_objective: '', horizon: '1_year', tech_asset_id: '',
  });

  const filtered = roadmapItems.filter(i => horizonFilter === 'all' || i.horizon === horizonFilter);

  // Group by domain for swimlane view
  const byDomain: Record<string, typeof roadmapItems> = {};
  domains.forEach(d => { byDomain[d] = filtered.filter(i => i.domain === d); });

  const handleSubmit = () => {
    if (!form.title) return;
    createRoadmapItem.mutate({
      ...form,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      tech_asset_id: form.tech_asset_id || null,
      created_by: user?.id,
    } as any);
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Map className="h-5 w-5 text-primary" /> Technology Roadmap</h3>
        <div className="flex gap-2">
          <Select value={horizonFilter} onValueChange={setHorizonFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Horizons</SelectItem>
              <SelectItem value="1_year">1 Year</SelectItem>
              <SelectItem value="3_year">3 Year</SelectItem>
              <SelectItem value="5_year">5 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setIsOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      {/* Swimlane View */}
      {domains.map(domain => {
        const items = byDomain[domain] || [];
        if (items.length === 0 && filtered.length > 0) return null;
        return (
          <Card key={domain}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={domainColors[domain]}>{domain.replace('_', ' / ')}</Badge>
                <span className="text-muted-foreground font-normal">{items.length} items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No items in this domain</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {items.map(item => (
                    <div key={item.id} className="min-w-[200px] border rounded-lg p-3 space-y-1.5 shrink-0">
                      <p className="font-medium text-sm">{item.title}</p>
                      <div className="flex gap-1 flex-wrap">
                        <Badge className={`text-[10px] ${statusColors[item.status] || ''}`}>{item.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{item.horizon.replace('_', ' ')}</Badge>
                      </div>
                      {item.start_date && <p className="text-[10px] text-muted-foreground">{item.start_date} → {item.end_date || '?'}</p>}
                      {item.budget > 0 && <p className="text-xs font-medium">{item.budget.toLocaleString()} SAR</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No roadmap items. Add technology initiatives to build your roadmap.</CardContent></Card>
      )}

      {/* Add Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Roadmap Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Domain</Label>
                <Select value={form.domain} onValueChange={v => setForm({...form, domain: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{domains.map(d => <SelectItem key={d} value={d}>{d.replace('_', ' / ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.item_type} onValueChange={v => setForm({...form, item_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['new_deployment','upgrade','migration','replacement','retirement','integration'].map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Horizon</Label>
                <Select value={form.horizon} onValueChange={v => setForm({...form, horizon: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_year">1 Year</SelectItem>
                    <SelectItem value="3_year">3 Year</SelectItem>
                    <SelectItem value="5_year">5 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Linked Tech Asset</Label>
              <Select value={form.tech_asset_id} onValueChange={v => setForm({...form, tech_asset_id: v})}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {techAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Strategic Objective</Label><Input value={form.strategic_objective} onChange={e => setForm({...form, strategic_objective: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.title}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
