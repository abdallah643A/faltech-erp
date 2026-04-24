import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Copy, Play, FileText, Layers, Settings, TestTube2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  documentType: string;
  description: string;
  stages: string[];
  conditions: { field: string; operator: string; value: string }[];
  priority: number;
  minAmount: number | null;
  maxAmount: number | null;
  branch: string;
  isActive: boolean;
  version: number;
  activeRequests: number;
  totalProcessed: number;
  avgApprovalHours: number;
}

const DOC_TYPES = ['Sales Order', 'Purchase Order', 'A/R Invoice', 'A/P Invoice', 'Delivery', 'Goods Receipt', 'Payment', 'Journal Entry', 'Credit Memo', 'Budget Request', 'Leave Request', 'Expense Report'];

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'PO Above 50K', documentType: 'Purchase Order', description: 'Requires finance + exec approval for POs over 50,000', stages: ['Department Manager', 'Finance Controller', 'Executive Committee'], conditions: [{ field: 'total', operator: '>', value: '50000' }], priority: 10, minAmount: 50000, maxAmount: null, branch: 'All', isActive: true, version: 3, activeRequests: 4, totalProcessed: 128, avgApprovalHours: 18 },
  { id: '2', name: 'Standard PO', documentType: 'Purchase Order', description: 'Manager approval for standard POs', stages: ['Department Manager'], conditions: [{ field: 'total', operator: '<=', value: '50000' }], priority: 20, minAmount: null, maxAmount: 50000, branch: 'All', isActive: true, version: 1, activeRequests: 12, totalProcessed: 456, avgApprovalHours: 6 },
  { id: '3', name: 'Sales Discount > 15%', documentType: 'Sales Order', description: 'Finance approval for high discount sales', stages: ['Finance Controller'], conditions: [{ field: 'discount_percent', operator: '>', value: '15' }], priority: 10, minAmount: null, maxAmount: null, branch: 'All', isActive: true, version: 2, activeRequests: 1, totalProcessed: 34, avgApprovalHours: 12 },
  { id: '4', name: 'Journal Entry Review', documentType: 'Journal Entry', description: 'All JEs require finance controller review', stages: ['Finance Controller'], conditions: [], priority: 50, minAmount: null, maxAmount: null, branch: 'All', isActive: false, version: 1, activeRequests: 0, totalProcessed: 0, avgApprovalHours: 0 },
];

export default function ApprovalTemplates() {
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = templates.filter(t => !filter || t.documentType === filter);

  const toggleActive = (id: string) => {
    const t = templates.find(x => x.id === id);
    if (t && t.activeRequests > 0 && t.isActive) {
      toast.error(`Cannot deactivate: ${t.activeRequests} active request(s) in progress`);
      return;
    }
    setTemplates(prev => prev.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
    toast.success('Template status updated');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Approval Templates</h1>
          <p className="text-sm text-muted-foreground">Build workflows from approval stages with conditions and priorities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTestDialogOpen(true)}><TestTube2 className="h-4 w-4 mr-1" />Test Template</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />New Template</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{templates.length}</div><div className="text-xs text-muted-foreground">Templates</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{templates.filter(t => t.isActive).length}</div><div className="text-xs text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{templates.reduce((s, t) => s + t.activeRequests, 0)}</div><div className="text-xs text-muted-foreground">In Progress</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{templates.reduce((s, t) => s + t.totalProcessed, 0)}</div><div className="text-xs text-muted-foreground">Total Processed</div></CardContent></Card>
      </div>

      <div className="flex gap-2 items-center">
        <Label className="text-xs">Filter by Document:</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="All Documents" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Documents</SelectItem>
            {DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Amount Range</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Active Req.</TableHead>
                <TableHead>Avg. Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div><span className="font-medium text-sm">{t.name}</span><span className="text-[10px] text-muted-foreground ml-1">v{t.version}</span></div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.documentType}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {t.stages.map((s, i) => (
                        <span key={i} className="text-xs flex items-center gap-1"><span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">{i + 1}</span>{s}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.conditions.length > 0 ? t.conditions.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] mr-1">{c.field} {c.operator} {c.value}</Badge>
                    )) : <span className="text-xs text-muted-foreground">Always</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{t.priority}</TableCell>
                  <TableCell className="text-xs">
                    {t.minAmount || t.maxAmount ? `${t.minAmount ? `≥${t.minAmount.toLocaleString()}` : ''}${t.minAmount && t.maxAmount ? ' – ' : ''}${t.maxAmount ? `≤${t.maxAmount.toLocaleString()}` : ''}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{t.branch}</TableCell>
                  <TableCell>{t.activeRequests > 0 ? <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t.activeRequests}</Badge> : <span className="text-xs text-muted-foreground">0</span>}</TableCell>
                  <TableCell className="text-sm">{t.avgApprovalHours > 0 ? `${t.avgApprovalHours}h` : '—'}</TableCell>
                  <TableCell><Switch checked={t.isActive} onCheckedChange={() => toggleActive(t.id)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Test Template Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Template Matching</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Simulate a document to see which approval template would match.</p>
          <div className="space-y-3">
            <div><Label>Document Type</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount</Label><Input type="number" placeholder="0.00" /></div>
              <div><Label>Branch</Label><Input placeholder="HQ" /></div>
            </div>
            <div><Label>Discount %</Label><Input type="number" placeholder="0" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Close</Button>
            <Button onClick={() => { toast.info('Match: "PO Above 50K" → 3 stages'); setTestDialogOpen(false); }}><Play className="h-4 w-4 mr-1" />Run Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
