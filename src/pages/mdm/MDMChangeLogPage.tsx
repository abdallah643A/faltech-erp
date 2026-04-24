import { useState } from 'react';
import { useChangeLog } from '@/hooks/useMDMSuite';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

export default function MDMChangeLogPage() {
  const [bpFilter, setBpFilter] = useState<string>('');
  const log = useChangeLog(bpFilter || undefined, 200);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="h-6 w-6" />Change Log</h1>
        <p className="text-muted-foreground">Append-only audit trail of all BP master-data changes.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="max-w-xs">
            <Label>Filter by BP ID</Label>
            <Input value={bpFilter} onChange={(e) => setBpFilter(e.target.value)} placeholder="Paste BP ID…" />
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>BP</TableHead><TableHead>Type</TableHead>
              <TableHead>Field</TableHead><TableHead>Summary</TableHead><TableHead>Source</TableHead><TableHead>By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(log.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{c.bp_id}</TableCell>
                  <TableCell><Badge variant="secondary">{c.change_type}</Badge></TableCell>
                  <TableCell className="text-sm">{c.field_name ?? '—'}</TableCell>
                  <TableCell className="text-sm">{c.change_summary}</TableCell>
                  <TableCell className="text-xs">{c.source}</TableCell>
                  <TableCell className="text-sm">{c.changed_by_name ?? '—'}</TableCell>
                </TableRow>
              ))}
              {(log.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No entries.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
