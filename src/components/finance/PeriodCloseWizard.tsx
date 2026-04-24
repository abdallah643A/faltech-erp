import { useMemo, useState } from 'react';
import { useFinancialClose, type CloseTask, type ClosePeriod } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle, Lock, AlertTriangle, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Standard period-close phases. Each phase pulls tasks from the existing
 * close_tasks table by `category` (or `function_area` fallback) so the wizard
 * stays in sync with the broader Financial Close suite.
 */
const PHASES: Array<{
  key: string;
  labelEn: string;
  labelAr: string;
  matchCategories: string[];
  matchAreas?: string[];
  hint?: string;
}> = [
  { key: 'cutoff', labelEn: 'Sub-ledger Cutoff', labelAr: 'إغلاق دفاتر المساعدة', matchCategories: ['cutoff', 'sub_ledger'], matchAreas: ['ar', 'ap', 'inventory'] },
  { key: 'accruals', labelEn: 'Accruals & Provisions', labelAr: 'الاستحقاقات والمخصصات', matchCategories: ['accrual', 'provision'] },
  { key: 'depreciation', labelEn: 'Depreciation', labelAr: 'الإهلاك', matchCategories: ['depreciation', 'fixed_asset'], matchAreas: ['fixed_assets'] },
  { key: 'revaluation', labelEn: 'FX Revaluation', labelAr: 'إعادة تقييم العملات', matchCategories: ['revaluation', 'fx'] },
  { key: 'reconciliation', labelEn: 'Reconciliations', labelAr: 'التسويات', matchCategories: ['reconciliation', 'bank_rec'], matchAreas: ['treasury'] },
  { key: 'review', labelEn: 'Management Review', labelAr: 'المراجعة الإدارية', matchCategories: ['review', 'analytics'] },
  { key: 'lock', labelEn: 'Lock & Sign-off', labelAr: 'القفل والاعتماد', matchCategories: ['lock', 'signoff'] },
];

interface Props {
  period: ClosePeriod;
  onClose?: () => void;
}

export default function PeriodCloseWizard({ period, onClose }: Props) {
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur';
  const { useCloseTasks, updateTaskStatus } = useFinancialClose();
  const { data: tasks = [], isLoading } = useCloseTasks(period.id);
  const [stepIdx, setStepIdx] = useState(0);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, string>>({});

  const groupedTasks = useMemo(() => {
    const map: Record<string, CloseTask[]> = {};
    PHASES.forEach(p => { map[p.key] = []; });
    const used = new Set<string>();
    PHASES.forEach(phase => {
      tasks.forEach(t => {
        if (used.has(t.id)) return;
        const catMatch = phase.matchCategories.includes((t.category || '').toLowerCase());
        const areaMatch = phase.matchAreas?.includes((t.function_area || '').toLowerCase());
        if (catMatch || areaMatch) {
          map[phase.key].push(t);
          used.add(t.id);
        }
      });
    });
    // Drop unmatched into last "review" bucket so nothing is lost
    tasks.forEach(t => { if (!used.has(t.id)) map['review'].push(t); });
    return map;
  }, [tasks]);

  const phaseStats = (key: string) => {
    const list = groupedTasks[key] || [];
    const done = list.filter(t => t.status === 'completed').length;
    const blocked = list.filter(t => t.status === 'blocked').length;
    return { total: list.length, done, blocked, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
  };

  const overallPct = useMemo(() => {
    const total = tasks.length || 1;
    const done = tasks.filter(t => t.status === 'completed').length;
    return Math.round((done / total) * 100);
  }, [tasks]);

  const phase = PHASES[stepIdx];
  const stats = phaseStats(phase.key);
  const phaseTasks = groupedTasks[phase.key] || [];
  const canAdvance = stats.total === 0 || stats.done === stats.total;

  const toggleTask = (task: CloseTask, checked: boolean) => {
    updateTaskStatus.mutate({
      id: task.id,
      status: checked ? 'completed' : 'pending',
      evidence_notes: evidenceMap[task.id],
    } as any);
  };

  const setStatus = (task: CloseTask, status: string) => {
    updateTaskStatus.mutate({ id: task.id, status, evidence_notes: evidenceMap[task.id] } as any);
  };

  const phaseLabel = (p: typeof PHASES[number]) => (isRTL ? p.labelAr : p.labelEn);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isRTL ? 'معالج إغلاق الفترة' : 'Period-Close Wizard'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {period.period_label || `${period.period_type} ${period.fiscal_year} P${period.period_number}`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{overallPct}%</div>
            <div className="text-xs text-muted-foreground">{isRTL ? 'مكتمل إجمالاً' : 'overall complete'}</div>
          </div>
        </div>
        <Progress value={overallPct} className="mt-3" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PHASES.map((p, i) => {
            const s = phaseStats(p.key);
            const isActive = i === stepIdx;
            const isDone = s.total > 0 && s.done === s.total;
            return (
              <button
                key={p.key}
                onClick={() => setStepIdx(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                <span className="font-medium">{i + 1}. {phaseLabel(p)}</span>
                {s.total > 0 && (
                  <Badge variant={isActive ? 'secondary' : 'outline'} className="text-[10px] h-4 px-1">
                    {s.done}/{s.total}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Phase body */}
        <div className="border rounded-lg p-4 space-y-3 min-h-[280px]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{phaseLabel(phase)}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stats.blocked > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {stats.blocked} {isRTL ? 'محجوب' : 'blocked'}
                </Badge>
              )}
              <span>{stats.done}/{stats.total} {isRTL ? 'مهام' : 'tasks'}</span>
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>}

          {!isLoading && phaseTasks.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {isRTL ? 'لا توجد مهام لهذه المرحلة. يمكنك المتابعة.' : 'No tasks for this phase — you can advance.'}
            </div>
          )}

          {phaseTasks.map(task => {
            const done = task.status === 'completed';
            const blocked = task.status === 'blocked';
            return (
              <div key={task.id} className={`flex gap-3 p-3 rounded-md border ${blocked ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
                <Checkbox
                  checked={done}
                  onCheckedChange={(c) => toggleTask(task, !!c)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{task.task_name}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{task.function_area}</Badge>
                      <Badge variant={task.priority === 'critical' || task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  {!done && (
                    <div className="flex gap-2 items-center">
                      <Select value={task.status} onValueChange={(v) => setStatus(task, v)}>
                        <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      {task.blocker_reason && <span className="text-xs text-destructive">⚠ {task.blocker_reason}</span>}
                    </div>
                  )}
                  {!done && (
                    <Textarea
                      placeholder={isRTL ? 'ملاحظات / إثبات (اختياري)' : 'Evidence notes (optional)'}
                      value={evidenceMap[task.id] ?? task.evidence_notes ?? ''}
                      onChange={(e) => setEvidenceMap({ ...evidenceMap, [task.id]: e.target.value })}
                      className="text-xs min-h-[50px]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>
            <ChevronLeft className="h-4 w-4" /> {isRTL ? 'السابق' : 'Back'}
          </Button>
          <div className="text-xs text-muted-foreground">
            {isRTL ? `الخطوة ${stepIdx + 1} من ${PHASES.length}` : `Step ${stepIdx + 1} of ${PHASES.length}`}
          </div>
          {stepIdx < PHASES.length - 1 ? (
            <Button size="sm" onClick={() => setStepIdx(stepIdx + 1)} disabled={!canAdvance}>
              {isRTL ? 'التالي' : 'Next'} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" disabled={overallPct < 100} onClick={onClose}>
              <Lock className="h-4 w-4 mr-1" /> {isRTL ? 'إنهاء الإغلاق' : 'Finish Close'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
