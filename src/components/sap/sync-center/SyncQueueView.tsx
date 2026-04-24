import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSyncAdminQueue } from '@/hooks/useSyncAdmin';
import { Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SyncQueueView() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: queueData = [], isLoading } = useSyncAdminQueue();

  const totalPending = (queueData as any[]).reduce((s: number, q: any) => s + (q.pending || 0), 0);
  const totalProcessing = (queueData as any[]).reduce((s: number, q: any) => s + (q.processing || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {totalPending} pending</Badge>
        <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3" /> {totalProcessing} processing</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(queueData as any[]).map((q: any) => (
              <Card key={q.entity}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium capitalize">{q.entity.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-amber-600">{q.total}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                    <span>{q.pending} pending</span>
                    <span>{q.processing} processing</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(queueData as any[]).length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {isAr ? 'لا توجد سجلات في قائمة الانتظار' : 'No records in queue'}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
