import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, CheckCircle2, AlertTriangle, BookOpen, Users, Package, DollarSign, Download, Play, Eye } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_BATCHES = [
  { id: '1', type: 'GL Balances', fileName: 'gl_opening_2026.xlsx', uploadedAt: '2026-01-02', uploadedBy: 'Finance Admin', status: 'posted', totalDebit: 2450000, totalCredit: 2450000, records: 156, errors: 0 },
  { id: '2', type: 'Customer Balances', fileName: 'ar_opening_2026.xlsx', uploadedAt: '2026-01-02', uploadedBy: 'Finance Admin', status: 'posted', totalDebit: 890000, totalCredit: 0, records: 45, errors: 0 },
  { id: '3', type: 'Vendor Balances', fileName: 'ap_opening_2026.xlsx', uploadedAt: '2026-01-03', uploadedBy: 'Finance Admin', status: 'validated', totalDebit: 0, totalCredit: 620000, records: 32, errors: 2 },
  { id: '4', type: 'Inventory Values', fileName: 'inventory_opening.xlsx', uploadedAt: '2026-01-05', uploadedBy: 'Warehouse Mgr', status: 'error', totalDebit: 1200000, totalCredit: 0, records: 340, errors: 12 },
];

const BALANCE_TYPES = [
  { value: 'gl', label: 'GL Balances', icon: BookOpen, description: 'Chart of accounts opening balances' },
  { value: 'ar', label: 'Customer Balances', icon: Users, description: 'Accounts receivable opening' },
  { value: 'ap', label: 'Vendor Balances', icon: Users, description: 'Accounts payable opening' },
  { value: 'inventory', label: 'Inventory Values', icon: Package, description: 'Inventory quantities and values' },
  { value: 'assets', label: 'Fixed Assets', icon: DollarSign, description: 'Asset register with depreciation' },
  { value: 'bank', label: 'Bank Balances', icon: DollarSign, description: 'Bank account opening balances' },
];

export default function OpeningBalances() {
  const [tab, setTab] = useState('overview');
  const [batches] = useState(MOCK_BATCHES);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardType, setWizardType] = useState('');

  const posted = batches.filter(b => b.status === 'posted').length;
  const totalDebit = batches.reduce((s, b) => s + b.totalDebit, 0);
  const totalCredit = batches.reduce((s, b) => s + b.totalCredit, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Opening Balances</h1><p className="text-sm text-muted-foreground">Import and post opening balances for go-live</p></div>
        <Button size="sm" onClick={() => { setWizardStep(1); setWizardType(''); setWizardOpen(true); }}><Upload className="h-4 w-4 mr-1" />Import Wizard</Button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{batches.length}</div><div className="text-xs text-muted-foreground">Batches</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{posted}</div><div className="text-xs text-muted-foreground">Posted</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{totalDebit.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Debit</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{totalCredit.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Credit</div></CardContent></Card>
        <Card className={totalDebit !== totalCredit ? 'border-destructive/30' : ''}><CardContent className="pt-4 text-center"><div className={`text-2xl font-bold ${totalDebit === totalCredit ? 'text-emerald-600' : 'text-destructive'}`}>{(totalDebit - totalCredit).toLocaleString()}</div><div className="text-xs text-muted-foreground">Difference</div></CardContent></Card>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="overview" className="text-xs">Batch Overview</TabsTrigger><TabsTrigger value="types" className="text-xs">Balance Types</TabsTrigger></TabsList>
        <TabsContent value="overview">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>File</TableHead><TableHead>Uploaded</TableHead><TableHead>By</TableHead><TableHead>Records</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead>Errors</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {batches.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">{b.type}</TableCell>
                    <TableCell className="text-xs font-mono">{b.fileName}</TableCell>
                    <TableCell className="text-xs">{b.uploadedAt}</TableCell>
                    <TableCell className="text-xs">{b.uploadedBy}</TableCell>
                    <TableCell className="text-sm">{b.records}</TableCell>
                    <TableCell className="text-sm font-medium">{b.totalDebit.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-medium">{b.totalCredit.toLocaleString()}</TableCell>
                    <TableCell>{b.errors > 0 ? <span className="text-destructive font-medium">{b.errors}</span> : '—'}</TableCell>
                    <TableCell>
                      {b.status === 'posted' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" />Posted</Badge>}
                      {b.status === 'validated' && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Validated</Badge>}
                      {b.status === 'error' && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs h-7"><Eye className="h-3 w-3 mr-1" />View</Button>
                        {b.status === 'validated' && <Button size="sm" className="text-xs h-7"><Play className="h-3 w-3 mr-1" />Post</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="types">
          <div className="grid grid-cols-3 gap-3">
            {BALANCE_TYPES.map(bt => {
              const batch = batches.find(b => b.type.toLowerCase().includes(bt.value));
              return (
                <Card key={bt.value} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><bt.icon className="h-5 w-5 text-primary" /></div>
                      <div><h3 className="font-semibold text-sm">{bt.label}</h3><p className="text-[11px] text-muted-foreground">{bt.description}</p></div>
                    </div>
                    {batch ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{batch.status}</Badge> : <Badge variant="secondary" className="text-[10px]">Not Imported</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Opening Balance Import - Step {wizardStep}/3</DialogTitle></DialogHeader>
          {wizardStep === 1 && (
            <div className="space-y-3"><Label>Select Balance Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {BALANCE_TYPES.map(bt => (
                  <button key={bt.value} onClick={() => setWizardType(bt.value)} className={`p-3 rounded-lg border text-left transition-colors ${wizardType === bt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <div className="font-medium text-sm">{bt.label}</div><div className="text-[10px] text-muted-foreground">{bt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" /><p className="text-sm">Drag & drop or browse</p>
              <Button variant="outline" size="sm" className="mt-3"><Download className="h-3 w-3 mr-1" />Template</Button>
            </div>
          )}
          {wizardStep === 3 && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm"><CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" /><p className="font-medium">Validation Complete — Ready to post.</p></div>
          )}
          <DialogFooter>
            {wizardStep > 1 && <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>Back</Button>}
            {wizardStep < 3 ? <Button onClick={() => setWizardStep(s => s + 1)} disabled={wizardStep === 1 && !wizardType}>Next</Button> : <Button onClick={() => { toast.success('Balances posted'); setWizardOpen(false); }}>Post</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
