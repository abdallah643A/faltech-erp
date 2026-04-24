import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Search, Map, ZoomIn, ZoomOut, Maximize2, Layers, Filter,
  MapPin, Plus, Eye, Download, RotateCcw, ArrowLeftRight, X, FileImage,
  Check, Paperclip, Image
} from 'lucide-react';

interface DrawingItem {
  id: string;
  name: string;
  revision: string;
  date: string;
  type: string;
  building: string;
  floor: string;
  pins: number;
  status: string;
  fileName?: string;
}

interface PlacedPin {
  id: string;
  x: number;
  y: number;
  status: 'pending' | 'approved' | 'not_approved';
  ticketId?: string;
}

const initialDrawings: DrawingItem[] = [
  { id: 'DWG-001', name: 'Ground Floor Plan – Tower A', revision: 'Rev C', date: '2026-03-15', type: 'Architectural', building: 'Tower A', floor: 'GF', pins: 8, status: 'Current' },
  { id: 'DWG-002', name: 'Level 5 Structural Layout', revision: 'Rev B', date: '2026-03-20', type: 'Structural', building: 'Tower A', floor: '5F', pins: 12, status: 'Current' },
  { id: 'DWG-003', name: 'MEP Services – Level 8', revision: 'Rev A', date: '2026-04-01', type: 'MEP', building: 'Tower A', floor: '8F', pins: 5, status: 'Current' },
  { id: 'DWG-004', name: 'Roof Waterproofing Detail', revision: 'Rev D', date: '2026-04-05', type: 'Detail', building: 'Tower B', floor: 'Roof', pins: 3, status: 'Current' },
  { id: 'DWG-005', name: 'Basement B2 Plan', revision: 'Rev B', date: '2026-02-28', type: 'Structural', building: 'Tower A', floor: 'B2', pins: 6, status: 'Superseded' },
  { id: 'DWG-006', name: 'Fire Protection Layout – Typical Floor', revision: 'Rev A', date: '2026-04-08', type: 'Fire Protection', building: 'Block B', floor: 'Typical', pins: 2, status: 'Current' },
];

const drawingTypes = ['Architectural', 'Structural', 'MEP', 'Detail', 'Fire Protection', 'Electrical', 'Plumbing', 'HVAC', 'Landscape'];
const ticketTypes = ['Defect', 'Snag', 'Observation', 'NCR', 'RFI', 'Inspection Request', 'Safety', 'Quality Check', 'Material Inspection', 'Handover Item', 'Rework'];
const priorities = ['Critical', 'High', 'Medium', 'Low'];
const severities = ['Critical', 'Major', 'Minor', 'Cosmetic'];
const trades = ['Structural', 'Finishing', 'MEP', 'HVAC', 'Electrical', 'Plumbing', 'Fire Protection', 'Waterproofing', 'Landscape'];

const pinColors: Record<string, string> = {
  'Open': '#ef4444', 'In Progress': '#f59e0b', 'Resolved': '#10b981', 'Closed': '#6b7280',
};

interface UploadForm {
  name: string;
  revision: string;
  type: string;
  building: string;
  floor: string;
}

const emptyForm: UploadForm = { name: '', revision: 'Rev A', type: 'Architectural', building: '', floor: '' };

