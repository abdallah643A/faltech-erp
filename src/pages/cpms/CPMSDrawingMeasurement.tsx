import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useCPMSDrawings, type CPMSDrawing, type CPMSDrawingMeasurement as DrawingMeasurementType } from '@/hooks/useCPMSDrawings';
import { useCPMS } from '@/hooks/useCPMS';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import {
  Ruler, MousePointer2, Square, Pentagon, Upload, ZoomIn, ZoomOut,
  Maximize, Move, Trash2, Eye, Undo2, Redo2, Download, Crosshair,
  FileImage, Plus, Settings, Palette, Tag, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

type MeasureTool = 'select' | 'distance' | 'area' | 'perimeter' | 'calibrate';
type Point = { x: number; y: number };

const UNIT_LABELS: Record<string, string> = { meters: 'm', feet: 'ft', inches: 'in', cm: 'cm' };
const UNIT_CONVERSIONS: Record<string, number> = { meters: 1, feet: 3.28084, inches: 39.3701, cm: 100 };
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function distPx(a: Point, b: Point) { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2); }
function polygonArea(pts: Point[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2);
}
function perimeterLen(pts: Point[]) {
  let p = 0;
  for (let i = 0; i < pts.length; i++) p += distPx(pts[i], pts[(i + 1) % pts.length]);
  return p;
}

