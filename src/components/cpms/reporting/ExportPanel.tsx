import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText, Code, FileType, Archive } from 'lucide-react';
import { performExport, downloadBlob, formatFileSize, type ExportOptions, type MeasurementExportData } from '@/lib/measurementExport';
import { supabase } from '@/integrations/supabase/client';
import type { CPMSDrawing } from '@/hooks/useCPMSDrawings';

interface Props {
  projects: any[];
  drawings: CPMSDrawing[];
  reporting: ReturnType<typeof import('@/hooks/useCPMSReporting').useCPMSReporting>;
}

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV', icon: FileText, desc: 'Comma-separated values' },
  { value: 'pdf', label: 'PDF', icon: FileType, desc: 'Professional formatted report' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, desc: 'Multi-sheet workbook' },
  { value: 'json', label: 'JSON', icon: Code, desc: 'Structured data for APIs' },
  { value: 'xml', label: 'XML', icon: Code, desc: 'Enterprise integration' },
];

export default function ExportPanel({ projects, drawings, reporting }: Props) {
  const [selectedProject, setSelectedProject] = useState('__all__');
  const [selectedDrawing, setSelectedDrawing] = useState('__all__');
  const [format, setFormat] = useState<ExportOptions['format']>('pdf');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';' | '\t'>(',');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [compress, setCompress] = useState(false);
  const [fileName, setFileName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const filteredDrawings = selectedProject === '__all__'
    ? drawings
    : drawings.filter(d => d.project_id === selectedProject);

  const handleExport = async () => {
    setExporting(true);
    setProgress(10);
    const start = Date.now();

    try {
      // Fetch measurements
      let q = supabase.from('cpms_drawing_measurements').select('*');
      if (selectedDrawing !== '__all__') q = q.eq('drawing_id', selectedDrawing);
      else if (selectedProject !== '__all__') {
        const drawingIds = filteredDrawings.map(d => d.id);
        if (drawingIds.length > 0) q = q.in('drawing_id', drawingIds);
      }
      const { data: measurements, error } = await q.order('sort_order');
      if (error) throw error;
      setProgress(40);

      const project = projects.find(p => p.id === selectedProject);
      const drawing = drawings.find(d => d.id === selectedDrawing);

      const exportData: MeasurementExportData = {
        projectName: project?.name || 'All Projects',
        projectCode: project?.code,
        drawingTitle: drawing?.title,
        scaleInfo: drawing ? `1:${drawing.scale_factor} (${drawing.scale_unit})` : undefined,
        measurements: ((measurements || []) as any[]).map(m => ({
          id: m.id,
          type: m.measurement_type,
          label: m.label,
          value: m.value,
          unit: m.unit,
          color: m.color,
          notes: m.notes,
          created_at: m.created_at,
        })),
        generatedAt: new Date().toISOString(),
        metadata: { filters: { project: selectedProject, drawing: selectedDrawing } },
      };

      setProgress(60);

      const opts: ExportOptions = {
        format,
        includeMetadata,
        pdfOrientation,
        csvDelimiter,
        compress,
        fileName: fileName || `measurements-${Date.now()}`,
      };

      const result = await performExport(exportData, opts);
      setProgress(90);

      downloadBlob(result.blob, result.fileName);

      // Log to audit
      const duration = Date.now() - start;
      await reporting.logAudit.mutateAsync({
        action: 'export',
        export_format: format,
        file_size: result.size,
        duration_ms: duration,
        status: 'success',
        filters_used: { project: selectedProject, drawing: selectedDrawing },
        details: { fileName: result.fileName, compressed: compress, measurementCount: exportData.measurements.length },
      });

      // Save report record
      await reporting.createReport.mutateAsync({
        title: result.fileName,
        report_type: 'measurement_export',
        format,
        file_size: result.size,
        status: 'completed',
        filters: { project: selectedProject, drawing: selectedDrawing },
        metadata: { measurementCount: exportData.measurements.length, duration },
        drawing_id: selectedDrawing !== '__all__' ? selectedDrawing : null,
        project_id: selectedProject !== '__all__' ? selectedProject : null,
      });

      setProgress(100);
      toast({
        title: 'Export complete',
        description: `${format.toUpperCase()} file (${formatFileSize(result.size)}) downloaded in ${(duration / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      await reporting.logAudit.mutateAsync({
        action: 'export',
        export_format: format,
        status: 'failure',
        details: { error: err.message },
      });
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export Format</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value as ExportOptions['format'])}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    format === f.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <f.icon className={`h-6 w-6 mx-auto mb-1 ${format === f.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="font-medium text-sm">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Project</Label>
                <Select value={selectedProject} onValueChange={v => { setSelectedProject(v); setSelectedDrawing('__all__'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Drawing</Label>
                <Select value={selectedDrawing} onValueChange={setSelectedDrawing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Drawings</SelectItem>
                    {filteredDrawings.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>File Name</Label>
              <Input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Auto-generated" />
            </div>

            {format === 'pdf' && (
              <div>
                <Label>PDF Orientation</Label>
                <Select value={pdfOrientation} onValueChange={v => setPdfOrientation(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {format === 'csv' && (
              <div>
                <Label>Delimiter</Label>
                <Select value={csvDelimiter} onValueChange={v => setCsvDelimiter(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value={'\t'}>Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeMetadata} onCheckedChange={v => setIncludeMetadata(!!v)} />
              Include metadata & project info
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={compress} onCheckedChange={v => setCompress(!!v)} />
              <div className="flex items-center gap-1">
                <Archive className="h-3.5 w-3.5" /> Compress (ZIP)
              </div>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {progress > 0 && (
              <div className="mb-3 space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{progress}%</p>
              </div>
            )}
            <Button onClick={handleExport} disabled={exporting} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
