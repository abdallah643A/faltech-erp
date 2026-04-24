import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PaginationControls, usePagination } from '@/components/ui/pagination-controls';
import {
  Globe, Plus, Copy, ExternalLink, Palette, Mail, Eye, MoreVertical, Trash2,
  Shield, Users, Send, Settings, MessageSquare, FolderOpen, BarChart3, UserPlus,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Portal {
  id: string;
  customer_id: string;
  customer_name: string;
  portal_slug: string;
  is_enabled: boolean;
  logo_url: string | null;
  primary_color: string;
  welcome_message: string | null;
  show_invoices: boolean;
  show_retainers: boolean;
  show_files: boolean;
  show_pay_button: boolean;
  show_projects: boolean;
  show_change_orders: boolean;
  show_documents: boolean;
  show_messages: boolean;
  allow_client_uploads: boolean;
  allow_co_approval: boolean;
  white_label: boolean;
  company_name_override: string | null;
  footer_text: string | null;
  custom_domain: string | null;
  created_at: string;
}

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substring(2, 8);

export default function ClientPortalSettings() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [activeTab, setActiveTab] = useState('portals');

  const [form, setForm] = useState({
    customer_name: '', customer_id: '', portal_slug: '',
    is_enabled: true, primary_color: '#1e40af', welcome_message: '',
    show_invoices: true, show_retainers: true, show_files: true, show_pay_button: true,
    show_projects: true, show_change_orders: true, show_documents: true, show_messages: true,
    allow_client_uploads: false, allow_co_approval: true,
    white_label: false, company_name_override: '', footer_text: '',
  });

  const [clientForm, setClientForm] = useState({ email: '', password: '', full_name: '', phone: '' });

  const { data: portals = [], isLoading } = useQuery({
    queryKey: ['client-portals', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('client_portals').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Portal[];
    },
  });

  // Client accounts for selected portal
  const { data: clientAccounts = [] } = useQuery({
    queryKey: ['portal-clients', selectedPortal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_client_accounts')
        .select('*')
        .eq('portal_id', selectedPortal!.id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!selectedPortal,
  });

  // Portal messages for selected portal
  const { data: messages = [] } = useQuery({
    queryKey: ['portal-admin-messages', selectedPortal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('portal_id', selectedPortal!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
    enabled: !!selectedPortal,
  });

  // Analytics for selected portal
  const { data: analytics = [] } = useQuery({
    queryKey: ['portal-analytics', selectedPortal?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_analytics')
        .select('*')
        .eq('portal_id', selectedPortal!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return (data || []) as any[];
    },
    enabled: !!selectedPortal,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload: any = {
        customer_name: values.customer_name,
        customer_id: values.customer_id || null,
        portal_slug: values.portal_slug || generateSlug(values.customer_name),
        is_enabled: values.is_enabled,
        primary_color: values.primary_color,
        welcome_message: values.welcome_message || null,
        show_invoices: values.show_invoices,
        show_retainers: values.show_retainers,
        show_files: values.show_files,
        show_pay_button: values.show_pay_button,
        show_projects: values.show_projects,
        show_change_orders: values.show_change_orders,
        show_documents: values.show_documents,
        show_messages: values.show_messages,
        allow_client_uploads: values.allow_client_uploads,
        allow_co_approval: values.allow_co_approval,
        white_label: values.white_label,
        company_name_override: values.company_name_override || null,
        footer_text: values.footer_text || null,
        company_id: activeCompanyId,
        created_by: user?.id,
      };
      if (editId) {
        const { error } = await supabase.from('client_portals').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('client_portals').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portals'] });
      setDialogOpen(false);
      setEditId(null);
      toast({ title: editId ? 'Portal updated' : 'Portal created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_portals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portals'] });
      toast({ title: 'Portal deleted' });
    },
  });

  const addClientMutation = useMutation({
    mutationFn: async (values: typeof clientForm) => {
      if (!selectedPortal) throw new Error('No portal selected');
      const { error } = await supabase.from('portal_client_accounts').insert({
        portal_id: selectedPortal.id,
        email: values.email.toLowerCase().trim(),
        password_hash: values.password, // In production, hash via edge function
        full_name: values.full_name || null,
        phone: values.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-clients'] });
      setClientDialogOpen(false);
      setClientForm({ email: '', password: '', full_name: '', phone: '' });
      toast({ title: 'Client account created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ portalId, message }: { portalId: string; message: string }) => {
      const { error } = await supabase.from('portal_messages').insert({
        portal_id: portalId,
        sender_type: 'admin',
        sender_name: 'Admin',
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-admin-messages'] });
      toast({ title: 'Reply sent' });
    },
  });

  const [replyText, setReplyText] = useState('');

  const openEdit = (p: Portal) => {
    setEditId(p.id);
    setForm({
      customer_name: p.customer_name, customer_id: p.customer_id || '',
      portal_slug: p.portal_slug, is_enabled: p.is_enabled,
      primary_color: p.primary_color, welcome_message: p.welcome_message || '',
      show_invoices: p.show_invoices, show_retainers: p.show_retainers,
      show_files: p.show_files, show_pay_button: p.show_pay_button,
      show_projects: p.show_projects ?? true, show_change_orders: p.show_change_orders ?? true,
      show_documents: p.show_documents ?? true, show_messages: p.show_messages ?? true,
      allow_client_uploads: p.allow_client_uploads ?? false, allow_co_approval: p.allow_co_approval ?? true,
      white_label: p.white_label ?? false,
      company_name_override: p.company_name_override || '', footer_text: p.footer_text || '',
    });
    setDialogOpen(true);
  };

  const getPortalUrl = (slug: string) => `${window.location.origin}/portal/${slug}`;
  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(getPortalUrl(slug));
    toast({ title: 'Portal URL copied!' });
  };

  const { paginatedItems, currentPage, pageSize, totalItems, handlePageChange, handlePageSizeChange } = usePagination(portals, 25);

  const loginCount = analytics.filter((a: any) => a.event_type === 'login').length;
  const pageViews = analytics.filter((a: any) => a.event_type === 'page_view').length;
  const docDownloads = analytics.filter((a: any) => a.event_type === 'document_download').length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            {language === 'ar' ? 'بوابات العملاء' : 'Client Portal Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            White-label portals for clients to view projects, invoices, documents, and communicate
          </p>
        </div>
        <Button onClick={() => {
          setEditId(null);
          setForm({
            customer_name: '', customer_id: '', portal_slug: '',
            is_enabled: true, primary_color: '#1e40af', welcome_message: '',
            show_invoices: true, show_retainers: true, show_files: true, show_pay_button: true,
            show_projects: true, show_change_orders: true, show_documents: true, show_messages: true,
            allow_client_uploads: false, allow_co_approval: true,
            white_label: false, company_name_override: '', footer_text: '',
          });
          setDialogOpen(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Portal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Portals</p>
            <p className="text-2xl font-bold">{portals.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{portals.filter(p => p.is_enabled).length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">White-Label</p>
            <p className="text-2xl font-bold">{portals.filter(p => p.white_label).length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">CO Approval Enabled</p>
            <p className="text-2xl font-bold">{portals.filter(p => p.allow_co_approval).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6 space-y-3">
                <div className="h-5 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-48" />
                <div className="h-8 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : portals.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Client Portals Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create white-label portals for your clients</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create First Portal
              </Button>
            </CardContent>
          </Card>
        ) : paginatedItems.map(portal => (
          <Card key={portal.id} className="group relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="h-1.5 w-full" style={{ backgroundColor: portal.primary_color }} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{portal.customer_name}</CardTitle>
                  <CardDescription className="text-xs mt-1 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {portal.portal_slug}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(portal)}>
                      <Settings className="h-4 w-4 mr-2" /> Configure
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedPortal(portal); setActiveTab('clients'); }}>
                      <Users className="h-4 w-4 mr-2" /> Manage Clients
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedPortal(portal); setActiveTab('messages'); }}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSelectedPortal(portal); setActiveTab('analytics'); }}>
                      <BarChart3 className="h-4 w-4 mr-2" /> Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyUrl(portal.portal_slug)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(getPortalUrl(portal.portal_slug), '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Portal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMutation.mutate(portal.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={portal.is_enabled ? 'default' : 'secondary'} className="text-xs">
                  {portal.is_enabled ? 'Active' : 'Disabled'}
                </Badge>
                {portal.white_label && <Badge variant="outline" className="text-xs">White-Label</Badge>}
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: portal.primary_color }} />
              </div>
              <div className="flex flex-wrap gap-1">
                {portal.show_projects && <Badge variant="outline" className="text-[10px]">Projects</Badge>}
                {portal.show_invoices && <Badge variant="outline" className="text-[10px]">Invoices</Badge>}
                {portal.show_documents && <Badge variant="outline" className="text-[10px]">Documents</Badge>}
                {portal.show_change_orders && <Badge variant="outline" className="text-[10px]">Change Orders</Badge>}
                {portal.show_messages && <Badge variant="outline" className="text-[10px]">Messages</Badge>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => copyUrl(portal.portal_slug)}>
                  <Copy className="h-3 w-3 mr-1" /> Copy URL
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs"
                  onClick={() => { setSelectedPortal(portal); setActiveTab('clients'); }}>
                  <Users className="h-3 w-3 mr-1" /> Clients
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {portals.length > 25 && (
        <PaginationControls currentPage={currentPage} totalItems={totalItems} pageSize={pageSize}
          onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
      )}

      {/* Portal Detail Panel */}
      {selectedPortal && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedPortal.primary_color }} />
                {selectedPortal.customer_name} — Portal Management
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPortal(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="clients" className="gap-1"><Users className="h-3 w-3" /> Clients</TabsTrigger>
                <TabsTrigger value="messages" className="gap-1"><MessageSquare className="h-3 w-3" /> Messages</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="h-3 w-3" /> Analytics</TabsTrigger>
              </TabsList>

              {/* Clients Tab */}
              <TabsContent value="clients" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{clientAccounts.length} client accounts</p>
                  <Button size="sm" onClick={() => setClientDialogOpen(true)} className="gap-1">
                    <UserPlus className="h-3 w-3" /> Add Client
                  </Button>
                </div>
                {clientAccounts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-sm">No client accounts yet. Add one to enable login.</p>
                ) : (
                  <div className="space-y-2">
                    {clientAccounts.map((acc: any) => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{acc.full_name || acc.email}</p>
                          <p className="text-xs text-muted-foreground">{acc.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={acc.is_active ? 'default' : 'secondary'} className="text-xs">
                            {acc.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                          {acc.last_login_at && (
                            <span className="text-xs text-muted-foreground">
                              Last: {format(new Date(acc.last_login_at), 'MMM dd')}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">{acc.login_count || 0} logins</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-4">
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6 text-sm">No messages yet.</p>
                  ) : messages.map((msg: any) => (
                    <div key={msg.id} className={`p-3 rounded-lg border ${msg.sender_type === 'client' ? 'bg-blue-50/50' : 'bg-muted/30'}`}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-medium">{msg.sender_name || msg.sender_type}</span>
                        <span>{format(new Date(msg.created_at), 'MMM dd, h:mm a')}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  ))}
                </div>
                {selectedPortal && (
                  <div className="flex gap-2">
                    <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply to client..." />
                    <Button size="sm" onClick={() => {
                      if (replyText.trim()) {
                        replyMutation.mutate({ portalId: selectedPortal.id, message: replyText.trim() });
                        setReplyText('');
                      }
                    }}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground">Total Logins</p>
                      <p className="text-xl font-bold">{loginCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground">Page Views</p>
                      <p className="text-xl font-bold">{pageViews}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground">Doc Downloads</p>
                      <p className="text-xl font-bold">{docDownloads}</p>
                    </CardContent>
                  </Card>
                </div>
                {analytics.length > 0 && (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {analytics.slice(0, 20).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded border">
                        <Badge variant="outline" className="text-[10px]">{a.event_type}</Badge>
                        <span className="text-muted-foreground">{a.page_path}</span>
                        <span className="text-muted-foreground">{format(new Date(a.created_at), 'MMM dd, h:mm a')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Portal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {editId ? 'Configure Portal' : 'Create Client Portal'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client Name *</Label>
              <Input value={form.customer_name} onChange={e => {
                const name = e.target.value;
                setForm({ ...form, customer_name: name, portal_slug: form.portal_slug || generateSlug(name) });
              }} placeholder="Client company name" />
            </div>
            <div>
              <Label>Portal Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/portal/</span>
                <Input value={form.portal_slug} onChange={e => setForm({ ...form, portal_slug: e.target.value })} />
              </div>
            </div>

            {/* Branding */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Palette className="h-4 w-4" /> Branding</h4>
              <div className="flex items-center gap-3">
                <Label>Primary Color</Label>
                <Input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })}
                  className="h-8 w-16 p-0 border-0" />
                <span className="text-xs text-muted-foreground">{form.primary_color}</span>
              </div>
              <div>
                <Label>Company Name Override</Label>
                <Input value={form.company_name_override} onChange={e => setForm({ ...form, company_name_override: e.target.value })}
                  placeholder="Override display name (optional)" />
              </div>
              <div>
                <Label>Welcome Message</Label>
                <Textarea value={form.welcome_message} onChange={e => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Welcome to your client portal!" rows={2} />
              </div>
              <div>
                <Label>Footer Text</Label>
                <Input value={form.footer_text} onChange={e => setForm({ ...form, footer_text: e.target.value })}
                  placeholder="Custom footer text (optional)" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.white_label} onCheckedChange={v => setForm({ ...form, white_label: v })} />
                <Label>White-Label (remove all branding)</Label>
              </div>
            </div>

            {/* Visible Sections */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Visible Sections</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'show_projects', label: 'Projects' },
                  { key: 'show_invoices', label: 'Invoices' },
                  { key: 'show_documents', label: 'Documents' },
                  { key: 'show_change_orders', label: 'Change Orders' },
                  { key: 'show_messages', label: 'Messages' },
                  { key: 'show_retainers', label: 'Retainers' },
                  { key: 'show_files', label: 'Shared Files' },
                  { key: 'show_pay_button', label: 'Pay Now Button' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <Switch checked={(form as any)[opt.key]} onCheckedChange={v => setForm({ ...form, [opt.key]: v })} />
                    <Label className="text-sm">{opt.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Permissions</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.allow_client_uploads} onCheckedChange={v => setForm({ ...form, allow_client_uploads: v })} />
                  <Label className="text-sm">Allow client document uploads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.allow_co_approval} onCheckedChange={v => setForm({ ...form, allow_co_approval: v })} />
                  <Label className="text-sm">Allow change order approval</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_enabled} onCheckedChange={v => setForm({ ...form, is_enabled: v })} />
              <Label>Portal Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.customer_name || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : editId ? 'Update' : 'Create Portal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Client Account Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Add Client Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input value={clientForm.full_name} onChange={e => setClientForm({ ...clientForm, full_name: e.target.value })}
                placeholder="John Doe" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="client@company.com" />
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })}
                placeholder="Set a password" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder="+966..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => addClientMutation.mutate(clientForm)}
              disabled={!clientForm.email || !clientForm.password || addClientMutation.isPending}>
              {addClientMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
