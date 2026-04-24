import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useBOQ } from '@/hooks/useBOQ';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatSAR } from '@/lib/currency';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  GitCompare, Plus, Download, CheckCircle2, XCircle, ArrowUp, ArrowDown,
  Minus, Equal, TrendingUp, TrendingDown, FileText, Eye, Search, Filter,
  Camera, ThumbsUp, ThumbsDown,
} from 'lucide-react';

interface VersionSnapshot {
  id: string;
  company_id: string | null;
  project_id: string | null;
  version_number: number;
  version_label: string;
  total_amount: number;
  total_items: number;
  sections_data: any[];
  items_data: any[];
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

interface ComparisonReport {
  id: string;
  version_a_id: string | null;
  version_b_id: string | null;
  version_a_label: string;
  version_b_label: string;
  comparison_data: any;
  total_additions: number;
  total_removals: number;
  total_modifications: number;
  total_unchanged: number;
  cost_impact: number;
  cost_impact_percent: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

interface DiffItem {
  item_ref: string;
  description_a: string;
  description_b: string;
  section_a: string;
  section_b: string;
  unit_a: string;
  unit_b: string;
  quantity_a: number;
  quantity_b: number;
  rate_a: number;
  rate_b: number;
  amount_a: number;
  amount_b: number;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged';
  changes: string[];
}

const changeColors: Record<string, string> = {
  added: 'bg-green-50 dark:bg-green-950/30',
  removed: 'bg-red-50 dark:bg-red-950/30',
  modified: 'bg-amber-50 dark:bg-amber-950/30',
  unchanged: '',
};

const changeBadgeColors: Record<string, string> = {
  added: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  modified: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  unchanged: 'bg-muted text-muted-foreground',
};

export default function BOQVersionComparison() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { sections, allItems } = useBOQ();

  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showReport, setShowReport] = useState<ComparisonReport | null>(null);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproval, setShowApproval] = useState<ComparisonReport | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch snapshots
  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ['boq-snapshots', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('boq_version_snapshots').select('*').order('version_number', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as VersionSnapshot[];
    },
  });

  // Fetch comparison reports
  const { data: reports = [] } = useQuery({
    queryKey: ['boq-comparison-reports', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('boq_comparison_reports').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ComparisonReport[];
    },
  });

  // Create snapshot from current BOQ
  const createSnapshot = useMutation({
    mutationFn: async () => {
      const secs = sections.data || [];
      const items = allItems.data || [];
      const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
      const nextVersion = (snapshots.length > 0 ? Math.max(...snapshots.map(s => s.version_number)) : 0) + 1;

      const { error } = await supabase.from('boq_version_snapshots').insert({
        company_id: activeCompanyId,
        version_number: nextVersion,
        version_label: snapshotLabel || `v${nextVersion}`,
        total_amount: totalAmount,
        total_items: items.length,
        sections_data: secs as any,
        items_data: items as any,
        notes: snapshotNotes || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-snapshots'] });
      toast({ title: 'Version snapshot created' });
      setShowSnapshot(false);
      setSnapshotLabel('');
      setSnapshotNotes('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Compare two versions
  const runComparison = useMutation({
    mutationFn: async () => {
      const snapA = snapshots.find(s => s.id === versionA);
      const snapB = snapshots.find(s => s.id === versionB);
      if (!snapA || !snapB) throw new Error('Select both versions');

      const itemsA: any[] = snapA.items_data || [];
      const itemsB: any[] = snapB.items_data || [];
      const secsA: any[] = snapA.sections_data || [];
      const secsB: any[] = snapB.sections_data || [];

      const secMapA = Object.fromEntries(secsA.map(s => [s.id, s.section_code + ' - ' + s.section_title]));
      const secMapB = Object.fromEntries(secsB.map(s => [s.id, s.section_code + ' - ' + s.section_title]));

      const mapA = new Map(itemsA.map(i => [i.item_ref, i]));
      const mapB = new Map(itemsB.map(i => [i.item_ref, i]));

      const diffItems: DiffItem[] = [];
      let additions = 0, removals = 0, modifications = 0, unchanged = 0;

      // Items in A
      for (const [ref, itemA] of mapA) {
        const itemB = mapB.get(ref);
        if (!itemB) {
          removals++;
          diffItems.push({
            item_ref: ref, description_a: itemA.description, description_b: '',
            section_a: secMapA[itemA.section_id] || '', section_b: '',
            unit_a: itemA.unit, unit_b: '',
            quantity_a: itemA.quantity, quantity_b: 0,
            rate_a: itemA.rate, rate_b: 0,
            amount_a: itemA.amount, amount_b: 0,
            change_type: 'removed', changes: ['Item removed'],
          });
        } else {
          const changes: string[] = [];
          if (itemA.quantity !== itemB.quantity) changes.push(`Qty: ${itemA.quantity} → ${itemB.quantity}`);
          if (itemA.rate !== itemB.rate) changes.push(`Rate: ${itemA.rate} → ${itemB.rate}`);
          if (itemA.unit !== itemB.unit) changes.push(`Unit: ${itemA.unit} → ${itemB.unit}`);
          if (itemA.description !== itemB.description) changes.push('Description changed');

          if (changes.length > 0) {
            modifications++;
            diffItems.push({
              item_ref: ref, description_a: itemA.description, description_b: itemB.description,
              section_a: secMapA[itemA.section_id] || '', section_b: secMapB[itemB.section_id] || '',
              unit_a: itemA.unit, unit_b: itemB.unit,
              quantity_a: itemA.quantity, quantity_b: itemB.quantity,
              rate_a: itemA.rate, rate_b: itemB.rate,
              amount_a: itemA.amount, amount_b: itemB.amount,
              change_type: 'modified', changes,
            });
          } else {
            unchanged++;
            diffItems.push({
              item_ref: ref, description_a: itemA.description, description_b: itemB.description,
              section_a: secMapA[itemA.section_id] || '', section_b: secMapB[itemB.section_id] || '',
              unit_a: itemA.unit, unit_b: itemB.unit,
              quantity_a: itemA.quantity, quantity_b: itemB.quantity,
              rate_a: itemA.rate, rate_b: itemB.rate,
              amount_a: itemA.amount, amount_b: itemB.amount,
              change_type: 'unchanged', changes: [],
            });
          }
        }
      }

      // Items only in B (additions)
      for (const [ref, itemB] of mapB) {
        if (!mapA.has(ref)) {
          additions++;
          diffItems.push({
            item_ref: ref, description_a: '', description_b: itemB.description,
            section_a: '', section_b: secMapB[itemB.section_id] || '',
            unit_a: '', unit_b: itemB.unit,
            quantity_a: 0, quantity_b: itemB.quantity,
            rate_a: 0, rate_b: itemB.rate,
            amount_a: 0, amount_b: itemB.amount,
            change_type: 'added', changes: ['New item'],
          });
        }
      }

      const costImpact = snapB.total_amount - snapA.total_amount;
      const costImpactPct = snapA.total_amount > 0 ? (costImpact / snapA.total_amount) * 100 : 0;

      const { error } = await supabase.from('boq_comparison_reports').insert({
        company_id: activeCompanyId,
        version_a_id: versionA,
        version_b_id: versionB,
        version_a_label: snapA.version_label,
        version_b_label: snapB.version_label,
        comparison_data: { items: diffItems } as any,
        total_additions: additions,
        total_removals: removals,
        total_modifications: modifications,
        total_unchanged: unchanged,
        cost_impact: costImpact,
        cost_impact_percent: costImpactPct,
        created_by: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-comparison-reports'] });
      toast({ title: 'Comparison report generated' });
      setShowCompare(false);
      setVersionA('');
      setVersionB('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Approve/reject comparison
  const updateReportStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const updates: any = { status, approved_by: user?.id, approved_at: new Date().toISOString() };
      if (reason) updates.rejection_reason = reason;
      const { error } = await supabase.from('boq_comparison_reports').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq-comparison-reports'] });
      toast({ title: 'Report status updated' });
      setShowApproval(null);
      setRejectionReason('');
    },
  });

  // Export comparison to Excel
  const exportComparison = (report: ComparisonReport) => {
    const items: DiffItem[] = report.comparison_data?.items || [];
    const rows = items.map(i => ({
      'Item Ref': i.item_ref,
      'Change Type': i.change_type.toUpperCase(),
      'Description (Version A)': i.description_a,
      'Description (Version B)': i.description_b,
      'Section (A)': i.section_a,
      'Section (B)': i.section_b,
      'Unit (A)': i.unit_a,
      'Unit (B)': i.unit_b,
      'Qty (A)': i.quantity_a,
      'Qty (B)': i.quantity_b,
      'Rate (A)': i.rate_a,
      'Rate (B)': i.rate_b,
      'Amount (A)': i.amount_a,
      'Amount (B)': i.amount_b,
      'Amount Diff': i.amount_b - i.amount_a,
      'Changes': i.changes.join('; '),
    }));

    const summaryRows = [
      { Metric: 'Version A', Value: report.version_a_label },
      { Metric: 'Version B', Value: report.version_b_label },
      { Metric: 'Additions', Value: report.total_additions },
      { Metric: 'Removals', Value: report.total_removals },
      { Metric: 'Modifications', Value: report.total_modifications },
      { Metric: 'Unchanged', Value: report.total_unchanged },
      { Metric: 'Cost Impact', Value: report.cost_impact },
      { Metric: 'Cost Impact %', Value: report.cost_impact_percent.toFixed(2) + '%' },
      { Metric: 'Status', Value: report.status },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Comparison Details');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.writeFile(wb, `BOQ_Comparison_${report.version_a_label}_vs_${report.version_b_label}.xlsx`);
  };

  // Report detail diff items
  const reportDiffItems: DiffItem[] = useMemo(() => {
    if (!showReport) return [];
    const items: DiffItem[] = showReport.comparison_data?.items || [];
    let filtered = items;
    if (filterType !== 'all') filtered = filtered.filter(i => i.change_type === filterType);
    if (searchTerm) filtered = filtered.filter(i =>
      i.item_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description_a.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description_b.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  }, [showReport, filterType, searchTerm]);

  const totalSections = sections.data?.length || 0;
  const totalItems = allItems.data?.length || 0;
  const totalAmount = allItems.data?.reduce((s, i) => s + (i.amount || 0), 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary" />
            {t('boqComparison.title') !== 'boqComparison.title' ? t('boqComparison.title') : 'BOQ Version Comparison'}
          </h1>
          <p className="text-muted-foreground">Compare BOQ revisions with detailed change tracking and approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSnapshot(true)} className="gap-2">
            <Camera className="h-4 w-4" /> Create Snapshot
          </Button>
          <Button onClick={() => setShowCompare(true)} variant="outline" className="gap-2" disabled={snapshots.length < 2}>
            <GitCompare className="h-4 w-4" /> Compare Versions
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Snapshots</p>
          <p className="text-2xl font-bold text-primary">{snapshots.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Reports</p>
          <p className="text-2xl font-bold text-primary">{reports.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Current Sections</p>
          <p className="text-2xl font-bold text-primary">{totalSections}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Current Items</p>
          <p className="text-2xl font-bold text-primary">{totalItems}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Current Total</p>
          <p className="text-2xl font-bold text-primary">{formatSAR(totalAmount)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="snapshots">
        <TabsList>
          <TabsTrigger value="snapshots">Version Snapshots ({snapshots.length})</TabsTrigger>
          <TabsTrigger value="reports">Comparison Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* Snapshots Tab */}
        <TabsContent value="snapshots">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No snapshots yet. Create a snapshot of your current BOQ to start comparing.
                    </TableCell></TableRow>
                  ) : snapshots.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono font-bold">v{s.version_number}</TableCell>
                      <TableCell className="font-medium">{s.version_label}</TableCell>
                      <TableCell className="text-right">{s.total_items}</TableCell>
                      <TableCell className="text-right font-mono">{formatSAR(s.total_amount)}</TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{s.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version A → B</TableHead>
                    <TableHead className="text-right text-green-600">Added</TableHead>
                    <TableHead className="text-right text-red-600">Removed</TableHead>
                    <TableHead className="text-right text-amber-600">Modified</TableHead>
                    <TableHead className="text-right">Unchanged</TableHead>
                    <TableHead className="text-right">Cost Impact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No comparison reports yet. Compare two snapshots to generate a report.
                    </TableCell></TableRow>
                  ) : reports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.version_a_label} → {r.version_b_label}</TableCell>
                      <TableCell className="text-right text-green-600 font-bold">+{r.total_additions}</TableCell>
                      <TableCell className="text-right text-red-600 font-bold">-{r.total_removals}</TableCell>
                      <TableCell className="text-right text-amber-600 font-bold">~{r.total_modifications}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.total_unchanged}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={r.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {r.cost_impact >= 0 ? '+' : ''}{formatSAR(r.cost_impact)} ({r.cost_impact_percent.toFixed(1)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          r.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          r.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-muted text-muted-foreground'
                        }>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setShowReport(r); setFilterType('all'); setSearchTerm(''); }}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => exportComparison(r)}>
                            <Download className="h-3 w-3" />
                          </Button>
                          {r.status === 'draft' && (
                            <Button size="sm" variant="ghost" onClick={() => setShowApproval(r)}>
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Snapshot Dialog */}
      <Dialog open={showSnapshot} onOpenChange={setShowSnapshot}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create BOQ Snapshot</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will capture the current state of your BOQ ({totalSections} sections, {totalItems} items, {formatSAR(totalAmount)} total).
            </p>
            <div>
              <Label>Version Label</Label>
              <Input value={snapshotLabel} onChange={e => setSnapshotLabel(e.target.value)}
                placeholder={`v${(snapshots.length > 0 ? Math.max(...snapshots.map(s => s.version_number)) : 0) + 1}`} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={snapshotNotes} onChange={e => setSnapshotNotes(e.target.value)}
                placeholder="Describe what changed in this version..." rows={3} />
            </div>
            <Button onClick={() => createSnapshot.mutate()} disabled={createSnapshot.isPending} className="w-full">
              {createSnapshot.isPending ? 'Creating...' : 'Create Snapshot'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compare BOQ Versions</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Version A (Base)</Label>
              <Select value={versionA} onValueChange={setVersionA}>
                <SelectTrigger><SelectValue placeholder="Select base version" /></SelectTrigger>
                <SelectContent>
                  {snapshots.filter(s => s.id !== versionB).map(s => (
                    <SelectItem key={s.id} value={s.id}>v{s.version_number} - {s.version_label} ({formatSAR(s.total_amount)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Version B (Revision)</Label>
              <Select value={versionB} onValueChange={setVersionB}>
                <SelectTrigger><SelectValue placeholder="Select revision" /></SelectTrigger>
                <SelectContent>
                  {snapshots.filter(s => s.id !== versionA).map(s => (
                    <SelectItem key={s.id} value={s.id}>v{s.version_number} - {s.version_label} ({formatSAR(s.total_amount)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => runComparison.mutate()} disabled={!versionA || !versionB || runComparison.isPending} className="w-full">
              {runComparison.isPending ? 'Comparing...' : 'Run Comparison'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={!!showReport} onOpenChange={() => setShowReport(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              {showReport?.version_a_label} → {showReport?.version_b_label}
            </DialogTitle>
          </DialogHeader>

          {showReport && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="border-green-200 dark:border-green-800"><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Added</p>
                  <p className="text-xl font-bold text-green-600">+{showReport.total_additions}</p>
                </CardContent></Card>
                <Card className="border-red-200 dark:border-red-800"><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Removed</p>
                  <p className="text-xl font-bold text-red-600">-{showReport.total_removals}</p>
                </CardContent></Card>
                <Card className="border-amber-200 dark:border-amber-800"><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Modified</p>
                  <p className="text-xl font-bold text-amber-600">~{showReport.total_modifications}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Unchanged</p>
                  <p className="text-xl font-bold text-muted-foreground">{showReport.total_unchanged}</p>
                </CardContent></Card>
                <Card className="col-span-2"><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Cost Impact</p>
                  <p className={`text-xl font-bold ${showReport.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {showReport.cost_impact >= 0 ? '+' : ''}{formatSAR(showReport.cost_impact)}
                    <span className="text-sm ml-1">({showReport.cost_impact_percent.toFixed(1)}%)</span>
                  </p>
                </CardContent></Card>
              </div>

              {/* Filters */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Changes</SelectItem>
                    <SelectItem value="added">Added Only</SelectItem>
                    <SelectItem value="removed">Removed Only</SelectItem>
                    <SelectItem value="modified">Modified Only</SelectItem>
                    <SelectItem value="unchanged">Unchanged Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportComparison(showReport)}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </div>

              {/* Diff Table */}
              <ScrollArea className="h-[50vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Type</TableHead>
                      <TableHead>Item Ref</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty (A)</TableHead>
                      <TableHead className="text-right">Qty (B)</TableHead>
                      <TableHead className="text-right">Rate (A)</TableHead>
                      <TableHead className="text-right">Rate (B)</TableHead>
                      <TableHead className="text-right">Amount (A)</TableHead>
                      <TableHead className="text-right">Amount (B)</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportDiffItems.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">No items match filter</TableCell></TableRow>
                    ) : reportDiffItems.map((item, idx) => {
                      const diff = item.amount_b - item.amount_a;
                      return (
                        <TableRow key={idx} className={changeColors[item.change_type]}>
                          <TableCell>
                            <Badge className={`text-[10px] ${changeBadgeColors[item.change_type]}`}>
                              {item.change_type === 'added' && <Plus className="h-3 w-3 mr-0.5" />}
                              {item.change_type === 'removed' && <Minus className="h-3 w-3 mr-0.5" />}
                              {item.change_type === 'modified' && <ArrowUp className="h-3 w-3 mr-0.5" />}
                              {item.change_type === 'unchanged' && <Equal className="h-3 w-3 mr-0.5" />}
                              {item.change_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.item_ref}</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{item.section_b || item.section_a}</TableCell>
                          <TableCell className="text-xs max-w-[180px]">
                            {item.change_type === 'modified' && item.description_a !== item.description_b ? (
                              <div>
                                <span className="line-through text-red-500">{item.description_a}</span>
                                <br />
                                <span className="text-green-600">{item.description_b}</span>
                              </div>
                            ) : (
                              item.description_b || item.description_a
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.unit_a !== item.unit_b && item.unit_a && item.unit_b ? (
                              <span><span className="line-through text-red-500">{item.unit_a}</span> → {item.unit_b}</span>
                            ) : (item.unit_b || item.unit_a)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.quantity_a || '-'}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${item.quantity_a !== item.quantity_b ? 'font-bold' : ''}`}>
                            {item.quantity_b || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.rate_a ? formatSAR(item.rate_a) : '-'}</TableCell>
                          <TableCell className={`text-right font-mono text-xs ${item.rate_a !== item.rate_b ? 'font-bold' : ''}`}>
                            {item.rate_b ? formatSAR(item.rate_b) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.amount_a ? formatSAR(item.amount_a) : '-'}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.amount_b ? formatSAR(item.amount_b) : '-'}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : ''}`}>
                            {diff !== 0 ? (diff > 0 ? '+' : '') + formatSAR(diff) : '-'}
                          </TableCell>
                          <TableCell className="text-[10px] max-w-[150px]">{item.changes.join(', ') || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!showApproval} onOpenChange={() => { setShowApproval(null); setRejectionReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve / Reject Comparison</DialogTitle></DialogHeader>
          {showApproval && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><strong>Comparison:</strong> {showApproval.version_a_label} → {showApproval.version_b_label}</p>
                <p><strong>Cost Impact:</strong> {formatSAR(showApproval.cost_impact)} ({showApproval.cost_impact_percent.toFixed(1)}%)</p>
                <p><strong>Changes:</strong> +{showApproval.total_additions} / -{showApproval.total_removals} / ~{showApproval.total_modifications}</p>
              </div>
              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Optional reason..." rows={2} />
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 gap-2" onClick={() => updateReportStatus.mutate({ id: showApproval.id, status: 'approved' })}>
                  <ThumbsUp className="h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1 gap-2" onClick={() => updateReportStatus.mutate({ id: showApproval.id, status: 'rejected', reason: rejectionReason })}>
                  <ThumbsDown className="h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
