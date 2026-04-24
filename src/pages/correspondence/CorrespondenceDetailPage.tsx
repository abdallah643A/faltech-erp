import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Upload, Send, CheckCircle2, XCircle, UserPlus, MessageSquare, FileText, History, Cloud, Link2 } from 'lucide-react';
import {
  useCorrespondence, useUpdateCorrespondence, useChangeStatus, useCorrAttachments,
  useUploadCorrAttachment, useCorrAssignments, useAssignCorrespondence, useCorrComments,
  useCorrAudit, useDispatchCorrespondence
} from '@/hooks/useCorrespondence';
import { CorrStatusBadge, CorrPriorityBadge, CorrConfBadge, CorrEcmBadge } from '@/components/correspondence/CorrBadges';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CorrespondenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: corr, isLoading } = useCorrespondence(id);
  const { data: attachments = [] } = useCorrAttachments(id);
  const { data: assignments = [] } = useCorrAssignments(id);
  const comments = useCorrComments(id);
  const { data: audit = [] } = useCorrAudit(id);
  const upload = useUploadCorrAttachment();
  const assign = useAssignCorrespondence();
  const changeStatus = useChangeStatus();
  const dispatch = useDispatchCorrespondence();
  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [actionRequired, setActionRequired] = useState('action');

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (!corr) return <div className="p-6">Not found.</div>;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) upload.mutate({ correspondenceId: id, file });
    e.target.value = '';
  };

  const onAssign = () => {
    if (!assigneeId || !id) return toast.error('Enter assignee user ID');
    assign.mutate({ correspondenceId: id, assignedTo: assigneeId, actionRequired });
    setAssigneeId('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{corr.subject}</h1>
              <Badge variant="outline">{corr.direction}</Badge>
              <CorrStatusBadge status={corr.status} />
              <CorrPriorityBadge p={corr.priority} />
              <CorrConfBadge c={corr.confidentiality} />
              <CorrEcmBadge s={corr.ecm_sync_status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{corr.reference_no ?? '— pending registration —'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {corr.status === 'draft' && (
            <Button onClick={() => changeStatus.mutate({ id: corr.id, status: 'registered' })}>Register</Button>
          )}
          {['registered','in_review','assigned','in_progress'].includes(corr.status) && (
            <Button variant="secondary" onClick={() => changeStatus.mutate({ id: corr.id, status: 'pending_approval' })}>
              Submit for Approval
            </Button>
          )}
          {corr.status === 'pending_approval' && (
            <>
              <Button onClick={() => changeStatus.mutate({ id: corr.id, status: 'approved' })}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="destructive" onClick={() => changeStatus.mutate({ id: corr.id, status: 'rejected' })}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </>
          )}
          {corr.direction === 'outgoing' && corr.status === 'approved' && (
            <Button onClick={() => dispatch.mutate({ correspondenceId: corr.id, channel: corr.channel ?? 'email' })}>
              <Send className="h-4 w-4 mr-1" /> Dispatch
            </Button>
          )}
          {!['closed','archived','cancelled'].includes(corr.status) && (
            <Button variant="outline" onClick={() => changeStatus.mutate({ id: corr.id, status: 'closed' })}>Close</Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Date</CardTitle></CardHeader>
          <CardContent className="text-sm">{corr.correspondence_date ? format(new Date(corr.correspondence_date), 'PP') : '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Due</CardTitle></CardHeader>
          <CardContent className="text-sm">{corr.due_date ? format(new Date(corr.due_date), 'PP') : '—'}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Channel</CardTitle></CardHeader>
          <CardContent className="text-sm capitalize">{corr.channel ?? '—'}</CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow"><History className="h-4 w-4 mr-1" /> Workflow</TabsTrigger>
          <TabsTrigger value="attachments"><FileText className="h-4 w-4 mr-1" /> Attachments</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 mr-1" /> Comments</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" /> Audit</TabsTrigger>
          <TabsTrigger value="ecm"><Cloud className="h-4 w-4 mr-1" /> ECM</TabsTrigger>
          <TabsTrigger value="related"><Link2 className="h-4 w-4 mr-1" /> Related</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Parties</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Sender</div>
                <div className="font-medium">{corr.sender_name ?? '—'}</div>
                <div>{corr.sender_org}</div>
                <div className="text-xs text-muted-foreground">{corr.sender_email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recipient</div>
                <div className="font-medium">{corr.recipient_name ?? '—'}</div>
                <div>{corr.recipient_org}</div>
                <div className="text-xs text-muted-foreground">{corr.recipient_email}</div>
              </div>
            </CardContent>
          </Card>
          {corr.summary && (
            <Card><CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{corr.summary}</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Assign / Route</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Assignee user ID (UUID)" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} />
                <Select value={actionRequired} onValueChange={setActionRequired}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['review','action','approve','info','sign'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={onAssign}><UserPlus className="h-4 w-4 mr-1" /> Assign</Button>
              </div>
              <div className="space-y-2">
                {assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span>{a.assigned_to_name ?? a.assigned_to} • {a.action_required} • {a.department ?? '—'}</span>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                ))}
                {assignments.length === 0 && <div className="text-sm text-muted-foreground">No assignments yet.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Files</CardTitle>
              <Button asChild variant="outline" size="sm">
                <label><Upload className="h-4 w-4 mr-1" /> Upload<input type="file" className="hidden" onChange={handleUpload} /></label>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {attachments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <a href={a.file_url} target="_blank" rel="noreferrer" className="hover:underline">{a.file_name}</a>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{a.kind}</Badge>
                    <CorrEcmBadge s={a.ecm_sync_status} />
                  </div>
                </div>
              ))}
              {attachments.length === 0 && <div className="text-sm text-muted-foreground">No attachments yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Discussion</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Textarea placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} rows={2} />
                <Button onClick={() => { if (comment.trim()) { comments.addComment({ text: comment }); setComment(''); } }}>Post</Button>
              </div>
              <div className="space-y-2">
                {comments.data?.map((c: any) => (
                  <div key={c.id} className="p-3 rounded bg-muted/50">
                    <div className="text-xs text-muted-foreground">{c.user_name} • {format(new Date(c.created_at), 'PPp')}</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{c.comment_text}</div>
                  </div>
                ))}
                {(!comments.data || comments.data.length === 0) && <div className="text-sm text-muted-foreground">No comments yet.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {audit.map((a: any) => (
                <div key={a.id} className="text-sm flex justify-between border-l-2 border-primary/30 pl-3 py-1">
                  <span><b>{a.action}</b> {a.from_status && <>{a.from_status} → </>}{a.to_status}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'PPp')}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ecm">
          <Card>
            <CardHeader><CardTitle>ECM Sync</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>Status: <CorrEcmBadge s={corr.ecm_sync_status} /></div>
              <div>Folder: <span className="font-mono">{corr.ecm_folder_path ?? `correspondence/${corr.id}`}</span></div>
              <div>Last synced: {corr.ecm_last_synced_at ? format(new Date(corr.ecm_last_synced_at), 'PPp') : '—'}</div>
              <p className="text-xs text-muted-foreground pt-2">Files are stored in Lovable Cloud Storage as the system of record (ECM).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="related">
          <Card>
            <CardHeader><CardTitle>Related Records</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Linked projects, contracts, BPs, and reply correspondence will appear here.</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
