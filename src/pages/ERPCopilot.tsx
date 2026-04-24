import { useState, useRef, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import {
  Bot, Send, User, Loader2, Sparkles, Plus, Trash2, Pin, MessageSquare,
  BookOpen, AlertTriangle, CheckCircle, Clock, ListChecks, Shield, Search,
  Eye, Zap, ChevronRight, ThumbsUp, ThumbsDown, ExternalLink, History,
  FileText, Brain, Settings2
} from 'lucide-react';
import { useERPCopilot, CopilotMessage, CopilotPrompt } from '@/hooks/useERPCopilot';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ROLES = [
  { value: 'CEO', label: 'CEO' },
  { value: 'CFO', label: 'CFO' },
  { value: 'COO', label: 'COO' },
  { value: 'Finance Manager', label: 'Finance Manager' },
  { value: 'Procurement Manager', label: 'Procurement Manager' },
  { value: 'PMO Manager', label: 'PMO Manager' },
  { value: 'HR Manager', label: 'HR Manager' },
  { value: 'Storekeeper', label: 'Storekeeper' },
  { value: 'Sales Manager', label: 'Sales Manager' },
  { value: 'General User', label: 'General User' },
];

const MODE_OPTIONS = [
  { value: 'read', label: 'Read-Only', icon: Eye, desc: 'Analysis & insights only' },
  { value: 'action', label: 'Action Mode', icon: Zap, desc: 'Can execute ERP actions' },
];

export default function ERPCopilot() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const {
    conversations, messages, activeConversationId, setActiveConversationId,
    isStreaming, streamContent, sendMessage, createConversation,
    followups, prompts, actionLog, createFollowup, updateFollowup,
    logAction, deleteConversation
  } = useERPCopilot();

  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('General User');
  const [mode, setMode] = useState<'read' | 'action'>('read');
  const [promptSearch, setPromptSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [followupDialog, setFollowupDialog] = useState(false);
  const [followupTitle, setFollowupTitle] = useState('');
  const [followupDesc, setFollowupDesc] = useState('');
  const [followupPriority, setFollowupPriority] = useState('medium');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  // Combine DB messages with streaming content
  const displayMessages = useMemo(() => {
    const msgs = [...messages];
    if (isStreaming && streamContent) {
      msgs.push({
        id: 'streaming',
        conversation_id: activeConversationId || '',
        role: 'assistant',
        content: streamContent,
        sources: [],
        confidence: null,
        reasoning_summary: null,
        suggested_followups: null,
        action_type: null,
        action_payload: null,
        action_status: null,
        created_at: new Date().toISOString(),
      });
    }
    return msgs;
  }, [messages, isStreaming, streamContent, activeConversationId]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    setInput('');

    let convId = activeConversationId;
    if (!convId) {
      const conv = await createConversation.mutateAsync({
        title: msg.slice(0, 60),
        userRole: selectedRole,
        mode,
        language,
      });
      convId = conv.id;
    }

    await sendMessage(msg, convId, messages, selectedRole, mode, language);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
  };

  const handleFeedback = async (messageId: string, rating: 'positive' | 'negative') => {
    if (!user) return;
    await (supabase.from('copilot_feedback' as any).insert({
      user_id: user.id,
      message_id: messageId,
      rating,
    } as any) as any);
    toast({ title: rating === 'positive' ? '👍 Thanks!' : '👎 Noted', description: 'Your feedback helps improve responses.' });
  };

  const filteredPrompts = useMemo(() => {
    let filtered = prompts;
    if (promptSearch) {
      const q = promptSearch.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.prompt_text.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    // Prioritize prompts matching selected role
    return filtered.sort((a, b) => {
      const aMatch = a.target_role === selectedRole ? 1 : 0;
      const bMatch = b.target_role === selectedRole ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [prompts, promptSearch, selectedRole]);

  const rolePrompts = useMemo(() => filteredPrompts.filter(p => p.target_role === selectedRole), [filteredPrompts, selectedRole]);

  const pendingFollowups = followups.filter(f => f.status === 'pending' || f.status === 'in_progress');
  const completedFollowups = followups.filter(f => f.status === 'completed');

  // Exceptions from anomaly alerts
  const [exceptions, setExceptions] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('ai_anomaly_alerts' as any).select('*')
      .in('status', ['new', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: any) => { if (data) setExceptions(data); });
  }, []);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            ERP Copilot
            <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
          </h1>
          <p className="text-muted-foreground text-sm">Enterprise intelligence assistant for Al Rajhi ERP</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            {MODE_OPTIONS.map(m => (
              <Button
                key={m.value}
                variant={mode === m.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode(m.value as 'read' | 'action')}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                <m.icon className="h-3.5 w-3.5 mr-1" />{m.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content with tabs */}
      <Tabs defaultValue="ask" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="ask" className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />Ask</TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />Suggested Actions</TabsTrigger>
          <TabsTrigger value="exceptions" className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />Exceptions
            {exceptions.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{exceptions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />My Follow-ups
            {pendingFollowups.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingFollowups.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />Prompt Library</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Audit Log</TabsTrigger>
        </TabsList>

        {/* ASK TAB - Split view */}
        <TabsContent value="ask" className="flex-1 overflow-hidden mt-2">
          <div className="flex gap-3 h-full">
            {/* Conversation sidebar */}
            <div className="w-64 flex flex-col border rounded-lg bg-muted/30">
              <div className="p-2 border-b">
                <Button size="sm" className="w-full" onClick={handleNewConversation}>
                  <Plus className="h-3.5 w-3.5 mr-1" />New Chat
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-1 space-y-1">
                  {conversations.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConversationId(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted ${activeConversationId === c.id ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {c.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <span className="truncate font-medium">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{c.message_count} msgs</span>
                        {c.user_role && <Badge variant="outline" className="text-[10px] h-4 px-1">{c.user_role}</Badge>}
                      </div>
                    </button>
                  ))}
                  {conversations.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                {displayMessages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Brain className="h-16 w-16 text-muted-foreground/20" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Ask your ERP anything</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Get insights from Sales, Finance, Procurement, HR, Inventory, Projects, and more.
                      Every answer is grounded in your actual ERP data.
                    </p>
                    {/* Role-based quick prompts */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                      {rolePrompts.slice(0, 6).map((p, i) => (
                        <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => handleSend(p.prompt_text)}>
                          <Sparkles className="h-3 w-3 mr-1" />{p.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {displayMessages.map((m, i) => (
                  <div key={m.id} className={`flex gap-3 mb-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
                    {m.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`rounded-lg px-4 py-3 max-w-[75%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm">{m.content}</p>
                      )}
                      {/* Feedback & meta for assistant messages */}
                      {m.role === 'assistant' && m.id !== 'streaming' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFeedback(m.id, 'positive')}>
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleFeedback(m.id, 'negative')}>
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                          {m.confidence && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              {Math.round(m.confidence * 100)}% confidence
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(new Date(m.created_at), 'HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                    {m.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && !streamContent && (
                  <div className="flex gap-3 mb-4">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <Input
                  placeholder={`Ask about your ERP data as ${selectedRole}...`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button onClick={() => handleSend()} disabled={isStreaming || !input.trim()}>
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Evidence panel (right side) */}
            <div className="w-72 flex flex-col border rounded-lg bg-muted/30">
              <div className="p-3 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />Evidence & Sources
                </h3>
              </div>
              <ScrollArea className="flex-1 p-3">
                {displayMessages.filter(m => m.role === 'assistant').length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Source records and evidence will appear here when the copilot responds.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs space-y-2">
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium text-muted-foreground mb-1">Mode</p>
                        <Badge variant={mode === 'action' ? 'default' : 'secondary'}>
                          {mode === 'action' ? '⚡ Action Mode' : '👁 Read-Only'}
                        </Badge>
                      </div>
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium text-muted-foreground mb-1">Role Context</p>
                        <Badge variant="outline">{selectedRole}</Badge>
                      </div>
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium text-muted-foreground mb-1">Data Sources Used</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['AR Invoices', 'Purchase Orders', 'Projects', 'Inventory', 'Approvals'].map(s => (
                            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium text-muted-foreground mb-1">Quick Actions</p>
                        <div className="space-y-1">
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => {
                            setFollowupDialog(true);
                          }}>
                            <Plus className="h-3 w-3 mr-1" />Create Follow-up
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7" onClick={() => {
                            if (activeConversationId) {
                              logAction.mutate({
                                action_type: 'export_conversation',
                                action_description: 'Exported conversation for review',
                                conversationId: activeConversationId,
                              });
                              toast({ title: 'Exported', description: 'Conversation logged for audit.' });
                            }
                          }}>
                            <ExternalLink className="h-3 w-3 mr-1" />Export to Audit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* SUGGESTED ACTIONS TAB */}
        <TabsContent value="actions" className="flex-1 overflow-auto mt-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: ListChecks, label: 'Create a Task', desc: 'Create a follow-up task from copilot insight', action: 'create_task' },
              { icon: AlertTriangle, label: 'Create an Alert', desc: 'Raise a finance or operations alert', action: 'create_alert' },
              { icon: User, label: 'Assign Exception', desc: 'Assign an open exception to an owner', action: 'assign_exception' },
              { icon: MessageSquare, label: 'Draft Collection Reminder', desc: 'Generate a collection reminder for overdue invoices', action: 'draft_reminder' },
              { icon: Clock, label: 'Schedule Follow-up', desc: 'Schedule a follow-up meeting or call', action: 'schedule_followup' },
              { icon: Shield, label: 'Create Risk Item', desc: 'Add an item to the project risk register', action: 'create_risk' },
              { icon: ExternalLink, label: 'Open ERP Page', desc: 'Navigate to a specific ERP page with filters', action: 'navigate' },
              { icon: FileText, label: 'Prepare Email Draft', desc: 'Generate an email or communication summary', action: 'draft_email' },
              { icon: Zap, label: 'Trigger Workflow Reminder', desc: 'Send a workflow reminder to approvers', action: 'workflow_reminder' },
              { icon: Search, label: 'Start Discrepancy Review', desc: 'Initiate a review process for data discrepancies', action: 'discrepancy_review' },
            ].map((a, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                setInput(`${a.label}: `);
                const tab = document.querySelector('[data-value="ask"]') as HTMLElement;
                tab?.click();
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <a.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{a.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* EXCEPTIONS TAB */}
        <TabsContent value="exceptions" className="flex-1 overflow-auto mt-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Active Exceptions ({exceptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active exceptions</p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map((ex: any) => (
                    <div key={ex.id} className="flex items-center justify-between p-3 rounded-md border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={ex.severity === 'critical' ? 'destructive' : ex.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {ex.severity}
                          </Badge>
                          <span className="font-medium text-sm">{ex.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{ex.module} • {ex.anomaly_type}</p>
                        {ex.description && <p className="text-xs mt-1 line-clamp-2">{ex.description}</p>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setInput(`Analyze this exception: ${ex.title} - ${ex.description || ex.anomaly_type}`);
                        const tab = document.querySelector('[data-value="ask"]') as HTMLElement;
                        tab?.click();
                      }}>
                        <Brain className="h-3.5 w-3.5 mr-1" />Analyze
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOLLOW-UPS TAB */}
        <TabsContent value="followups" className="flex-1 overflow-auto mt-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">My Follow-ups</h3>
            <Button size="sm" onClick={() => setFollowupDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />New Follow-up
            </Button>
          </div>
          <div className="space-y-3">
            {pendingFollowups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Pending ({pendingFollowups.length})</h4>
                <div className="space-y-2">
                  {pendingFollowups.map(f => (
                    <Card key={f.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={f.priority === 'critical' ? 'destructive' : f.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {f.priority}
                            </Badge>
                            <span className="font-medium text-sm">{f.title}</span>
                          </div>
                          {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                          {f.due_date && <p className="text-[10px] text-muted-foreground mt-1">Due: {format(new Date(f.due_date), 'MMM dd, yyyy')}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateFollowup.mutate({ id: f.id, status: 'completed' })}>
                            <CheckCircle className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateFollowup.mutate({ id: f.id, status: 'dismissed' })}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {completedFollowups.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Completed ({completedFollowups.length})</h4>
                <div className="space-y-2">
                  {completedFollowups.slice(0, 10).map(f => (
                    <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded border opacity-60">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm line-through">{f.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {f.completed_at && format(new Date(f.completed_at), 'MMM dd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {followups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No follow-ups yet. Create one from the copilot or click "New Follow-up".</p>
            )}
          </div>
        </TabsContent>

        {/* PROMPT LIBRARY TAB */}
        <TabsContent value="prompts" className="flex-1 overflow-auto mt-2">
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="Search prompts..."
              value={promptSearch}
              onChange={e => setPromptSearch(e.target.value)}
              className="max-w-sm"
            />
            <Badge variant="outline" className="flex items-center gap-1 px-3">
              {filteredPrompts.length} prompts
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPrompts.map(p => (
              <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleSend(p.prompt_text)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {p.target_role === selectedRole && <Sparkles className="h-3 w-3 text-primary" />}
                    <h4 className="font-medium text-sm">{p.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.prompt_text}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.target_role && <Badge variant="outline" className="text-[10px]">{p.target_role}</Badge>}
                    <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                    {p.module && <Badge variant="secondary" className="text-[10px]">{p.module}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="flex-1 overflow-auto mt-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Action Audit Log ({actionLog.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No actions logged yet</p>
              ) : (
                <div className="space-y-2">
                  {actionLog.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-md border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={a.status === 'executed' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {a.status}
                          </Badge>
                          <span className="font-medium text-sm">{a.action_type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.action_description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(a.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Follow-up dialog */}
      <Dialog open={followupDialog} onOpenChange={setFollowupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Follow-up title" value={followupTitle} onChange={e => setFollowupTitle(e.target.value)} />
            <Textarea placeholder="Description (optional)" value={followupDesc} onChange={e => setFollowupDesc(e.target.value)} />
            <Select value={followupPriority} onValueChange={setFollowupPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowupDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!followupTitle.trim()) return;
              createFollowup.mutate({
                title: followupTitle,
                description: followupDesc || null,
                priority: followupPriority,
                conversation_id: activeConversationId || undefined,
              } as any);
              setFollowupTitle('');
              setFollowupDesc('');
              setFollowupDialog(false);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
