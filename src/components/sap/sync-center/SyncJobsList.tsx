import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSyncJobs } from '@/hooks/useSyncJobs';
import { format } from 'date-fns';
import { Search, Download, ChevronRight, Loader2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';

export function SyncJobsList() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { jobs, isLoading } = useSyncJobs(entityFilter || undefined, statusFilter || undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={entityFilter || 'all'} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder={isAr ? 'كل الكيانات' : 'All Entities'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {['business_partner','item','sales_order','ar_invoice','incoming_payment','purchase_order','goods_receipt','ap_invoice_payable','journal_entry','activity','opportunity','quote'].map(e => (
              <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder={isAr ? 'كل الحالات' : 'All Statuses'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {['queued','running','completed','failed','paused','cancelled'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">{isAr ? 'المهمة' : 'Job'}</th>
                  <th className="p-3 text-left font-medium">{isAr ? 'الكيان' : 'Entity'}</th>
                  <th className="p-3 text-left font-medium">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3 text-left font-medium">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-right font-medium">{isAr ? 'جلب' : 'Fetched'}</th>
                  <th className="p-3 text-right font-medium">{isAr ? 'إدراج' : 'Inserted'}</th>
                  <th className="p-3 text-right font-medium">{isAr ? 'تحديث' : 'Updated'}</th>
                  <th className="p-3 text-right font-medium">{isAr ? 'فشل' : 'Failed'}</th>
                  <th className="p-3 text-right font-medium">{isAr ? 'المدة' : 'Duration'}</th>
                  <th className="p-3 text-left font-medium">{isAr ? 'الوقت' : 'Time'}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={11} className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                )}
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedJob(job)}>
                    <td className="p-3 font-mono text-xs">{job.job_number}</td>
                    <td className="p-3 capitalize">{job.entity_name.replace(/_/g, ' ')}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{job.job_type}</Badge></td>
                    <td className="p-3">
                      <Badge variant={job.status === 'completed' ? 'secondary' : job.status === 'failed' ? 'destructive' : 'outline'}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{job.records_fetched}</td>
                    <td className="p-3 text-right text-emerald-600">{job.records_inserted}</td>
                    <td className="p-3 text-right text-blue-600">{job.records_updated}</td>
                    <td className="p-3 text-right text-destructive">{job.records_failed}</td>
                    <td className="p-3 text-right text-xs">{job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{format(new Date(job.created_at), 'MMM dd HH:mm')}</td>
                    <td className="p-3"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
                {!isLoading && jobs.length === 0 && (
                  <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">{isAr ? 'لا توجد مهام' : 'No sync jobs found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Job Detail: {selectedJob?.job_number}</SheetTitle>
          </SheetHeader>
          {selectedJob && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium">{selectedJob.entity_name}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedJob.job_type}</span></div>
                <div><span className="text-muted-foreground">Direction:</span> <span className="font-medium">{selectedJob.direction}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedJob.status}</Badge></div>
                <div><span className="text-muted-foreground">Triggered:</span> <span className="font-medium">{selectedJob.trigger_type}</span></div>
                <div><span className="text-muted-foreground">By:</span> <span className="font-medium">{selectedJob.triggered_by_name || 'System'}</span></div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3">Records</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold">{selectedJob.records_fetched}</p><p className="text-xs text-muted-foreground">Fetched</p></div>
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold text-emerald-600">{selectedJob.records_inserted}</p><p className="text-xs text-muted-foreground">Inserted</p></div>
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold text-blue-600">{selectedJob.records_updated}</p><p className="text-xs text-muted-foreground">Updated</p></div>
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold text-amber-600">{selectedJob.records_skipped}</p><p className="text-xs text-muted-foreground">Skipped</p></div>
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold text-destructive">{selectedJob.records_failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
                  <div className="text-center p-2 rounded bg-muted"><p className="text-lg font-bold">{selectedJob.duration_ms ? `${(selectedJob.duration_ms / 1000).toFixed(1)}s` : '-'}</p><p className="text-xs text-muted-foreground">Duration</p></div>
                </div>
              </div>
              {selectedJob.watermark_before && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Watermark Before:</span> {selectedJob.watermark_before} → {selectedJob.watermark_after || 'N/A'}
                </div>
              )}
              {selectedJob.error_summary && (
                <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-xs mt-1">{selectedJob.error_summary}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
