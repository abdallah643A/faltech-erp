import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ListChecks, Copy, Eye, Pencil, CheckCircle2, Trash2, X } from 'lucide-react';

interface ChecklistItem {
  text: string;
  textAr: string;
  required: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  items: number;
  version: string;
  status: string;
  usageCount: number;
  checklistItems: ChecklistItem[];
}

const defaultChecklistItems: ChecklistItem[] = [
  { text: 'Formwork alignment verified', textAr: 'تم التحقق من محاذاة القوالب', required: true },
  { text: 'Rebar spacing matches approved shop drawing', textAr: 'تباعد الحديد يطابق المخطط المعتمد', required: true },
  { text: 'Cover blocks placed correctly', textAr: 'تم وضع كتل الغطاء بشكل صحيح', required: true },
  { text: 'Concrete mix design approved', textAr: 'تم اعتماد تصميم خلطة الخرسانة', required: true },
  { text: 'Slump test conducted and within range', textAr: 'تم إجراء اختبار الهبوط ضمن النطاق', required: true },
  { text: 'Cube samples taken (min 6)', textAr: 'تم أخذ عينات المكعب (6 كحد أدنى)', required: true },
  { text: 'Vibrator available on site', textAr: 'الهزاز متوفر في الموقع', required: false },
  { text: 'Curing procedure confirmed', textAr: 'تم تأكيد إجراء المعالجة', required: true },
  { text: 'Weather conditions acceptable', textAr: 'الظروف الجوية مقبولة', required: false },
  { text: 'Pre-pour photographs taken', textAr: 'تم التقاط صور ما قبل الصب', required: false },
  { text: 'MEP sleeves/openings verified', textAr: 'تم التحقق من أكمام/فتحات الميكانيكا', required: true },
  { text: 'Approved inspection request (IR) signed', textAr: 'تم توقيع طلب الفحص المعتمد', required: true },
];

const initialChecklists: ChecklistTemplate[] = [
  { id: 'CL-001', name: 'Concrete Pour Pre-Check', nameAr: 'فحص ما قبل الصب', category: 'Structural', items: 12, version: 'v2.1', status: 'Published', usageCount: 34, checklistItems: defaultChecklistItems },
  { id: 'CL-002', name: 'Rebar Placement Inspection', nameAr: 'فحص تسليح الحديد', category: 'Structural', items: 8, version: 'v1.3', status: 'Published', usageCount: 28, checklistItems: defaultChecklistItems.slice(0, 8) },
  { id: 'CL-003', name: 'Waterproofing Application', nameAr: 'تطبيق العزل المائي', category: 'Waterproofing', items: 15, version: 'v1.0', status: 'Published', usageCount: 12, checklistItems: defaultChecklistItems },
  { id: 'CL-004', name: 'MEP Rough-in Verification', nameAr: 'فحص التمديدات الأولية', category: 'MEP', items: 20, version: 'v3.0', status: 'Published', usageCount: 45, checklistItems: defaultChecklistItems },
  { id: 'CL-005', name: 'Fire Protection Systems', nameAr: 'أنظمة الحماية من الحريق', category: 'Fire Protection', items: 18, version: 'v2.0', status: 'Published', usageCount: 22, checklistItems: defaultChecklistItems },
  { id: 'CL-006', name: 'Final Handover Walkthrough', nameAr: 'جولة التسليم النهائي', category: 'Handover', items: 30, version: 'v1.2', status: 'Published', usageCount: 8, checklistItems: defaultChecklistItems },
  { id: 'CL-007', name: 'Material Receiving Inspection', nameAr: 'فحص استلام المواد', category: 'Material', items: 10, version: 'v1.5', status: 'Published', usageCount: 56, checklistItems: defaultChecklistItems.slice(0, 10) },
  { id: 'CL-008', name: 'Mock-up Room Approval', nameAr: 'موافقة غرفة النموذج', category: 'Finishing', items: 25, version: 'v1.0', status: 'Draft', usageCount: 0, checklistItems: defaultChecklistItems },
];

const categories = ['Structural', 'MEP', 'Waterproofing', 'Fire Protection', 'Finishing', 'Handover', 'Material', 'Safety', 'Electrical'];

interface NewChecklistForm {
  name: string;
  nameAr: string;
  category: string;
  items: ChecklistItem[];
}

const emptyForm: NewChecklistForm = { name: '', nameAr: '', category: 'Structural', items: [] };
const emptyItem: ChecklistItem = { text: '', textAr: '', required: false };

