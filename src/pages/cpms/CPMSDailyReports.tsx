import React, { useState, useEffect, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useCPMS } from '@/hooks/useCPMS';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList, Plus, Users, Wrench, Sun, Cloud, CloudRain, Wind, AlertTriangle,
  Download, Eye, Calendar, Thermometer, Droplets, MapPin, Camera, Package,
  ClipboardCheck, Clock, FileText, CheckCircle, XCircle, Smartphone, Search, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import { format, parseISO, subDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WEATHER_OPTIONS = [
  { value: 'sunny', label: '☀️ Sunny', icon: Sun },
  { value: 'partly_cloudy', label: '⛅ Partly Cloudy', icon: Cloud },
  { value: 'cloudy', label: '☁️ Cloudy', icon: Cloud },
  { value: 'rainy', label: '🌧️ Rainy', icon: CloudRain },
  { value: 'heavy_rain', label: '⛈️ Heavy Rain', icon: CloudRain },
  { value: 'windy', label: '💨 Windy', icon: Wind },
  { value: 'sandstorm', label: '🌪️ Sandstorm', icon: Wind },
  { value: 'foggy', label: '🌫️ Foggy', icon: Cloud },
  { value: 'hot', label: '🔥 Extreme Heat', icon: Thermometer },
];

const SHIFT_OPTIONS = ['day', 'night', 'split'];

const emptyForm: Record<string, any> = {
  project_id: '', report_date: format(new Date(), 'yyyy-MM-dd'), weather: 'sunny',
  temperature_high: '', temperature_low: '', humidity: '', wind_speed: '', rain_mm: 0,
  shift: 'day', manpower_count: 0, equipment_count: 0, incidents_count: 0,
  work_summary: '', delays_notes: '', safety_observations: '', visitor_log: '',
  subcontractor_summary: '', material_receipts: '', inspections_conducted: '',
  next_day_plan: '', status: 'draft',
};

export default function CPMSDailyReports() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { projects, fetchTable, insertRow, updateRow } = useCPMS();
  const { user } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewReport, setViewReport] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState<Record<string, any>>({ ...emptyForm });

  const loadReports = async () => {
    setLoading(true);
    try {
      const filters = selectedProject !== 'all' ? { project_id: selectedProject } : {};
      const data = await fetchTable('cpms_daily_reports', filters, 'report_date');
      setReports(data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadReports(); }, [selectedProject]);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || '-';

  const filtered = useMemo(() => {
    if (!searchTerm) return reports;
    const s = searchTerm.toLowerCase();
    return reports.filter(r =>
      r.work_summary?.toLowerCase().includes(s) ||
      r.report_number?.toLowerCase().includes(s) ||
      r.site_engineer_name?.toLowerCase().includes(s) ||
      getProjectName(r.project_id).toLowerCase().includes(s)
    );
  }, [reports, searchTerm, projects]);

  // KPI stats
  const stats = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    const weekReports = reports.filter(r => {
      try {
        return isWithinInterval(parseISO(r.report_date), { start: thisWeekStart, end: thisWeekEnd });
      } catch { return false; }
    });
    const totalManpower = reports.reduce((s, r) => s + (r.manpower_count || 0), 0);
    const totalEquipment = reports.reduce((s, r) => s + (r.equipment_count || 0), 0);
    const totalIncidents = reports.reduce((s, r) => s + (r.incidents_count || 0), 0);
    const pendingApproval = reports.filter(r => r.status === 'submitted').length;
    const avgManpower = reports.length > 0 ? Math.round(totalManpower / reports.length) : 0;
    return { total: reports.length, weekReports: weekReports.length, totalManpower, totalEquipment, totalIncidents, pendingApproval, avgManpower };
  }, [reports]);

  // Trend chart data (last 14 days)
  const trendData = useMemo(() => {
    const days: { date: string; manpower: number; equipment: number; incidents: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayReports = reports.filter(r => r.report_date === d);
      days.push({
        date: format(subDays(new Date(), i), 'dd/MM'),
        manpower: dayReports.reduce((s, r) => s + (r.manpower_count || 0), 0),
        equipment: dayReports.reduce((s, r) => s + (r.equipment_count || 0), 0),
        incidents: dayReports.reduce((s, r) => s + (r.incidents_count || 0), 0),
      });
    }
    return days;
  }, [reports]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, project_id: selectedProject !== 'all' ? selectedProject : '' });
    setShowForm(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ ...r });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.project_id || !form.report_date) return;
    try {
      if (editing) {
        const updates = { ...form };
        delete updates.id; delete updates.created_at; delete updates.updated_at; delete updates.report_number;
        await updateRow('cpms_daily_reports', editing.id, updates);
      } else {
        await insertRow('cpms_daily_reports', {
          ...form, site_engineer_id: user?.id,
          site_engineer_name: user?.email?.split('@')[0] || 'User',
          created_by: user?.id,
        });
      }
      setShowForm(false);
      loadReports();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const approveReport = async (id: string) => {
    await updateRow('cpms_daily_reports', id, { status: 'approved', approved_by: user?.id, approved_date: format(new Date(), 'yyyy-MM-dd') });
    loadReports();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'Report #': r.report_number, Date: r.report_date, Project: getProjectName(r.project_id),
      Weather: r.weather, 'Temp High': r.temperature_high, 'Temp Low': r.temperature_low,
      Humidity: r.humidity, 'Wind km/h': r.wind_speed, 'Rain mm': r.rain_mm, Shift: r.shift,
      Manpower: r.manpower_count, Equipment: r.equipment_count, Incidents: r.incidents_count,
      'Work Summary': r.work_summary, Delays: r.delays_notes, Safety: r.safety_observations,
      Visitors: r.visitor_log, Subcontractors: r.subcontractor_summary,
      'Material Receipts': r.material_receipts, Inspections: r.inspections_conducted,
      'Next Day Plan': r.next_day_plan, Status: r.status, Engineer: r.site_engineer_name,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Site Diary');
    XLSX.writeFile(wb, 'site_diary.xlsx');
  };

  const exportPDF = (r: any) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Daily Site Diary', 14, 20);
    doc.setFontSize(10);
    doc.text(`Report: ${r.report_number || '-'} | Date: ${r.report_date} | Project: ${getProjectName(r.project_id)}`, 14, 30);
    doc.text(`Engineer: ${r.site_engineer_name || '-'} | Status: ${r.status}`, 14, 36);

    const sections = [
      ['Weather', `${r.weather || '-'} | High: ${r.temperature_high || '-'}°C | Low: ${r.temperature_low || '-'}°C | Humidity: ${r.humidity || '-'}% | Wind: ${r.wind_speed || '-'} km/h | Rain: ${r.rain_mm || 0}mm`],
      ['Shift', r.shift || 'day'],
      ['Manpower', `${r.manpower_count || 0} workers`],
      ['Equipment', `${r.equipment_count || 0} units`],
      ['Incidents', `${r.incidents_count || 0}`],
      ['Work Completed', r.work_summary || '-'],
      ['Delays', r.delays_notes || '-'],
      ['Safety Observations', r.safety_observations || '-'],
      ['Visitors', r.visitor_log || '-'],
      ['Subcontractor Presence', r.subcontractor_summary || '-'],
      ['Material Receipts', r.material_receipts || '-'],
      ['Inspections', r.inspections_conducted || '-'],
      ['Next Day Plan', r.next_day_plan || '-'],
    ];

    autoTable(doc, {
      startY: 42,
      head: [['Section', 'Details']],
      body: sections,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 140 } },
    });

    doc.save(`site_diary_${r.report_number || r.report_date}.pdf`);
  };

  const getWeatherEmoji = (w: string) => WEATHER_OPTIONS.find(o => o.value === w)?.label?.split(' ')[0] || '☀️';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            {t('nav.cpmsDailyReports') || 'Digital Site Diary'}
          </h1>
          <p className="text-muted-foreground text-sm">Record daily site activities, weather, manpower, and progress</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />New Entry</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { icon: ClipboardList, label: 'Total Entries', value: stats.total, color: 'text-primary' },
          { icon: Calendar, label: 'This Week', value: stats.weekReports, color: 'text-blue-500' },
          { icon: Users, label: 'Avg Manpower', value: stats.avgManpower, color: 'text-green-500' },
          { icon: Users, label: 'Total Manpower', value: stats.totalManpower, color: 'text-blue-600' },
          { icon: Wrench, label: 'Total Equipment', value: stats.totalEquipment, color: 'text-orange-500' },
          { icon: AlertTriangle, label: 'Incidents', value: stats.totalIncidents, color: 'text-destructive' },
          { icon: Clock, label: 'Pending Review', value: stats.pendingApproval, color: 'text-amber-500' },
        ].map((kpi, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <kpi.icon className={`h-4 w-4 mx-auto ${kpi.color} mb-1`} />
            <div className="text-lg font-bold text-foreground">{kpi.value}</div>
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search entries..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Diary Entries ({filtered.length})</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[550px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Weather</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead className="text-right">Manpower</TableHead>
                      <TableHead className="text-right">Equipment</TableHead>
                      <TableHead className="text-right">Incidents</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Engineer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">No diary entries found</TableCell></TableRow>
                    ) : filtered.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-mono text-xs">{r.report_number || '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{format(parseISO(r.report_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-xs">{getProjectName(r.project_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs gap-1">{getWeatherEmoji(r.weather)} {r.weather}</Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{r.shift || 'day'}</TableCell>
                        <TableCell className="text-right font-medium">{r.manpower_count || 0}</TableCell>
                        <TableCell className="text-right">{r.equipment_count || 0}</TableCell>
                        <TableCell className="text-right">
                          {(r.incidents_count || 0) > 0
                            ? <Badge variant="destructive">{r.incidents_count}</Badge>
                            : <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'approved' ? 'default' : r.status === 'submitted' ? 'secondary' : 'outline'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.site_engineer_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewReport(r)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><FileText className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => exportPDF(r)}><Download className="h-4 w-4" /></Button>
                            {r.status === 'submitted' && (
                              <Button variant="ghost" size="sm" onClick={() => approveReport(r.id)}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Manpower & Equipment (14-Day Trend)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="manpower" fill="#10b981" name="Manpower" />
                    <Bar dataKey="equipment" fill="#f59e0b" name="Equipment" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Incidents (14-Day Trend)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="incidents" stroke="hsl(var(--destructive))" strokeWidth={2} name="Incidents" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Report Dialog */}
      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Site Diary - {viewReport.report_number || viewReport.report_date}</span>
                  <Badge variant={viewReport.status === 'approved' ? 'default' : 'secondary'}>{viewReport.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="font-medium text-foreground">{format(parseISO(viewReport.report_date), 'dd MMM yyyy')}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Project</div>
                    <div className="font-medium text-foreground text-sm">{getProjectName(viewReport.project_id)}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Weather</div>
                    <div className="font-medium text-foreground">{getWeatherEmoji(viewReport.weather)} {viewReport.weather}</div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">Shift</div>
                    <div className="font-medium text-foreground capitalize">{viewReport.shift || 'day'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <Thermometer className="h-4 w-4 mx-auto text-orange-500 mb-1" />
                    <div className="text-sm font-bold text-foreground">{viewReport.temperature_high || '-'}° / {viewReport.temperature_low || '-'}°</div>
                    <div className="text-xs text-muted-foreground">High / Low</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <Droplets className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                    <div className="text-sm font-bold text-foreground">{viewReport.humidity || '-'}%</div>
                    <div className="text-xs text-muted-foreground">Humidity</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <Users className="h-4 w-4 mx-auto text-green-500 mb-1" />
                    <div className="text-sm font-bold text-foreground">{viewReport.manpower_count || 0}</div>
                    <div className="text-xs text-muted-foreground">Manpower</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <Wrench className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                    <div className="text-sm font-bold text-foreground">{viewReport.equipment_count || 0}</div>
                    <div className="text-xs text-muted-foreground">Equipment</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${(viewReport.incidents_count || 0) > 0 ? 'text-destructive' : 'text-green-500'}`} />
                    <div className="text-sm font-bold text-foreground">{viewReport.incidents_count || 0}</div>
                    <div className="text-xs text-muted-foreground">Incidents</div>
                  </div>
                </div>

                {[
                  { label: 'Work Completed', value: viewReport.work_summary },
                  { label: 'Delays & Issues', value: viewReport.delays_notes },
                  { label: 'Safety Observations', value: viewReport.safety_observations },
                  { label: 'Visitors', value: viewReport.visitor_log },
                  { label: 'Subcontractor Presence', value: viewReport.subcontractor_summary },
                  { label: 'Material Receipts', value: viewReport.material_receipts },
                  { label: 'Inspections Conducted', value: viewReport.inspections_conducted },
                  { label: 'Next Day Plan', value: viewReport.next_day_plan },
                ].filter(s => s.value).map((s, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{s.label}</div>
                    <div className="text-sm text-foreground whitespace-pre-wrap">{s.value}</div>
                  </div>
                ))}

                <div className="text-xs text-muted-foreground">Engineer: {viewReport.site_engineer_name || '-'}</div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => exportPDF(viewReport)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
                <Button variant="outline" onClick={() => { setViewReport(null); openEdit(viewReport); }}>Edit</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Site Diary Entry' : 'New Site Diary Entry'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="weather">Weather</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="work">Work & Progress</TabsTrigger>
              <TabsTrigger value="safety">Safety & Visitors</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Project *</Label>
                  <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Report Date *</Label>
                  <Input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Shift</Label>
                  <Select value={form.shift || 'day'} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHIFT_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="weather">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Weather Condition</Label>
                  <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WEATHER_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Temp High °C</Label><Input type="number" value={form.temperature_high || ''} onChange={e => setForm(f => ({ ...f, temperature_high: e.target.value }))} /></div>
                  <div><Label>Temp Low °C</Label><Input type="number" value={form.temperature_low || ''} onChange={e => setForm(f => ({ ...f, temperature_low: e.target.value }))} /></div>
                </div>
                <div><Label>Humidity %</Label><Input type="number" value={form.humidity || ''} onChange={e => setForm(f => ({ ...f, humidity: +e.target.value }))} /></div>
                <div><Label>Wind Speed (km/h)</Label><Input type="number" value={form.wind_speed || ''} onChange={e => setForm(f => ({ ...f, wind_speed: +e.target.value }))} /></div>
                <div><Label>Rainfall (mm)</Label><Input type="number" value={form.rain_mm || 0} onChange={e => setForm(f => ({ ...f, rain_mm: +e.target.value }))} /></div>
              </div>
            </TabsContent>

            <TabsContent value="resources">
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Manpower Count</Label><Input type="number" value={form.manpower_count} onChange={e => setForm(f => ({ ...f, manpower_count: +e.target.value }))} /></div>
                <div><Label>Equipment Count</Label><Input type="number" value={form.equipment_count} onChange={e => setForm(f => ({ ...f, equipment_count: +e.target.value }))} /></div>
                <div><Label>Incidents</Label><Input type="number" value={form.incidents_count} onChange={e => setForm(f => ({ ...f, incidents_count: +e.target.value }))} /></div>
              </div>
              <div className="mt-4">
                <Label>Subcontractor Presence</Label>
                <Textarea value={form.subcontractor_summary || ''} onChange={e => setForm(f => ({ ...f, subcontractor_summary: e.target.value }))} rows={3} placeholder="List subcontractors on site, headcount, and areas of work..." />
              </div>
            </TabsContent>

            <TabsContent value="work">
              <div className="space-y-4">
                <div>
                  <Label>Work Completed Today</Label>
                  <Textarea value={form.work_summary || ''} onChange={e => setForm(f => ({ ...f, work_summary: e.target.value }))} rows={4} placeholder="Describe work activities completed..." />
                </div>
                <div>
                  <Label>Delays & Issues</Label>
                  <Textarea value={form.delays_notes || ''} onChange={e => setForm(f => ({ ...f, delays_notes: e.target.value }))} rows={2} placeholder="Any delays, stoppages, or issues..." />
                </div>
                <div>
                  <Label>Material Receipts</Label>
                  <Textarea value={form.material_receipts || ''} onChange={e => setForm(f => ({ ...f, material_receipts: e.target.value }))} rows={2} placeholder="Materials received on site today..." />
                </div>
                <div>
                  <Label>Inspections Conducted</Label>
                  <Textarea value={form.inspections_conducted || ''} onChange={e => setForm(f => ({ ...f, inspections_conducted: e.target.value }))} rows={2} placeholder="Quality / safety inspections conducted..." />
                </div>
                <div>
                  <Label>Next Day Plan</Label>
                  <Textarea value={form.next_day_plan || ''} onChange={e => setForm(f => ({ ...f, next_day_plan: e.target.value }))} rows={2} placeholder="Planned activities for tomorrow..." />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="safety">
              <div className="space-y-4">
                <div>
                  <Label>Safety Observations</Label>
                  <Textarea value={form.safety_observations || ''} onChange={e => setForm(f => ({ ...f, safety_observations: e.target.value }))} rows={3} placeholder="HSE observations, near misses, toolbox talks..." />
                </div>
                <div>
                  <Label>Visitor Log</Label>
                  <Textarea value={form.visitor_log || ''} onChange={e => setForm(f => ({ ...f, visitor_log: e.target.value }))} rows={3} placeholder="Name, company, purpose, time in/out..." />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.project_id || !form.report_date}>
              {editing ? 'Update Entry' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