export function QAQCDrawings() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const [drawings, setDrawings] = useState<DrawingItem[]>(initialDrawings);
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingItem | null>(null);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(100);
  const [showPins, setShowPins] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<UploadForm>(emptyForm);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pin placement state
  const [placedPins, setPlacedPins] = useState<PlacedPin[]>([]);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [draggingPin, setDraggingPin] = useState(false);
  const drawingAreaRef = useRef<HTMLDivElement>(null);

  // Ticket creation from pin
  const [showTicketCreate, setShowTicketCreate] = useState(false);
  const [ticketPinLocation, setTicketPinLocation] = useState<{ x: number; y: number } | null>(null);
  const [ticketForm, setTicketForm] = useState({
    title: '', form: 'Documentation', type: '', trade: '', assignee: '', receiver: '',
    dueDate: '', extensionDate: '', description: '', priority: 'Medium', severity: 'Minor',
  });
  const [ticketFiles, setTicketFiles] = useState<File[]>([]);
  const ticketFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };

  const handleUploadSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: isAr ? 'اسم المخطط مطلوب' : 'Drawing name is required', variant: 'destructive' });
      return;
    }
    if (uploadedFiles.length === 0) {
      toast({ title: isAr ? 'يرجى إرفاق ملف' : 'Please attach a drawing file', variant: 'destructive' });
      return;
    }
    const newDrawing: DrawingItem = {
      id: `DWG-${String(drawings.length + 1).padStart(3, '0')}`,
      name: form.name, revision: form.revision, type: form.type,
      building: form.building, floor: form.floor,
      date: new Date().toISOString().split('T')[0], pins: 0, status: 'Current',
      fileName: uploadedFiles[0]?.name,
    };
    setDrawings(prev => [newDrawing, ...prev]);
    setForm(emptyForm);
    setUploadedFiles([]);
    setShowUpload(false);
    toast({ title: isAr ? 'تم رفع المخطط بنجاح' : 'Drawing uploaded successfully', description: newDrawing.id });
  };

  // Right-click handler on drawing area
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!drawingAreaRef.current) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) });
  }, []);

  // Mouse move for dragging pending pin
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingPin || !pendingPin || !drawingAreaRef.current) return;
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) });
  }, [draggingPin, pendingPin]);

  // Confirm pin placement → open ticket creation
  const handlePinConfirm = () => {
    if (!pendingPin) return;
    setTicketPinLocation(pendingPin);
    setShowTicketCreate(true);
    // Don't clear pending pin yet — show it during ticket creation
  };

  // Cancel pin placement
  const handlePinCancel = () => {
    setPendingPin(null);
    setDraggingPin(false);
  };

  // Create ticket from pin
  const handleCreateTicketFromPin = () => {
    if (!ticketForm.title.trim()) {
      toast({ title: isAr ? 'العنوان مطلوب' : 'Title is required', variant: 'destructive' });
      return;
    }
    if (ticketPinLocation) {
      const newPin: PlacedPin = {
        id: `PIN-${Date.now()}`,
        x: ticketPinLocation.x,
        y: ticketPinLocation.y,
        status: 'not_approved',
        ticketId: `TKT-${String(placedPins.length + 100).padStart(3, '0')}`,
      };
      setPlacedPins(prev => [...prev, newPin]);
    }
    setPendingPin(null);
    setDraggingPin(false);
    setShowTicketCreate(false);
    setTicketPinLocation(null);
    setTicketForm({
      title: '', form: 'Documentation', type: '', trade: '', assignee: '', receiver: '',
      dueDate: '', extensionDate: '', description: '', priority: 'Medium', severity: 'Minor',
    });
    setTicketFiles([]);
    toast({ title: isAr ? 'تم إنشاء التذكرة بنجاح' : 'Ticket created from pin successfully' });
  };

  const cancelTicketCreation = () => {
    setPendingPin(null);
    setDraggingPin(false);
    setShowTicketCreate(false);
    setTicketPinLocation(null);
    setTicketForm({
      title: '', form: 'Documentation', type: '', trade: '', assignee: '', receiver: '',
      dueDate: '', extensionDate: '', description: '', priority: 'Medium', severity: 'Minor',
    });
    setTicketFiles([]);
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.svg" className="hidden" onChange={handleFileSelect} />
      <input ref={ticketFileRef} type="file" multiple className="hidden" onChange={(e) => {
        if (e.target.files) setTicketFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        e.target.value = '';
      }} />

      <div className="grid lg:grid-cols-[320px,1fr] gap-4">
        {/* Left: Drawing List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}><Upload className="h-4 w-4 mr-1" />{isAr ? 'رفع' : 'Upload'}</Button>
            <div className="relative flex-1"><Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" /><Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" /></div>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {drawings.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase())).map(dwg => (
              <Card key={dwg.id} className={`cursor-pointer transition-all ${selectedDrawing?.id === dwg.id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`} onClick={() => { setSelectedDrawing(dwg); setPendingPin(null); }}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <Map className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{dwg.name}</p>
                      <p className="text-[10px] text-muted-foreground">{dwg.building} / {dwg.floor} • {dwg.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Badge variant="outline" className="text-[9px]">{dwg.revision}</Badge>
                      <Badge variant={dwg.status === 'Current' ? 'default' : 'secondary'} className="text-[9px]">{dwg.status}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{dwg.pins + placedPins.length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Drawing Viewer */}
        <Card className="min-h-[500px]">
          {selectedDrawing ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-1 p-2 border-b flex-wrap">
                <span className="text-xs font-medium mr-2">{selectedDrawing.name}</span>
                <Badge variant="outline" className="text-[9px]">{selectedDrawing.revision}</Badge>
                <div className="flex items-center gap-1 ml-auto">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut className="h-3.5 w-3.5" /></Button>
                  <span className="text-xs w-10 text-center">{zoom}%</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(400, z + 25))}><ZoomIn className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Maximize2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPins(!showPins)}><Layers className={`h-3.5 w-3.5 ${showPins ? 'text-primary' : ''}`} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowLeftRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><RotateCcw className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div
                className="flex-1 relative bg-muted/30 overflow-hidden select-none"
                style={{ cursor: 'crosshair' }}
                onContextMenu={handleContextMenu}
                onMouseMove={handleMouseMove}
                onMouseUp={() => setDraggingPin(false)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative" style={{ transform: `scale(${zoom / 100})` }}>
                    <div
                      ref={drawingAreaRef}
                      className="w-[800px] h-[500px] border-2 border-dashed border-muted-foreground/20 rounded-lg bg-white dark:bg-slate-900 relative"
                    >
                      {/* Grid background */}
                      <div className="absolute inset-0 grid grid-cols-8 grid-rows-5">
                        {Array.from({ length: 40 }).map((_, i) => <div key={i} className="border border-muted-foreground/5" />)}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Map className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                          <p className="text-sm text-muted-foreground/50 mt-2">{selectedDrawing.name}</p>
                          <p className="text-xs text-muted-foreground/30">{selectedDrawing.revision} • {selectedDrawing.date}</p>
                        </div>
                      </div>

                      {/* Existing static pins */}
                      {showPins && Array.from({ length: selectedDrawing.pins }).map((_, i) => {
                        const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
                        const status = statuses[i % statuses.length];
                        const x = 10 + ((i * 37 + 13) % 80);
                        const y = 10 + ((i * 53 + 7) % 80);
                        return (
                          <div key={`static-${i}`} className="absolute group cursor-pointer" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}>
                            <MapPin className="h-6 w-6 drop-shadow-md" style={{ color: pinColors[status] }} />
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border rounded-lg shadow-lg p-2 w-[160px] z-10">
                              <p className="text-[10px] font-mono text-muted-foreground">TKT-{String(i + 1).padStart(3, '0')}</p>
                              <p className="text-xs font-medium">Issue #{i + 1}</p>
                              <Badge className="text-[9px] mt-1" style={{ backgroundColor: pinColors[status] + '20', color: pinColors[status] }}>{status}</Badge>
                            </div>
                          </div>
                        );
                      })}

                      {/* User-placed pins */}
                      {showPins && placedPins.map(pin => (
                        <div key={pin.id} className="absolute group cursor-pointer" style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)' }}>
                          <MapPin className="h-6 w-6 drop-shadow-md" style={{ color: pin.status === 'approved' ? '#10b981' : '#ef4444' }} />
                          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border rounded-lg shadow-lg p-2 w-[160px] z-10">
                            <p className="text-[10px] font-mono text-muted-foreground">{pin.ticketId}</p>
                            <Badge className="text-[9px] mt-1" style={{ backgroundColor: pin.status === 'approved' ? '#10b98120' : '#ef444420', color: pin.status === 'approved' ? '#10b981' : '#ef4444' }}>
                              {pin.status === 'approved' ? 'Approved' : 'Not Approved'}
                            </Badge>
                          </div>
                        </div>
                      ))}

                      {/* Pending pin with OK/Cancel buttons */}
                      {pendingPin && (
                        <div
                          className="absolute z-20"
                          style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%`, transform: 'translate(-50%, -100%)' }}
                          onMouseDown={(e) => { e.stopPropagation(); setDraggingPin(true); }}
                        >
                          {/* The pin marker */}
                          <div className="relative cursor-grab active:cursor-grabbing">
                            <MapPin className="h-8 w-8 drop-shadow-lg text-red-500" />
                          </div>
                          {/* OK / Cancel circles */}
                          <div className="flex items-center gap-2 mt-1 -ml-3">
                            {/* Cancel (Red circle with X) */}
                            <button
                              className="w-9 h-9 rounded-full border-[3px] border-red-600 bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                              onClick={(e) => { e.stopPropagation(); handlePinCancel(); }}
                              title={isAr ? 'إلغاء' : 'Cancel'}
                            >
                              <X className="h-5 w-5 text-red-600 stroke-[3]" />
                            </button>
                            {/* OK (Green circle with Check) */}
                            <button
                              className="w-9 h-9 rounded-full border-[3px] border-green-600 bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                              onClick={(e) => { e.stopPropagation(); handlePinConfirm(); }}
                              title={isAr ? 'تأكيد' : 'Confirm'}
                            >
                              <Check className="h-5 w-5 text-green-600 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Hint text */}
                <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded shadow">
                  {isAr ? 'انقر بزر الفأرة الأيمن لوضع دبوس' : 'Right-click to place a pin'}
                </div>
              </div>
            </div>
          ) : (
            <CardContent className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Map className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">{isAr ? 'اختر مخططاً للعرض' : 'Select a drawing to view'}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{isAr ? 'أو ارفع مخططاً جديداً' : 'Or upload a new drawing'}</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) { setForm(emptyForm); setUploadedFiles([]); } setShowUpload(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{isAr ? 'رفع مخطط جديد' : 'Upload Drawing'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Drawing Name *</Label><Input placeholder="e.g. Ground Floor Plan" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{drawingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Revision</Label><Input placeholder="Rev A" value={form.revision} onChange={e => setForm(p => ({ ...p, revision: e.target.value }))} /></div>
              <div><Label>Building</Label><Input placeholder="e.g. Tower A" value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))} /></div>
              <div><Label>Floor</Label><Input placeholder="e.g. 5F" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} /></div>
            </div>
            <div>
              <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                <FileImage className="h-4 w-4 mr-1" />{isAr ? 'إرفاق ملف المخطط' : 'Attach Drawing File'}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-1">PDF, DWG, DXF, PNG, JPG, SVG</p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-1">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                    <FileImage className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setUploadedFiles(f => f.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(emptyForm); setUploadedFiles([]); setShowUpload(false); }}>Cancel</Button>
            <Button onClick={handleUploadSubmit}>{isAr ? 'رفع' : 'Upload Drawing'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket from Pin Dialog — 2-column layout like reference */}
      <Dialog open={showTicketCreate} onOpenChange={(open) => { if (!open) cancelTicketCreation(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إنشاء تذكرة جديدة' : 'Create new ticket'}</DialogTitle>
            <p className="text-sm text-muted-foreground">{isAr ? 'اختر نموذجاً للتذكرة' : 'Select a form for your ticket'}</p>
          </DialogHeader>

          <div className="grid md:grid-cols-[1fr,340px] gap-6">
            {/* Left: Form Fields */}
            <div className="space-y-4">
              {/* Form selector */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="font-bold">{isAr ? 'النموذج' : 'Form'}</Label>
                  <Select value={ticketForm.form} onValueChange={v => setTicketForm(p => ({ ...p, form: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Documentation">{isAr ? 'التوثيق' : 'Documentation'}</SelectItem>
                      <SelectItem value="Inspection">{isAr ? 'الفحص' : 'Inspection'}</SelectItem>
                      <SelectItem value="Quality">{isAr ? 'الجودة' : 'Quality'}</SelectItem>
                      <SelectItem value="Safety">{isAr ? 'السلامة' : 'Safety'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="font-bold">{isAr ? 'العنوان' : 'Title'}</Label>
                  <Input
                    placeholder={isAr ? 'عنوان التذكرة...' : 'Ticket title...'}
                    value={ticketForm.title}
                    onChange={e => setTicketForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'النوع' : 'Type'}</Label>
                  <Select value={ticketForm.type} onValueChange={v => setTicketForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>{ticketTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'التجارة' : 'Trade'}</Label>
                  <Select value={ticketForm.trade} onValueChange={v => setTicketForm(p => ({ ...p, trade: v }))}>
                    <SelectTrigger><SelectValue placeholder={isAr ? 'اختر...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>{trades.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'المكلف' : 'Assignee'}</Label>
                  <Select value={ticketForm.assignee} onValueChange={v => setTicketForm(p => ({ ...p, assignee: v }))}>
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
                  <Select value={ticketForm.receiver} onValueChange={v => setTicketForm(p => ({ ...p, receiver: v }))}>
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
                  <Input type="date" value={ticketForm.dueDate} onChange={e => setTicketForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'تاريخ التمديد' : 'Extension Date'}</Label>
                  <Input type="date" value={ticketForm.extensionDate} onChange={e => setTicketForm(p => ({ ...p, extensionDate: e.target.value }))} />
                </div>

                <div>
                  <Label className="font-bold">{isAr ? 'الوصف' : 'Description'}</Label>
                  <Textarea rows={3} placeholder={isAr ? 'وصف تفصيلي...' : 'Detailed description...'} value={ticketForm.description} onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Right: Layer / Drawing Preview / Attachments */}
            <div className="space-y-4">
              {/* Layer */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <Label className="font-bold">{isAr ? 'الطبقة' : 'Layer'}</Label>
                  <Select defaultValue={selectedDrawing?.floor || 'GF'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GF">{isAr ? 'الطابق الأرضي' : 'Ground Floor'}</SelectItem>
                      <SelectItem value="1F">{isAr ? 'الطابق الأول' : '1st Floor'}</SelectItem>
                      <SelectItem value="2F">{isAr ? 'الطابق الثاني' : '2nd Floor'}</SelectItem>
                      <SelectItem value="B1">{isAr ? 'بدروم 1' : 'Basement 1'}</SelectItem>
                      <SelectItem value="Roof">{isAr ? 'السطح' : 'Roof'}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Drawing preview with pin location */}
                  <div className="relative bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20 h-[200px] overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
                      {Array.from({ length: 24 }).map((_, i) => <div key={i} className="border border-muted-foreground/5" />)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Map className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                    {/* Show pin location on mini drawing */}
                    {ticketPinLocation && (
                      <div
                        className="absolute z-10"
                        style={{ left: `${ticketPinLocation.x}%`, top: `${ticketPinLocation.y}%`, transform: 'translate(-50%, -100%)' }}
                      >
                        <MapPin className="h-6 w-6 text-red-500 drop-shadow-md" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* General Attachments */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold">{isAr ? 'المرفقات العامة' : 'General attachments'}</Label>
                    <Filter className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => ticketFileRef.current?.click()}>
                    <Plus className="h-4 w-4 mr-1" />{isAr ? 'إضافة مرفق جديد' : 'Add new attachment'}
                  </Button>
                  {ticketFiles.length > 0 ? (
                    <div className="space-y-1">
                      {ticketFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="truncate flex-1">{f.name}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setTicketFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg py-6 text-center text-sm text-muted-foreground">
                      {isAr ? 'اسحب الملفات هنا' : 'Drag files here'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2 sm:justify-end">
            <Button variant="outline" onClick={cancelTicketCreation}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleCreateTicketFromPin}>{isAr ? 'حفظ' : 'Save'}</Button>
            <Button variant="outline" onClick={handleCreateTicketFromPin}>{isAr ? 'حفظ وإغلاق' : 'Save and close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
