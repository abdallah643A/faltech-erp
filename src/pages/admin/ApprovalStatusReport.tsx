import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Download, Clock, CheckCircle2, XCircle, AlertTriangle, Timer } from 'lucide-react';

const mockRequests = [
  { id: 'APR-001', module: 'Purchasing', docType: 'Purchase Order', docNum: 'PO-2026-0145', requester: 'Ahmed K.', approver: 'Manager A', stage: 'Finance Review', status: 'pending', submitted: '2026-04-12', sla: '48h', elapsed: '36h' },
  { id: 'APR-002', module: 'Sales', docType: 'Sales Order', docNum: 'SO-2026-0089', requester: 'Sarah M.', approver: 'Director B', stage: 'Director Approval', status: 'approved', submitted: '2026-04-10', sla: '24h', elapsed: '18h' },
  { id: 'APR-003', module: 'HR', docType: 'Leave Request', docNum: 'LR-2026-0034', requester: 'Omar H.', approver: 'HR Lead', stage: 'HR Review', status: 'rejected', submitted: '2026-04-11', sla: '24h', elapsed: '6h' },
  { id: 'APR-004', module: 'Finance', docType: 'Journal Entry', docNum: 'JE-2026-0201', requester: 'Lina S.', approver: 'CFO', stage: 'CFO Sign-off', status: 'escalated', submitted: '2026-04-08', sla: '48h', elapsed: '120h' },
  { id: 'APR-005', module: 'Purchasing', docType: 'AP Invoice', docNum: 'API-2026-0078', requester: 'Khalid R.', approver: 'Finance Manager', stage: 'Finance Review', status: 'pending', submitted: '2026-04-13', sla: '24h', elapsed: '12h' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { class: string; icon: any }> = {
    pending: { class: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    rejected: { class: 'bg-red-100 text-red-700', icon: XCircle },
    escalated: { class: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    cancelled: { class: 'bg-gray-100 text-gray-600', icon: XCircle },
  };
  const cfg = map[status] || map.pending;
  const Icon = cfg.icon;
  return <Badge className={cfg.class}><Icon className="h-3 w-3 mr-1" />{status}</Badge>;
};

export default function ApprovalStatusReport() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Approval Status Report</h1><p className="text-sm text-muted-foreground">Monitor all live approval requests across the ERP</p></div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-600">2</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">1</p><p className="text-xs text-muted-foreground">Approved</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">1</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">1</p><p className="text-xs text-muted-foreground">Escalated</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">28h</p><p className="text-xs text-muted-foreground">Avg Time</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent>{['All', 'Sales', 'Purchasing', 'Finance', 'HR'].map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent></Select>
        <Select><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent>{['All', 'Pending', 'Approved', 'Rejected', 'Escalated'].map(m => <SelectItem key={m} value={m.toLowerCase()}>{m}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="Search by doc number..." className="w-48" />
      </div>

      <Tabs defaultValue="list">
        <TabsList><TabsTrigger value="list">List View</TabsTrigger><TabsTrigger value="kanban">Kanban</TabsTrigger></TabsList>
        <TabsContent value="list" className="mt-4">
          <Table>
            <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Module</TableHead><TableHead>Document</TableHead><TableHead>Doc #</TableHead><TableHead>Requester</TableHead><TableHead>Approver</TableHead><TableHead>Stage</TableHead><TableHead>SLA</TableHead><TableHead>Elapsed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{mockRequests.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell><Badge variant="outline">{r.module}</Badge></TableCell>
                <TableCell className="text-xs">{r.docType}</TableCell>
                <TableCell className="font-mono text-xs">{r.docNum}</TableCell>
                <TableCell className="text-xs">{r.requester}</TableCell>
                <TableCell className="text-xs">{r.approver}</TableCell>
                <TableCell className="text-xs">{r.stage}</TableCell>
                <TableCell className="text-xs">{r.sla}</TableCell>
                <TableCell className={`text-xs ${parseInt(r.elapsed) > parseInt(r.sla) ? 'text-red-600 font-medium' : ''}`}>{r.elapsed}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-4 gap-4">
            {['pending', 'approved', 'rejected', 'escalated'].map(status => (
              <div key={status} className="space-y-2">
                <h3 className="font-semibold text-sm capitalize px-2">{status}</h3>
                {mockRequests.filter(r => r.status === status).map(r => (
                  <Card key={r.id}><CardContent className="p-3">
                    <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
                    <p className="text-sm font-medium mt-1">{r.docType}</p>
                    <p className="text-xs text-muted-foreground">{r.docNum}</p>
                    <p className="text-xs mt-1">{r.requester} → {r.approver}</p>
                  </CardContent></Card>
                ))}
                {mockRequests.filter(r => r.status === status).length === 0 && <Card><CardContent className="p-4 text-center text-xs text-muted-foreground">Empty</CardContent></Card>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
