import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useWmsExceptions } from '@/hooks/useWarehouseExecution';
import { AlertTriangle, Plus, Search, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function ExceptionConsole() {
  const { data: exceptions, createException, updateException } = useWmsExceptions();
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showResolve, setShowResolve] = useState<any>(null);
  const [resolution, setResolution] = useState('');
  const [form, setForm] = useState({ exception_type: 'shortage', severity: 'medium', title: '', description: '', item_code: '', warehouse_code: '', expected_value: '', actual_value: '' });

  const filtered = (exceptions || []).filter((e: any) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (typeFilter !== 'all' && e.exception_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (e.title || '').toLowerCase().includes(s) || (e.item_code || '').toLowerCase().includes(s) || (e.description || '').toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    open: exceptions?.filter((e: any) => e.status === 'open').length || 0,
    investigating: exceptions?.filter((e: any) => e.status === 'investigating').length || 0,
    resolved: exceptions?.filter((e: any) => e.status === 'resolved').length || 0,
    escalated: exceptions?.filter((e: any) => e.status === 'escalated').length || 0,
  };

  const handleCreate = async () => {
    await createException.mutateAsync(form);
    setShowCreate(false);
    setForm({ exception_type: 'shortage', severity: 'medium', title: '', description: '', item_code: '', warehouse_code: '', expected_value: '', actual_value: '' });
  };

  const handleResolve = async () => {
    if (!showResolve) return;
    await updateException.mutateAsync({ id: showResolve.id, status: 'resolved', resolution, resolved_at: new Date().toISOString() });
    setShowResolve(null);
    setResolution('');
  };

  const severityColor = (s: string) => s === 'critical' ? 'destructive' : s === 'high' ? 'default' : 'secondary';
  const statusIcon = (s: string) => {
    switch (s) {
      case 'open': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'investigating': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'escalated': return <Shield className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Exception Console</h1>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Report Exception</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Report Exception</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.exception_type} onValueChange={v => setForm(p => ({ ...p, exception_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortage">Shortage</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="mismatch">Mismatch</SelectItem>
                    <SelectItem value="split_pick">Split Pick</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item</SelectItem>
                    <SelectItem value="wrong_location">Wrong Location</SelectItem>
                    <SelectItem value="system_error">System Error</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Item Code" value={form.item_code} onChange={e => setForm(p => ({ ...p, item_code: e.target.value }))} />
              <Input placeholder="Warehouse" value={form.warehouse_code} onChange={e => setForm(p => ({ ...p, warehouse_code: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Expected Value" value={form.expected_value} onChange={e => setForm(p => ({ ...p, expected_value: e.target.value }))} />
                <Input placeholder="Actual Value" value={form.actual_value} onChange={e => setForm(p => ({ ...p, actual_value: e.target.value }))} />
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <Button onClick={handleCreate} className="w-full" disabled={!form.title || createException.isPending}>Report</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 cursor-pointer hover:border-red-500/50" onClick={() => setStatusFilter('open')}><div className="text-2xl font-bold text-red-500">{stats.open}</div><div className="text-xs text-muted-foreground">Open</div></Card>
        <Card className="p-4 cursor-pointer hover:border-orange-500/50" onClick={() => setStatusFilter('investigating')}><div className="text-2xl font-bold text-orange-500">{stats.investigating}</div><div className="text-xs text-muted-foreground">Investigating</div></Card>
        <Card className="p-4 cursor-pointer hover:border-purple-500/50" onClick={() => setStatusFilter('escalated')}><div className="text-2xl font-bold text-purple-500">{stats.escalated}</div><div className="text-xs text-muted-foreground">Escalated</div></Card>
        <Card className="p-4 cursor-pointer hover:border-green-500/50" onClick={() => setStatusFilter('resolved')}><div className="text-2xl font-bold text-green-500">{stats.resolved}</div><div className="text-xs text-muted-foreground">Resolved</div></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search exceptions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="shortage">Shortage</SelectItem>
            <SelectItem value="damage">Damage</SelectItem>
            <SelectItem value="mismatch">Mismatch</SelectItem>
            <SelectItem value="split_pick">Split Pick</SelectItem>
            <SelectItem value="wrong_item">Wrong Item</SelectItem>
            <SelectItem value="wrong_location">Wrong Location</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Expected/Actual</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exc: any) => (
                <TableRow key={exc.id}>
                  <TableCell>{statusIcon(exc.status)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{exc.title}</TableCell>
                  <TableCell><Badge variant="outline">{exc.exception_type}</Badge></TableCell>
                  <TableCell><Badge variant={severityColor(exc.severity)}>{exc.severity}</Badge></TableCell>
                  <TableCell>{exc.item_code || '—'}</TableCell>
                  <TableCell className="text-xs">{exc.expected_value || '—'} / {exc.actual_value || '—'}</TableCell>
                  <TableCell className="text-xs">{exc.created_at ? format(new Date(exc.created_at), 'dd MMM HH:mm') : '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {exc.status === 'open' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateException.mutateAsync({ id: exc.id, status: 'investigating' })}>Investigate</Button>
                        <Button size="sm" variant="outline" onClick={() => updateException.mutateAsync({ id: exc.id, status: 'escalated' })}>Escalate</Button>
                      </>
                    )}
                    {(exc.status === 'open' || exc.status === 'investigating') && (
                      <Button size="sm" onClick={() => setShowResolve(exc)}>Resolve</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No exceptions found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!showResolve} onOpenChange={() => setShowResolve(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Exception</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{showResolve?.title}</p>
            <Textarea placeholder="Resolution notes..." value={resolution} onChange={e => setResolution(e.target.value)} rows={4} />
            <Button onClick={handleResolve} className="w-full" disabled={!resolution}>Mark Resolved</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
