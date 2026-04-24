import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTicket, useTicketComments, useAddComment, useUpdateTicket, useTechnicians, useAIDispatchSuggestion } from '@/hooks/useServiceITSM';
import { Sparkles, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function ITSMTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket } = useTicket(id);
  const { data: comments = [] } = useTicketComments(id);
  const { data: techs = [] } = useTechnicians();
  const addComment = useAddComment();
  const update = useUpdateTicket();
  const aiDispatch = useAIDispatchSuggestion();

  const [msg, setMsg] = useState('');
  const [channel, setChannel] = useState('internal');
  const [aiResult, setAiResult] = useState<any>(null);

  if (!ticket) return <div className="p-6">Loading...</div>;

  const onAI = () => {
    aiDispatch.mutate({ ticket_id: ticket.id }, {
      onSuccess: (d) => { setAiResult(d); toast.success('AI suggestions ready'); },
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-mono">{ticket.ticket_number}</p>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant={ticket.priority === 'critical' ? 'destructive' : 'secondary'}>{ticket.priority}</Badge>
            <Badge variant="outline">{ticket.status}</Badge>
            {ticket.is_breached && <Badge variant="destructive">SLA breached</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={ticket.status} onValueChange={(v) => update.mutate({ id: ticket.id, status: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onAI} disabled={aiDispatch.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />{aiDispatch.isPending ? 'Thinking...' : 'AI dispatch'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{ticket.description || '—'}</p></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Communication log ({comments.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {comments.map((c: any) => (
                  <div key={c.id} className={`p-3 rounded border-l-4 ${c.channel === 'internal' ? 'border-muted bg-muted/30' : 'border-primary bg-primary/5'}`}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{c.author_name || 'System'} · {c.channel}</span>
                      <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
              </div>
              <div className="space-y-2 border-t pt-3">
                <div className="flex gap-2">
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['internal', 'customer', 'email', 'phone', 'chat', 'whatsapp'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Type message..." value={msg} onChange={(e) => setMsg(e.target.value)} />
                <Button onClick={() => msg && addComment.mutate({ ticket_id: ticket.id, message: msg, channel }, { onSuccess: () => setMsg('') })}>
                  <Send className="h-4 w-4 mr-2" />Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Customer:</span> {ticket.customer_name || '—'}</div>
              <div><span className="text-muted-foreground">Asset:</span> {ticket.asset_code || '—'}</div>
              <div><span className="text-muted-foreground">Type:</span> {ticket.ticket_type}</div>
              <div><span className="text-muted-foreground">Created:</span> {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</div>
              <div><span className="text-muted-foreground">First response due:</span> {ticket.due_first_response_at ? new Date(ticket.due_first_response_at).toLocaleString() : '—'}</div>
              <div><span className="text-muted-foreground">Resolution due:</span> {ticket.due_resolution_at ? new Date(ticket.due_resolution_at).toLocaleString() : '—'}</div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-sm">Assign technician</CardTitle></CardHeader>
            <CardContent>
              <Select value={ticket.assigned_technician_id || ''} onValueChange={(v) => update.mutate({ id: ticket.id, assigned_technician_id: v, status: ticket.status === 'new' ? 'assigned' : ticket.status, assigned_at: new Date().toISOString() })}>
                <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                <SelectContent>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.technician_name}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>

          {aiResult?.recommendations && (
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" />AI suggestions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {aiResult.recommendations.map((r: any, i: number) => (
                  <div key={i} className="border rounded p-2 text-sm">
                    <div className="flex justify-between font-medium">{r.technician_name}<Badge>{r.score}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => update.mutate({ id: ticket.id, assigned_technician_id: r.technician_id, status: 'assigned', assigned_at: new Date().toISOString() })}>Assign</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
