import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin, Camera, Clock, CheckCircle, FileText, AlertTriangle,
  Send, Wifi, WifiOff, Plus, User, Calendar, CloudOff, Loader2,
  HardHat, Truck, ClipboardCheck, RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

// Draft storage for offline
const DRAFT_KEY = 'erp_field_drafts';

interface Draft {
  id: string;
  type: 'check_in' | 'daily_report' | 'photo';
  data: Record<string, any>;
  created_at: string;
  synced: boolean;
}

function saveDraft(draft: Draft) {
  const drafts: Draft[] = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
  drafts.push(draft);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function getDrafts(): Draft[] {
  return JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
}

function removeDraft(id: string) {
  const drafts = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export default function FieldOperations() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAr = language === 'ar';

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(getDrafts());

  // Check-in form
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinProject, setCheckinProject] = useState('');

  // Daily report form
  const [reportProject, setReportProject] = useState('');
  const [reportWeather, setReportWeather] = useState('clear');
  const [reportSummary, setReportSummary] = useState('');
  const [reportManpower, setReportManpower] = useState('');
  const [reportIssues, setReportIssues] = useState('');
  const [reportProgress, setReportProgress] = useState('');

  useEffect(() => {
    const onLine = () => setIsOnline(true);
    const offLine = () => setIsOnline(false);
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => { window.removeEventListener('online', onLine); window.removeEventListener('offline', offLine); };
  }, []);

  // Get GPS
  const getLocation = () => {
    setGeoLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => { setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
        () => { setGeoLoading(false); toast({ title: 'Location unavailable', variant: 'destructive' }); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoLoading(false);
    }
  };

  // Fetch projects for selection
  const { data: projects = [] } = useQuery({
    queryKey: ['field-projects', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('projects').select('id, name, status').eq('status', 'in_progress').order('name').limit(50) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
  });

  // Recent attendance for today
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['field-attendance-today', user?.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase.from('attendance')
        .select('*')
        .eq('attendance_date', today)
        .order('check_in_time', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  // Pending approval requests
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['field-pending-approvals', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('approval_requests')
        .select('id, document_type, document_number, amount, status, created_at, requester_name')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Check-in mutation
  const checkIn = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        const draft: Draft = {
          id: crypto.randomUUID(),
          type: 'check_in',
          data: { notes: checkinNotes, project: checkinProject, location: geoLocation, timestamp: new Date().toISOString() },
          created_at: new Date().toISOString(),
          synced: false,
        };
        saveDraft(draft);
        setDrafts(getDrafts());
        return draft;
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from('attendance').insert({
        employee_id: authUser?.id,
        attendance_date: format(new Date(), 'yyyy-MM-dd'),
        check_in_time: format(new Date(), 'HH:mm:ss'),
        status: 'present',
        check_in_location: geoLocation ? `${geoLocation.lat},${geoLocation.lng}` : null,
        notes: checkinNotes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-attendance-today'] });
      toast({ title: isOnline ? 'Checked in!' : 'Draft saved (offline)' });
      setShowCheckin(false);
      setCheckinNotes('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Daily report mutation
  const submitReport = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        const draft: Draft = {
          id: crypto.randomUUID(),
          type: 'daily_report',
          data: {
            project: reportProject, weather: reportWeather, summary: reportSummary,
            manpower: reportManpower, issues: reportIssues, progress: reportProgress,
            location: geoLocation, timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          synced: false,
        };
        saveDraft(draft);
        setDrafts(getDrafts());
        return draft;
      }
      // Create as activity in the system
      const { error } = await supabase.from('activities').insert({
        type: 'note',
        subject: `Daily Site Report - ${format(new Date(), 'MMM d, yyyy')}`,
        description: `Weather: ${reportWeather}\nManpower: ${reportManpower}\nProgress: ${reportProgress}%\n\nSummary:\n${reportSummary}\n\nIssues:\n${reportIssues}`,
        project_id: reportProject || null,
        created_by: user?.id,
        company_id: activeCompanyId || null,
        priority: reportIssues ? 'high' : 'medium',
        status: 'completed',
        location: geoLocation ? `${geoLocation.lat},${geoLocation.lng}` : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({ title: isOnline ? 'Report submitted!' : 'Draft saved (offline)' });
      setShowReport(false);
      setReportSummary(''); setReportManpower(''); setReportIssues(''); setReportProgress('');
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Quick approve
  const quickApprove = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const { error } = await supabase.from('approval_actions').insert({
        request_id: id,
        action: action === 'approve' ? 'approved' : 'rejected',
        stage_order: 1,
        acted_by: user?.id,
        acted_at: new Date().toISOString(),
      });
      if (error) throw error;
      await supabase.from('approval_requests').update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-pending-approvals'] });
      toast({ title: 'Action completed' });
    },
  });

  // Sync drafts
  const syncDrafts = async () => {
    const unsyncedDrafts = drafts.filter(d => !d.synced);
    for (const draft of unsyncedDrafts) {
      try {
        if (draft.type === 'check_in') {
          await supabase.from('attendance').insert({
            employee_id: user?.id,
            attendance_date: format(new Date(draft.data.timestamp), 'yyyy-MM-dd'),
            check_in_time: format(new Date(draft.data.timestamp), 'HH:mm:ss'),
            status: 'present',
            check_in_location: draft.data.location ? `${draft.data.location.lat},${draft.data.location.lng}` : null,
            notes: draft.data.notes || null,
          } as any);
        }
        removeDraft(draft.id);
      } catch { /* skip failed */ }
    }
    setDrafts(getDrafts());
    toast({ title: 'Drafts synced' });
  };

  const unsyncedCount = drafts.filter(d => !d.synced).length;

  return (
    <div className="space-y-4 page-enter max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{isAr ? 'العمليات الميدانية' : 'Field Operations'}</h1>
          <div className="flex items-center gap-2 mt-1">
            {isOnline ? (
              <Badge variant="outline" className="text-success border-success/30 gap-1"><Wifi className="h-3 w-3" /> Online</Badge>
            ) : (
              <Badge variant="outline" className="text-destructive border-destructive/30 gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>
            )}
            {geoLocation && (
              <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> Located</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!geoLocation && (
            <Button variant="outline" size="sm" onClick={getLocation} disabled={geoLoading}>
              {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </Button>
          )}
          {unsyncedCount > 0 && isOnline && (
            <Button variant="outline" size="sm" className="gap-1" onClick={syncDrafts}>
              <RefreshCw className="h-4 w-4" /> Sync ({unsyncedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions - Large touch targets */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-24 flex-col gap-2 text-base" onClick={() => { getLocation(); setShowCheckin(true); }}>
          <Clock className="h-7 w-7 text-primary" />
          {isAr ? 'تسجيل الحضور' : 'Check In'}
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 text-base" onClick={() => { getLocation(); setShowReport(true); }}>
          <FileText className="h-7 w-7 text-info" />
          {isAr ? 'تقرير يومي' : 'Daily Report'}
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 text-base" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.capture = 'environment';
          input.onchange = () => {
            if (input.files?.[0]) {
              toast({ title: 'Photo captured', description: 'Upload coming soon with storage integration' });
            }
          };
          input.click();
        }}>
          <Camera className="h-7 w-7 text-warning" />
          {isAr ? 'التقاط صورة' : 'Photo Upload'}
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 text-base relative" onClick={() => {/* scroll to approvals */}}>
          <ClipboardCheck className="h-7 w-7 text-success" />
          {isAr ? 'الموافقات' : 'Approvals'}
          {pendingApprovals.length > 0 && (
            <Badge className="absolute top-2 right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {pendingApprovals.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Offline Drafts */}
      {unsyncedCount > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-warning">
              <CloudOff className="h-4 w-4" /> {unsyncedCount} Unsynced Draft{unsyncedCount > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.filter(d => !d.synced).map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                <div className="flex items-center gap-2">
                  {d.type === 'check_in' ? <Clock className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  <span className="capitalize">{d.type.replace('_', ' ')}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {isAr ? 'نشاط اليوم' : "Today's Activity"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'لا يوجد نشاط اليوم' : 'No activity today. Tap Check In to start.'}</p>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm font-medium">{a.check_in_time}</p>
                      {a.check_in_location && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{a.check_in_location}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-warning" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovals.map((a: any) => (
              <div key={a.id} className="p-3 rounded-lg border bg-background">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">{a.document_type} {a.document_number && `#${a.document_number}`}</p>
                    <p className="text-xs text-muted-foreground">{a.requester_name} • {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    {a.amount && <p className="text-xs font-medium mt-0.5">SAR {Number(a.amount).toLocaleString()}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-10" onClick={() => quickApprove.mutate({ id: a.id, action: 'approve' })}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1 h-10" onClick={() => quickApprove.mutate({ id: a.id, action: 'reject' })}>
                    <AlertTriangle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Check-in Dialog */}
      <Dialog open={showCheckin} onOpenChange={setShowCheckin}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isAr ? 'تسجيل الحضور' : 'Quick Check-In'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {geoLocation && (
              <div className="flex items-center gap-2 p-2 rounded bg-success/10 text-success text-sm">
                <MapPin className="h-4 w-4" /> {geoLocation.lat.toFixed(5)}, {geoLocation.lng.toFixed(5)}
              </div>
            )}
            <div>
              <Label>Project (optional)</Label>
              <Select value={checkinProject} onValueChange={setCheckinProject}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)} placeholder="Optional notes..." className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-base" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
              {checkIn.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
              {!isOnline ? 'Save Draft' : 'Check In Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAr ? 'تقرير يومي' : 'Daily Site Report'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {geoLocation && (
              <div className="flex items-center gap-2 p-2 rounded bg-success/10 text-success text-sm">
                <MapPin className="h-4 w-4" /> {geoLocation.lat.toFixed(5)}, {geoLocation.lng.toFixed(5)}
              </div>
            )}
            <div>
              <Label>Project *</Label>
              <Select value={reportProject} onValueChange={setReportProject}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weather</Label>
              <Select value={reportWeather} onValueChange={setReportWeather}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['clear', 'cloudy', 'rainy', 'hot', 'windy', 'sandstorm'].map(w => (
                    <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Manpower Count</Label>
              <Input type="number" value={reportManpower} onChange={e => setReportManpower(e.target.value)} placeholder="Total workers on site" />
            </div>
            <div>
              <Label>Progress (%)</Label>
              <Input type="number" min="0" max="100" value={reportProgress} onChange={e => setReportProgress(e.target.value)} placeholder="Overall progress" />
            </div>
            <div>
              <Label>Work Summary *</Label>
              <Textarea value={reportSummary} onChange={e => setReportSummary(e.target.value)} placeholder="What was accomplished today..." className="min-h-[80px]" />
            </div>
            <div>
              <Label>Issues / Delays</Label>
              <Textarea value={reportIssues} onChange={e => setReportIssues(e.target.value)} placeholder="Any blockers or delays..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-12 text-base" onClick={() => submitReport.mutate()} disabled={submitReport.isPending || !reportSummary}>
              {submitReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {!isOnline ? 'Save Draft' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
