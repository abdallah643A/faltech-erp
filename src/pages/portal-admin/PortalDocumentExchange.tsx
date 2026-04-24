import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePortalDocumentExchanges, PortalType } from '@/hooks/useUnifiedPortal';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const PORTAL_TYPES: PortalType[] = ['client', 'supplier', 'subcontractor'];

export default function PortalDocumentExchange() {
  const [portalType, setPortalType] = useState<PortalType>('supplier');
  const { data: docs = [], updateStatus } = usePortalDocumentExchanges(portalType);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Exchange</h1>
          <p className="text-sm text-muted-foreground">Review documents shared by portal members.</p>
        </div>
        <Select value={portalType} onValueChange={(v) => setPortalType(v as PortalType)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{PORTAL_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Pending review</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Direction</TableHead>
              <TableHead>Shared</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {docs.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.document_name}</TableCell>
                  <TableCell>{d.document_type || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{d.direction}</Badge></TableCell>
                  <TableCell>{new Date(d.shared_at).toLocaleDateString()}</TableCell>
                  <TableCell><Badge>{d.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: d.id, status: 'accepted' })}><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: d.id, status: 'requested_changes' })}><Clock className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: d.id, status: 'rejected' })}><XCircle className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {docs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No documents shared yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
