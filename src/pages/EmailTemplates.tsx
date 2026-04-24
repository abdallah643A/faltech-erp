import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Mail, Send, Eye, Edit2, Trash2, Search, Clock, CheckCircle, XCircle, MailOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function EmailTemplates() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', subject: '', body_html: '', category: 'general', variables: '[]',
  });
  const [sendData, setSendData] = useState({ to_email: '', to_name: '', variables: '{}' });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: emailLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async (data: any) => {
      if (editingTemplate) {
        const { error } = await supabase.from('email_templates').update(data).eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('email_templates').insert({ ...data, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      toast({ title: editingTemplate ? 'Template updated' : 'Template created' });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast({ title: 'Template deleted' });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) return;
      let html = selectedTemplate.body_html;
      try {
        const vars = JSON.parse(sendData.variables);
        Object.entries(vars).forEach(([key, val]) => {
          html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
        });
      } catch {}
      
      const { error } = await supabase.functions.invoke('send-workflow-email', {
        body: {
          test: true,
          test_recipient: sendData.to_email,
          custom_subject: selectedTemplate.subject,
          custom_html: html,
        },
      });
      
      await supabase.from('email_logs').insert({
        template_id: selectedTemplate.id,
        to_email: sendData.to_email,
        to_name: sendData.to_name,
        subject: selectedTemplate.subject,
        body_html: html,
        status: error ? 'failed' : 'sent',
        sent_by: user?.id,
        error_message: error?.message,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      setShowSendDialog(false);
      setSendData({ to_email: '', to_name: '', variables: '{}' });
      toast({ title: 'Email sent successfully' });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    },
  });

  const openEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name, subject: tpl.subject, body_html: tpl.body_html,
      category: tpl.category || 'general', variables: JSON.stringify(tpl.variables || []),
    });
    setShowTemplateDialog(true);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', body_html: '', category: 'general', variables: '[]' });
    setShowTemplateDialog(true);
  };

  const openSend = (tpl: any) => {
    setSelectedTemplate(tpl);
    setSendData({ to_email: '', to_name: '', variables: '{}' });
    setShowSendDialog(true);
  };

  const filteredTemplates = templates.filter((t: any) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter((l: any) => l.status === 'sent').length,
    opened: emailLogs.filter((l: any) => l.opened_at).length,
    failed: emailLogs.filter((l: any) => l.status === 'failed').length,
  };

  const categoryColors: Record<string, string> = {
    general: 'bg-primary/10 text-primary',
    sales: 'bg-emerald-500/10 text-emerald-600',
    followup: 'bg-amber-500/10 text-amber-600',
    proposals: 'bg-sky-500/10 text-sky-600',
    invoices: 'bg-indigo-500/10 text-indigo-600',
    marketing: 'bg-purple-500/10 text-purple-600',
    notification: 'bg-blue-500/10 text-blue-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.emailTemplates')}</h1>
          <p className="text-muted-foreground">Create, manage and send emails with customizable templates</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Template</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Templates</p><p className="text-2xl font-bold">{templates.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Send className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-sm text-muted-foreground">Sent</p><p className="text-2xl font-bold">{stats.sent}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><MailOpen className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Opened</p><p className="text-2xl font-bold">{stats.opened}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-bold">{stats.failed}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="sent">Sent Emails</TabsTrigger>
          <TabsTrigger value="variables">Variables Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search templates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl: any) => (
              <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <Badge variant="secondary" className={categoryColors[tpl.category] || ''}>{tpl.category}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedTemplate(tpl); setShowPreview(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tpl)}><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(tpl.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">Subject: {tpl.subject}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{format(new Date(tpl.created_at), 'MMM d, yyyy')}</span>
                    <Button size="sm" onClick={() => openSend(tpl)}><Send className="h-3 w-3 mr-1" />Send</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.to_name || log.to_email}</p>
                        {log.to_name && <p className="text-xs text-muted-foreground">{log.to_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="gap-1">
                        {log.status === 'sent' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {log.status}
                      </Badge>
                      {log.opened_at && <Badge variant="outline" className="ml-1 gap-1"><MailOpen className="h-3 w-3" />Opened</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
                {emailLogs.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No emails sent yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>Available Template Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Contact Variables</h4>
                  <div className="space-y-1 text-sm">
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{FirstName}}'}</code> — Contact first name</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{LastName}}'}</code> — Contact last name</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{Email}}'}</code> — Contact email</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{Phone}}'}</code> — Contact phone</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Company Variables</h4>
                  <div className="space-y-1 text-sm">
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{CompanyName}}'}</code> — Company name</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{LeadScore}}'}</code> — Lead score (0-100)</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{LastContact}}'}</code> — Last contact date</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{Status}}'}</code> — Lead/deal status</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Sales Variables</h4>
                  <div className="space-y-1 text-sm">
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{DealValue}}'}</code> — Deal/opportunity value</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{QuoteNumber}}'}</code> — Quote reference number</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{SalesRepName}}'}</code> — Assigned sales rep</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Date Variables</h4>
                  <div className="space-y-1 text-sm">
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{Today}}'}</code> — Today's date</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{MeetingDate}}'}</code> — Meeting date</p>
                    <p><code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{'{{DueDate}}'}</code> — Due date</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Create/Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTemplate ? 'Edit Template' : 'New Email Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Welcome Email" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="proposals">Proposals</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject... Use {{variable}} for dynamic values" />
            </div>
            <div className="space-y-2">
              <Label>Email Body (HTML)</Label>
              <Textarea value={formData.body_html} onChange={e => setFormData(p => ({ ...p, body_html: e.target.value }))} rows={12} placeholder="<h1>Hello {{name}}</h1><p>Your content here...</p>" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Use {'{{variable}}'} syntax for dynamic placeholders</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={() => saveTemplate.mutate({ name: formData.name, subject: formData.subject, body_html: formData.body_html, category: formData.category })} disabled={!formData.name || !formData.subject}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Email: {selectedTemplate?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input value={sendData.to_email} onChange={e => setSendData(p => ({ ...p, to_email: e.target.value }))} placeholder="recipient@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Recipient Name (optional)</Label>
              <Input value={sendData.to_name} onChange={e => setSendData(p => ({ ...p, to_name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Template Variables (JSON)</Label>
              <Textarea value={sendData.variables} onChange={e => setSendData(p => ({ ...p, variables: e.target.value }))} rows={3} placeholder='{"name": "John", "company": "Acme"}' className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
            <Button onClick={() => sendEmail.mutate()} disabled={!sendData.to_email || sendEmail.isPending}>
              <Send className="h-4 w-4 mr-2" />{sendEmail.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle></DialogHeader>
          <div className="border rounded-lg p-1">
            <div className="bg-muted/50 px-4 py-2 rounded-t-lg border-b">
              <p className="text-sm"><strong>Subject:</strong> {selectedTemplate?.subject}</p>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTemplate?.body_html || '') }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
