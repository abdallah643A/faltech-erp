import { useState } from 'react';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Shield, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const TRACKED_TABLES = [
  { value: 'all', label: 'All Tables' },
  { value: 'sales_orders', label: 'Sales Orders' },
  { value: 'purchase_orders', label: 'Purchase Orders' },
  { value: 'ar_invoices', label: 'AR Invoices' },
  { value: 'ap_invoices', label: 'AP Invoices' },
  { value: 'ar_credit_memos', label: 'AR Credit Memos' },
  { value: 'ap_credit_memos', label: 'AP Credit Memos' },
  { value: 'business_partners', label: 'Business Partners' },
  { value: 'journal_entries', label: 'Journal Entries' },
  { value: 'incoming_payments', label: 'Incoming Payments' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'items', label: 'Items' },
  { value: 'employees', label: 'Employees' },
  { value: 'projects', label: 'Projects' },
  { value: 'leave_requests', label: 'Leave Requests' },
  { value: 'material_requests', label: 'Material Requests' },
  { value: 'delivery_notes', label: 'Delivery Notes' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'goods_receipts', label: 'Goods Receipts' },
  { value: 'activities', label: 'Activities' },
  { value: 'financial_clearances', label: 'Financial Clearances' },
];

export default function AuditTrail() {
  const { t } = useLanguage();
  const [tableFilter, setTableFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailEntry, setDetailEntry] = useState<any>(null);

  const { entries, isLoading } = useAuditTrail({
    table_name: tableFilter === 'all' ? undefined : tableFilter || undefined,
    limit: 500,
  });

  const filtered = (entries || []).filter(e =>
    !searchTerm ||
    e.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.record_id?.includes(searchTerm)
  );

  const actionColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    INSERT: 'default',
    UPDATE: 'secondary',
    DELETE: 'destructive',
  };

  const stats = {
    total: entries?.length || 0,
    inserts: entries?.filter(e => e.action === 'INSERT').length || 0,
    updates: entries?.filter(e => e.action === 'UPDATE').length || 0,
    deletes: entries?.filter(e => e.action === 'DELETE').length || 0,
  };

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
        <p className="text-muted-foreground">Immutable log of all data changes across the system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Entries</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-green-600">{stats.inserts}</p><p className="text-xs text-muted-foreground">Inserts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-blue-600">{stats.updates}</p><p className="text-xs text-muted-foreground">Updates</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold text-destructive">{stats.deletes}</p><p className="text-xs text-muted-foreground">Deletes</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by user or record..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Tables" /></SelectTrigger>
          <SelectContent>
            {TRACKED_TABLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Timestamp</TableHead><TableHead>Table</TableHead><TableHead>Action</TableHead>
            <TableHead>Record ID</TableHead><TableHead>Changed Fields</TableHead><TableHead>User</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow> :
             filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audit entries</TableCell></TableRow> :
             filtered.map(entry => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs">{format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                <TableCell><Badge variant="outline">{entry.table_name}</Badge></TableCell>
                <TableCell><Badge variant={actionColors[entry.action] || 'outline'}>{entry.action}</Badge></TableCell>
                <TableCell className="font-mono text-xs max-w-[120px] truncate">{entry.record_id}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{entry.changed_fields?.join(', ') || '—'}</TableCell>
                <TableCell><div><p className="text-sm">{entry.user_name || '—'}</p><p className="text-xs text-muted-foreground">{entry.user_email}</p></div></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailEntry(entry)}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
             ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Audit Detail</DialogTitle></DialogHeader>
          {detailEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Table:</span> {detailEntry.table_name}</div>
                <div><span className="text-muted-foreground">Action:</span> <Badge variant={actionColors[detailEntry.action]}>{detailEntry.action}</Badge></div>
                <div><span className="text-muted-foreground">User:</span> {detailEntry.user_name}</div>
              </div>
              {detailEntry.changed_fields && (
                <div><span className="text-sm font-medium">Changed Fields:</span>
                  <div className="flex gap-1 mt-1 flex-wrap">{detailEntry.changed_fields.map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}</div>
                </div>
              )}
              {detailEntry.old_values && (
                <div><span className="text-sm font-medium">Old Values:</span>
                  <ScrollArea className="h-40 mt-1"><pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(detailEntry.old_values, null, 2)}</pre></ScrollArea>
                </div>
              )}
              {detailEntry.new_values && (
                <div><span className="text-sm font-medium">New Values:</span>
                  <ScrollArea className="h-40 mt-1"><pre className="text-xs bg-muted p-3 rounded overflow-auto">{JSON.stringify(detailEntry.new_values, null, 2)}</pre></ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
