import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStoreTasks } from '@/hooks/useStoreTasks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardList, Plus, CheckCircle, Clock, BarChart3, Sun, Moon, Sunrise, Sunset } from 'lucide-react';

const t: Record<string, Record<string, string>> = {
  title: { en: 'Store Operations Task Board', ar: 'لوحة مهام عمليات المتجر' },
  newTask: { en: 'New Task', ar: 'مهمة جديدة' },
  taskTitle: { en: 'Task Title', ar: 'عنوان المهمة' },
  category: { en: 'Category', ar: 'الفئة' },
  shift: { en: 'Shift', ar: 'الوردية' },
  type: { en: 'Type', ar: 'النوع' },
  all: { en: 'All', ar: 'الكل' },
  opening: { en: 'Opening', ar: 'افتتاح' },
  midday: { en: 'Midday', ar: 'منتصف اليوم' },
  closing: { en: 'Closing', ar: 'إغلاق' },
  create: { en: 'Create', ar: 'إنشاء' },
  completion: { en: 'Completion', ar: 'الإنجاز' },
};

const catIcons: Record<string, any> = { opening: Sunrise, midday: Sun, closing: Sunset, ad_hoc: ClipboardList };
const typeLabels: Record<string, string> = { checklist: 'Checklist', price_check: 'Price Check', display_audit: 'Display Audit', cash_check: 'Cash Check', replenishment: 'Replenishment', queue_management: 'Queue', handover: 'Handover', custom: 'Custom' };

export default function StoreTaskBoardPage() {
  const { language } = useLanguage();
  const lang = language === 'ar' ? 'ar' : 'en';
  const [catFilter, setCatFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const { tasks, isLoading, stats, createTask, completeTask } = useStoreTasks({ category: catFilter, shift: shiftFilter });
  const [form, setForm] = useState({ task_title: '', task_type: 'checklist', checklist_category: 'opening', shift: 'morning', priority: 'medium' });

  const handleCreate = () => {
    createTask.mutate(form);
    setOpen(false);
    setForm({ task_title: '', task_type: 'checklist', checklist_category: 'opening', shift: 'morning', priority: 'medium' });
  };

  return (
    <div className="p-6 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6" />{t.title[lang]}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t.newTask[lang]}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.newTask[lang]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t.taskTitle[lang]}</Label><Input value={form.task_title} onChange={e => setForm(p => ({ ...p, task_title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t.type[lang]}</Label><Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>{t.category[lang]}</Label><Select value={form.checklist_category} onValueChange={v => setForm(p => ({ ...p, checklist_category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['opening', 'midday', 'closing', 'ad_hoc'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>{t.shift[lang]}</Label><Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['morning', 'afternoon', 'evening', 'night'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
              <Button onClick={handleCreate} className="w-full">{t.create[lang]}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><ClipboardList className="h-5 w-5 mx-auto mb-1 text-muted-foreground" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Done</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" /><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{stats.completionRate}%</p><p className="text-xs text-muted-foreground">{t.completion[lang]}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'opening', 'midday', 'closing', 'ad_hoc'].map(c => (
          <Button key={c} variant={catFilter === c ? 'default' : 'outline'} size="sm" onClick={() => setCatFilter(c)}>{c === 'all' ? t.all[lang] : c}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? <p>Loading...</p> : tasks.map(task => (
          <Card key={task.id} className={task.is_completed ? 'opacity-60' : ''}>
            <CardContent className="p-3 flex items-center gap-3">
              <Checkbox checked={task.is_completed || false} onCheckedChange={() => !task.is_completed && completeTask.mutate(task.id)} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${task.is_completed ? 'line-through' : ''}`}>{task.task_title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{typeLabels[task.task_type || 'custom'] || task.task_type}</Badge>
                  <Badge variant="outline" className="text-xs">{task.checklist_category}</Badge>
                  <Badge variant="outline" className="text-xs">{task.shift}</Badge>
                </div>
              </div>
              {task.is_completed && <CheckCircle className="h-4 w-4 text-green-600" />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
