import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCPMSTimeClock } from '@/hooks/useCPMSTimeClock';
import { useCPMS } from '@/hooks/useCPMS';
import { MobileBottomNav } from '@/components/cpms/mobile/MobileBottomNav';
import { Play, Square, Coffee, Star, Clock, ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSMobileTimeClock() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeEntry, entries, loading, isOnBreak, clockIn, clockOut, startBreak, endBreak } = useCPMSTimeClock();
  const { projects } = useCPMS();
  const [selectedProject, setSelectedProject] = useState('');
  const [costCode, setCostCode] = useState('');
  const [showClockOut, setShowClockOut] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');

  // Live timer
  useEffect(() => {
    if (!activeEntry) { setElapsed('00:00:00'); return; }
    const tick = () => {
      const ms = Date.now() - new Date(activeEntry.clock_in).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeEntry]);

  const handleClockIn = async () => {
    if (!selectedProject) return;
    await clockIn(selectedProject, costCode || undefined);
  };

  const handleClockOut = async () => {
    await clockOut(rating || undefined, notes || undefined);
    setShowClockOut(false);
    setRating(0);
    setNotes('');
  };

  const todayEntries = entries.filter(e => {
    const d = new Date(e.clock_in);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayHours = todayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  const projectName = (id: string | null) => projects.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cpms/mobile')} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Time Clock</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Timer or Clock In */}
        {activeEntry ? (
          <Card className="border-2 border-primary">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">CLOCKED IN</span>
              </div>
              <div className="text-5xl font-mono font-bold tracking-wider text-primary">{elapsed}</div>
              <p className="text-sm text-muted-foreground">{projectName(activeEntry.project_id)}</p>
              {activeEntry.cost_code && <Badge variant="outline">{activeEntry.cost_code}</Badge>}

              <div className="flex gap-3">
                {isOnBreak ? (
                  <Button onClick={endBreak} className="flex-1 min-h-[52px] text-base" variant="outline">
                    <Coffee className="h-5 w-5 mr-2" /> End Break
                  </Button>
                ) : (
                  <Button onClick={startBreak} className="flex-1 min-h-[52px] text-base" variant="outline">
                    <Coffee className="h-5 w-5 mr-2" /> Break
                  </Button>
                )}
                <Button onClick={() => setShowClockOut(true)} variant="destructive" className="flex-1 min-h-[52px] text-base">
                  <Square className="h-5 w-5 mr-2" /> Clock Out
                </Button>
              </div>

              {activeEntry.break_minutes > 0 && (
                <p className="text-xs text-muted-foreground">Break time: {activeEntry.break_minutes} min</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-center">Clock In</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Project *</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="min-h-[48px] text-base">
                    <SelectValue placeholder="Choose a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status === 'in_progress' || p.status === 'active').map(p => (
                      <SelectItem key={p.id} value={p.id!} className="min-h-[44px]">
                        {p.code} – {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost Code / Task (optional)</Label>
                <Textarea
                  value={costCode}
                  onChange={e => setCostCode(e.target.value)}
                  placeholder="e.g. Foundation work, Electrical rough-in..."
                  className="min-h-[48px] text-base"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>GPS location will be captured on clock in</span>
              </div>
              <Button
                onClick={handleClockIn}
                disabled={!selectedProject}
                className="w-full min-h-[60px] text-xl font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="h-6 w-6 mr-2" /> CLOCK IN
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Today's Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Today's Timesheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</span>
              <Badge variant="secondary">{todayHours.toFixed(1)} hrs total</Badge>
            </div>
            <div className="space-y-2">
              {todayEntries.filter(e => e.id !== activeEntry?.id).map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <p className="font-medium">{projectName(entry.project_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.clock_in), 'HH:mm')} – {entry.clock_out ? format(new Date(entry.clock_out), 'HH:mm') : 'Active'}
                    </p>
                  </div>
                  <span className="font-mono text-sm">{entry.total_hours?.toFixed(1) || '–'}h</span>
                </div>
              ))}
              {todayEntries.length === 0 && !activeEntry && (
                <p className="text-sm text-muted-foreground text-center py-3">No time entries today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clock Out Dialog */}
      <Dialog open={showClockOut} onOpenChange={setShowClockOut}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Clock Out</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rate Your Productivity</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <Star className={`h-8 w-8 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Work completed..." rows={3} className="text-base" />
            </div>
            <Button onClick={handleClockOut} className="w-full min-h-[52px] text-base" variant="destructive">
              Confirm Clock Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileBottomNav />
    </div>
  );
}
