import { useState } from 'react';
import { useQAMode } from '@/contexts/QAModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FlaskConical, Play, Square, Trash2, Download, CheckCircle2, XCircle, AlertTriangle,
  Clock, SkipForward, Loader2, FileText, Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  pass: CheckCircle2,
  fail: XCircle,
  blocked: AlertTriangle,
  skipped: SkipForward,
  pending: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  pass: 'text-success bg-success/10',
  fail: 'text-destructive bg-destructive/10',
  blocked: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
  skipped: 'text-muted-foreground bg-muted',
  pending: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
};

export default function QADashboard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { isQAMode, runs, activeRun, toggleQAMode, startRun, endRun, deleteTestRecords } = useQAMode();
  const { toast } = useToast();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [runName, setRunName] = useState('');
  const [testerName, setTesterName] = useState('');
  const [desc, setDesc] = useState('');
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const viewRunId = selectedRunId || activeRun?.id;

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['qa-records-detail', viewRunId],
    queryFn: async () => {
      if (!viewRunId) return [];
      const { data, error } = await (supabase as any).from('qa_test_records').select('*').eq('test_run_id', viewRunId).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!viewRunId,
  });

  const filteredRecords = records.filter((r: any) =>
    !search || r.module?.toLowerCase().includes(search.toLowerCase()) ||
    r.label?.toLowerCase().includes(search.toLowerCase()) ||
    r.doc_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.table_name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: records.length,
    pass: records.filter((r: any) => r.evidence_status === 'pass').length,
    fail: records.filter((r: any) => r.evidence_status === 'fail').length,
    blocked: records.filter((r: any) => r.evidence_status === 'blocked').length,
    pending: records.filter((r: any) => r.evidence_status === 'pending').length,
  };

  const handleStart = async () => {
    if (!runName.trim()) return;
    await startRun(runName.trim(), testerName.trim() || undefined, desc.trim() || undefined);
    setShowStartDialog(false);
    setRunName('');
    setTesterName('');
    setDesc('');
  };

  const updateRecordField = async (id: string, field: string, value: string) => {
    await (supabase as any).from('qa_test_records').update({ [field]: value }).eq('id', id);
  };

  const handleExport = () => {
  const { t } = useLanguage();

    const csv = [
      ['Module', 'Table', 'Doc Number', 'Label', 'Status', 'Expected', 'Actual', 'Blocker Notes', 'Created At'].join(','),
      ...records.map((r: any) => [
        r.module, r.table_name, r.doc_number || '', r.label || '', r.evidence_status,
        `"${(r.expected_result || '').replace(/"/g, '""')}"`,
        `"${(r.actual_result || '').replace(/"/g, '""')}"`,
        `"${(r.blocker_notes || '').replace(/"/g, '""')}"`,
        r.created_at,
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-run-${viewRunId?.slice(0, 8)}-evidence.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Test evidence exported as CSV' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold">{isAr ? 'لوحة ضمان الجودة' : 'QA Dashboard'}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? 'إدارة تشغيلات الاختبار والسجلات' : 'Manage test runs, records, and evidence'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isQAMode && (
            <Button onClick={toggleQAMode} className="bg-amber-500 hover:bg-amber-600 text-amber-950">
              <FlaskConical className="h-4 w-4 mr-1" /> {isAr ? 'تفعيل وضع QA' : 'Enable QA Mode'}
            </Button>
          )}
          {isQAMode && !activeRun && (
            <Button onClick={() => setShowStartDialog(true)} className="bg-amber-500 hover:bg-amber-600 text-amber-950">
              <Play className="h-4 w-4 mr-1" /> {isAr ? 'بدء تشغيل' : 'Start Run'}
            </Button>
          )}
          {activeRun && (
            <Button variant="outline" onClick={endRun}>
              <Square className="h-4 w-4 mr-1" /> {isAr ? 'إنهاء التشغيل' : 'End Run'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {viewRunId && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: isAr ? 'الإجمالي' : 'Total', value: stats.total, color: 'text-foreground' },
            { label: isAr ? 'نجح' : 'Pass', value: stats.pass, color: 'text-success' },
            { label: isAr ? 'فشل' : 'Fail', value: stats.fail, color: 'text-destructive' },
            { label: isAr ? 'محظور' : 'Blocked', value: stats.blocked, color: 'text-amber-600' },
            { label: isAr ? 'معلق' : 'Pending', value: stats.pending, color: 'text-blue-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="runs" className="space-y-3">
        <TabsList>
          <TabsTrigger value="runs">{isAr ? 'تشغيلات الاختبار' : 'Test Runs'}</TabsTrigger>
          <TabsTrigger value="records">{isAr ? 'السجلات' : 'Records & Evidence'}</TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead>{isAr ? 'المختبر' : 'Tester'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{isAr ? 'البيئة' : 'Environment'}</TableHead>
                    <TableHead>{isAr ? 'بدأ في' : 'Started'}</TableHead>
                    <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isAr ? 'لا يوجد تشغيلات' : 'No test runs yet'}</TableCell></TableRow>
                  ) : runs.map(run => (
                    <TableRow key={run.id} className={`cursor-pointer ${viewRunId === run.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => setSelectedRunId(run.id)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{run.name}</p>
                          {run.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{run.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{run.tester_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={run.status === 'active' ? 'default' : 'secondary'} className={run.status === 'active' ? 'bg-amber-500 text-amber-950' : ''}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{run.environment || 'staging'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(run.created_at), 'MMM d, HH:mm')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteRunId(run.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records">
          <Card>
            <CardHeader className="py-3 px-4 flex-row items-center gap-2 space-y-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder={isAr ? 'بحث...' : 'Search records...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={records.length === 0}>
                <Download className="h-4 w-4 mr-1" /> {isAr ? 'تصدير' : 'Export CSV'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{isAr ? 'الوحدة' : 'Module'}</TableHead>
                      <TableHead>{isAr ? 'الجدول' : 'Table'}</TableHead>
                      <TableHead>{isAr ? 'رقم المستند' : 'Doc #'}</TableHead>
                      <TableHead>{isAr ? 'التسمية' : 'Label'}</TableHead>
                      <TableHead className="w-[100px]">{isAr ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{isAr ? 'النتيجة المتوقعة' : 'Expected'}</TableHead>
                      <TableHead>{isAr ? 'النتيجة الفعلية' : 'Actual'}</TableHead>
                      <TableHead>{isAr ? 'ملاحظات العائق' : 'Blockers'}</TableHead>
                      <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsLoading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{isAr ? 'لا سجلات' : 'No test records'}</TableCell></TableRow>
                    ) : filteredRecords.map((rec: any) => {
                      const Icon = STATUS_ICONS[rec.evidence_status] || Clock;
                      return (
                        <TableRow key={rec.id}>
                          <TableCell><Badge variant="outline" className="text-[10px]">{rec.module}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{rec.table_name}</TableCell>
                          <TableCell className="text-xs font-mono">{rec.doc_number || rec.record_id.slice(0, 8)}</TableCell>
                          <TableCell className="text-xs">{rec.label || '—'}</TableCell>
                          <TableCell>
                            <Select defaultValue={rec.evidence_status} onValueChange={v => updateRecordField(rec.id, 'evidence_status', v)}>
                              <SelectTrigger className="h-7 text-[10px] w-[90px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['pending', 'pass', 'fail', 'blocked', 'skipped'].map(s => (
                                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-xs w-[140px]" defaultValue={rec.expected_result || ''}
                              onBlur={e => updateRecordField(rec.id, 'expected_result', e.target.value)} placeholder="Expected..." />
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-xs w-[140px]" defaultValue={rec.actual_result || ''}
                              onBlur={e => updateRecordField(rec.id, 'actual_result', e.target.value)} placeholder="Actual..." />
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 text-xs w-[140px]" defaultValue={rec.blocker_notes || ''}
                              onBlur={e => updateRecordField(rec.id, 'blocker_notes', e.target.value)} placeholder="Blockers..." />
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">{format(new Date(rec.created_at), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Start Run Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-amber-500" />
              {isAr ? 'بدء تشغيل اختبار جديد' : 'Start New Test Run'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{isAr ? 'الاسم' : 'Run Name'} *</Label><Input value={runName} onChange={e => setRunName(e.target.value)} placeholder="Sprint 12 Regression" /></div>
            <div><Label>{isAr ? 'المختبر' : 'Tester'}</Label><Input value={testerName} onChange={e => setTesterName(e.target.value)} /></div>
            <div><Label>{isAr ? 'الوصف' : 'Description'}</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleStart} disabled={!runName.trim()} className="bg-amber-500 hover:bg-amber-600 text-amber-950">
              <Play className="h-4 w-4 mr-1" /> {isAr ? 'بدء' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRunId} onOpenChange={() => setDeleteRunId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'حذف تشغيل الاختبار' : 'Delete Test Run & All Records'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAr ? 'سيتم حذف جميع السجلات المنشأة أثناء هذا التشغيل نهائياً' : 'This will permanently delete ALL records created during this test run from their respective tables.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteRunId) { deleteTestRecords(deleteRunId); setDeleteRunId(null); } }}>
              {isAr ? 'حذف' : 'Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
