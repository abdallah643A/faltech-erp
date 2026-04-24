import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Camera, Upload, Calendar, MapPin, Eye, ChevronLeft, ChevronRight,
  Maximize2, Plus, ArrowLeftRight, Clock, Building, Layers, Video,
  X, Play, Image, FileVideo, Info
} from 'lucide-react';

type CaptureType = 'photo_360' | 'video_360' | 'live_camera';

interface CaptureItem {
  id: string;
  project: string;
  building: string;
  floor: string;
  zone: string;
  date: string;
  uploader: string;
  device: string;
  ticketCount: number;
  route: string;
  type: CaptureType;
  phase?: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

const sampleCaptures: CaptureItem[] = [
  { id: 'CAP-001', project: 'Al-Noor Tower', building: 'Tower A', floor: 'GF', zone: 'Lobby', date: '2026-04-12', uploader: 'Eng. Ahmed', device: 'Ricoh Theta Z1', ticketCount: 3, route: 'Lobby Walkthrough', type: 'photo_360', phase: 'Finishing', description: 'Complete lobby area 360° walkthrough covering reception, elevators, and main entrance.' },
  { id: 'CAP-002', project: 'Al-Noor Tower', building: 'Tower A', floor: '5F', zone: 'Corridor C1', date: '2026-04-11', uploader: 'Eng. Khalid', device: 'Insta360 Pro', ticketCount: 5, route: 'Level 5 Survey', type: 'video_360', phase: 'MEP Rough-In', description: 'Video walkthrough of corridor C1 showing MEP installations and ceiling framing.' },
  { id: 'CAP-003', project: 'Al-Noor Tower', building: 'Tower A', floor: '8F', zone: 'Column Grid', date: '2026-04-10', uploader: 'Eng. Omar', device: 'Ricoh Theta Z1', ticketCount: 2, route: 'Structural Check', type: 'photo_360', phase: 'Structure', description: 'Structural column grid inspection before slab pour on Level 8.' },
  { id: 'CAP-004', project: 'King Fahd Complex', building: 'Block B', floor: '3F', zone: 'Stairwell S2', date: '2026-04-09', uploader: 'Eng. Fahad', device: 'GoPro MAX', ticketCount: 1, route: 'Fire Safety Audit', type: 'video_360', phase: 'Fire Protection', description: 'Fire stopping and stairwell pressurization system inspection recording.' },
  { id: 'CAP-005', project: 'Riyadh Metro Hub', building: 'Station 1', floor: 'Concourse', zone: 'Platform Area', date: '2026-04-08', uploader: 'Eng. Hassan', device: 'Insta360 X3', ticketCount: 4, route: 'MEP Inspection', type: 'photo_360', phase: 'MEP Installation', description: 'Platform level MEP routing and ceiling services capture for coordination review.' },
  { id: 'CAP-006', project: 'Al-Noor Tower', building: 'Tower B', floor: 'Roof', zone: 'Waterproofing', date: '2026-04-07', uploader: 'Eng. Youssef', device: 'Ricoh Theta Z1', ticketCount: 2, route: 'Roof Survey', type: 'photo_360', phase: 'Waterproofing', description: 'Waterproofing membrane application documentation before protection screed.' },
];

const typeIcon = (type: CaptureType) => {
  switch (type) {
    case 'video_360': return <Video className="h-4 w-4 text-blue-500" />;
    case 'live_camera': return <Play className="h-4 w-4 text-green-500" />;
    default: return <Camera className="h-4 w-4 text-primary" />;
  }
};

const typeLabel = (type: CaptureType) => {
  switch (type) {
    case 'video_360': return '360° Video';
    case 'live_camera': return 'Live Camera';
    default: return '360° Photo';
  }
};

interface UploadForm {
  route: string;
  project: string;
  building: string;
  floor: string;
  zone: string;
  phase: string;
  device: string;
  description: string;
  type: CaptureType;
}

const emptyUpload: UploadForm = {
  route: '', project: '', building: '', floor: '', zone: '',
  phase: '', device: '', description: '', type: 'photo_360',
};

const phases = ['Excavation', 'Foundation', 'Structure', 'MEP Rough-In', 'MEP Installation', 'Fire Protection', 'Waterproofing', 'Finishing', 'Handover', 'Defects Liability'];

export function QAQCSiteView360() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const [captures, setCaptures] = useState<CaptureItem[]>(sampleCaptures);
  const [selectedCapture, setSelectedCapture] = useState<CaptureItem | null>(null);
  const [filterProject, setFilterProject] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUpload);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const projects = [...new Set(captures.map(c => c.project))];
  const filtered = captures.filter(c => filterProject === 'all' || c.project === filterProject);

  const updateUpload = (field: keyof UploadForm, value: string) => {
    setUploadForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const removeFile = (i: number) => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i));

  const handleUploadSubmit = () => {
    if (!uploadForm.route.trim()) {
      toast({ title: isAr ? 'اسم الالتقاط مطلوب' : 'Capture name is required', variant: 'destructive' });
      return;
    }
    if (uploadedFiles.length === 0 && uploadForm.type !== 'live_camera') {
      toast({ title: isAr ? 'يرجى إرفاق ملف' : 'Please attach a file', variant: 'destructive' });
      return;
    }

    const newCapture: CaptureItem = {
      id: `CAP-${String(captures.length + 1).padStart(3, '0')}`,
      route: uploadForm.route,
      project: uploadForm.project || 'Unassigned',
      building: uploadForm.building,
      floor: uploadForm.floor,
      zone: uploadForm.zone,
      phase: uploadForm.phase,
      device: uploadForm.device,
      description: uploadForm.description,
      type: uploadForm.type,
      date: new Date().toISOString().split('T')[0],
      uploader: 'Current User',
      ticketCount: 0,
    };

    setCaptures(prev => [newCapture, ...prev]);
    setUploadForm(emptyUpload);
    setUploadedFiles([]);
    setShowUpload(false);
    toast({ title: isAr ? 'تم الرفع بنجاح' : 'Capture uploaded successfully', description: newCapture.id });
  };

  const startLiveCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsStreaming(true);
    } catch {
      toast({ title: isAr ? 'تعذر الوصول للكاميرا' : 'Camera access denied', description: 'Please allow camera permissions.', variant: 'destructive' });
    }
  };

  const stopLiveCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsStreaming(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-1" />{isAr ? 'رفع صور/فيديو 360°' : 'Upload 360° Captures'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          if (isStreaming) { stopLiveCamera(); } else { startLiveCamera(); }
        }}>
          {isStreaming ? <><X className="h-4 w-4 mr-1" />{isAr ? 'إيقاف' : 'Stop Camera'}</> : <><Video className="h-4 w-4 mr-1" />{isAr ? 'كاميرا مباشرة' : 'Live Camera'}</>}
        </Button>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Live Camera Feed */}
      {isStreaming && (
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <video ref={videoRef} className="w-full max-h-[400px] object-cover bg-black" autoPlay muted playsInline />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge className="bg-red-600 text-white animate-pulse text-xs">● LIVE</Badge>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => {
                toast({ title: isAr ? 'تم التقاط الصورة' : 'Snapshot captured' });
              }}>
                <Camera className="h-4 w-4 mr-1" />{isAr ? 'التقاط' : 'Snapshot'}
              </Button>
              <Button size="sm" variant="destructive" onClick={stopLiveCamera}>
                <X className="h-4 w-4 mr-1" />{isAr ? 'إيقاف' : 'Stop'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-[300px,1fr] gap-4">
        {/* Left: Capture List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map(cap => (
            <Card
              key={cap.id}
              className={`cursor-pointer transition-all ${selectedCapture?.id === cap.id ? 'ring-2 ring-primary' : 'hover:shadow-sm'}`}
              onClick={() => setSelectedCapture(cap)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  {typeIcon(cap.type)}
                  <Badge variant="outline" className="text-[9px]">{cap.date}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium">{cap.route}</p>
                  <p className="text-[10px] text-muted-foreground">{cap.building} / {cap.floor} / {cap.zone}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{cap.uploader}</span>
                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{cap.ticketCount} issues</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[9px]">{typeLabel(cap.type)}</Badge>
                  {cap.phase && <Badge variant="outline" className="text-[9px]">{cap.phase}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No captures found</p>
          )}
        </div>

        {/* Right: 360 Viewer */}
        <Card className="min-h-[500px]">
          {selectedCapture ? (
            <div className="h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 border-b flex-wrap">
                <span className="text-xs font-medium">{selectedCapture.route}</span>
                <Badge variant="outline" className="text-[9px]">{selectedCapture.building}/{selectedCapture.floor}</Badge>
                <Badge variant="secondary" className="text-[9px]">{typeLabel(selectedCapture.type)}</Badge>
                <div className="flex items-center gap-1 ml-auto">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDetail(true)}>
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Maximize2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowLeftRight className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Layers className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {/* 360 Canvas */}
              <div className="flex-1 relative bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden rounded-b-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/70">
                    {selectedCapture.type === 'video_360' ? (
                      <Video className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    ) : (
                      <Camera className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    )}
                    <p className="text-sm font-medium">{isAr ? 'عرض 360° تفاعلي' : selectedCapture.type === 'video_360' ? '360° Video Playback' : '360° Interactive View'}</p>
                    <p className="text-xs opacity-50 mt-1">{selectedCapture.zone} – {selectedCapture.date}</p>
                    <p className="text-[10px] opacity-30 mt-2">{isAr ? 'اسحب للتدوير • انقر لإضافة مشكلة' : 'Drag to rotate • Click to add issue'}</p>
                  </div>
                </div>
                {/* Hotspots */}
                {Array.from({ length: selectedCapture.ticketCount }).map((_, i) => (
                  <div key={i} className="absolute cursor-pointer group" style={{ left: `${20 + i * 15}%`, top: `${30 + (i % 3) * 15}%` }}>
                    <div className="h-6 w-6 rounded-full bg-red-500/80 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                      <span className="text-[9px] text-white font-bold">{i + 1}</span>
                    </div>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-2 w-[150px] z-10">
                      <p className="text-[10px] font-mono text-muted-foreground">TKT-{String(i + 1).padStart(3, '0')}</p>
                      <p className="text-xs font-medium text-foreground">Issue at hotspot</p>
                      <Badge variant="destructive" className="text-[9px] mt-1">Open</Badge>
                    </div>
                  </div>
                ))}
                <Button size="sm" className="absolute bottom-4 right-4 shadow-lg"><Plus className="h-4 w-4 mr-1" />{isAr ? 'تذكرة من هنا' : 'Create Ticket Here'}</Button>
              </div>
              {/* Metadata */}
              <div className="p-2 border-t flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{selectedCapture.date}</span>
                <span className="flex items-center gap-1"><Camera className="h-3 w-3" />{selectedCapture.device}</span>
                <span className="flex items-center gap-1"><Building className="h-3 w-3" />{selectedCapture.project}</span>
                {selectedCapture.phase && <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{selectedCapture.phase}</span>}
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedCapture.ticketCount} issues linked</span>
              </div>
            </div>
          ) : (
            <CardContent className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Camera className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">{isAr ? 'اختر نقطة التقاط' : 'Select a capture point'}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{isAr ? 'لعرض صورة 360° تفاعلية' : 'To view immersive 360° scene'}</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isAr ? 'الجدول الزمني للالتقاطات' : 'Capture Timeline'}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {captures.map(cap => (
              <div key={cap.id} className={`shrink-0 p-2 rounded-lg border cursor-pointer min-w-[120px] ${selectedCapture?.id === cap.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedCapture(cap)}>
                <div className="h-12 w-full bg-muted rounded flex items-center justify-center mb-1.5">
                  {typeIcon(cap.type)}
                </div>
                <p className="text-[10px] font-medium truncate">{cap.zone}</p>
                <p className="text-[9px] text-muted-foreground">{cap.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.jpg,.jpeg,.png,.mp4,.mov" className="hidden" onChange={handleFileSelect} />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) { setUploadForm(emptyUpload); setUploadedFiles([]); } setShowUpload(open); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAr ? 'رفع التقاط 360°' : 'Upload 360° Capture'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Capture Name *</Label>
              <Input placeholder="e.g. Lobby Walkthrough" value={uploadForm.route} onChange={e => updateUpload('route', e.target.value)} />
            </div>
            <div>
              <Label>Capture Type</Label>
              <Select value={uploadForm.type} onValueChange={v => updateUpload('type', v as CaptureType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo_360">360° Photo</SelectItem>
                  <SelectItem value="video_360">360° Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Project</Label>
                <Input placeholder="e.g. Al-Noor Tower" value={uploadForm.project} onChange={e => updateUpload('project', e.target.value)} />
              </div>
              <div>
                <Label>Phase</Label>
                <Select value={uploadForm.phase} onValueChange={v => updateUpload('phase', v)}>
                  <SelectTrigger><SelectValue placeholder="Select phase..." /></SelectTrigger>
                  <SelectContent>{phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Building</Label><Input placeholder="e.g. Tower A" value={uploadForm.building} onChange={e => updateUpload('building', e.target.value)} /></div>
              <div><Label>Floor</Label><Input placeholder="e.g. 5F" value={uploadForm.floor} onChange={e => updateUpload('floor', e.target.value)} /></div>
              <div><Label>Zone / Location</Label><Input placeholder="e.g. Lobby" value={uploadForm.zone} onChange={e => updateUpload('zone', e.target.value)} /></div>
              <div><Label>Device</Label><Input placeholder="e.g. Ricoh Theta Z1" value={uploadForm.device} onChange={e => updateUpload('device', e.target.value)} /></div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Describe the capture context..." value={uploadForm.description} onChange={e => updateUpload('description', e.target.value)} />
            </div>

            {/* File Upload */}
            <div>
              <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                {uploadForm.type === 'video_360' ? <><FileVideo className="h-4 w-4 mr-1" />Attach Video</> : <><Image className="h-4 w-4 mr-1" />Attach 360° Image</>}
              </Button>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Files ({uploadedFiles.length})</Label>
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                    {file.type.startsWith('video') ? <FileVideo className="h-3 w-3 shrink-0" /> : <Image className="h-3 w-3 shrink-0" />}
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeFile(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadForm(emptyUpload); setUploadedFiles([]); setShowUpload(false); }}>Cancel</Button>
            <Button onClick={handleUploadSubmit}>{isAr ? 'رفع' : 'Upload Capture'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capture Detail Dialog */}
      <Dialog open={showDetail && !!selectedCapture} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          {selectedCapture && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selectedCapture.id}</span>
                  <Badge variant="secondary" className="text-[9px]">{typeLabel(selectedCapture.type)}</Badge>
                </div>
                <DialogTitle>{selectedCapture.route}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedCapture.description && (
                  <p className="text-sm text-muted-foreground">{selectedCapture.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Project</Label><p className="font-medium">{selectedCapture.project}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Phase</Label><p className="font-medium">{selectedCapture.phase || '—'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Building</Label><p>{selectedCapture.building}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Floor</Label><p>{selectedCapture.floor}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Zone / Location</Label><p>{selectedCapture.zone}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Device</Label><p>{selectedCapture.device}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Captured By</Label><p>{selectedCapture.uploader}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Date</Label><p>{selectedCapture.date}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Linked Issues</Label><p className="font-medium text-destructive">{selectedCapture.ticketCount} ticket(s)</p></div>
                  <div><Label className="text-xs text-muted-foreground">Media Type</Label><p>{typeLabel(selectedCapture.type)}</p></div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
