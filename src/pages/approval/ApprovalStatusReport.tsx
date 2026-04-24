import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Clock, AlertTriangle, CheckCircle2, XCircle, Users, FileText, Download, RefreshCw } from 'lucide-react';

interface ActiveRequest {
  id: string;
  docNumber: string;
  documentType: string;
  requester: string;
  template: string;
  currentStage: string;
  currentApprover: string;
  stageProgress: string;
  submittedAt: string;
  ageHours: number;
  slaHours: number;
  status: 'pending' | 'overdue' | 'escalated';
  amount: number;
  branch: string;
}

const MOCK_REQUESTS: ActiveRequest[] = [
  { id: '1', docNumber: 'PO-2026-0451', documentType: 'Purchase Order', requester: 'Ahmed Al-Rashid', template: 'PO Above 50K', currentStage: 'Finance Controller', currentApprover: 'Sara Finance', stageProgress: '2/3', submittedAt: '2026-04-13 09:30', ageHours: 28, slaHours: 48, status: 'pending', amount: 125000, branch: 'HQ' },
  { id: '2', docNumber: 'PO-2026-0449', documentType: 'Purchase Order', requester: 'Khalid Ops', template: 'Standard PO', currentStage: 'Department Manager', currentApprover: 'Nora Manager', stageProgress: '1/1', submittedAt: '2026-04-12 14:00', ageHours: 47, slaHours: 24, status: 'overdue', amount: 32000, branch: 'Branch A' },
  { id: '3', docNumber: 'SO-2026-1102', documentType: 'Sales Order', requester: 'Fatima Sales', template: 'Sales Discount > 15%', currentStage: 'Finance Controller', currentApprover: 'Sara Finance', stageProgress: '1/1', submittedAt: '2026-04-14 08:00', ageHours: 3, slaHours: 24, status: 'pending', amount: 87500, branch: 'HQ' },
  { id: '4', docNumber: 'PO-2026-0443', documentType: 'Purchase Order', requester: 'Omar Procurement', template: 'PO Above 50K', currentStage: 'Executive Committee', currentApprover: 'CEO Office', stageProgress: '3/3', submittedAt: '2026-04-10 11:00', ageHours: 94, slaHours: 72, status: 'escalated', amount: 340000, branch: 'HQ' },
];

export default function ApprovalStatusReport() {
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = MOCK_REQUESTS.filter(r => !statusFilter || r.status === statusFilter);
  const pending = MOCK_REQUESTS.filter(r => r.status === 'pending').length;
  const overdue = MOCK_REQUESTS.filter(r => r.status === 'overdue').length;
  const escalated = MOCK_REQUESTS.filter(r => r.status === 'escalated').length;
  const totalAmount = MOCK_REQUESTS.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Approval Status Report</h1>
          <p className="text-sm text-muted-foreground">Monitor active approval requests, SLA compliance, and bottlenecks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{MOCK_REQUESTS.length}</div><div className="text-xs text-muted-foreground">Total Active</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{pending}</div><div className="text-xs text-muted-foreground">Pending</div></CardContent></Card>
        <Card className="border-destructive/30"><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-destructive">{overdue}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-600">{escalated}</div><div className="text-xs text-muted-foreground">Escalated</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{totalAmount.toLocaleString()}</div><div className="text-xs text-muted-foreground">Total Value</div></CardContent></Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="text-xs">List View</TabsTrigger>
            <TabsTrigger value="aging" className="text-xs">Aging Analysis</TabsTrigger>
            <TabsTrigger value="approver" className="text-xs">By Approver</TabsTrigger>
          </TabsList>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const slaPercent = Math.min((r.ageHours / r.slaHours) * 100, 100);
                    return (
                      <TableRow key={r.id} className={r.status === 'overdue' ? 'bg-destructive/5' : r.status === 'escalated' ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                        <TableCell className="font-mono text-sm font-medium">{r.docNumber}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.documentType}</Badge></TableCell>
                        <TableCell className="text-sm">{r.requester}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.template}</TableCell>
                        <TableCell className="text-sm font-medium">{r.currentStage}</TableCell>
                        <TableCell className="text-sm">{r.currentApprover}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{r.stageProgress}</Badge></TableCell>
                        <TableCell className={r.ageHours > r.slaHours ? 'text-destructive font-medium text-sm' : 'text-sm'}>{r.ageHours}h</TableCell>
                        <TableCell>
                          <div className="w-16"><Progress value={slaPercent} className={slaPercent > 100 ? '[&>div]:bg-destructive' : slaPercent > 75 ? '[&>div]:bg-amber-500' : ''} /></div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{r.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {r.status === 'pending' && <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                          {r.status === 'overdue' && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>}
                          {r.status === 'escalated' && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Users className="h-3 w-3 mr-1" />Escalated</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card><CardContent className="p-6">
            <h3 className="font-semibold mb-4">Aging Distribution</h3>
            <div className="space-y-3">
              {[{ label: '0-12 hours', count: 1, color: 'bg-emerald-500' }, { label: '12-24 hours', count: 1, color: 'bg-blue-500' }, { label: '24-48 hours', count: 1, color: 'bg-amber-500' }, { label: '48+ hours', count: 1, color: 'bg-destructive' }].map(b => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="text-sm w-24">{b.label}</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden"><div className={`h-full ${b.color} rounded`} style={{ width: `${(b.count / MOCK_REQUESTS.length) * 100}%` }} /></div>
                  <span className="text-sm font-medium w-8">{b.count}</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="approver">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Approver</TableHead><TableHead>Pending</TableHead><TableHead>Overdue</TableHead><TableHead>Avg Response</TableHead><TableHead>Approval Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Sara Finance</TableCell><TableCell>2</TableCell><TableCell className="text-destructive">0</TableCell><TableCell>8h</TableCell><TableCell>94%</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Nora Manager</TableCell><TableCell>1</TableCell><TableCell className="text-destructive">1</TableCell><TableCell>18h</TableCell><TableCell>87%</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">CEO Office</TableCell><TableCell>1</TableCell><TableCell className="text-destructive">0</TableCell><TableCell>36h</TableCell><TableCell>100%</TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
