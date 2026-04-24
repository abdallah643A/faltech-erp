import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFinancialPeriods } from '@/hooks/useFinancialPeriods';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Calendar, Lock, Unlock, CheckCircle2, AlertTriangle, Plus, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FinancialPeriods() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { periods, isLoading, generatePeriods, updatePeriodStatus, closeYear } = useFinancialPeriods();
  const { profile } = useAuth();

  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [showGenerate, setShowGenerate] = useState(false);
  const [showCloseYear, setShowCloseYear] = useState(false);
  const [closeYearValue, setCloseYearValue] = useState(new Date().getFullYear());
  const [confirmText, setConfirmText] = useState('');

  const years = [...new Set(periods.map(p => p.fiscal_year))].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const activeYear = selectedYear || years[0] || new Date().getFullYear();
  const yearPeriods = periods.filter(p => p.fiscal_year === activeYear);

  const statusConfig: Record<string, { icon: any; color: string; label: string; labelAr: string }> = {
    open: { icon: Unlock, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: 'Open', labelAr: 'مفتوحة' },
    locked: { icon: Lock, color: 'bg-amber-500/10 text-amber-600 border-amber-200', label: 'Locked', labelAr: 'مقفلة' },
    closed: { icon: CheckCircle2, color: 'bg-red-500/10 text-red-600 border-red-200', label: 'Closed', labelAr: 'مغلقة' },
  };

  const openCount = yearPeriods.filter(p => p.status === 'open').length;
  const lockedCount = yearPeriods.filter(p => p.status === 'locked').length;
  const closedCount = yearPeriods.filter(p => p.status === 'closed').length;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isAr ? 'الفترات المالية' : 'Financial Periods'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'إدارة فتح وإقفال الفترات المالية' : 'Manage period opening, locking, and year-end closing'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCloseYear(true)}>
            <Lock className="h-4 w-4 mr-1" />
            {isAr ? 'إقفال سنة' : 'Close Year'}
          </Button>
          <Button size="sm" onClick={() => setShowGenerate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {isAr ? 'إنشاء فترات' : 'Generate Periods'}
          </Button>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 items-center">
        {years.map(y => (
          <Button
            key={y}
            variant={activeYear === y ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Unlock className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{openCount}</p>
              <p className="text-[11px] text-muted-foreground">{isAr ? 'مفتوحة' : 'Open'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{lockedCount}</p>
              <p className="text-[11px] text-muted-foreground">{isAr ? 'مقفلة' : 'Locked'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{closedCount}</p>
              <p className="text-[11px] text-muted-foreground">{isAr ? 'مغلقة' : 'Closed'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Periods table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الفترة' : 'Period'}</TableHead>
                <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                <TableHead>{isAr ? 'من' : 'Start'}</TableHead>
                <TableHead>{isAr ? 'إلى' : 'End'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'تم بواسطة' : 'Changed By'}</TableHead>
                <TableHead className="w-[200px]">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : yearPeriods.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isAr ? 'لا توجد فترات. اضغط "إنشاء فترات" لإنشاء فترات لهذه السنة.' : 'No periods. Click "Generate Periods" to create periods for a year.'}
                </TableCell></TableRow>
              ) : yearPeriods.map(period => {
                const cfg = statusConfig[period.status] || statusConfig.open;
                const Icon = cfg.icon;
                return (
                  <TableRow key={period.id}>
                    <TableCell className="text-xs font-medium">{period.period_name}</TableCell>
                    <TableCell className="font-mono text-xs">{period.period_code}</TableCell>
                    <TableCell className="text-xs">{period.start_date}</TableCell>
                    <TableCell className="text-xs">{period.end_date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {isAr ? cfg.labelAr : cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {period.closed_at ? `Closed ${new Date(period.closed_at).toLocaleDateString()}` :
                       period.locked_at ? `Locked ${new Date(period.locked_at).toLocaleDateString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {period.status === 'open' && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updatePeriodStatus.mutate({ id: period.id, status: 'locked' })}>
                            <Lock className="h-3 w-3 mr-1" /> {isAr ? 'قفل' : 'Lock'}
                          </Button>
                        )}
                        {period.status === 'locked' && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => updatePeriodStatus.mutate({ id: period.id, status: 'open' })}>
                              <Unlock className="h-3 w-3 mr-1" /> {isAr ? 'فتح' : 'Reopen'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => updatePeriodStatus.mutate({ id: period.id, status: 'closed' })}>
                              <X className="h-3 w-3 mr-1" /> {isAr ? 'إغلاق' : 'Close'}
                            </Button>
                          </>
                        )}
                        {period.status === 'closed' && (
                          <span className="text-xs text-muted-foreground italic">{isAr ? 'مغلقة نهائياً' : 'Permanently closed'}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAr ? 'إنشاء فترات مالية' : 'Generate Financial Periods'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'سيتم إنشاء 12 فترة شهرية للسنة المختارة' : 'This will create 12 monthly periods for the selected year'}
            </p>
            <Input type="number" value={generateYear} onChange={e => setGenerateYear(parseInt(e.target.value))} min={2020} max={2030} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => { generatePeriods.mutate(generateYear); setShowGenerate(false); }}>
              {isAr ? 'إنشاء' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Year Dialog */}
      <Dialog open={showCloseYear} onOpenChange={setShowCloseYear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {isAr ? 'إقفال سنة مالية' : 'Year-End Closing'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'سيتم إغلاق جميع الفترات للسنة المختارة. هذا الإجراء لا يمكن التراجع عنه.' : 'All periods for the selected year will be permanently closed. This action cannot be undone.'}
            </p>
            <Input type="number" value={closeYearValue} onChange={e => setCloseYearValue(parseInt(e.target.value))} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">{isAr ? 'اكتب DELETE للتأكيد' : 'Type DELETE to confirm'}</p>
              <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCloseYear(false); setConfirmText(''); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" disabled={confirmText !== 'DELETE'} onClick={() => { closeYear.mutate(closeYearValue); setShowCloseYear(false); setConfirmText(''); }}>
              {isAr ? 'إقفال السنة' : 'Close Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
