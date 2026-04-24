import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  History, CheckCircle2, XCircle, Loader2, RefreshCw, Clock, Play
} from 'lucide-react';

interface RunLog {
  id: string;
  run_type: string;
  started_at: string;
  completed_at: string | null;
  total_invoices: number;
  sent_count: number;
  failed_count: number;
  retry_count: number;
  skipped_count: number;
  status: string;
  error_message: string | null;
}

export function ExecutionHistory() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRuns(); }, []);

  const fetchRuns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoice_automation_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    setRuns((data || []) as RunLog[]);
    setLoading(false);
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const secs = Math.round(ms / 1000);
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const handleManualRun = async () => {
    const { error } = await supabase.from('invoice_automation_runs').insert({
      run_type: 'manual',
      status: 'running',
    });
    if (!error) fetchRuns();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            {isAr ? 'سجل التنفيذ' : 'Execution History'}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleManualRun} className="gap-1">
              <Play className="h-3 w-3" />{isAr ? 'تشغيل يدوي' : 'Manual Run'}
            </Button>
            <Button size="sm" variant="ghost" onClick={fetchRuns}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{isAr ? 'لا يوجد سجل تنفيذ' : 'No execution history yet'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{isAr ? 'وقت البدء' : 'Started'}</TableHead>
                <TableHead>{isAr ? 'المدة' : 'Duration'}</TableHead>
                <TableHead>{isAr ? 'الإجمالي' : 'Total'}</TableHead>
                <TableHead>{isAr ? 'مرسل' : 'Sent'}</TableHead>
                <TableHead>{isAr ? 'فشل' : 'Failed'}</TableHead>
                <TableHead>{isAr ? 'إعادة' : 'Retry'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {run.run_type === 'manual' ? (isAr ? 'يدوي' : 'Manual') : (isAr ? 'مجدول' : 'Scheduled')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{new Date(run.started_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{getDuration(run.started_at, run.completed_at)}</TableCell>
                  <TableCell className="font-medium">{run.total_invoices}</TableCell>
                  <TableCell className="text-green-600">{run.sent_count}</TableCell>
                  <TableCell className="text-red-600">{run.failed_count}</TableCell>
                  <TableCell className="text-orange-600">{run.retry_count}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 text-xs ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {run.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> :
                       run.status === 'failed' ? <XCircle className="h-3 w-3" /> :
                       <Loader2 className="h-3 w-3 animate-spin" />}
                      {run.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