export default function CPMSDrawingMeasurement() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { projects } = useCPMS();
  const projectList = projects || [];

  const [selectedProject, setSelectedProject] = useState<string>('__all__');
  const { drawings, createDrawing, deleteDrawing, updateDrawing, useMeasurements, createMeasurement, deleteMeasurement, uploadFile } = useCPMSDrawings(selectedProject === '__all__' ? null : selectedProject);

  const [activeDrawing, setActiveDrawing] = useState<CPMSDrawing | null>(null);
  const measurementsQuery = useMeasurements(activeDrawing?.id || null);
  const measurements = measurementsQuery.data || [];

  const [tool, setTool] = useState<MeasureTool>('select');
  const [unit, setUnit] = useState<string>('meters');
  const [color, setColor] = useState('#ef4444');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', project_id: '' });
  const [uploading, setUploading] = useState(false);
  const [labelDialog, setLabelDialog] = useState(false);
  const [pendingLabel, setPendingLabel] = useState('');
  const [pendingMeasurement, setPendingMeasurement] = useState<{ points: Point[]; type: string; value: number } | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [calibrating, setCalibratingState] = useState(false);
  const [calPoints, setCalPoints] = useState<Point[]>([]);
  const [calRealDist, setCalRealDist] = useState('');
  const [showCalDialog, setShowCalDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scaleFactor = activeDrawing?.scale_factor || 1;

  const pxToReal = useCallback((px: number) => px * scaleFactor, [scaleFactor]);
  const convertUnit = useCallback((m: number) => m * (UNIT_CONVERSIONS[unit] || 1), [unit]);

  // Load drawing image (supports both images and PDFs)
  useEffect(() => {
    if (!activeDrawing) { imgRef.current = null; return; }
    
    const isPdf = activeDrawing.file_type === 'application/pdf' || activeDrawing.file_url?.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      // Load PDF.js from CDN and render first page
      (async () => {
        try {
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            // Dynamically load pdf.js from CDN
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Failed to load PDF.js'));
              document.head.appendChild(script);
            });
          }
          const pdfjs = (window as any).pdfjsLib;
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const loadingTask = pdfjs.getDocument(activeDrawing.file_url);
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const scale = 2;
          const viewport = page.getViewport({ scale });
          const offscreen = document.createElement('canvas');
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          const ctx = offscreen.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const img = new Image();
          img.onload = () => { imgRef.current = img; drawCanvas(); };
          img.src = offscreen.toDataURL('image/png');
        } catch (err) {
          console.error('PDF render failed:', err);
          toast({ title: 'PDF render failed', description: 'Could not render the PDF drawing.', variant: 'destructive' });
        }
      })();
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { imgRef.current = img; drawCanvas(); };
      img.onerror = () => toast({ title: 'Image load failed', variant: 'destructive' });
      img.src = activeDrawing.file_url;
    }
  }, [activeDrawing?.file_url]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx) return;

    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (img) {
      ctx.drawImage(img, 0, 0);
    }

    // Draw saved measurements
    measurements.forEach(m => {
      drawMeasurementOnCanvas(ctx, m.points, m.measurement_type, m.color, m.label, m.value, m.unit);
    });

    // Draw current measurement in progress
    if (currentPoints.length > 0) {
      const allPts = mousePos && tool !== 'select' ? [...currentPoints, mousePos] : currentPoints;
      drawMeasurementOnCanvas(ctx, allPts, tool === 'calibrate' ? 'distance' : tool, color, null, null, null, true);
    }

    // Draw calibration line
    if (tool === 'calibrate' && calPoints.length > 0) {
      const allPts = mousePos ? [...calPoints, mousePos] : calPoints;
      drawMeasurementOnCanvas(ctx, allPts, 'distance', '#f59e0b', 'CAL', null, null, true);
    }

    ctx.restore();

    // Show cursor coordinates
    if (mousePos) {
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '11px monospace';
      const rx = convertUnit(pxToReal(mousePos.x));
      const ry = convertUnit(pxToReal(mousePos.y));
      ctx.fillText(`${rx.toFixed(2)}, ${ry.toFixed(2)} ${UNIT_LABELS[unit]}`, 8, canvas.height - 8);
    }
  }, [pan, zoom, measurements, currentPoints, mousePos, tool, color, calPoints, unit, scaleFactor]);

  const drawMeasurementOnCanvas = (
    ctx: CanvasRenderingContext2D, pts: Point[], type: string, clr: string,
    label: string | null, value: number | null, mUnit: string | null, isActive = false
  ) => {
    if (pts.length < 1) return;
    ctx.strokeStyle = clr;
    ctx.lineWidth = isActive ? 2 : 1.5;
    ctx.fillStyle = clr;
    ctx.setLineDash(isActive ? [6, 3] : []);

    if (type === 'distance' && pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); });
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = value !== null ? value : convertUnit(pxToReal(distPx(pts[0], pts[1])));
      const u = mUnit || UNIT_LABELS[unit];
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = 'hsl(var(--background))';
      const text = `${label ? label + ': ' : ''}${dist.toFixed(2)} ${u}`;
      const tw = ctx.measureText(text).width;
      ctx.fillRect(mid.x - tw / 2 - 4, mid.y - 18, tw + 8, 20);
      ctx.fillStyle = clr;
      ctx.fillText(text, mid.x - tw / 2, mid.y - 3);
    } else if ((type === 'area' || type === 'perimeter') && pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      if (!isActive && pts.length >= 3) ctx.closePath();
      if (type === 'area' && !isActive && pts.length >= 3) {
        ctx.globalAlpha = 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.stroke();
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
      if (pts.length >= 3 && !isActive) {
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const v = value !== null ? value : (type === 'area'
          ? convertUnit(pxToReal(Math.sqrt(polygonArea(pts)))) ** 2
          : convertUnit(pxToReal(perimeterLen(pts))));
        const u = mUnit || (type === 'area' ? `${UNIT_LABELS[unit]}²` : UNIT_LABELS[unit]);
        const text = `${label ? label + ': ' : ''}${v.toFixed(2)} ${u}`;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = 'hsl(var(--background))';
        const tw = ctx.measureText(text).width;
        ctx.fillRect(cx - tw / 2 - 4, cy - 18, tw + 8, 20);
        ctx.fillStyle = clr;
        ctx.fillText(text, cx - tw / 2, cy - 3);
      }
    }
    ctx.setLineDash([]);
  };

  useEffect(() => { drawCanvas(); }, [drawCanvas]);
  useEffect(() => {
    const resize = () => drawCanvas();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawCanvas]);

  // Canvas to image coords
  const canvasToImg = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select' || isPanning) return;
    const pt = canvasToImg(e);

    if (tool === 'calibrate') {
      const newCal = [...calPoints, pt];
      setCalPoints(newCal);
      if (newCal.length === 2) {
        setShowCalDialog(true);
      }
      return;
    }

    if (tool === 'distance') {
      const newPts = [...currentPoints, pt];
      setCurrentPoints(newPts);
      if (newPts.length === 2) {
        const val = convertUnit(pxToReal(distPx(newPts[0], newPts[1])));
        setPendingMeasurement({ points: newPts, type: 'distance', value: val });
        setLabelDialog(true);
        setCurrentPoints([]);
      }
    } else if (tool === 'area' || tool === 'perimeter') {
      setCurrentPoints(prev => [...prev, pt]);
    }
  }, [tool, currentPoints, calPoints, canvasToImg, isPanning, pxToReal, convertUnit]);

  const handleDoubleClick = useCallback(() => {
    if ((tool === 'area' || tool === 'perimeter') && currentPoints.length >= 3) {
      const val = tool === 'area'
        ? convertUnit(pxToReal(Math.sqrt(polygonArea(currentPoints)))) ** 2
        : convertUnit(pxToReal(perimeterLen(currentPoints)));
      setPendingMeasurement({ points: [...currentPoints], type: tool, value: val });
      setLabelDialog(true);
      setCurrentPoints([]);
    }
  }, [tool, currentPoints, pxToReal, convertUnit]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.clientX - panStart.x, y: prev.y + e.clientY - panStart.y }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    const pt = canvasToImg(e);
    setMousePos(pt);
  }, [canvasToImg, isPanning, panStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select' || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [tool]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  const saveMeasurement = async () => {
    if (!pendingMeasurement || !activeDrawing) return;
    const unitLabel = pendingMeasurement.type === 'area' ? `${UNIT_LABELS[unit]}²` : UNIT_LABELS[unit];
    await createMeasurement.mutateAsync({
      drawing_id: activeDrawing.id,
      measurement_type: pendingMeasurement.type,
      label: pendingLabel || null,
      color,
      points: pendingMeasurement.points,
      value: pendingMeasurement.value,
      unit: unitLabel,
      sort_order: measurements.length,
    });
    setUndoStack(prev => [...prev, 'add']);
    setLabelDialog(false);
    setPendingLabel('');
    setPendingMeasurement(null);
  };

  const saveCalibration = async () => {
    if (!activeDrawing || calPoints.length < 2 || !calRealDist) return;
    const pxDist = distPx(calPoints[0], calPoints[1]);
    const realDist = parseFloat(calRealDist);
    if (!realDist || !pxDist) return;
    const sf = realDist / pxDist;
    await updateDrawing.mutateAsync({
      id: activeDrawing.id,
      scale_factor: sf,
      scale_unit: unit,
      scale_reference_px: pxDist,
      scale_reference_real: realDist,
    });
    setActiveDrawing(prev => prev ? { ...prev, scale_factor: sf, scale_unit: unit, scale_reference_px: pxDist, scale_reference_real: realDist } : null);
    setCalPoints([]);
    setCalRealDist('');
    setShowCalDialog(false);
    setTool('select');
    toast({ title: 'Scale calibrated', description: `1px = ${sf.toFixed(6)} ${unit}` });
  };

  const handleUpload = async () => {
    const input = fileInputRef.current;
    if (!input?.files?.[0]) return;
    setUploading(true);
    try {
      const file = input.files[0];
      const url = await uploadFile(file);
      await createDrawing.mutateAsync({
        title: uploadForm.title || file.name,
        description: uploadForm.description || null,
        file_url: url,
        file_type: file.type,
        file_name: file.name,
        project_id: uploadForm.project_id || null,
      });
      setShowUpload(false);
      setUploadForm({ title: '', description: '', project_id: '' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const exportMeasurements = () => {
  const { t } = useLanguage();

    if (!measurements.length) return;
    const csv = ['Type,Label,Value,Unit,Color,Points']
      .concat(measurements.map(m =>
        `${m.measurement_type},${m.label || ''},${m.value},${m.unit},${m.color},"${JSON.stringify(m.points)}"`
      )).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `measurements_${activeDrawing?.title || 'export'}.csv`;
    a.click();
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const drawingsList = drawings.data || [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cpms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Ruler className="h-5 w-5 text-primary" />
              Drawing Measurement
            </h1>
            <p className="text-sm text-muted-foreground">Upload drawings, measure distances, areas & perimeters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={v => { setSelectedProject(v); setActiveDrawing(null); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filter by project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Projects</SelectItem>
              {projectList.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate('/cpms/measurement-reporting')}><Download className="h-4 w-4 mr-1" /> Reports & Export</Button>
          <Button onClick={() => setShowUpload(true)}><Plus className="h-4 w-4 mr-1" /> Upload Drawing</Button>
        </div>
      </div>

      {!activeDrawing ? (
        /* Drawing Gallery */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drawingsList.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileImage className="h-16 w-16 mb-4 opacity-40" />
                <p className="font-medium text-lg">No drawings uploaded</p>
                <p className="text-sm mb-4">Upload construction drawings to start measuring</p>
                <Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4 mr-1" /> Upload Drawing</Button>
              </CardContent>
            </Card>
          ) : drawingsList.map(d => (
            <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow group">
              <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg" onClick={() => { setActiveDrawing(d); resetView(); }}>
                {d.file_type.startsWith('image') ? (
                  <img src={d.file_url} alt={d.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1">
                    <FileImage className="h-12 w-12 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">PDF Drawing</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{d.title}</p>
                <p className="text-xs text-muted-foreground truncate">{d.file_name}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {d.scale_factor !== 1 ? `Scale: 1px = ${d.scale_factor.toFixed(4)}${d.scale_unit}` : 'Not calibrated'}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteDrawing.mutate(d.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Measurement Workspace */
        <div className="flex gap-4 h-[calc(100vh-180px)]">
          {/* Toolbar */}
          <div className="flex flex-col gap-1 bg-card border rounded-lg p-2 w-12 shrink-0">
            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={tool === 'select' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => { setTool('select'); setCurrentPoints([]); }}>
                <MousePointer2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Pan / Select</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={tool === 'distance' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => { setTool('distance'); setCurrentPoints([]); }}>
                <Ruler className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Distance</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={tool === 'area' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => { setTool('area'); setCurrentPoints([]); }}>
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Area (double-click to close)</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={tool === 'perimeter' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => { setTool('perimeter'); setCurrentPoints([]); }}>
                <Pentagon className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Perimeter (double-click to close)</TooltipContent></Tooltip>

            <Separator className="my-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={tool === 'calibrate' ? 'default' : 'ghost'} className="h-8 w-8" onClick={() => { setTool('calibrate'); setCalPoints([]); setCurrentPoints([]); }}>
                <Crosshair className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Calibrate Scale</TooltipContent></Tooltip>

            <Separator className="my-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.min(10, z * 1.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Zoom In</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Zoom Out</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={resetView}>
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Reset View</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleFullscreen}>
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Fullscreen</TooltipContent></Tooltip>

            <Separator className="my-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={exportMeasurements}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="right">Export CSV</TooltipContent></Tooltip>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="flex-1 bg-muted/30 rounded-lg border overflow-hidden relative"
            style={{ cursor: tool === 'select' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setMousePos(null); setIsPanning(false); }}
              onWheel={handleWheel}
              className="w-full h-full"
            />
            {/* Status bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur border-t px-3 py-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
                <span>Scale: {scaleFactor !== 1 ? `1px = ${scaleFactor.toFixed(4)} ${activeDrawing.scale_unit}` : 'Not set'}</span>
                <span>Tool: <Badge variant="secondary" className="text-[10px] h-4">{tool}</Badge></span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="h-6 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">Meters</SelectItem>
                    <SelectItem value="feet">Feet</SelectItem>
                    <SelectItem value="inches">Inches</SelectItem>
                    <SelectItem value="cm">Centimeters</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button key={c} className={`w-4 h-4 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                  ))}
                </div>
              </div>
            </div>
            {/* Back button overlay */}
            <Button size="sm" variant="secondary" className="absolute top-2 left-2 h-7 text-xs"
              onClick={() => { setActiveDrawing(null); setCurrentPoints([]); }}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to Gallery
            </Button>
          </div>

          {/* Measurement History Panel */}
          <Card className="w-72 shrink-0 flex flex-col">
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Measurements ({measurements.length})</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">{activeDrawing.title}</p>
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {measurements.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No measurements yet. Use the tools to start measuring.</p>
                ) : measurements.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 group text-xs">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: m.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.label || `${m.measurement_type} #${i + 1}`}</p>
                      <p className="text-muted-foreground font-mono">{m.value.toFixed(2)} {m.unit}</p>
                      <Badge variant="outline" className="text-[9px] h-4 mt-0.5">{m.measurement_type}</Badge>
                    </div>
                    <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                      onClick={() => deleteMeasurement.mutate(m.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {measurements.length > 0 && (
              <>
                <Separator />
                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium">Summary</p>
                  {['distance', 'area', 'perimeter'].map(type => {
                    const items = measurements.filter(m => m.measurement_type === type);
                    if (!items.length) return null;
                    const total = items.reduce((s, m) => s + m.value, 0);
                    return (
                      <div key={type} className="flex justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{type} ({items.length})</span>
                        <span className="font-mono">{total.toFixed(2)} {items[0].unit}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Construction Drawing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Drawing File *</Label>
              <Input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.svg" />
              <p className="text-xs text-muted-foreground">Supported: PDF, PNG, JPG, SVG</p>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="Floor Plan - Level 1" />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={uploadForm.project_id || '__none__'} onValueChange={v => setUploadForm(f => ({ ...f, project_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Project</SelectItem>
                  {projectList.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} - {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUpload(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Label Dialog */}
      <Dialog open={labelDialog} onOpenChange={v => { if (!v) { setLabelDialog(false); setPendingMeasurement(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save Measurement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium capitalize">{pendingMeasurement?.type}</p>
              <p className="text-lg font-mono font-bold">
                {pendingMeasurement?.value.toFixed(2)} {pendingMeasurement?.type === 'area' ? `${UNIT_LABELS[unit]}²` : UNIT_LABELS[unit]}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input value={pendingLabel} onChange={e => setPendingLabel(e.target.value)} placeholder="e.g. Wall A, Room 101" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setLabelDialog(false); setPendingMeasurement(null); }}>Discard</Button>
              <Button onClick={saveMeasurement}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calibration Dialog */}
      <Dialog open={showCalDialog} onOpenChange={v => { if (!v) { setShowCalDialog(false); setCalPoints([]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Set Scale Reference</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">You drew a line of <strong>{calPoints.length === 2 ? distPx(calPoints[0], calPoints[1]).toFixed(1) : 0} px</strong>. What is the real-world distance?</p>
            <div className="flex gap-2">
              <Input type="number" value={calRealDist} onChange={e => setCalRealDist(e.target.value)} placeholder="Enter distance" autoFocus />
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="inches">Inches</SelectItem>
                  <SelectItem value="cm">CM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCalDialog(false); setCalPoints([]); }}>{t('common.cancel')}</Button>
              <Button onClick={saveCalibration} disabled={!calRealDist}>Apply Scale</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
