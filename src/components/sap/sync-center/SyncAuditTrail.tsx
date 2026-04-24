import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSyncAuditLog } from '@/hooks/useSyncEnhanced';
import { Loader2, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = ['config', 'sync_run', 'metadata', 'mapping', 'provisioning', 'schedule'];

export function SyncAuditTrail() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [catFilter, setCatFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data: logs = [], isLoading } = useSyncAuditLog(catFilter || undefined, entityFilter || undefined);

  const categoryCounts = (logs as any[]).reduce((acc: Record<string, number>, l: any) => {
    acc[l.action_category] = (acc[l.action_category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={catFilter || 'all'} onValueChange={(v) => setCatFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder={isAr ? 'كل الفئات' : 'All Categories'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <Badge key={cat} variant="outline" className="cursor-pointer text-[10px]" onClick={() => setCatFilter(cat)}>
              {cat}: {String(count)}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">{isAr ? 'الوقت' : 'Time'}</th>
                    <th className="p-2 text-left">{isAr ? 'الفئة' : 'Category'}</th>
                    <th className="p-2 text-left">{isAr ? 'الإجراء' : 'Action'}</th>
                    <th className="p-2 text-left">{isAr ? 'الكيان' : 'Entity'}</th>
                    <th className="p-2 text-left">{isAr ? 'بواسطة' : 'By'}</th>
                    <th className="p-2 text-left">{isAr ? 'التفاصيل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs as any[]).map((l: any) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(l.created_at), 'MMM dd HH:mm:ss')}</div>
                      </td>
                      <td className="p-2"><Badge variant="outline" className="text-[10px]">{l.action_category}</Badge></td>
                      <td className="p-2 text-xs font-medium">{l.action}</td>
                      <td className="p-2 text-xs capitalize">{l.entity_name?.replace(/_/g, ' ') || '-'}</td>
                      <td className="p-2 text-xs text-muted-foreground">{l.performed_by_name || 'System'}</td>
                      <td className="p-2 text-xs max-w-[300px] truncate text-muted-foreground">
                        {l.details ? JSON.stringify(l.details).slice(0, 100) : '-'}
                      </td>
                    </tr>
                  ))}
                  {(logs as any[]).length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      {isAr ? 'لا توجد سجلات تدقيق بعد' : 'No audit logs yet'}
                    </td></tr>
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
