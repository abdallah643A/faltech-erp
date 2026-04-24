import { useState, useRef } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { useCPMSSiteProgress, SitePhoto, SiteReport } from '@/hooks/useCPMSSiteProgress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Camera, Upload, MapPin, Clock, FileText, BarChart3, Image,
  Plus, RefreshCw, Trash2, Eye, Calendar, CloudSun, Users, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSSiteProgress() {
  const { t } = useLanguage();
  const { projects } = useCPMS();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const {
    photos, snapshots, siteReports, loading, fetchAll,
    uploadPhoto, deletePhoto, saveSnapshot, getProgressByArea,
    createSiteReport, updateSiteReport,
  } = useCPMSSiteProgress(selectedProjectId || undefined);

  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SitePhoto | null>(null);
  const [photoMeta, setPhotoMeta] = useState({ area: '', phase: '', description: '', tags: '' });
  const [reportForm, setReportForm] = useState<Partial<SiteReport>>({
    report_date: new Date().toISOString().split('T')[0],
    weather: '', manpower_count: 0, work_performed: '', status: 'draft',
  });
  const [progressForm, setProgressForm] = useState({ area: '', phase: '', progress_pct: 0, planned_pct: 0, notes: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedProjectId) return;

    // Try to get GPS location
    let lat: number | undefined, lng: number | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS unavailable */ }
    }

    for (const file of Array.from(files)) {
      await uploadPhoto(file, {
        area: photoMeta.area || undefined,
        phase: photoMeta.phase || undefined,
        description: photoMeta.description || undefined,
        latitude: lat, longitude: lng,
        tags: photoMeta.tags ? photoMeta.tags.split(',').map(t => t.trim()) : [],
      });
    }
    setShowPhotoUpload(false);
    setPhotoMeta({ area: '', phase: '', description: '', tags: '' });
  };

  const handleSaveReport = async () => {
    if (!selectedProjectId) return;
    await createSiteReport(reportForm);
    setShowReportForm(false);
    setReportForm({ report_date: new Date().toISOString().split('T')[0], weather: '', manpower_count: 0, work_performed: '', status: 'draft' });
  };

  const handleSaveProgress = async () => {
    if (!selectedProjectId) return;
    await saveSnapshot({
      area: progressForm.area,
      phase: progressForm.phase,
      progress_pct: progressForm.progress_pct,
      planned_pct: progressForm.planned_pct,
      notes: progressForm.notes,
      snapshot_date: new Date().toISOString().split('T')[0],
    });
    setShowProgressForm(false);
  };

  const progressByArea = getProgressByArea();
  const overallProgress = progressByArea.length > 0
    ? Math.round(progressByArea.reduce((s, p) => s + p.progress_pct, 0) / progressByArea.length)
    : 0;

  const progressChartData = snapshots
    .reduce((acc: any[], s) => {
      const existing = acc.find(a => a.date === s.snapshot_date);
      if (existing) { existing[s.area || 'Overall'] = s.progress_pct; }
      else { acc.push({ date: s.snapshot_date, [s.area || 'Overall']: s.progress_pct }); }
      return acc;
    }, [])
    .sort((a, b) => a.date.localeCompare(b.date));

  const areas = [...new Set(snapshots.map(s => s.area).filter(Boolean))];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            Site Progress Tracking
          </h1>
          <p className="text-sm text-muted-foreground">تتبع تقدم الموقع – Photos, Reports & Progress</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAll} disabled={!selectedProjectId}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {!selectedProjectId ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Select a project to view site progress</CardContent></Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold mt-1">{overallProgress}%</p>
                <Progress value={overallProgress} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Site Photos</p>
                <p className="text-2xl font-bold mt-1">{photos.length}</p>
                <p className="text-xs text-muted-foreground">{areas.length} areas documented</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Site Reports</p>
                <p className="text-2xl font-bold mt-1">{siteReports.length}</p>
                <p className="text-xs text-muted-foreground">{siteReports.filter(r => r.status === 'submitted').length} submitted</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Delays</p>
                <p className="text-2xl font-bold mt-1">{siteReports.reduce((s, r) => s + (r.delay_hours || 0), 0)}h</p>
                <p className="text-xs text-muted-foreground">{siteReports.filter(r => (r.delay_hours || 0) > 0).length} reports with delays</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="photos">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="photos"><Image className="h-4 w-4 mr-1" />Photos</TabsTrigger>
              <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1" />Progress</TabsTrigger>
              <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1" />Daily Reports</TabsTrigger>
              <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
            </TabsList>

            {/* Photos Tab */}
            <TabsContent value="photos" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{photos.length} photos captured</p>
                <Button onClick={() => setShowPhotoUpload(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Upload Photos
                </Button>
              </div>

              {photos.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No photos yet. Upload site photos to document progress.</CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {photos.map(photo => (
                    <Card key={photo.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setSelectedPhoto(photo)}>
                      <div className="aspect-square relative">
                        <img src={photo.photo_url} alt={photo.description || 'Site photo'} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {photo.latitude && (
                          <div className="absolute bottom-1 left-1">
                            <Badge variant="secondary" className="text-[10px]"><MapPin className="h-3 w-3 mr-0.5" />GPS</Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs font-medium truncate">{photo.description || photo.area || 'Site photo'}</p>
                        <p className="text-[10px] text-muted-foreground">{photo.captured_at ? format(new Date(photo.captured_at), 'dd MMM yyyy HH:mm') : ''}</p>
                        {photo.area && <Badge variant="outline" className="text-[10px] mt-1">{photo.area}</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Progress by area/phase</p>
                <Button onClick={() => setShowProgressForm(true)}><Plus className="h-4 w-4 mr-1" />Record Progress</Button>
              </div>

              {progressChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Progress Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={progressChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={10} tickFormatter={d => d?.slice(5)} />
                        <YAxis fontSize={10} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {areas.map((area, i) => (
                          <Area key={area} type="monotone" dataKey={area!} stroke={`hsl(${i * 60}, 70%, 50%)`} fill={`hsl(${i * 60}, 70%, 50%)`} fillOpacity={0.15} strokeWidth={2} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {progressByArea.map(p => (
                  <Card key={`${p.area}-${p.phase}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{p.area || 'General'}</p>
                          <p className="text-xs text-muted-foreground">{p.phase || 'Overall'}</p>
                        </div>
                        <Badge variant={p.progress_pct >= p.planned_pct ? 'default' : 'destructive'}>
                          {p.progress_pct >= p.planned_pct ? 'On Track' : 'Behind'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span>Actual</span><span className="font-semibold">{p.progress_pct}%</span></div>
                        <Progress value={p.progress_pct} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground"><span>Planned</span><span>{p.planned_pct}%</span></div>
                        <Progress value={p.planned_pct} className="h-1.5 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Daily Reports Tab */}
            <TabsContent value="reports" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{siteReports.length} reports</p>
                <Button onClick={() => setShowReportForm(true)}><Plus className="h-4 w-4 mr-1" />New Report</Button>
              </div>

              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Weather</TableHead>
                      <TableHead>Manpower</TableHead>
                      <TableHead>Delays</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>Work</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteReports.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.report_date}</TableCell>
                        <TableCell><CloudSun className="h-3 w-3 inline mr-1" />{r.weather || '—'}{r.temperature_c ? ` ${r.temperature_c}°C` : ''}</TableCell>
                        <TableCell><Users className="h-3 w-3 inline mr-1" />{r.manpower_count}</TableCell>
                        <TableCell>{(r.delay_hours || 0) > 0 ? <Badge variant="destructive">{r.delay_hours}h</Badge> : <span className="text-muted-foreground">None</span>}</TableCell>
                        <TableCell><Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{r.work_performed || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Project Timeline</CardTitle><CardDescription>Visual evolution of site progress</CardDescription></CardHeader>
                <CardContent>
                  {siteReports.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={siteReports.slice().reverse().map(r => ({
                        date: r.report_date,
                        manpower: r.manpower_count || 0,
                        delays: r.delay_hours || 0,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={10} tickFormatter={d => d?.slice(5)} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="manpower" fill="hsl(var(--primary))" name="Manpower" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="delays" fill="hsl(0, 84%, 60%)" name="Delay Hours" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-12 text-muted-foreground">No reports to display timeline</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Upload Site Photos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Area</Label><Input value={photoMeta.area} onChange={e => setPhotoMeta({ ...photoMeta, area: e.target.value })} placeholder="e.g. Block A, Zone 3" /></div>
            <div><Label>Phase</Label><Input value={photoMeta.phase} onChange={e => setPhotoMeta({ ...photoMeta, phase: e.target.value })} placeholder="e.g. Foundation, MEP" /></div>
            <div><Label>{t('common.description')}</Label><Textarea value={photoMeta.description} onChange={e => setPhotoMeta({ ...photoMeta, description: e.target.value })} placeholder="What does this show?" /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={photoMeta.tags} onChange={e => setPhotoMeta({ ...photoMeta, tags: e.target.value })} placeholder="concrete, rebar, inspection" /></div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
            <Button className="w-full" onClick={() => fileInputRef.current?.click()}><Camera className="h-4 w-4 mr-1" />Select Photos</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{selectedPhoto?.description || 'Site Photo'}</DialogTitle></DialogHeader>
          {selectedPhoto && (
            <div className="space-y-3">
              <img src={selectedPhoto.photo_url} alt="" className="w-full rounded-lg" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                {selectedPhoto.area && <span><MapPin className="h-3 w-3 inline mr-1" />{selectedPhoto.area}</span>}
                {selectedPhoto.captured_at && <span><Clock className="h-3 w-3 inline mr-1" />{format(new Date(selectedPhoto.captured_at), 'dd MMM yyyy HH:mm')}</span>}
                {selectedPhoto.latitude && <span>📍 {selectedPhoto.latitude.toFixed(4)}, {selectedPhoto.longitude?.toFixed(4)}</span>}
              </div>
              {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">{selectedPhoto.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div>
              )}
              <Button variant="destructive" size="sm" onClick={async () => { await deletePhoto(selectedPhoto.id!); setSelectedPhoto(null); }}>
                <Trash2 className="h-3 w-3 mr-1" />Delete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Form Dialog */}
      <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Daily Site Report</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-3 pr-4">
              <div><Label>{t('common.date')}</Label><Input type="date" value={reportForm.report_date} onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Weather</Label><Input value={reportForm.weather || ''} onChange={e => setReportForm({ ...reportForm, weather: e.target.value })} placeholder="Sunny, Rainy..." /></div>
                <div><Label>Temperature (°C)</Label><Input type="number" value={reportForm.temperature_c || ''} onChange={e => setReportForm({ ...reportForm, temperature_c: +e.target.value })} /></div>
              </div>
              <div><Label>Manpower Count</Label><Input type="number" value={reportForm.manpower_count || 0} onChange={e => setReportForm({ ...reportForm, manpower_count: +e.target.value })} /></div>
              <div><Label>Work Performed</Label><Textarea value={reportForm.work_performed || ''} onChange={e => setReportForm({ ...reportForm, work_performed: e.target.value })} rows={3} /></div>
              <div><Label>Issues Encountered</Label><Textarea value={reportForm.issues_encountered || ''} onChange={e => setReportForm({ ...reportForm, issues_encountered: e.target.value })} rows={2} /></div>
              <div><Label>Safety Observations</Label><Textarea value={reportForm.safety_observations || ''} onChange={e => setReportForm({ ...reportForm, safety_observations: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Delay Hours</Label><Input type="number" value={reportForm.delay_hours || 0} onChange={e => setReportForm({ ...reportForm, delay_hours: +e.target.value })} /></div>
                <div><Label>Delay Reason</Label><Input value={reportForm.delay_reason || ''} onChange={e => setReportForm({ ...reportForm, delay_reason: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={handleSaveReport}>Save Report</Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Progress Form Dialog */}
      <Dialog open={showProgressForm} onOpenChange={setShowProgressForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Progress</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Area</Label><Input value={progressForm.area} onChange={e => setProgressForm({ ...progressForm, area: e.target.value })} placeholder="e.g. Block A" /></div>
            <div><Label>Phase</Label><Input value={progressForm.phase} onChange={e => setProgressForm({ ...progressForm, phase: e.target.value })} placeholder="e.g. Structure" /></div>
            <div><Label>Actual Progress (%)</Label><Input type="number" min={0} max={100} value={progressForm.progress_pct} onChange={e => setProgressForm({ ...progressForm, progress_pct: +e.target.value })} /></div>
            <div><Label>Planned Progress (%)</Label><Input type="number" min={0} max={100} value={progressForm.planned_pct} onChange={e => setProgressForm({ ...progressForm, planned_pct: +e.target.value })} /></div>
            <div><Label>{t('common.notes')}</Label><Textarea value={progressForm.notes} onChange={e => setProgressForm({ ...progressForm, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={handleSaveProgress}>Save Progress</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