export function QAQCChecklists() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>(initialChecklists);
  const [search, setSearch] = useState('');
  const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<NewChecklistForm>(emptyForm);

  const toggleItem = (idx: number) => {
    const next = new Set(checkedItems);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setCheckedItems(next);
  };

  const addItemRow = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const updateItemRow = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeItemRow = (index: number) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: isAr ? 'اسم القائمة مطلوب' : 'Checklist name is required', variant: 'destructive' });
      return;
    }
    const validItems = form.items.filter(it => it.text.trim());
    if (validItems.length === 0) {
      toast({ title: isAr ? 'أضف عنصر واحد على الأقل' : 'Add at least one checklist item', variant: 'destructive' });
      return;
    }

    const newChecklist: ChecklistTemplate = {
      id: `CL-${String(checklists.length + 1).padStart(3, '0')}`,
      name: form.name,
      nameAr: form.nameAr || form.name,
      category: form.category,
      items: validItems.length,
      version: 'v1.0',
      status: 'Draft',
      usageCount: 0,
      checklistItems: validItems,
    };

    setChecklists(prev => [newChecklist, ...prev]);
    resetForm();
    setShowCreate(false);
    toast({ title: isAr ? 'تم إنشاء قائمة الفحص' : 'Checklist created successfully', description: `${newChecklist.id} — ${validItems.length} items` });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button onClick={() => { resetForm(); setShowCreate(true); }} size="sm"><Plus className="h-4 w-4 mr-1" />{isAr ? 'قائمة فحص جديدة' : 'New Checklist'}</Button>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? 'بحث...' : 'Search templates...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" /></div>
      </div>

      {/* Template Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {checklists.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).map(cl => (
          <Card key={cl.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedChecklist(cl); setCheckedItems(new Set()); }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${cl.status === 'Published' ? 'bg-green-50 dark:bg-green-950' : 'bg-amber-50 dark:bg-amber-950'}`}>
                  <ListChecks className={`h-5 w-5 ${cl.status === 'Published' ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <Badge variant={cl.status === 'Published' ? 'default' : 'secondary'} className="text-[10px]">{cl.status}</Badge>
              </div>
              <div>
                <h4 className="text-sm font-medium">{isAr ? cl.nameAr : cl.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">{cl.category} • {cl.items} items • {cl.version}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                <span>Used {cl.usageCount} times</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Checklist Detail / Fill */}
      <Dialog open={!!selectedChecklist} onOpenChange={() => setSelectedChecklist(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedChecklist && (
            <>
              <DialogHeader>
                <DialogTitle>{isAr ? selectedChecklist.nameAr : selectedChecklist.name}</DialogTitle>
                <p className="text-xs text-muted-foreground">{selectedChecklist.category} • {selectedChecklist.version} • {selectedChecklist.checklistItems.length} items</p>
              </DialogHeader>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{checkedItems.size}/{selectedChecklist.checklistItems.length}</span>
                </div>
                <Progress value={(checkedItems.size / selectedChecklist.checklistItems.length) * 100} className="h-2 mb-4" />
                {selectedChecklist.checklistItems.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 ${checkedItems.has(i) ? 'bg-green-50 dark:bg-green-950/30' : ''}`}>
                    <Checkbox checked={checkedItems.has(i)} onCheckedChange={() => toggleItem(i)} className="mt-0.5" />
                    <div className="flex-1">
                      <span className={`text-sm ${checkedItems.has(i) ? 'line-through text-muted-foreground' : ''}`}>
                        {isAr ? item.textAr : item.text}
                      </span>
                      {item.required && <span className="text-red-500 text-xs ml-1">*</span>}
                    </div>
                    {checkedItems.has(i) && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedChecklist(null)}>Close</Button>
                <Button disabled={checkedItems.size < selectedChecklist.checklistItems.filter(i => i.required).length}>Submit Checklist</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog with Items Grid */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAr ? 'قائمة فحص جديدة' : 'New Checklist Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name (EN) *</Label><Input placeholder="Checklist name..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Name (AR)</Label><Input placeholder="اسم قائمة الفحص..." dir="rtl" value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Items Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{isAr ? 'عناصر الفحص' : 'Checklist Items'}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItemRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" />{isAr ? 'إضافة عنصر' : 'Add Item'}
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <ListChecks className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{isAr ? 'لا توجد عناصر بعد' : 'No items yet'}</p>
                  <Button type="button" size="sm" variant="outline" className="mt-2" onClick={addItemRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{isAr ? 'إضافة أول عنصر' : 'Add First Item'}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>{isAr ? 'العنصر (EN)' : 'Item (EN)'}</TableHead>
                        <TableHead>{isAr ? 'العنصر (AR)' : 'Item (AR)'}</TableHead>
                        <TableHead className="w-[80px] text-center">{isAr ? 'مطلوب' : 'Required'}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                          <TableCell>
                            <Input
                              placeholder="Check item description..."
                              value={item.text}
                              onChange={e => updateItemRow(i, 'text', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="وصف عنصر الفحص..."
                              dir="rtl"
                              value={item.textAr}
                              onChange={e => updateItemRow(i, 'textAr', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={item.required}
                              onCheckedChange={v => updateItemRow(i, 'required', !!v)}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItemRow(i)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {form.items.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {form.items.filter(it => it.text.trim()).length} valid item(s) • {form.items.filter(it => it.required).length} required
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
            <Button onClick={handleSave}>{isAr ? 'حفظ' : 'Save Checklist'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
