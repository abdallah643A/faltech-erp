import { useState } from 'react';
import { useAccountingDetermination } from '@/hooks/useAccountingDetermination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, Search, XCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ErrorQueuePanel() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { exceptions, resolveException } = useAccountingDetermination();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);

  const filtered = exceptions.filter((ex: any) => {
    if (statusFilter !== 'all' && ex.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (ex.document_number || '').toLowerCase().includes(s) ||
        (ex.error_message || '').toLowerCase().includes(s) ||
        (ex.error_type || '').toLowerCase().includes(s) ||
        (ex.document_type || '').toLowerCase().includes(s);
    }
    return true;
  });

  const openCount = exceptions.filter((e: any) => e.status === 'open').length;
  const resolvedCount = exceptions.filter((e: any) => e.status === 'resolved').length;

  const handleResolve = () => {
    if (!resolveId) return;
    resolveException.mutate({ id: resolveId, notes });
    setResolveId(null);
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">{isAr ? 'مفتوحة' : 'Open'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div><p className="text-2xl font-bold">{resolvedCount}</p><p className="text-xs text-muted-foreground">{isAr ? 'محلولة' : 'Resolved'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div><p className="text-2xl font-bold">{exceptions.length}</p><p className="text-xs text-muted-foreground">{isAr ? 'إجمالي' : 'Total'}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {isAr ? 'قائمة الأخطاء والاستثناءات' : 'Error Queue & Exceptions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search by doc, error...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="open">{isAr ? 'مفتوح' : 'Open'}</SelectItem>
                <SelectItem value="resolved">{isAr ? 'محلول' : 'Resolved'}</SelectItem>
                <SelectItem value="ignored">{isAr ? 'متجاهل' : 'Ignored'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'نوع المستند' : 'Doc Type'}</TableHead>
                <TableHead>{isAr ? 'رقم المستند' : 'Doc #'}</TableHead>
                <TableHead>{isAr ? 'نوع الخطأ' : 'Error Type'}</TableHead>
                <TableHead className="min-w-[250px]">{isAr ? 'الرسالة' : 'Error Message'}</TableHead>
                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell>
                    <Badge variant={ex.status === 'open' ? 'destructive' : ex.status === 'resolved' ? 'default' : 'secondary'} className="text-xs">
                      {ex.status}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ex.document_type}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{ex.document_number || '-'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ex.error_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{ex.error_message}</TableCell>
                  <TableCell className="text-xs">{ex.created_at ? format(new Date(ex.created_at), 'yyyy-MM-dd HH:mm') : ''}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetailItem(ex)}><Eye className="h-3.5 w-3.5" /></Button>
                      {ex.status === 'open' && (
                        <Button size="sm" variant="ghost" onClick={() => { setResolveId(ex.id); setNotes(''); }}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {isAr ? 'لا توجد استثناءات' : 'No exceptions found'}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveId} onOpenChange={() => setResolveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'حل الاستثناء' : 'Resolve Exception'}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder={isAr ? 'ملاحظات الحل...' : 'Resolution notes...'} value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleResolve}><CheckCircle2 className="h-4 w-4 mr-2" /> {isAr ? 'حل' : 'Resolve'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تفاصيل الاستثناء' : 'Exception Details'}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><strong>{isAr ? 'الحالة:' : 'Status:'}</strong> <Badge variant={detailItem.status === 'open' ? 'destructive' : 'default'}>{detailItem.status}</Badge></div>
                <div><strong>{isAr ? 'نوع المستند:' : 'Doc Type:'}</strong> {detailItem.document_type}</div>
                <div><strong>{isAr ? 'رقم المستند:' : 'Doc #:'}</strong> {detailItem.document_number || '-'}</div>
                <div><strong>{isAr ? 'نوع الخطأ:' : 'Error Type:'}</strong> {detailItem.error_type}</div>
              </div>
              <div>
                <strong>{isAr ? 'رسالة الخطأ:' : 'Error Message:'}</strong>
                <p className="mt-1 p-2 bg-destructive/10 rounded text-destructive text-sm">{detailItem.error_message}</p>
              </div>
              {detailItem.error_details && (
                <div>
                  <strong>{isAr ? 'تفاصيل إضافية:' : 'Error Details:'}</strong>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px]">{JSON.stringify(detailItem.error_details, null, 2)}</pre>
                </div>
              )}
              {detailItem.resolution_notes && (
                <div>
                  <strong>{isAr ? 'ملاحظات الحل:' : 'Resolution Notes:'}</strong>
                  <p className="mt-1 p-2 bg-green-50 dark:bg-green-900/10 rounded text-sm">{detailItem.resolution_notes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{isAr ? 'الإنشاء:' : 'Created:'} {detailItem.created_at ? format(new Date(detailItem.created_at), 'yyyy-MM-dd HH:mm') : ''}</span>
                {detailItem.resolved_at && <span>• {isAr ? 'الحل:' : 'Resolved:'} {format(new Date(detailItem.resolved_at), 'yyyy-MM-dd HH:mm')}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
