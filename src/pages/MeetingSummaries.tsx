import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Calendar, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MeetingSummaries() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', meeting_date: new Date().toISOString().split('T')[0], raw_notes: '', attendees: '' });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meeting-summaries', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('meeting_summaries' as any).select('*').order('meeting_date', { ascending: false }).limit(50) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['meeting-actions'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('meeting_action_items' as any).select('*').order('created_at', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const createMeeting = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from('meeting_summaries' as any).insert({
        ...form,
        attendees: form.attendees.split(',').map(a => a.trim()).filter(Boolean),
        company_id: activeCompanyId,
        created_by: user?.id,
      }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meeting-summaries'] }); setShowCreate(false); toast({ title: 'Meeting notes saved' }); },
  });

  const pendingActions = actionItems.filter((a: any) => a.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Meeting Summaries</h1>
          <p className="text-muted-foreground">AI-structured meeting notes with action items and follow-ups</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Meeting</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {[{ label: 'Meetings', value: meetings.length, icon: Calendar },
          { label: 'Action Items', value: actionItems.length, icon: CheckCircle },
          { label: 'Pending', value: pendingActions.length, icon: Users },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-2"><s.icon className="h-4 w-4 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-3">
        {meetings.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{format(new Date(m.meeting_date), 'dd MMM yyyy')}</span>
                    {(m.attendees || []).length > 0 && <Badge variant="outline">{m.attendees.length} attendees</Badge>}
                  </div>
                  {m.ai_summary && <p className="text-sm text-muted-foreground mt-2">{m.ai_summary}</p>}
                  {(m.key_decisions || []).length > 0 && (
                    <div className="mt-2"><span className="text-xs font-medium">Decisions:</span>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">{m.key_decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {meetings.length === 0 && <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="py-12 text-center text-muted-foreground">No meeting summaries yet</CardContent></Card>}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Meeting Notes</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Weekly Sales Review" /></div>
            <div><Label>{t('common.date')}</Label><Input type="date" value={form.meeting_date} onChange={e => setForm(p => ({ ...p, meeting_date: e.target.value }))} /></div>
            <div><Label>Attendees (comma-separated)</Label><Input value={form.attendees} onChange={e => setForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Ahmed, Sara, Khalid" /></div>
            <div><Label>Notes / Transcript</Label><Textarea rows={6} value={form.raw_notes} onChange={e => setForm(p => ({ ...p, raw_notes: e.target.value }))} placeholder="Paste meeting notes or transcript..." /></div>
            <Button className="w-full" onClick={() => createMeeting.mutate()} disabled={!form.title}>Save Meeting</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
