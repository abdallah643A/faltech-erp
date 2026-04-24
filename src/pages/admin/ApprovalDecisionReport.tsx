import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart3, Download, CheckCircle2, XCircle } from 'lucide-react';

const mockDecisions = [
  { id: 'APR-001', module: 'Purchasing', requester: 'Ahmed K.', approver: 'Manager A', decision: 'Approved', decisionTime: '2026-04-12 14:30', stage: 'Dept Head', slaMet: true, comments: 'Approved per budget', escalated: false },
  { id: 'APR-002', module: 'HR', requester: 'Omar H.', approver: 'HR Lead', decision: 'Rejected', decisionTime: '2026-04-11 10:15', stage: 'HR Review', slaMet: true, comments: 'Insufficient leave balance', escalated: false },
  { id: 'APR-003', module: 'Finance', requester: 'Lina S.', approver: 'CFO', decision: 'Approved', decisionTime: '2026-04-10 16:45', stage: 'CFO Sign-off', slaMet: false, comments: 'Approved with delay', escalated: true },
  { id: 'APR-004', module: 'Sales', requester: 'Sarah M.', approver: 'Director B', decision: 'Approved', decisionTime: '2026-04-09 09:00', stage: 'Director', slaMet: true, comments: '', escalated: false },
  { id: 'APR-005', module: 'Purchasing', requester: 'Khalid R.', approver: 'Finance Manager', decision: 'Rejected', decisionTime: '2026-04-08 11:30', stage: 'Finance', slaMet: true, comments: 'Over budget limit', escalated: false },
];

export default function ApprovalDecisionReport() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Approval Decision Report</h1><p className="text-sm text-muted-foreground">Historical approval decision analytics and audit trail</p></div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">5</p><p className="text-xs text-muted-foreground">Total Decisions</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">60%</p><p className="text-xs text-muted-foreground">Approval Rate</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">80%</p><p className="text-xs text-muted-foreground">SLA Met</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">1</p><p className="text-xs text-muted-foreground">Escalations</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent>{['All', 'Sales', 'Purchasing', 'Finance', 'HR'].map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent></Select>
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Decision" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select>
        <Input type="date" className="w-40" />
        <Input type="date" className="w-40" />
      </div>

      <Table>
        <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Module</TableHead><TableHead>Requester</TableHead><TableHead>Approver</TableHead><TableHead>Decision</TableHead><TableHead>Time</TableHead><TableHead>Stage</TableHead><TableHead>SLA</TableHead><TableHead>Escalated</TableHead><TableHead>Comments</TableHead></TableRow></TableHeader>
        <TableBody>{mockDecisions.map(d => (
          <TableRow key={d.id}>
            <TableCell className="font-mono text-xs">{d.id}</TableCell>
            <TableCell><Badge variant="outline">{d.module}</Badge></TableCell>
            <TableCell className="text-xs">{d.requester}</TableCell>
            <TableCell className="text-xs">{d.approver}</TableCell>
            <TableCell>{d.decision === 'Approved' ? <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />{d.decision}</Badge> : <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />{d.decision}</Badge>}</TableCell>
            <TableCell className="text-xs">{d.decisionTime}</TableCell>
            <TableCell className="text-xs">{d.stage}</TableCell>
            <TableCell>{d.slaMet ? <Badge className="bg-emerald-100 text-emerald-700">Met</Badge> : <Badge className="bg-red-100 text-red-700">Breached</Badge>}</TableCell>
            <TableCell>{d.escalated ? '⚠️' : '—'}</TableCell>
            <TableCell className="text-xs max-w-[200px] truncate">{d.comments || '—'}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </div>
  );
}
