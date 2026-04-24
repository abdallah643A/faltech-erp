import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus, Search, ClipboardCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, User } from 'lucide-react';

const inspTypes = ['Material Receiving', 'Concrete Pour', 'Rebar', 'Waterproofing', 'MEP Rough-in', 'MEP Final', 'Fire Protection', 'Finishing', 'Structural', 'Handover', 'Mock-up', 'Safety'];

const sampleInspections = [
  { id: 'INS-001', title: 'Concrete pour inspection – Column Grid C1-C5', type: 'Concrete Pour', status: 'Scheduled', result: '', inspector: 'Eng. Ahmed', project: 'Al-Noor Tower', building: 'Tower A', floor: '8F', date: '2026-04-15', score: null, checklistItems: 12, completed: 0 },
  { id: 'INS-002', title: 'Rebar placement check – Slab S3', type: 'Rebar', status: 'In Progress', result: '', inspector: 'Eng. Khalid', project: 'Al-Noor Tower', building: 'Tower A', floor: '7F', date: '2026-04-13', score: null, checklistItems: 8, completed: 5 },
  { id: 'INS-003', title: 'MEP rough-in inspection – Level 5', type: 'MEP Rough-in', status: 'Completed', result: 'Pass', inspector: 'Eng. Omar', project: 'King Fahd Complex', building: 'Block B', floor: '5F', date: '2026-04-10', score: 92, checklistItems: 15, completed: 15 },
  { id: 'INS-004', title: 'Material receiving – Steel Batch #42', type: 'Material Receiving', status: 'Completed', result: 'Fail', inspector: 'Eng. Fahad', project: 'Riyadh Metro Hub', building: 'Station 1', floor: '-', date: '2026-04-09', score: 45, checklistItems: 10, completed: 10 },
  { id: 'INS-005', title: 'Waterproofing membrane – Roof Level', type: 'Waterproofing', status: 'Completed', result: 'Conditional', inspector: 'Eng. Hassan', project: 'Al-Noor Tower', building: 'Tower B', floor: 'Roof', date: '2026-04-08', score: 72, checklistItems: 8, completed: 8 },
  { id: 'INS-006', title: 'Fire stopping inspection – Stairwells', type: 'Fire Protection', status: 'Overdue', result: '', inspector: 'Eng. Youssef', project: 'King Fahd Complex', building: 'Block A', floor: '3F-6F', date: '2026-04-05', score: null, checklistItems: 20, completed: 0 },
];

const resultColor: Record<string, string> = { 'Pass': 'bg-green-100 text-green-800', 'Fail': 'bg-red-100 text-red-800', 'Conditional': 'bg-amber-100 text-amber-800' };
const statusColor: Record<string, string> = { 'Scheduled': 'bg-blue-100 text-blue-800', 'In Progress': 'bg-amber-100 text-amber-800', 'Completed': 'bg-green-100 text-green-800', 'Overdue': 'bg-red-100 text-red-800' };

export function QAQCInspections() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const stats = {
    total: sampleInspections.length,
    scheduled: sampleInspections.filter(i => i.status === 'Scheduled').length,
    passed: sampleInspections.filter(i => i.result === 'Pass').length,
    failed: sampleInspections.filter(i => i.result === 'Fail').length,
    overdue: sampleInspections.filter(i => i.status === 'Overdue').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><ClipboardCheck className="h-5 w-5 mx-auto text-blue-600 mb-1" /><div className="text-lg font-bold">{stats.total}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'الإجمالي' : 'Total'}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><Calendar className="h-5 w-5 mx-auto text-blue-600 mb-1" /><div className="text-lg font-bold">{stats.scheduled}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'مجدولة' : 'Scheduled'}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" /><div className="text-lg font-bold">{stats.passed}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'ناجحة' : 'Passed'}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" /><div className="text-lg font-bold">{stats.failed}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'فاشلة' : 'Failed'}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-red-700 mb-1" /><div className="text-lg font-bold">{stats.overdue}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'متأخرة' : 'Overdue'}</p></CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />{isAr ? 'طلب فحص' : 'New Inspection'}</Button>
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" /></div>
      </div>

      {/* List */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sampleInspections.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase())).map(insp => (
          <Card key={insp.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div><p className="text-xs font-mono text-muted-foreground">{insp.id}</p><h4 className="text-sm font-medium leading-tight mt-0.5">{insp.title}</h4></div>
                <Badge className={`text-[10px] shrink-0 ${statusColor[insp.status]}`}>{insp.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">{insp.type}</Badge>
                {insp.result && <Badge className={`text-[10px] ${resultColor[insp.result]}`}>{insp.result}{insp.score !== null ? ` (${insp.score}%)` : ''}</Badge>}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>Checklist Progress</span><span>{insp.completed}/{insp.checklistItems}</span></div>
                <Progress value={insp.checklistItems > 0 ? (insp.completed / insp.checklistItems) * 100 : 0} className="h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{insp.inspector}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{insp.date}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isAr ? 'طلب فحص جديد' : 'New Inspection Request'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input placeholder="Inspection title..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select defaultValue="Concrete Pour"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{inspTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Scheduled Date</Label><Input type="date" /></div>
              <div><Label>Inspector</Label><Input placeholder="Assign inspector..." /></div>
              <div><Label>Building / Floor</Label><Input placeholder="Tower A / 8F" /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} placeholder="Special requirements..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => setShowCreate(false)}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
