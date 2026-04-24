import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Search, Filter, LayoutGrid, List, Columns, Calendar, Image, MessageSquare, 
  Clock, User, MapPin, Tag, AlertTriangle, Paperclip, ChevronRight, X, Map as MapIcon
} from 'lucide-react';
import { format } from 'date-fns';

const ticketTypes = ['Defect', 'Snag', 'Observation', 'NCR', 'RFI', 'Inspection Request', 'Safety', 'Quality Check', 'Material Inspection', 'Handover Item', 'Rework'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const severities = ['Critical', 'Major', 'Minor', 'Cosmetic'];
const statuses = ['Open', 'Assigned', 'In Progress', 'Under Review', 'Resolved', 'Verified', 'Closed', 'Rejected'];

const initialSampleTickets = [
  { id: 'TKT-001', title: 'Concrete crack in basement wall B2', type: 'Defect', status: 'Open', priority: 'Critical', severity: 'Critical', assignee: 'Ahmed Al-Rashid', project: 'Al-Noor Tower', building: 'Tower A', floor: 'B2', zone: 'Wall W-14', trade: 'Structural', dueDate: '2026-04-18', createdAt: '2026-04-10', comments: 3, photos: 2, rootCause: 'Insufficient curing time', description: '' },
  { id: 'TKT-002', title: 'Paint peeling on corridor walls', type: 'Snag', status: 'In Progress', priority: 'Medium', severity: 'Minor', assignee: 'Khalid Mahmoud', project: 'Al-Noor Tower', building: 'Tower A', floor: '5F', zone: 'Corridor C1', trade: 'Finishing', dueDate: '2026-04-22', createdAt: '2026-04-08', comments: 5, photos: 4, rootCause: '', description: '' },
  { id: 'TKT-003', title: 'Fire stopping gap in stairwell', type: 'Safety', status: 'Assigned', priority: 'High', severity: 'Major', assignee: 'Omar Sayed', project: 'King Fahd Complex', building: 'Block B', floor: '3F', zone: 'Stairwell S2', trade: 'Fire Protection', dueDate: '2026-04-15', createdAt: '2026-04-11', comments: 1, photos: 1, rootCause: '', description: '' },
  { id: 'TKT-004', title: 'Waterproofing membrane tear on roof', type: 'Defect', status: 'Under Review', priority: 'Critical', severity: 'Critical', assignee: 'Fahad Al-Qahtani', project: 'Riyadh Metro Hub', building: 'Station 1', floor: 'Roof', zone: 'Zone R3', trade: 'Waterproofing', dueDate: '2026-04-14', createdAt: '2026-04-09', comments: 8, photos: 6, rootCause: 'Material defect', description: '' },
  { id: 'TKT-005', title: 'MEP pipe alignment deviation >15mm', type: 'Observation', status: 'Resolved', priority: 'Medium', severity: 'Minor', assignee: 'Hassan Nabil', project: 'Al-Noor Tower', building: 'Tower B', floor: '12F', zone: 'Plant Room', trade: 'MEP', dueDate: '2026-04-20', createdAt: '2026-04-06', comments: 4, photos: 3, rootCause: 'Installation error', description: '' },
  { id: 'TKT-006', title: 'Missing rebar in column C-45', type: 'NCR', status: 'Open', priority: 'Critical', severity: 'Critical', assignee: 'Youssef Ibrahim', project: 'King Fahd Complex', building: 'Block A', floor: '8F', zone: 'Column C-45', trade: 'Structural', dueDate: '2026-04-13', createdAt: '2026-04-12', comments: 0, photos: 2, rootCause: '', description: '' },
  { id: 'TKT-007', title: 'HVAC duct insulation incomplete', type: 'Quality Check', status: 'Assigned', priority: 'Low', severity: 'Minor', assignee: 'Tariq Mansour', project: 'Riyadh Metro Hub', building: 'Station 2', floor: '2F', zone: 'AHU Room', trade: 'HVAC', dueDate: '2026-04-25', createdAt: '2026-04-11', comments: 2, photos: 1, rootCause: '', description: '' },
  { id: 'TKT-008', title: 'Tile alignment issue in lobby', type: 'Snag', status: 'Closed', priority: 'Low', severity: 'Cosmetic', assignee: 'Nour Hamdi', project: 'Al-Noor Tower', building: 'Tower A', floor: 'GF', zone: 'Lobby L1', trade: 'Finishing', dueDate: '2026-04-10', createdAt: '2026-04-01', comments: 6, photos: 5, rootCause: 'Workmanship', description: '' },
];

const statusColor: Record<string, string> = {
  'Open': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Assigned': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Under Review': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Resolved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Verified': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Closed': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  'Rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
};

const priorityColor: Record<string, string> = {
  'Critical': 'bg-red-600 text-white', 'High': 'bg-orange-500 text-white',
  'Medium': 'bg-amber-400 text-black', 'Low': 'bg-blue-100 text-blue-800',
};

const formTypes = ['Documentation', 'Inspection', 'Quality', 'Safety'];
const tradeOptions = ['Structural', 'Finishing', 'MEP', 'HVAC', 'Electrical', 'Plumbing', 'Fire Protection', 'Waterproofing', 'Landscape'];

interface NewTicketForm {
  title: string;
  formType: string;
  type: string;
  priority: string;
  severity: string;
  dueDate: string;
  extensionDate: string;
  assignee: string;
  receiver: string;
  building: string;
  floor: string;
  zone: string;
  trade: string;
  description: string;
  rootCause: string;
}

const emptyForm: NewTicketForm = {
  title: '', formType: 'Documentation', type: 'Defect', priority: 'Medium', severity: 'Minor',
  dueDate: '', extensionDate: '', assignee: '', receiver: '', building: '', floor: '', zone: '', trade: '',
  description: '', rootCause: '',
};

export function QAQCTickets() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const [view, setView] = useState<'table' | 'card' | 'kanban'>('card');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<typeof initialSampleTickets[0] | null>(null);
  const [tickets, setTickets] = useState(initialSampleTickets);

  // Create form state
  const [form, setForm] = useState<NewTicketForm>(emptyForm);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPhotos, setAttachedPhotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      return true;
    });
  }, [search, filterStatus, filterPriority, filterType, tickets]);

  const kanbanStatuses = ['Open', 'Assigned', 'In Progress', 'Under Review', 'Resolved', 'Closed'];

  const updateForm = (field: keyof NewTicketForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAttachFiles = () => fileInputRef.current?.click();
  const handleAddPhotos = () => photoInputRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const onPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  const removePhoto = (index: number) => setAttachedPhotos(prev => prev.filter((_, i) => i !== index));

  const resetCreateForm = () => {
    setForm(emptyForm);
    setAttachedFiles([]);
    setAttachedPhotos([]);
  };

  const handleCreateTicket = () => {
    if (!form.title.trim()) {
      toast({ title: isAr ? 'العنوان مطلوب' : 'Title is required', variant: 'destructive' });
      return;
    }

    const newTicket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      title: form.title,
      type: form.type,
      status: 'Open',
      priority: form.priority,
      severity: form.severity,
      assignee: form.assignee || 'Unassigned',
      project: '',
      building: form.building,
      floor: form.floor,
      zone: form.zone,
      trade: form.trade,
      dueDate: form.dueDate || '',
      createdAt: new Date().toISOString().split('T')[0],
      comments: 0,
      photos: attachedPhotos.length,
      rootCause: form.rootCause,
      description: form.description,
    };

    setTickets(prev => [newTicket, ...prev]);
    resetCreateForm();
    setShowCreate(false);
    toast({
      title: isAr ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created successfully',
      description: `${newTicket.id} — ${newTicket.title}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />{isAr ? 'تذكرة جديدة' : 'New Ticket'}</Button>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isAr ? 'بحث...' : 'Search tickets...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Priority</SelectItem>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{ticketTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden ml-auto">
          <Button variant={view === 'card' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('card')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
          <Button variant={view === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setView('kanban')}><Columns className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Card View */}
      {view === 'card' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(ticket => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedTicket(ticket)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{ticket.id}</p>
                    <h4 className="text-sm font-medium leading-tight mt-0.5 line-clamp-2">{ticket.title}</h4>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${priorityColor[ticket.priority]}`}>{ticket.priority}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{ticket.type}</Badge>
                  <Badge className={`text-[10px] ${statusColor[ticket.status]}`}>{ticket.status}</Badge>
                  {ticket.severity === 'Critical' && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ticket.building} / {ticket.floor}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.assignee.split(' ')[0]}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ticket.dueDate}</span>
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{ticket.trade}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{ticket.comments}</span>
                  <span className="flex items-center gap-1"><Image className="h-3 w-3" />{ticket.photos}</span>
                  <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />0</span>
                  <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(t)}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="font-medium text-sm max-w-[250px] truncate">{t.title}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.type}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${statusColor[t.status]}`}>{t.status}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${priorityColor[t.priority]}`}>{t.priority}</Badge></TableCell>
                    <TableCell className="text-xs">{t.assignee}</TableCell>
                    <TableCell className="text-xs">{t.building}/{t.floor}</TableCell>
                    <TableCell className="text-xs">{t.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {kanbanStatuses.map(status => {
            const items = filtered.filter(t => t.status === status);
            return (
              <div key={status} className="min-w-[260px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${statusColor[status]}`}>{status}</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
                    <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTicket(t)}>
                      <CardContent className="p-3 space-y-2">
                        <p className="text-xs font-mono text-muted-foreground">{t.id}</p>
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[10px] ${priorityColor[t.priority]}`}>{t.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t.assignee}</p>
                      </CardContent>
                    </Card>
                  ))}
                  {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No items</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Drawer */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selectedTicket.id}</span>
                  <Badge className={`text-[10px] ${statusColor[selectedTicket.status]}`}>{selectedTicket.status}</Badge>
                  <Badge className={`text-[10px] ${priorityColor[selectedTicket.priority]}`}>{selectedTicket.priority}</Badge>
                </div>
                <DialogTitle className="text-lg">{selectedTicket.title}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="comments" className="flex-1">Comments ({selectedTicket.comments})</TabsTrigger>
                  <TabsTrigger value="photos" className="flex-1">Photos ({selectedTicket.photos})</TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><Label className="text-muted-foreground text-xs">Type</Label><p>{selectedTicket.type}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Severity</Label><p><Badge variant={selectedTicket.severity === 'Critical' ? 'destructive' : 'secondary'} className="text-xs">{selectedTicket.severity}</Badge></p></div>
                    <div><Label className="text-muted-foreground text-xs">Project</Label><p>{selectedTicket.project}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Assignee</Label><p>{selectedTicket.assignee}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Building / Floor</Label><p>{selectedTicket.building} / {selectedTicket.floor}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Zone</Label><p>{selectedTicket.zone}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Trade</Label><p>{selectedTicket.trade}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Due Date</Label><p>{selectedTicket.dueDate}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Created</Label><p>{selectedTicket.createdAt}</p></div>
                    {selectedTicket.rootCause && <div className="col-span-2"><Label className="text-muted-foreground text-xs">Root Cause</Label><p>{selectedTicket.rootCause}</p></div>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm">Assign</Button>
                    <Button size="sm" variant="outline">Change Status</Button>
                    <Button size="sm" variant="outline">Add Comment</Button>
                    <Button size="sm" variant="outline">Attach File</Button>
                  </div>
                </TabsContent>
                <TabsContent value="comments" className="mt-4">
                  <div className="space-y-3">
                    {[
                      { user: 'Ahmed Al-Rashid', text: 'Crack extends approximately 2m along the basement wall. Structural review needed urgently.', time: '2 hours ago' },
                      { user: 'Eng. Fahad', text: 'Scheduled structural engineer visit for tomorrow morning.', time: '1 hour ago' },
                      { user: 'QA Manager', text: 'Please provide core sample test results before proceeding with repair.', time: '30 min ago' },
                    ].map((c, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{c.user}</span>
                          <span className="text-xs text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="text-sm">{c.text}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input placeholder="Add a comment..." className="flex-1" />
                      <Button size="sm">Send</Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="photos" className="mt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: selectedTicket.photos }).map((_, i) => (
                      <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="mt-3"><Plus className="h-4 w-4 mr-1" />Add Photo</Button>
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                  <div className="space-y-2 text-sm">
                    {[
                      { action: 'Ticket created', by: 'Ahmed Al-Rashid', time: selectedTicket.createdAt },
                      { action: 'Status changed to Assigned', by: 'QA Manager', time: '2026-04-11' },
                      { action: 'Photo added (2)', by: 'Ahmed Al-Rashid', time: '2026-04-11' },
                      { action: 'Comment added', by: 'Eng. Fahad', time: '2026-04-12' },
                    ].map((h, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <div className="flex-1"><span className="font-medium">{h.action}</span> — <span className="text-muted-foreground">{h.by}</span></div>
                        <span className="text-xs text-muted-foreground">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />
      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={onPhotosSelected}
      />

      {/* Create Ticket Dialog — 2-column layout */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetCreateForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إنشاء تذكرة جديدة' : 'Create new ticket'}</DialogTitle>
            <p className="text-sm text-muted-foreground">{isAr ? 'اختر نموذجاً للتذكرة' : 'Select a form for your ticket'}</p>
          </DialogHeader>

          <div className="grid md:grid-cols-[1fr,340px] gap-6">
            {/* Left: Form Fields */}
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <Label className="font-bold">{isAr ? 'النموذج' : 'Form'}</Label>
                <Select value={form.formType} onValueChange={v => updateForm('formType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{formTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="font-bold">{isAr ? 'العنوان' : 'Title'}</Label>
                  <Input placeholder={isAr ? 'عنوان التذكرة...' : 'Ticket title...'} value={form.title} onChange={e => updateForm('title', e.target.value)} />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'النوع' : 'Type'}</Label>
                  <Select value={form.type} onValueChange={v => updateForm('type', v)}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>{ticketTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'التجارة' : 'Trade'}</Label>
                  <Select value={form.trade} onValueChange={v => updateForm('trade', v)}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>{tradeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'المكلف' : 'Assignee'}</Label>
                  <Select value={form.assignee} onValueChange={v => updateForm('assignee', v)}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ahmed Al-Rashid">Ahmed Al-Rashid</SelectItem>
                      <SelectItem value="Khalid Mahmoud">Khalid Mahmoud</SelectItem>
                      <SelectItem value="Omar Sayed">Omar Sayed</SelectItem>
                      <SelectItem value="Fahad Al-Qahtani">Fahad Al-Qahtani</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'المستلم' : 'Receiver'}</Label>
                  <Select value={form.receiver} onValueChange={v => updateForm('receiver', v)}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QA Manager">QA Manager</SelectItem>
                      <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                      <SelectItem value="Project Manager">Project Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'تاريخ الاستحقاق' : 'Due date'}</Label>
                  <Input type="date" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'تاريخ التمديد' : 'Extension Date'}</Label>
                  <Input type="date" value={form.extensionDate} onChange={e => updateForm('extensionDate', e.target.value)} />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'الوصف' : 'Description'}</Label>
                  <Textarea rows={3} placeholder={isAr ? 'وصف تفصيلي...' : 'Detailed description...'} value={form.description} onChange={e => updateForm('description', e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{isAr ? 'المبنى' : 'Building'}</Label><Input placeholder="e.g. Tower A" value={form.building} onChange={e => updateForm('building', e.target.value)} /></div>
                  <div><Label>{isAr ? 'الطابق' : 'Floor'}</Label><Input placeholder="e.g. 5F" value={form.floor} onChange={e => updateForm('floor', e.target.value)} /></div>
                  <div><Label>{isAr ? 'المنطقة' : 'Zone'}</Label><Input placeholder="e.g. Wall W-14" value={form.zone} onChange={e => updateForm('zone', e.target.value)} /></div>
                  <div><Label>{isAr ? 'الأولوية' : 'Priority'}</Label>
                    <Select value={form.priority} onValueChange={v => updateForm('priority', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Layer / Drawing Preview / Attachments */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Label className="font-bold">{isAr ? 'الطبقة' : 'Layer'}</Label>
                  <Select defaultValue="GF">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GF">{isAr ? 'الطابق الأرضي' : 'Ground Floor'}</SelectItem>
                      <SelectItem value="1F">{isAr ? 'الطابق الأول' : '1st Floor'}</SelectItem>
                      <SelectItem value="2F">{isAr ? 'الطابق الثاني' : '2nd Floor'}</SelectItem>
                      <SelectItem value="B1">{isAr ? 'بدروم 1' : 'Basement 1'}</SelectItem>
                      <SelectItem value="Roof">{isAr ? 'السطح' : 'Roof'}</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Drawing mini preview */}
                  <div className="relative bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 h-[180px] overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                      {Array.from({ length: 24 }).map((_, i) => <div key={i} className="border border-muted-foreground/5" />)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapIcon className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">{isAr ? 'المرفقات العامة' : 'General attachments'}</Label>
                    <Filter className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleAttachFiles}>
                    <Plus className="h-4 w-4 mr-1" />{isAr ? 'إضافة مرفق جديد' : 'Add new attachment'}
                  </Button>
                  {attachedFiles.length > 0 ? (
                    <div className="space-y-1">
                      {attachedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="truncate flex-1">{f.name}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeFile(i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg py-6 text-center text-sm text-muted-foreground">
                      {isAr ? 'اسحب الملفات هنا' : 'Drag files here'}
                    </div>
                  )}

                  {/* Photos section */}
                  {attachedPhotos.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <Label className="text-xs text-muted-foreground">Photos ({attachedPhotos.length})</Label>
                      <div className="flex flex-wrap gap-2">
                        {attachedPhotos.map((photo, i) => (
                          <div key={i} className="relative group">
                            <img src={URL.createObjectURL(photo)} alt={photo.name} className="h-14 w-14 rounded object-cover border" />
                            <Button variant="destructive" size="sm" className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePhoto(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={handleAddPhotos}>
                    <Image className="h-4 w-4 mr-1" />{isAr ? 'إضافة صور' : 'Add Photos'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => { resetCreateForm(); setShowCreate(false); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreateTicket}>{isAr ? 'حفظ' : 'Save'}</Button>
            <Button variant="outline" onClick={handleCreateTicket}>{isAr ? 'حفظ وإغلاق' : 'Save and close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
