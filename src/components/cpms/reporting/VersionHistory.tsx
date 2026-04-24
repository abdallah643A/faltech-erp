import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { GitBranch } from 'lucide-react';
import { formatFileSize } from '@/lib/measurementExport';
import type { MeasurementReport } from '@/hooks/useCPMSReporting';

interface Props {
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

export default function VersionHistory({ reporting }: Props) {
  const reports = reporting.reports.data || [];
  const [selectedReport, setSelectedReport] = useState('');

  const versionsQuery = selectedReport ? reporting.getVersions(selectedReport) : null;
  const versions = versionsQuery?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-medium flex items-center gap-2"><GitBranch className="h-4 w-4" /> Report Version History</h3>
        <Select value={selectedReport || '__none__'} onValueChange={v => setSelectedReport(v === '__none__' ? '' : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a report..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select a report...</SelectItem>
            {reports.map(r => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Changes</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedReport ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Select a report to view version history</TableCell></TableRow>
              ) : versions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No versions recorded</TableCell></TableRow>
              ) : versions.map(v => (
                <TableRow key={v.id}>
                  <TableCell><Badge variant="outline">v{v.version_number}</Badge></TableCell>
                  <TableCell className="text-sm">{v.changes_summary || '-'}</TableCell>
                  <TableCell className="text-xs">{v.file_size ? formatFileSize(v.file_size) : '-'}</TableCell>
                  <TableCell className="text-xs">{format(new Date(v.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
