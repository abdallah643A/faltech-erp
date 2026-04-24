import { useState } from 'react';
import { useQAMode } from '@/contexts/QAModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { FlaskConical, Play, Square, Clipboard, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function QAModeIndicator() {
  const { isQAMode, activeRun, records, startRun, endRun, toggleQAMode } = useQAMode();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [showStart, setShowStart] = useState(false);
  const [runName, setRunName] = useState('');
  const [testerName, setTesterName] = useState('');
  const [desc, setDesc] = useState('');

  if (!isQAMode) return null;

  const handleStart = async () => {
    if (!runName.trim()) return;
    await startRun(runName.trim(), testerName.trim() || undefined, desc.trim() || undefined);
    setShowStart(false);
    setRunName('');
    setTesterName('');
    setDesc('');
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 h-7 flex items-center justify-between px-3 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5" />
          <span>{isAr ? 'وضع الاختبار' : 'QA MODE'}</span>
          {activeRun && (
            <Badge variant="outline" className="border-amber-700 text-amber-900 text-[10px] h-4 px-1.5">
              {activeRun.name}
            </Badge>
          )}
          {activeRun && (
            <span className="text-amber-800 text-[10px]">
              {records.length} {isAr ? 'سجل' : 'records'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!activeRun ? (
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 text-amber-900 hover:bg-amber-400" onClick={() => setShowStart(true)}>
              <Play className="h-3 w-3 mr-1" />
              {isAr ? 'بدء تشغيل' : 'Start Run'}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 text-amber-900 hover:bg-amber-400" onClick={endRun}>
              <Square className="h-3 w-3 mr-1" />
              {isAr ? 'إنهاء' : 'End Run'}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 text-amber-900 hover:bg-amber-400" onClick={() => navigate('/qa-dashboard')}>
            <Clipboard className="h-3 w-3 mr-1" />
            {isAr ? 'لوحة QA' : 'Dashboard'}
          </Button>
          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2 text-amber-900 hover:bg-amber-400" onClick={toggleQAMode}>
            ✕
          </Button>
        </div>
      </div>

      <Dialog open={showStart} onOpenChange={setShowStart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-amber-500" />
              {isAr ? 'بدء تشغيل اختبار جديد' : 'Start New Test Run'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'سيتم وسم جميع السجلات المنشأة أثناء هذا التشغيل' : 'All records created during this run will be tagged for tracking'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{isAr ? 'اسم التشغيل' : 'Run Name'} *</Label>
              <Input value={runName} onChange={e => setRunName(e.target.value)} placeholder="e.g. Sprint 12 Regression" />
            </div>
            <div>
              <Label>{isAr ? 'اسم المختبر' : 'Tester Name'}</Label>
              <Input value={testerName} onChange={e => setTesterName(e.target.value)} placeholder="e.g. Ahmed" />
            </div>
            <div>
              <Label>{isAr ? 'الوصف' : 'Description'}</Label>
              <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What are you testing?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStart(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleStart} disabled={!runName.trim()} className="bg-amber-500 hover:bg-amber-600 text-amber-950">
              <Play className="h-4 w-4 mr-1" /> {isAr ? 'بدء' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
