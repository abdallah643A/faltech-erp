import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Plus, Send, Reply, Forward, FileText, Paperclip, Clock,
  Star, Archive, Inbox, SendHorizontal, File, Users, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ECMInternalMemos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ subject: '', body: '', to: '', priority: 'normal' });

  const { data: memos = [], isLoading } = useQuery({
    queryKey: ['ecm-memos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_memos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_memos').insert({
        subject: form.subject,
        body: form.body,
        from_user_id: user?.id,
        from_name: user?.email?.split('@')[0] || 'User',
        priority: form.priority,
        status: 'sent',
        sent_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecm-memos'] });
      toast.success("Memo sent successfully");
      setShowCompose(false);
      setForm({ subject: '', body: '', to: '', priority: 'normal' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredMemos = memos.filter(m => {
    if (activeFolder === 'sent') return m.status === 'sent' || m.status === 'read';
    if (activeFolder === 'drafts') return m.status === 'draft';
    return m.status !== 'draft';
  }).filter(m => !search || m.subject?.toLowerCase().includes(search.toLowerCase()));

  const selected = memos.find(m => m.id === selectedMemo);

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: memos.filter(m => m.status !== 'draft' && m.status !== 'read').length },
    { id: 'sent', label: 'Sent', icon: SendHorizontal, count: 0 },
    { id: 'drafts', label: 'Drafts', icon: File, count: memos.filter(m => m.status === 'draft').length },
    { id: 'starred', label: 'Starred', icon: Star, count: 0 },
    { id: 'archived', label: 'Archived', icon: Archive, count: 0 },
  ];

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-[#0066cc]" />
          <div>
            <h1 className="text-xl font-bold">Internal Memos & Forms</h1>
            <p className="text-sm text-muted-foreground">Inter-department communication</p>
          </div>
        </div>
        <Button className="bg-[#0066cc] hover:bg-[#0055aa]" onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4 mr-2" /> Compose Memo
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-48 space-y-1">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeFolder === folder.id ? 'bg-[#0066cc] text-white' : 'hover:bg-accent'}`}
            >
              <folder.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{folder.label}</span>
              {folder.count > 0 && (
                <Badge variant={activeFolder === folder.id ? 'secondary' : 'outline'} className="h-5 text-[10px] min-w-5 justify-center">
                  {folder.count}
                </Badge>
              )}
            </button>
          ))}
          <div className="border-t my-3" />
          <p className="text-xs font-semibold text-muted-foreground px-3 mb-2">Groups</p>
          {['All Staff', 'Department Heads', 'Finance Team', 'Project Managers'].map(g => (
            <button key={g} className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left">
              <Users className="h-3 w-3 text-muted-foreground" /> {g}
            </button>
          ))}
        </div>

        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
            <Input placeholder="Search memos..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 max-w-xs" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
            ) : filteredMemos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No memos found</div>
            ) : filteredMemos.map(memo => (
              <div
                key={memo.id}
                onClick={() => setSelectedMemo(memo.id)}
                className={`p-3 border-b cursor-pointer hover:bg-accent/50 transition-colors ${memo.status === 'sent' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''} ${selectedMemo === memo.id ? 'bg-accent' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${memo.status === 'sent' ? 'bg-[#0066cc]' : 'bg-transparent'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${memo.status === 'sent' ? 'font-semibold' : 'font-medium'}`}>{memo.subject}</p>
                        {memo.priority === 'urgent' && <Badge variant="destructive" className="h-4 text-[9px]">Urgent</Badge>}
                        {memo.priority === 'high' && <Badge className="h-4 text-[9px] bg-orange-100 text-orange-700">High</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{memo.from_name || 'Unknown'}</span>
                        {memo.department && <><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{memo.department}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {memo.has_attachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {memo.sent_at ? format(new Date(memo.sent_at), 'yyyy-MM-dd') : format(new Date(memo.created_at), 'yyyy-MM-dd')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="w-96 border rounded-lg overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.subject}</h2>
                <div className="flex items-center gap-2 mt-2">
                  {selected.department && <Badge variant="outline" className="text-[10px]">{selected.department}</Badge>}
                  {selected.priority !== 'normal' && <Badge variant={selected.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-[10px]">{selected.priority}</Badge>}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">From:</span> {selected.from_name}</p>
                <p><span className="text-muted-foreground">Date:</span> {selected.sent_at ? format(new Date(selected.sent_at), 'yyyy-MM-dd HH:mm') : '-'}</p>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{selected.body || 'No content'}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1"><Reply className="h-3.5 w-3.5 mr-1" /> Reply</Button>
                <Button variant="outline" size="sm" className="flex-1"><Forward className="h-3.5 w-3.5 mr-1" /> Forward</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Compose Internal Memo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs">To</Label><Input placeholder="Recipients..." value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} className="h-9" /></div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Subject</Label><Input placeholder="Memo subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs">Message</Label><Textarea placeholder="Write your memo..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className="min-h-[150px]" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCompose(false); toast.info("Draft saved"); }}>Save Draft</Button>
              <Button className="bg-[#0066cc]" onClick={() => sendMutation.mutate()} disabled={!form.subject || sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Send Memo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ECMInternalMemos;