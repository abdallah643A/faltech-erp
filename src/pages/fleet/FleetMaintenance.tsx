import { useState } from 'react';
import { useFleetMaintenanceJobs } from '@/hooks/useFleetData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench } from 'lucide-react';
import { formatSAR } from '@/lib/currency';

export default function FleetMaintenance() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: jobs = [], isLoading } = useFleetMaintenanceJobs({ status: statusFilter || undefined });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Maintenance Hub</h1>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {['open','scheduled','in_progress','pending_parts','completed','cancelled'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Job #</TableHead><TableHead>Vehicle</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Description</TableHead><TableHead>Cost</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow> :
            jobs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No jobs</TableCell></TableRow> :
            jobs.map(j => (
              <TableRow key={j.id}>
                <TableCell className="text-xs font-mono">{j.job_number}</TableCell>
                <TableCell className="text-xs">{(j as any).fleet_assets?.asset_name || '—'}</TableCell>
                <TableCell className="text-xs capitalize">{j.job_type}</TableCell>
                <TableCell><Badge variant={j.priority === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{j.priority}</Badge></TableCell>
                <TableCell className="text-xs truncate max-w-[200px]">{j.description}</TableCell>
                <TableCell className="text-xs">{formatSAR(j.total_cost)}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{j.status?.replace(/_/g,' ')}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
