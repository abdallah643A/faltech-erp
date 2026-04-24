import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Search, Download, Shield } from 'lucide-react';
import { formatFileSize, performExport, downloadBlob, type MeasurementExportData } from '@/lib/measurementExport';

interface Props {
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

export default function AuditLogViewer({ reporting }: Props) {
  const logs = reporting.auditLogs.data || [];
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('__all__');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (actionFilter !== '__all__' && l.action !== actionFilter) return false;
      if (statusFilter !== '__all__' && l.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (l.user_name?.toLowerCase().includes(s) || l.user_email?.toLowerCase().includes(s) || l.action.toLowerCase().includes(s));
      }
      return true;
    });
  }, [logs, search, actionFilter, statusFilter]);

  const actions = [...new Set(logs.map(l => l.action))];

  const handleExportAudit = async () => {
    const data: MeasurementExportData = {
      projectName: 'Audit Trail Export',
      measurements: filtered.map((l, i) => ({
        id: l.id,
        type: l.action,
        label: l.user_name || l.user_email || 'Unknown',
        value: l.duration_ms || 0,
        unit: 'ms',
        color: '#000',
        notes: `Status: ${l.status} | Format: ${l.export_format || '-'} | Size: ${l.file_size ? formatFileSize(l.file_size) : '-'}`,
        created_at: l.created_at,
      })),
      generatedAt: new Date().toISOString(),
    };
    const result = await performExport(data, { format: 'csv', includeMetadata: true });
    downloadBlob(result.blob, `audit-trail-${Date.now()}.csv`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Audit Trail</CardTitle>
            <Button size="sm" variant="outline" onClick={handleExportAudit}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user..." className="pl-8" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Actions</SelectItem>
                {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audit entries</TableCell></TableRow>
                ) : filtered.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                    <TableCell className="text-sm">{l.user_name || l.user_email || '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.action}</Badge></TableCell>
                    <TableCell>{l.export_format ? <Badge variant="secondary" className="text-xs uppercase">{l.export_format}</Badge> : '-'}</TableCell>
                    <TableCell className="text-xs">{l.file_size ? formatFileSize(l.file_size) : '-'}</TableCell>
                    <TableCell className="text-xs">{l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'success' ? 'default' : 'destructive'} className="text-xs">{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {logs.length} entries</p>
        </CardContent>
      </Card>
    </div>
  );
}
