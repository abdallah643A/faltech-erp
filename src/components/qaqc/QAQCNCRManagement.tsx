import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Search, AlertTriangle, FileWarning, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const sampleNCRs = [
  { id: 'NCR-001', title: 'Concrete strength below specification – Column C-12', status: 'Open', severity: 'Critical', category: 'Material', project: 'Al-Noor Tower', building: 'Tower A', floor: '8F', subcontractor: 'BESIX Concrete', reportedBy: 'Eng. Ahmed', reportedDate: '2026-04-10', rootCause: 'Incorrect water-cement ratio', correctiveAction: 'Core testing and potential column reinforcement', preventiveAction: 'Implement batch plant QC checks', costImpact: 45000, timeImpact: 5, disposition: 'Rework', closedDate: '' },
  { id: 'NCR-002', title: 'Wrong steel grade used in slab reinforcement', status: 'Under Investigation', severity: 'Critical', category: 'Material', project: 'King Fahd Complex', building: 'Block B', floor: '4F', subcontractor: 'Saudi Binladin', reportedBy: 'Eng. Khalid', reportedDate: '2026-04-08', rootCause: '', correctiveAction: '', preventiveAction: '', costImpact: 0, timeImpact: 0, disposition: '', closedDate: '' },
  { id: 'NCR-003', title: 'Waterproofing application non-compliant with spec', status: 'Corrective Action', severity: 'Major', category: 'Workmanship', project: 'Riyadh Metro Hub', building: 'Station 1', floor: 'Roof', subcontractor: 'Drake & Scull', reportedBy: 'Eng. Omar', reportedDate: '2026-04-05', rootCause: 'Insufficient primer application', correctiveAction: 'Strip and re-apply membrane system', preventiveAction: 'Mandatory hold-point inspection before membrane', costImpact: 28000, timeImpact: 3, disposition: 'Rework', closedDate: '' },
  { id: 'NCR-004', title: 'Fireproofing thickness below minimum requirement', status: 'Closed', severity: 'Major', category: 'Workmanship', project: 'Al-Noor Tower', building: 'Tower B', floor: '3F', subcontractor: 'Al-Futtaim MEP', reportedBy: 'Eng. Fahad', reportedDate: '2026-03-28', rootCause: 'Application pressure too low', correctiveAction: 'Re-apply to meet specified thickness', preventiveAction: 'Calibrate spray equipment daily', costImpact: 12000, timeImpact: 2, disposition: 'Rework', closedDate: '2026-04-08' },
];

const statusColor: Record<string, string> = {
  'Open': 'bg-red-100 text-red-800', 'Under Investigation': 'bg-amber-100 text-amber-800',
  'Corrective Action': 'bg-blue-100 text-blue-800', 'Verification': 'bg-purple-100 text-purple-800',
  'Closed': 'bg-green-100 text-green-800',
};

const statusFilters = [
  { key: 'all', en: 'All', ar: 'الكل' },
  { key: 'Open', en: 'Open', ar: 'مفتوح' },
  { key: 'Under Investigation', en: 'Investigating', ar: 'قيد التحقيق' },
  { key: 'Corrective Action', en: 'Corrective Action', ar: 'إجراء تصحيحي' },
  { key: 'Closed', en: 'Closed', ar: 'مغلق' },
];

