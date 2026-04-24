import { useState } from 'react';
import { useQualityTests } from '@/hooks/useQualityManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, ShieldCheck, AlertTriangle, CheckCircle, XCircle, MoreHorizontal, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { useLanguage } from '@/contexts/LanguageContext';

export default function QualityManagement() {
  const { t } = useLanguage();
  const { tests, isLoading, createTest, updateTest } = useQualityTests();
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({ test_name: '', test_type: 'incoming', item_description: '', item_code: '', sample_size: 1, notes: '' });

  const filtered = (tests || []).filter(t => {
    const matchesSearch = !searchTerm || t.test_name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.test_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || t.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: tests?.length || 0,
    pending: tests?.filter(t => t.status === 'pending').length || 0,
    passed: tests?.filter(t => t.result === 'pass').length || 0,
    failed: tests?.filter(t => t.result === 'fail').length || 0,
    defectRate: tests?.length ? ((tests.filter(t => t.result === 'fail').length / tests.length) * 100).toFixed(1) : '0',
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quality Management</h1>
          <p className="text-muted-foreground">Quality tests, inspections, and defect tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('quality'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <Button onClick={() => { setForm({ test_name: '', test_type: 'incoming', item_description: '', item_code: '', sample_size: 1, notes: '' }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />New Quality Test
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ClipboardCheck className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Tests</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">{t('common.pending')}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.passed}</p><p className="text-xs text-muted-foreground">Passed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{stats.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><ShieldCheck className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.defectRate}%</p><p className="text-xs text-muted-foreground">Defect Rate</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">{t('common.pending')}</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Test #</TableHead><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.type')}</TableHead>
            <TableHead>Item</TableHead><TableHead>Sample Size</TableHead><TableHead>Result</TableHead>
            <TableHead>Inspector</TableHead><TableHead>{t('common.status')}</TableHead><TableHead className="w-[50px]"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
             filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No quality tests found</TableCell></TableRow> :
             filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-sm">{t.test_number}</TableCell>
                <TableCell className="font-medium">{t.test_name}</TableCell>
                <TableCell><Badge variant="outline">{t.test_type}</Badge></TableCell>
                <TableCell>{t.item_description || '—'}</TableCell>
                <TableCell>{t.sample_size}</TableCell>
                <TableCell><Badge variant={t.result === 'pass' ? 'default' : t.result === 'fail' ? 'destructive' : 'outline'}>{t.result}</Badge></TableCell>
                <TableCell>{t.inspector_name || '—'}</TableCell>
                <TableCell><Badge variant={t.status === 'completed' ? 'secondary' : t.status === 'in_progress' ? 'default' : 'outline'}>{t.status}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {t.status === 'pending' && <DropdownMenuItem onClick={() => updateTest.mutate({ id: t.id, status: 'in_progress' })}>Start Inspection</DropdownMenuItem>}
                      {t.status === 'in_progress' && (
                        <>
                          <DropdownMenuItem onClick={() => updateTest.mutate({ id: t.id, status: 'completed', result: 'pass', inspected_at: new Date().toISOString() })}><CheckCircle className="h-4 w-4 mr-2" />Pass</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateTest.mutate({ id: t.id, status: 'completed', result: 'fail', inspected_at: new Date().toISOString() })}><XCircle className="h-4 w-4 mr-2" />Fail</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Quality Test</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Test Name</Label><Input value={form.test_name} onChange={e => setForm({...form, test_name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('common.type')}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.test_type} onChange={e => setForm({...form, test_type: e.target.value})}>
                  <option value="incoming">Incoming</option><option value="in_process">In-Process</option><option value="final">Final</option><option value="outgoing">Outgoing</option>
                </select>
              </div>
              <div><Label>Sample Size</Label><Input type="number" value={form.sample_size} onChange={e => setForm({...form, sample_size: +e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Item Description</Label><Input value={form.item_description} onChange={e => setForm({...form, item_description: e.target.value})} /></div>
              <div><Label>Item Code</Label><Input value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value})} /></div>
            </div>
            <div><Label>{t('common.notes')}</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!form.test_name} onClick={() => { createTest.mutate(form); setFormOpen(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
