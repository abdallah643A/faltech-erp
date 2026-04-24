import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Inbox, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCorrespondenceList } from '@/hooks/useCorrespondence';
import { CorrStatusBadge, CorrPriorityBadge, CorrConfBadge } from '@/components/correspondence/CorrBadges';
import type { CorrDirection } from '@/integrations/supabase/correspondence-tables';
import { format } from 'date-fns';

interface Props {
  direction: CorrDirection;
  title: string;
  titleAr: string;
}

export function CorrespondenceListView({ direction, title, titleAr }: Props) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useCorrespondenceList({ direction, search: search || undefined, limit: 200 });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {direction === 'incoming' ? <Inbox className="h-8 w-8 text-primary" /> : <Send className="h-8 w-8 text-primary" />}
            {title}
          </h1>
          <p className="text-muted-foreground mt-1" dir="rtl">{titleAr}</p>
        </div>
        <Button asChild>
          <Link to={`/correspondence/${direction}/new`}>
            <Plus className="h-4 w-4 mr-2" /> New {direction === 'incoming' ? 'Incoming' : 'Outgoing'}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subject, reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No correspondence found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>{direction === 'incoming' ? 'Sender' : 'Recipient'}</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Confidentiality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/correspondence/${r.id}`)}>
                    <TableCell className="font-mono text-xs">{r.reference_no ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate font-medium">{r.subject}</TableCell>
                    <TableCell className="text-sm">{direction === 'incoming' ? (r.sender_org || r.sender_name || '—') : (r.recipient_org || r.recipient_name || '—')}</TableCell>
                    <TableCell className="text-sm">{r.correspondence_date ? format(new Date(r.correspondence_date), 'PP') : '—'}</TableCell>
                    <TableCell><CorrStatusBadge status={r.status} /></TableCell>
                    <TableCell><CorrPriorityBadge p={r.priority} /></TableCell>
                    <TableCell><CorrConfBadge c={r.confidentiality} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
