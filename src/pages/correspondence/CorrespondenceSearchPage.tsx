import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCorrespondenceList } from '@/hooks/useCorrespondence';
import { CorrStatusBadge, CorrConfBadge, CorrPriorityBadge, CorrEcmBadge } from '@/components/correspondence/CorrBadges';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Download } from 'lucide-react';

export default function CorrespondenceSearchPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<any>({ limit: 200 });
  const { data: rows = [], isLoading } = useCorrespondenceList(filters);

  const exportCsv = () => {
    const header = ['Reference','Subject','Direction','Status','Priority','Confidentiality','Date'];
    const lines = rows.map(r => [r.reference_no, r.subject, r.direction, r.status, r.priority, r.confidentiality, r.correspondence_date ?? ''].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `correspondence-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Search Correspondence</h1>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      <Card>
        <CardHeader><CardTitle><Search className="h-4 w-4 inline mr-1" /> Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Search</Label><Input value={filters.search ?? ''} onChange={(e) => setFilters((f: any) => ({ ...f, search: e.target.value }))} placeholder="subject / reference" /></div>
          <div><Label>Direction</Label>
            <Select value={filters.direction ?? 'all'} onValueChange={(v) => setFilters((f: any) => ({ ...f, direction: v === 'all' ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={filters.status ?? 'all'} onValueChange={(v) => setFilters((f: any) => ({ ...f, status: v === 'all' ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['draft','registered','in_review','assigned','in_progress','pending_approval','approved','dispatched','closed','archived'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Priority</Label>
            <Select value={filters.priority ?? 'all'} onValueChange={(v) => setFilters((f: any) => ({ ...f, priority: v === 'all' ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['low','normal','high','urgent','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f: any) => ({ ...f, dateFrom: e.target.value }))} /></div>
          <div><Label>To</Label><Input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((f: any) => ({ ...f, dateTo: e.target.value }))} /></div>
          <div><Label>ECM Status</Label>
            <Select value={filters.ecmStatus ?? 'all'} onValueChange={(v) => setFilters((f: any) => ({ ...f, ecmStatus: v === 'all' ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['pending','synced','failed','retry_required'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Reference</TableHead><TableHead>Subject</TableHead><TableHead>Direction</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Conf.</TableHead><TableHead>ECM</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8}>Loading…</TableCell></TableRow> :
                rows.map(r => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/correspondence/${r.id}`)}>
                    <TableCell className="font-mono text-xs">{r.reference_no ?? '—'}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>{r.direction}</TableCell>
                    <TableCell>{r.correspondence_date ? format(new Date(r.correspondence_date), 'PP') : '—'}</TableCell>
                    <TableCell><CorrStatusBadge status={r.status} /></TableCell>
                    <TableCell><CorrPriorityBadge p={r.priority} /></TableCell>
                    <TableCell><CorrConfBadge c={r.confidentiality} /></TableCell>
                    <TableCell><CorrEcmBadge s={r.ecm_sync_status} /></TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