export function QAQCNCRManagement() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<typeof sampleNCRs[0] | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = sampleNCRs.filter(n => {
    if (activeFilter !== 'all' && n.status !== activeFilter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCardClick = (status: string) => {
    setActiveFilter(prev => prev === status ? 'all' : status);
  };

  return (
    <div className="space-y-4">
      {/* Stats - Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleCardClick('all')}
        >
          <CardContent className="p-3 text-center">
            <FileWarning className="h-5 w-5 mx-auto text-red-600 mb-1" />
            <div className="text-lg font-bold">{sampleNCRs.length}</div>
            <p className="text-[11px] text-muted-foreground">{isAr ? 'إجمالي' : 'Total NCRs'}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${activeFilter === 'Open' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => handleCardClick('Open')}
        >
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-700 mb-1" />
            <div className="text-lg font-bold">{sampleNCRs.filter(n => n.status === 'Open').length}</div>
            <p className="text-[11px] text-muted-foreground">{isAr ? 'مفتوح' : 'Open'}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${activeFilter === 'Under Investigation' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => handleCardClick('Under Investigation')}
        >
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" />
            <div className="text-lg font-bold">{sampleNCRs.filter(n => n.status === 'Under Investigation').length}</div>
            <p className="text-[11px] text-muted-foreground">{isAr ? 'قيد التحقيق' : 'Investigating'}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${activeFilter === 'Corrective Action' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => handleCardClick('Corrective Action')}
        >
          <CardContent className="p-3 text-center">
            <ArrowRight className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <div className="text-lg font-bold">{sampleNCRs.filter(n => n.status === 'Corrective Action').length}</div>
            <p className="text-[11px] text-muted-foreground">{isAr ? 'إجراء تصحيحي' : 'Corrective Action'}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer hover:shadow-md transition-all ${activeFilter === 'Closed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => handleCardClick('Closed')}
        >
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <div className="text-lg font-bold">{sampleNCRs.filter(n => n.status === 'Closed').length}</div>
            <p className="text-[11px] text-muted-foreground">{isAr ? 'مغلق' : 'Closed'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active filter indicator */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {isAr ? 'تصفية:' : 'Filtered:'} {activeFilter}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveFilter('all')}>
            {isAr ? 'مسح' : 'Clear'}
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />{isAr ? 'تقرير عدم مطابقة' : 'New NCR'}</Button>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? 'بحث...' : 'Search NCRs...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" /></div>
      </div>

      {/* NCR Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map(ncr => (
          <Card key={ncr.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedNCR(ncr)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs font-mono text-muted-foreground">{ncr.id}</p><h4 className="text-sm font-medium leading-tight mt-0.5">{ncr.title}</h4></div>
                <Badge className={`text-[10px] shrink-0 ${statusColor[ncr.status]}`}>{ncr.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={ncr.severity === 'Critical' ? 'destructive' : 'secondary'} className="text-[10px]">{ncr.severity}</Badge>
                <Badge variant="outline" className="text-[10px]">{ncr.category}</Badge>
                {ncr.disposition && <Badge variant="outline" className="text-[10px]">{ncr.disposition}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <span>{ncr.project}</span>
                <span>{ncr.subcontractor}</span>
                <span>{ncr.building} / {ncr.floor}</span>
                <span>{ncr.reportedDate}</span>
              </div>
              {(ncr.costImpact > 0 || ncr.timeImpact > 0) && (
                <div className="flex gap-3 text-xs pt-1 border-t">
                  {ncr.costImpact > 0 && <span className="text-red-600">Cost: {ncr.costImpact.toLocaleString()} SAR</span>}
                  {ncr.timeImpact > 0 && <span className="text-amber-600">Time: +{ncr.timeImpact} days</span>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 col-span-2">{isAr ? 'لا توجد نتائج' : 'No NCRs found'}</p>}
      </div>

      {/* NCR Detail Dialog */}
      <Dialog open={!!selectedNCR} onOpenChange={() => setSelectedNCR(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedNCR?.id} – {selectedNCR?.title}</DialogTitle></DialogHeader>
          {selectedNCR && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-muted-foreground">{isAr ? 'الحالة' : 'Status'}</Label><Badge className={`mt-1 ${statusColor[selectedNCR.status]}`}>{selectedNCR.status}</Badge></div>
                <div><Label className="text-muted-foreground">{isAr ? 'الشدة' : 'Severity'}</Label><p className="font-medium">{selectedNCR.severity}</p></div>
                <div><Label className="text-muted-foreground">{isAr ? 'المشروع' : 'Project'}</Label><p>{selectedNCR.project}</p></div>
                <div><Label className="text-muted-foreground">{isAr ? 'المقاول' : 'Subcontractor'}</Label><p>{selectedNCR.subcontractor}</p></div>
                <div><Label className="text-muted-foreground">{isAr ? 'الموقع' : 'Location'}</Label><p>{selectedNCR.building} / {selectedNCR.floor}</p></div>
                <div><Label className="text-muted-foreground">{isAr ? 'تاريخ البلاغ' : 'Reported'}</Label><p>{selectedNCR.reportedDate} by {selectedNCR.reportedBy}</p></div>
              </div>
              {selectedNCR.rootCause && <div><Label className="text-muted-foreground">{isAr ? 'السبب الجذري' : 'Root Cause'}</Label><p className="text-sm mt-1">{selectedNCR.rootCause}</p></div>}
              {selectedNCR.correctiveAction && <div><Label className="text-muted-foreground">{isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}</Label><p className="text-sm mt-1">{selectedNCR.correctiveAction}</p></div>}
              {selectedNCR.preventiveAction && <div><Label className="text-muted-foreground">{isAr ? 'الإجراء الوقائي' : 'Preventive Action'}</Label><p className="text-sm mt-1">{selectedNCR.preventiveAction}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create NCR Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isAr ? 'تقرير عدم مطابقة جديد' : 'New NCR Report'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{isAr ? 'العنوان' : 'Title'}</Label><Input /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{isAr ? 'الشدة' : 'Severity'}</Label><Select><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="major">Major</SelectItem><SelectItem value="minor">Minor</SelectItem></SelectContent></Select></div>
              <div><Label>{isAr ? 'الفئة' : 'Category'}</Label><Select><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="material">Material</SelectItem><SelectItem value="workmanship">Workmanship</SelectItem><SelectItem value="design">Design</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>{isAr ? 'الوصف' : 'Description'}</Label><Textarea rows={3} /></div>
          </div>
          <DialogFooter><Button onClick={() => setShowCreate(false)}>{isAr ? 'إنشاء' : 'Create NCR'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
