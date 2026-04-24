import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSyncAdminFailedRecords, useSyncAdminActions } from '@/hooks/useSyncAdmin';
import { Loader2, RotateCcw, SkipForward, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const ERROR_CATEGORIES = ['validation', 'mapping', 'dependency', 'timeout', 'duplicate', 'authorization', 'source_error'];

export function SyncFailedRecords() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const { data: records = [], isLoading } = useSyncAdminFailedRecords(entityFilter || undefined, categoryFilter || undefined);
  const { retryFailed, skipRecord, exportFailed } = useSyncAdminActions();

  // Group by error category
  const categoryCounts: Record<string, number> = {};
  (records as any[]).forEach((r: any) => {
    const cat = r.error_category || 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityFilter || 'all'} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder={isAr ? 'كل الكيانات' : 'All Entities'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {['business_partner','item','sales_order','ar_invoice','incoming_payment','purchase_order','journal_entry'].map(e => (
              <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder={isAr ? 'كل الفئات' : 'All Categories'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {ERROR_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => retryFailed.mutate({ entity_type: entityFilter || undefined })} disabled={(records as any[]).length === 0 || retryFailed.isPending}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إعادة محاولة الكل' : 'Retry All'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportFailed.mutate(entityFilter || undefined)} disabled={exportFailed.isPending}>
          <Download className="h-3.5 w-3.5 mr-1" /> {isAr ? 'تصدير' : 'Export'}
        </Button>
        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {(records as any[]).length} failed</Badge>
      </div>

      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <Badge key={cat} variant="outline" className="cursor-pointer" onClick={() => setCategoryFilter(cat)}>
              {cat}: {count}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">{isAr ? 'الكيان' : 'Entity'}</th>
                    <th className="p-2 text-left">{isAr ? 'مفتاح المصدر' : 'Source Key'}</th>
                    <th className="p-2 text-left">{isAr ? 'الفئة' : 'Category'}</th>
                    <th className="p-2 text-left">{isAr ? 'الخطأ' : 'Error'}</th>
                    <th className="p-2 text-right">{isAr ? 'المحاولات' : 'Retries'}</th>
                    <th className="p-2 text-left">{isAr ? 'آخر محاولة' : 'Last Attempt'}</th>
                    <th className="p-2">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(records as any[]).map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 capitalize">{r.entity_type?.replace(/_/g, ' ')}</td>
                      <td className="p-2 font-mono text-xs">{r.source_key}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.error_category || 'unknown'}</Badge></td>
                      <td className="p-2 text-xs text-destructive max-w-xs truncate">{r.error_message || '-'}</td>
                      <td className="p-2 text-right">{r.retry_count}</td>
                      <td className="p-2 text-xs text-muted-foreground">{r.last_sync_attempt ? format(new Date(r.last_sync_attempt), 'MMM dd HH:mm') : '-'}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => retryFailed.mutate({ record_ids: [r.id] })} title="Retry">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => skipRecord.mutate({ record_id: r.id })} title="Skip">
                            <SkipForward className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(records as any[]).length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد سجلات فاشلة' : 'No failed records'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
