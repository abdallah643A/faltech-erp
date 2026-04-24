import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Plus, Clock, CalendarDays, FileText, CheckCircle, XCircle, Filter, Download, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { differenceInDays, format } from 'date-fns';

const CAUSE_CATEGORIES = [
  { value: 'weather', label: 'Weather' },
  { value: 'site_conditions', label: 'Site Conditions' },
  { value: 'client', label: 'Client / Owner' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'material_shortage', label: 'Material Shortage' },
  { value: 'permit_approval', label: 'Permit / Approval' },
  { value: 'force_majeure', label: 'Force Majeure' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS = ['minor', 'moderate', 'major', 'critical'];
const STATUS_OPTIONS = ['identified', 'under_review', 'claimed', 'approved', 'rejected', 'resolved'];
const EOT_STATUS_OPTIONS = ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'withdrawn'];
const COLORS = ['hsl(var(--primary))', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'];

const emptyEvent = {
  title: '', description: '', cause_category: 'other', cause_detail: '', responsible_party: '',
  impacted_activities: '', start_date: '', end_date: '', actual_delay_days: 0, days_claimed: 0,
  days_approved: 0, status: 'identified', severity: 'moderate', is_excusable: false, is_compensable: false,
  contract_ref: '', correspondence_ref: '', weather_data: '', site_conditions: '', evidence_notes: '',
  mitigation_plan: '', mitigation_cost: 0, project_id: '', change_order_id: '',
};

const emptyEOT = {
  title: '', description: '', delay_event_id: '', original_completion_date: '', requested_completion_date: '',
  total_days_requested: 0, total_days_approved: 0, cost_impact: 0, status: 'draft', contract_clause: '',
  project_id: '',
};

export default function CPMSDelayAnalysis() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();

  const [events, setEvents] = useState<any[]>([]);
  const [eotClaims, setEotClaims] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('events');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showEOTDialog, setShowEOTDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingEOT, setEditingEOT] = useState<any>(null);
  const [eventForm, setEventForm] = useState<any>({ ...emptyEvent });
  const [eotForm, setEotForm] = useState<any>({ ...emptyEOT });
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evRes, eotRes, projRes, coRes] = await Promise.all([
        supabase.from('cpms_delay_events').select('*').order('created_at', { ascending: false }),
        supabase.from('cpms_eot_claims').select('*').order('created_at', { ascending: false }),
        supabase.from('cpms_projects').select('id, name, code').order('name'),
        supabase.from('cpms_change_orders').select('id, co_number, title, project_id').order('co_number'),
      ]);
      setEvents(evRes.data || []);
      setEotClaims(eotRes.data || []);
      setProjects(projRes.data || []);
      setChangeOrders(coRes.data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || '-';

  // Stats
  const stats = useMemo(() => {
    const totalDelayDays = events.reduce((s, e) => s + (e.actual_delay_days || 0), 0);
    const totalClaimed = events.reduce((s, e) => s + (e.days_claimed || 0), 0);
    const totalApproved = events.reduce((s, e) => s + (e.days_approved || 0), 0);
    const openEvents = events.filter(e => !['approved', 'rejected', 'resolved'].includes(e.status)).length;
    const mitigationCost = events.reduce((s, e) => s + (e.mitigation_cost || 0), 0);
    const eotPending = eotClaims.filter(c => !['approved', 'rejected', 'withdrawn'].includes(c.status)).length;
    return { totalDelayDays, totalClaimed, totalApproved, openEvents, mitigationCost, eotPending };
  }, [events, eotClaims]);

  // Charts
  const causeChart = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach(e => { map[e.cause_category] = (map[e.cause_category] || 0) + (e.actual_delay_days || 0); });
    return Object.entries(map).map(([name, value]) => ({ name: CAUSE_CATEGORIES.find(c => c.value === name)?.label || name, value }));
  }, [events]);

  const projectChart = useMemo(() => {
    const map: Record<string, { claimed: number; approved: number }> = {};
    events.forEach(e => {
      const pn = getProjectName(e.project_id);
      if (!map[pn]) map[pn] = { claimed: 0, approved: 0 };
      map[pn].claimed += e.days_claimed || 0;
      map[pn].approved += e.days_approved || 0;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [events, projects]);

  // Filter
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterProject !== 'all' && e.project_id !== filterProject) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      return true;
    });
  }, [events, filterProject, filterStatus]);

  const filteredEOT = useMemo(() => {
    return eotClaims.filter(c => {
      if (filterProject !== 'all' && c.project_id !== filterProject) return false;
      return true;
    });
  }, [eotClaims, filterProject]);

  // CRUD Events
  const openNewEvent = () => { setEditingEvent(null); setEventForm({ ...emptyEvent }); setShowEventDialog(true); };
  const openEditEvent = (e: any) => { setEditingEvent(e); setEventForm({ ...e, project_id: e.project_id || '', change_order_id: e.change_order_id || '' }); setShowEventDialog(true); };

  const saveEvent = async () => {
    try {
      const payload: any = { ...eventForm, created_by: user?.id };
      if (activeCompanyId) payload.company_id = activeCompanyId;
      if (!payload.project_id) delete payload.project_id;
      if (!payload.change_order_id) delete payload.change_order_id;
      // Calc delay days from dates
      if (payload.start_date && payload.end_date) {
        payload.actual_delay_days = Math.max(differenceInDays(new Date(payload.end_date), new Date(payload.start_date)), 0);
      }
      if (editingEvent) {
        delete payload.event_number; delete payload.created_at; delete payload.updated_at;
        const { error } = await supabase.from('cpms_delay_events').update(payload).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        delete payload.event_number;
        const { error } = await supabase.from('cpms_delay_events').insert(payload);
        if (error) throw error;
      }
      toast({ title: editingEvent ? 'Event updated' : 'Event created' });
      setShowEventDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this delay event?')) return;
    await supabase.from('cpms_delay_events').delete().eq('id', id);
    fetchAll();
  };

  // CRUD EOT Claims
  const openNewEOT = () => { setEditingEOT(null); setEotForm({ ...emptyEOT }); setShowEOTDialog(true); };
  const openEditEOT = (c: any) => { setEditingEOT(c); setEotForm({ ...c, project_id: c.project_id || '', delay_event_id: c.delay_event_id || '' }); setShowEOTDialog(true); };

  const saveEOT = async () => {
    try {
      const payload: any = { ...eotForm, created_by: user?.id };
      if (activeCompanyId) payload.company_id = activeCompanyId;
      if (!payload.project_id) delete payload.project_id;
      if (!payload.delay_event_id) delete payload.delay_event_id;
      if (editingEOT) {
        delete payload.claim_number; delete payload.created_at; delete payload.updated_at;
        const { error } = await supabase.from('cpms_eot_claims').update(payload).eq('id', editingEOT.id);
        if (error) throw error;
      } else {
        delete payload.claim_number;
        const { error } = await supabase.from('cpms_eot_claims').insert(payload);
        if (error) throw error;
      }
      toast({ title: editingEOT ? 'EOT claim updated' : 'EOT claim created' });
      setShowEOTDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const deleteEOT = async (id: string) => {
    if (!confirm('Delete this EOT claim?')) return;
    await supabase.from('cpms_eot_claims').delete().eq('id', id);
    fetchAll();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredEvents.map(e => ({
      'Event #': e.event_number, Title: e.title, Project: getProjectName(e.project_id),
      Cause: CAUSE_CATEGORIES.find(c => c.value === e.cause_category)?.label || e.cause_category,
      'Responsible Party': e.responsible_party, Severity: e.severity, Status: e.status,
      'Start Date': e.start_date, 'End Date': e.end_date, 'Delay Days': e.actual_delay_days,
      'Days Claimed': e.days_claimed, 'Days Approved': e.days_approved,
      Excusable: e.is_excusable ? 'Yes' : 'No', Compensable: e.is_compensable ? 'Yes' : 'No',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Delay Events');
    XLSX.writeFile(wb, 'delay_analysis.xlsx');
  };

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'major': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-green-600 text-white';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'resolved': return 'bg-blue-600 text-white';
      case 'claimed': case 'submitted': return 'bg-orange-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.cpmsDelayAnalysis') || 'Delay Analysis & EOT Tracker'}</h1>
          <p className="text-muted-foreground text-sm">Track delay events, extension-of-time claims, and project impact</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" onClick={openNewEvent}><Plus className="h-4 w-4 mr-1" />Delay Event</Button>
          <Button size="sm" variant="secondary" onClick={openNewEOT}><Plus className="h-4 w-4 mr-1" />EOT Claim</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.totalDelayDays}</div>
          <div className="text-xs text-muted-foreground">Total Delay Days</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-orange-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.openEvents}</div>
          <div className="text-xs text-muted-foreground">Open Events</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CalendarDays className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.totalClaimed}</div>
          <div className="text-xs text-muted-foreground">Days Claimed</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-5 w-5 mx-auto text-green-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.totalApproved}</div>
          <div className="text-xs text-muted-foreground">Days Approved</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-purple-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.totalClaimed > 0 ? Math.round(stats.totalApproved / stats.totalClaimed * 100) : 0}%</div>
          <div className="text-xs text-muted-foreground">Approval Rate</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <FileText className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <div className="text-2xl font-bold text-foreground">{stats.eotPending}</div>
          <div className="text-xs text-muted-foreground">Pending EOT Claims</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="events">Delay Events ({filteredEvents.length})</TabsTrigger>
          <TabsTrigger value="eot">EOT Claims ({filteredEOT.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Delay Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Cause</TableHead>
                      <TableHead>Responsible</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Delay</TableHead>
                      <TableHead className="text-right">Claimed</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No delay events found</TableCell></TableRow>
                    ) : filteredEvents.map(e => (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditEvent(e)}>
                        <TableCell className="font-mono text-xs">{e.event_number}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                        <TableCell className="text-xs">{getProjectName(e.project_id)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{CAUSE_CATEGORIES.find(c => c.value === e.cause_category)?.label || e.cause_category}</Badge></TableCell>
                        <TableCell className="text-xs">{e.responsible_party || '-'}</TableCell>
                        <TableCell><Badge className={getSeverityColor(e.severity)}>{e.severity}</Badge></TableCell>
                        <TableCell className="text-xs">{e.start_date ? format(new Date(e.start_date), 'dd/MM/yy') : '-'} → {e.end_date ? format(new Date(e.end_date), 'dd/MM/yy') : '-'}</TableCell>
                        <TableCell className="text-right font-medium">{e.actual_delay_days || 0}d</TableCell>
                        <TableCell className="text-right">{e.days_claimed || 0}d</TableCell>
                        <TableCell className="text-right font-medium text-green-600">{e.days_approved || 0}d</TableCell>
                        <TableCell><Badge className={getStatusColor(e.status)}>{e.status.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EOT Claims Tab */}
        <TabsContent value="eot">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Linked Event</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead className="text-right">Days Req.</TableHead>
                      <TableHead className="text-right">Days Appr.</TableHead>
                      <TableHead className="text-right">Cost Impact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEOT.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No EOT claims found</TableCell></TableRow>
                    ) : filteredEOT.map(c => {
                      const linkedEvent = events.find(e => e.id === c.delay_event_id);
                      return (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditEOT(c)}>
                          <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                          <TableCell className="text-xs">{getProjectName(c.project_id)}</TableCell>
                          <TableCell className="text-xs font-mono">{linkedEvent?.event_number || '-'}</TableCell>
                          <TableCell className="text-xs">{c.original_completion_date ? format(new Date(c.original_completion_date), 'dd/MM/yy') : '-'}</TableCell>
                          <TableCell className="text-xs">{c.requested_completion_date ? format(new Date(c.requested_completion_date), 'dd/MM/yy') : '-'}</TableCell>
                          <TableCell className="text-right">{c.total_days_requested || 0}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{c.total_days_approved || 0}</TableCell>
                          <TableCell className="text-right">{(c.cost_impact || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge className={getStatusColor(c.status)}>{c.status.replace('_', ' ')}</Badge></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); deleteEOT(c.id); }}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Delay Days by Cause</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={causeChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}d`}>
                      {causeChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Claimed vs Approved by Project</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={projectChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="claimed" fill="#f59e0b" name="Days Claimed" />
                    <Bar dataKey="approved" fill="#10b981" name="Days Approved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            {/* Severity breakdown */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Events by Severity & Status</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SEVERITY_OPTIONS.map(sev => {
                    const sevEvents = events.filter(e => e.severity === sev);
                    const totalDays = sevEvents.reduce((s, e) => s + (e.actual_delay_days || 0), 0);
                    return (
                      <div key={sev} className="border rounded-lg p-4">
                        <Badge className={getSeverityColor(sev)}>{sev}</Badge>
                        <div className="mt-2 text-2xl font-bold text-foreground">{sevEvents.length}</div>
                        <div className="text-xs text-muted-foreground">{totalDays} delay days</div>
                        <Progress value={events.length > 0 ? (sevEvents.length / events.length) * 100 : 0} className="mt-2 h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delay Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? `Edit ${editingEvent.event_number}` : 'New Delay Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Title *</Label>
              <Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Project</Label>
              <Select value={eventForm.project_id} onValueChange={v => setEventForm({ ...eventForm, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cause Category *</Label>
              <Select value={eventForm.cause_category} onValueChange={v => setEventForm({ ...eventForm, cause_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CAUSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsible Party</Label>
              <Input value={eventForm.responsible_party} onChange={e => setEventForm({ ...eventForm, responsible_party: e.target.value })} />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={eventForm.severity} onValueChange={v => setEventForm({ ...eventForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={eventForm.start_date || ''} onChange={e => setEventForm({ ...eventForm, start_date: e.target.value })} />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={eventForm.end_date || ''} onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })} />
            </div>
            <div>
              <Label>Days Claimed</Label>
              <Input type="number" value={eventForm.days_claimed} onChange={e => setEventForm({ ...eventForm, days_claimed: +e.target.value })} />
            </div>
            <div>
              <Label>Days Approved</Label>
              <Input type="number" value={eventForm.days_approved} onChange={e => setEventForm({ ...eventForm, days_approved: +e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={eventForm.status} onValueChange={v => setEventForm({ ...eventForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Change Order</Label>
              <Select value={eventForm.change_order_id || 'none'} onValueChange={v => setEventForm({ ...eventForm, change_order_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {changeOrders.map(co => <SelectItem key={co.id} value={co.id}>{co.co_number} - {co.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Impacted Activities</Label>
              <Textarea value={eventForm.impacted_activities || ''} onChange={e => setEventForm({ ...eventForm, impacted_activities: e.target.value })} rows={2} placeholder="List impacted schedule activities..." />
            </div>
            <div className="md:col-span-2">
              <Label>Description / Cause Detail</Label>
              <Textarea value={eventForm.description || ''} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Contract Reference</Label>
              <Input value={eventForm.contract_ref || ''} onChange={e => setEventForm({ ...eventForm, contract_ref: e.target.value })} />
            </div>
            <div>
              <Label>Correspondence Reference</Label>
              <Input value={eventForm.correspondence_ref || ''} onChange={e => setEventForm({ ...eventForm, correspondence_ref: e.target.value })} />
            </div>
            <div>
              <Label>Weather Data</Label>
              <Input value={eventForm.weather_data || ''} onChange={e => setEventForm({ ...eventForm, weather_data: e.target.value })} placeholder="e.g. Heavy rainfall 50mm" />
            </div>
            <div>
              <Label>Site Conditions</Label>
              <Input value={eventForm.site_conditions || ''} onChange={e => setEventForm({ ...eventForm, site_conditions: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Mitigation Plan</Label>
              <Textarea value={eventForm.mitigation_plan || ''} onChange={e => setEventForm({ ...eventForm, mitigation_plan: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Mitigation Cost</Label>
              <Input type="number" value={eventForm.mitigation_cost} onChange={e => setEventForm({ ...eventForm, mitigation_cost: +e.target.value })} />
            </div>
            <div>
              <Label>Evidence / Notes</Label>
              <Input value={eventForm.evidence_notes || ''} onChange={e => setEventForm({ ...eventForm, evidence_notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={eventForm.is_excusable} onCheckedChange={v => setEventForm({ ...eventForm, is_excusable: v })} />
                <Label>Excusable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={eventForm.is_compensable} onCheckedChange={v => setEventForm({ ...eventForm, is_compensable: v })} />
                <Label>Compensable</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onClick={saveEvent} disabled={!eventForm.title}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EOT Claim Dialog */}
      <Dialog open={showEOTDialog} onOpenChange={setShowEOTDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEOT ? `Edit ${editingEOT.claim_number}` : 'New EOT Claim'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Title *</Label>
              <Input value={eotForm.title} onChange={e => setEotForm({ ...eotForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Project</Label>
              <Select value={eotForm.project_id} onValueChange={v => setEotForm({ ...eotForm, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked Delay Event</Label>
              <Select value={eotForm.delay_event_id || 'none'} onValueChange={v => setEotForm({ ...eotForm, delay_event_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.event_number} - {e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Original Completion Date</Label>
              <Input type="date" value={eotForm.original_completion_date || ''} onChange={e => setEotForm({ ...eotForm, original_completion_date: e.target.value })} />
            </div>
            <div>
              <Label>Requested Completion Date</Label>
              <Input type="date" value={eotForm.requested_completion_date || ''} onChange={e => setEotForm({ ...eotForm, requested_completion_date: e.target.value })} />
            </div>
            <div>
              <Label>Days Requested</Label>
              <Input type="number" value={eotForm.total_days_requested} onChange={e => setEotForm({ ...eotForm, total_days_requested: +e.target.value })} />
            </div>
            <div>
              <Label>Days Approved</Label>
              <Input type="number" value={eotForm.total_days_approved} onChange={e => setEotForm({ ...eotForm, total_days_approved: +e.target.value })} />
            </div>
            <div>
              <Label>Cost Impact</Label>
              <Input type="number" value={eotForm.cost_impact} onChange={e => setEotForm({ ...eotForm, cost_impact: +e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={eotForm.status} onValueChange={v => setEotForm({ ...eotForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EOT_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Contract Clause Reference</Label>
              <Input value={eotForm.contract_clause || ''} onChange={e => setEotForm({ ...eotForm, contract_clause: e.target.value })} placeholder="e.g. Clause 8.4 - Extension of Time" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={eotForm.description || ''} onChange={e => setEotForm({ ...eotForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEOTDialog(false)}>Cancel</Button>
            <Button onClick={saveEOT} disabled={!eotForm.title}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
