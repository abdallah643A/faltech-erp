import { useState } from 'react';
import { usePickLists } from '@/hooks/usePickPack';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, PackageCheck, Truck, ClipboardList, MoreHorizontal, Play, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open', variant: 'outline' },
  picking: { label: 'Picking', variant: 'default' },
  picked: { label: 'Picked', variant: 'secondary' },
  packing: { label: 'Packing', variant: 'default' },
  packed: { label: 'Packed', variant: 'secondary' },
  shipped: { label: 'Shipped', variant: 'default' },
};

export default function PickAndPack() {
  const { t } = useLanguage();
  const { pickLists, isLoading, createPickList, updatePickList } = usePickLists();
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({ source_number: '', warehouse: '', priority: 'normal', notes: '' });

  const filtered = (pickLists || []).filter(pl => {
    const matchesSearch = !searchTerm || pl.pick_number?.toLowerCase().includes(searchTerm.toLowerCase()) || pl.source_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || pl.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: pickLists?.length || 0,
    open: pickLists?.filter(p => p.status === 'open').length || 0,
    inProgress: pickLists?.filter(p => ['picking', 'packing'].includes(p.status)).length || 0,
    shipped: pickLists?.filter(p => p.status === 'shipped').length || 0,
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pick & Pack</h1>
          <p className="text-muted-foreground">Warehouse picking, packing, and shipping workflows</p>
        </div>
        <Button onClick={() => { setForm({ source_number: '', warehouse: '', priority: 'normal', notes: '' }); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Pick List
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ClipboardList className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Lists</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><PackageCheck className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.open}</p><p className="text-xs text-muted-foreground">Open</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Play className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><Truck className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.shipped}</p><p className="text-xs text-muted-foreground">Shipped</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pick lists..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="picking">Picking</TabsTrigger>
            <TabsTrigger value="packed">Packed</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pick #</TableHead><TableHead>Source</TableHead><TableHead>Warehouse</TableHead>
            <TableHead>Picker</TableHead><TableHead>Priority</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Created</TableHead><TableHead className="w-[50px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
             filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pick lists found</TableCell></TableRow> :
             filtered.map(pl => {
              const cfg = statusConfig[pl.status] || statusConfig.open;
              return (
                <TableRow key={pl.id}>
                  <TableCell className="font-mono text-sm">{pl.pick_number}</TableCell>
                  <TableCell>{pl.source_number || '—'}</TableCell>
                  <TableCell>{pl.warehouse || '—'}</TableCell>
                  <TableCell>{pl.picker_name || '—'}</TableCell>
                  <TableCell><Badge variant={pl.priority === 'urgent' ? 'destructive' : pl.priority === 'high' ? 'default' : 'outline'}>{pl.priority}</Badge></TableCell>
                  <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(pl.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {pl.status === 'open' && <DropdownMenuItem onClick={() => updatePickList.mutate({ id: pl.id, status: 'picking' })}><Play className="h-4 w-4 mr-2" />Start Picking</DropdownMenuItem>}
                        {pl.status === 'picking' && <DropdownMenuItem onClick={() => updatePickList.mutate({ id: pl.id, status: 'picked', picked_at: new Date().toISOString() })}><CheckCircle className="h-4 w-4 mr-2" />Mark Picked</DropdownMenuItem>}
                        {pl.status === 'picked' && <DropdownMenuItem onClick={() => updatePickList.mutate({ id: pl.id, status: 'packing' })}><PackageCheck className="h-4 w-4 mr-2" />Start Packing</DropdownMenuItem>}
                        {pl.status === 'packing' && <DropdownMenuItem onClick={() => updatePickList.mutate({ id: pl.id, status: 'packed', packed_at: new Date().toISOString() })}><CheckCircle className="h-4 w-4 mr-2" />Mark Packed</DropdownMenuItem>}
                        {pl.status === 'packed' && <DropdownMenuItem onClick={() => updatePickList.mutate({ id: pl.id, status: 'shipped', shipped_at: new Date().toISOString() })}><Truck className="h-4 w-4 mr-2" />Ship</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
             })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Pick List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Source Document #</Label><Input value={form.source_number} onChange={e => setForm({...form, source_number: e.target.value})} placeholder="SO-001" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Warehouse</Label><Input value={form.warehouse} onChange={e => setForm({...form, warehouse: e.target.value})} /></div>
              <div><Label>Priority</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => { createPickList.mutate(form); setFormOpen(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
