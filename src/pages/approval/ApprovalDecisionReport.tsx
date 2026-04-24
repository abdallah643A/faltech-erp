import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, Download, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

interface Decision {
  id: string;
  docNumber: string;
  documentType: string;
  requester: string;
  template: string;
  approver: string;
  stage: string;
  action: 'approved' | 'rejected' | 'returned';
  comments: string;
  decidedAt: string;
  processingHours: number;
  amount: number;
}

const MOCK_DECISIONS: Decision[] = [
  { id: '1', docNumber: 'PO-2026-0440', documentType: 'Purchase Order', requester: 'Ahmed', template: 'PO Above 50K', approver: 'Sara Finance', stage: 'Finance Controller', action: 'approved', comments: 'Budget confirmed', decidedAt: '2026-04-13 16:30', processingHours: 4, amount: 85000 },
  { id: '2', docNumber: 'PO-2026-0438', documentType: 'Purchase Order', requester: 'Khalid', template: 'Standard PO', approver: 'Nora Manager', stage: 'Department Manager', action: 'rejected', comments: 'Vendor not on approved list', decidedAt: '2026-04-13 10:15', processingHours: 8, amount: 22000 },
  { id: '3', docNumber: 'SO-2026-1098', documentType: 'Sales Order', requester: 'Fatima', template: 'Sales Discount > 15%', approver: 'Sara Finance', stage: 'Finance Controller', action: 'approved', comments: 'Strategic client exception', decidedAt: '2026-04-12 14:00', processingHours: 6, amount: 120000 },
  { id: '4', docNumber: 'PO-2026-0435', documentType: 'Purchase Order', requester: 'Omar', template: 'PO Above 50K', approver: 'CEO Office', stage: 'Executive Committee', action: 'approved', comments: '', decidedAt: '2026-04-11 09:00', processingHours: 24, amount: 290000 },
  { id: '5', docNumber: 'PO-2026-0430', documentType: 'Purchase Order', requester: 'Ahmed', template: 'Standard PO', approver: 'Nora Manager', stage: 'Department Manager', action: 'returned', comments: 'Need updated specs', decidedAt: '2026-04-10 15:45', processingHours: 12, amount: 15000 },
];

export default function ApprovalDecisionReport() {
  const [view, setView] = useState('history');
  const [dateRange, setDateRange] = useState('30');

  const approved = MOCK_DECISIONS.filter(d => d.action === 'approved').length;
  const rejected = MOCK_DECISIONS.filter(d => d.action === 'rejected').length;
  const returned = MOCK_DECISIONS.filter(d => d.action === 'returned').length;
  const avgTime = Math.round(MOCK_DECISIONS.reduce((s, d) => s + d.processingHours, 0) / MOCK_DECISIONS.length);
  const approvalRate = Math.round((approved / MOCK_DECISIONS.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Approval Decision Report</h1>
          <p className="text-sm text-muted-foreground">Historical analysis of approval outcomes, rejection trends, and SLA performance</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export Report</Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{MOCK_DECISIONS.length}</div><div className="text-xs text-muted-foreground">Total Decisions</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{approved}</div><div className="text-xs text-muted-foreground">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-destructive">{rejected}</div><div className="text-xs text-muted-foreground">Rejected</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-amber-600">{avgTime}h</div><div className="text-xs text-muted-foreground">Avg. Response</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-600">{approvalRate}%</div><div className="text-xs text-muted-foreground">Approval Rate</div></CardContent></Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="history" className="text-xs">Decision Log</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Rejection Trends</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Approver Performance</TabsTrigger>
            <TabsTrigger value="bottlenecks" className="text-xs">Bottlenecks</TabsTrigger>
          </TabsList>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="history">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DECISIONS.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm font-medium">{d.docNumber}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.documentType}</Badge></TableCell>
                    <TableCell className="text-sm">{d.requester}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.template}</TableCell>
                    <TableCell className="text-xs">{d.stage}</TableCell>
                    <TableCell className="text-sm">{d.approver}</TableCell>
                    <TableCell>
                      {d.action === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>}
                      {d.action === 'rejected' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                      {d.action === 'returned' && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle className="h-3 w-3 mr-1" />Returned</Badge>}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{d.comments || '—'}</TableCell>
                    <TableCell className="text-sm">{d.processingHours}h</TableCell>
                    <TableCell className="text-sm font-medium">{d.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.decidedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card><CardContent className="p-6">
            <h3 className="font-semibold mb-4">Top Rejection Reasons</h3>
            <div className="space-y-3">
              {[{ reason: 'Vendor not on approved list', count: 8, pct: 35 }, { reason: 'Budget exceeded', count: 5, pct: 22 }, { reason: 'Missing documentation', count: 4, pct: 17 }, { reason: 'Duplicate request', count: 3, pct: 13 }, { reason: 'Incorrect specifications', count: 3, pct: 13 }].map(r => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-sm flex-1">{r.reason}</span>
                  <div className="w-40 h-5 bg-muted rounded overflow-hidden"><div className="h-full bg-destructive/70 rounded" style={{ width: `${r.pct}%` }} /></div>
                  <span className="text-sm font-medium w-16 text-right">{r.count} ({r.pct}%)</span>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Approver</TableHead><TableHead>Decisions</TableHead><TableHead>Approved</TableHead><TableHead>Rejected</TableHead><TableHead>Returned</TableHead><TableHead>Avg Response</TableHead><TableHead>SLA Met</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Sara Finance</TableCell><TableCell>42</TableCell><TableCell className="text-emerald-600">38</TableCell><TableCell className="text-destructive">2</TableCell><TableCell>2</TableCell><TableCell>6h</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700">95%</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Nora Manager</TableCell><TableCell>28</TableCell><TableCell className="text-emerald-600">22</TableCell><TableCell className="text-destructive">4</TableCell><TableCell>2</TableCell><TableCell>14h</TableCell><TableCell><Badge className="bg-amber-100 text-amber-700">78%</Badge></TableCell></TableRow>
                <TableRow><TableCell className="font-medium">CEO Office</TableCell><TableCell>8</TableCell><TableCell className="text-emerald-600">8</TableCell><TableCell className="text-destructive">0</TableCell><TableCell>0</TableCell><TableCell>30h</TableCell><TableCell><Badge className="bg-emerald-100 text-emerald-700">88%</Badge></TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="bottlenecks">
          <Card><CardContent className="p-6">
            <h3 className="font-semibold mb-4">Identified Bottlenecks</h3>
            <div className="space-y-3">
              {[
                { stage: 'Executive Committee', template: 'PO Above 50K', avgHours: 36, sla: 72, issue: 'Slow but within SLA' },
                { stage: 'Department Manager', template: 'Standard PO', avgHours: 18, sla: 24, issue: 'Near SLA breach frequently' },
              ].map((b, i) => (
                <Card key={i}><CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{b.stage}</div>
                    <div className="text-xs text-muted-foreground">{b.template}</div>
                  </div>
                  <div className="text-center"><div className="text-lg font-bold">{b.avgHours}h</div><div className="text-xs text-muted-foreground">avg / {b.sla}h SLA</div></div>
                  <Badge variant="outline" className="text-xs">{b.issue}</Badge>
                </CardContent></Card>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
