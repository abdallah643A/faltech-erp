import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Shield, MessageSquare, Bell, FileCheck, Star,
  Search, Plus, Eye, CheckCircle, XCircle, Clock,
  FileText, TrendingUp, AlertTriangle, Send, BarChart3,
  Upload, Calendar, Package, Receipt, Globe
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { toast } from 'sonner';
import { useSupplierHub } from '@/hooks/useSupplierHub';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  inactive: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/20 text-blue-400',
  under_review: 'bg-yellow-500/20 text-yellow-400',
  accepted: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  approved: 'bg-green-500/20 text-green-400',
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  expired: 'bg-red-500/20 text-red-400',
  expiring_soon: 'bg-orange-500/20 text-orange-400',
  acknowledged: 'bg-green-500/20 text-green-400',
  matched: 'bg-green-500/20 text-green-400',
  mismatch: 'bg-red-500/20 text-red-400',
  partial_match: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  disputed: 'bg-red-500/20 text-red-400',
  sent: 'bg-blue-500/20 text-blue-400',
  resolved: 'bg-green-500/20 text-green-400',
};

export default function SupplierHub() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [newAccount, setNewAccount] = useState({ email: '', contact_name: '', contact_phone: '', portal_role: 'vendor', password_hash: '' });
  const [newMessage, setNewMessage] = useState({ thread_key: '', message: '' });
  const [reminderOpen, setReminderOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ portal_account_id: '', reminder_type: 'document_expiry', title: '', due_date: '', message: '' });

  const hub = useSupplierHub();

  const accounts = hub.portalAccounts.data || [];
  const interactionList = hub.interactions.data || [];
  const messageList = hub.messages.data || [];
  const reminderList = hub.reminders.data || [];
  const documentList = hub.documents.data || [];
  const rfqList = hub.rfqResponses.data || [];
  const poAckList = hub.poAcknowledgements.data || [];
  const invoiceList = hub.invoiceSubmissions.data || [];
  const scorecardList = hub.scorecards.data || [];

  const activeAccounts = accounts.filter((a: any) => a.is_active).length;
  const pendingDocs = documentList.filter((d: any) => d.status === 'pending_review').length;
  const pendingInvoices = invoiceList.filter((i: any) => i.approval_status === 'submitted').length;
  const pendingRfqs = rfqList.filter((r: any) => r.status === 'submitted').length;
  const unreadMessages = messageList.filter((m: any) => !m.is_read && m.sender_type === 'supplier').length;
  const pendingReminders = reminderList.filter((r: any) => r.status === 'pending').length;
  const expiringDocs = documentList.filter((d: any) => d.expiry_date && differenceInDays(new Date(d.expiry_date), new Date()) <= 30 && differenceInDays(new Date(d.expiry_date), new Date()) > 0).length;
  const expiredDocs = documentList.filter((d: any) => d.expiry_date && isPast(new Date(d.expiry_date))).length;

  const filteredAccounts = accounts.filter((a: any) =>
    !search || a.email?.toLowerCase().includes(search.toLowerCase()) || a.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAccount = () => {
    if (!newAccount.email || !newAccount.password_hash) { toast.error('Email and password required'); return; }
    hub.createAccount.mutate(newAccount, {
      onSuccess: () => { setCreateAccountOpen(false); setNewAccount({ email: '', contact_name: '', contact_phone: '', portal_role: 'vendor', password_hash: '' }); }
    });
  };

  return (
    <div className="space-y-6 p-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" /> Supplier & Subcontractor Hub
          </h1>
          <p className="text-sm text-muted-foreground">Central management for all external supplier and subcontractor interactions</p>
        </div>
        <Button onClick={() => setCreateAccountOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Portal Account</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Portal Accounts', value: activeAccounts, icon: Users, color: 'text-primary' },
          { label: 'Pending RFQs', value: pendingRfqs, icon: FileText, color: 'text-blue-400' },
          { label: 'Pending Invoices', value: pendingInvoices, icon: Receipt, color: 'text-yellow-400' },
          { label: 'Pending Docs', value: pendingDocs, icon: FileCheck, color: 'text-orange-400' },
          { label: 'Unread Messages', value: unreadMessages, icon: MessageSquare, color: 'text-green-400' },
          { label: 'Reminders', value: pendingReminders, icon: Bell, color: 'text-purple-400' },
          { label: 'Expiring Docs', value: expiringDocs, icon: AlertTriangle, color: 'text-orange-400' },
          { label: 'Expired Docs', value: expiredDocs, icon: XCircle, color: 'text-red-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="submissions">Submission Queue</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="documents">Documents & Compliance</TabsTrigger>
            <TabsTrigger value="doc-expiry">Doc Expiry Monitor</TabsTrigger>
            <TabsTrigger value="ncr">NCR Response</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Interactions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Recent Interactions</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {interactionList.length === 0 ? <p className="text-sm text-muted-foreground py-4">No interactions yet</p> :
                    interactionList.slice(0, 20).map((i: any) => (
                      <div key={i.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {i.interaction_type === 'login' ? <Users className="h-4 w-4 text-primary" /> :
                           i.interaction_type?.includes('rfq') ? <FileText className="h-4 w-4 text-blue-400" /> :
                           i.interaction_type?.includes('invoice') ? <Receipt className="h-4 w-4 text-yellow-400" /> :
                           <Globe className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{(i as any).supplier_portal_accounts?.contact_name || (i as any).supplier_portal_accounts?.email || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{i.interaction_type?.replace(/_/g, ' ')} {i.entity_reference ? `• ${i.entity_reference}` : ''}</p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(i.created_at), 'dd MMM HH:mm')}</p>
                      </div>
                    ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Pending Actions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Pending Actions</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {pendingRfqs > 0 && <div className="flex items-center justify-between p-2 rounded bg-blue-500/10"><span className="text-sm"><FileText className="h-4 w-4 inline mr-2 text-blue-400" />{pendingRfqs} RFQ responses to review</span><Button size="sm" variant="outline" onClick={() => setActiveTab('submissions')}>Review</Button></div>}
                    {pendingInvoices > 0 && <div className="flex items-center justify-between p-2 rounded bg-yellow-500/10"><span className="text-sm"><Receipt className="h-4 w-4 inline mr-2 text-yellow-400" />{pendingInvoices} invoices to process</span><Button size="sm" variant="outline" onClick={() => setActiveTab('submissions')}>Review</Button></div>}
                    {pendingDocs > 0 && <div className="flex items-center justify-between p-2 rounded bg-orange-500/10"><span className="text-sm"><FileCheck className="h-4 w-4 inline mr-2 text-orange-400" />{pendingDocs} documents to review</span><Button size="sm" variant="outline" onClick={() => setActiveTab('documents')}>Review</Button></div>}
                    {expiringDocs > 0 && <div className="flex items-center justify-between p-2 rounded bg-orange-500/10"><span className="text-sm"><Calendar className="h-4 w-4 inline mr-2 text-orange-400" />{expiringDocs} documents expiring within 30 days</span><Button size="sm" variant="outline" onClick={() => setActiveTab('documents')}>View</Button></div>}
                    {expiredDocs > 0 && <div className="flex items-center justify-between p-2 rounded bg-red-500/10"><span className="text-sm"><XCircle className="h-4 w-4 inline mr-2 text-red-400" />{expiredDocs} expired documents</span><Button size="sm" variant="outline" onClick={() => setActiveTab('documents')}>View</Button></div>}
                    {pendingRfqs === 0 && pendingInvoices === 0 && pendingDocs === 0 && expiringDocs === 0 && expiredDocs === 0 && <p className="text-sm text-muted-foreground py-4">No pending actions</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Scorecard Summary */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4" />Top Supplier Scores</CardTitle></CardHeader>
            <CardContent>
              {scorecardList.length === 0 ? <p className="text-sm text-muted-foreground">No scorecards available. Run scorecard calculation from the Scorecards tab.</p> :
                <Table>
                  <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Overall</TableHead><TableHead>Delivery</TableHead><TableHead>Quality</TableHead><TableHead>Price</TableHead><TableHead>Responsiveness</TableHead><TableHead>Compliance</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {scorecardList.slice(0, 10).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.vendor_name}</TableCell>
                        <TableCell><Badge className={s.overall_score >= 80 ? 'bg-green-500/20 text-green-400' : s.overall_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>{s.overall_score?.toFixed(0)}%</Badge></TableCell>
                        <TableCell>{s.delivery_score?.toFixed(0)}%</TableCell>
                        <TableCell>{s.quality_score?.toFixed(0)}%</TableCell>
                        <TableCell>{s.price_score?.toFixed(0)}%</TableCell>
                        <TableCell>{s.responsiveness_score?.toFixed(0)}%</TableCell>
                        <TableCell>{s.invoice_accuracy_score?.toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                    <TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Logins</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hub.portalAccounts.isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow> :
                   filteredAccounts.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No portal accounts found</TableCell></TableRow> :
                   filteredAccounts.map((a: any) => {
                     const perms = a.permissions || {};
                     return (
                       <TableRow key={a.id}>
                         <TableCell className="font-medium">{a.contact_name || '-'}</TableCell>
                         <TableCell>{a.email}</TableCell>
                         <TableCell><Badge variant="outline">{a.portal_role}</Badge></TableCell>
                         <TableCell><Badge className={a.is_active ? statusColors.active : statusColors.inactive}>{a.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                         <TableCell className="text-sm text-muted-foreground">{a.last_login_at ? format(new Date(a.last_login_at), 'dd MMM yyyy HH:mm') : 'Never'}</TableCell>
                         <TableCell>{a.login_count || 0}</TableCell>
                         <TableCell>
                           <div className="flex gap-1 flex-wrap">
                             {perms.view_rfqs && <Badge variant="outline" className="text-[10px]">RFQs</Badge>}
                             {perms.submit_quotes && <Badge variant="outline" className="text-[10px]">Quotes</Badge>}
                             {perms.view_pos && <Badge variant="outline" className="text-[10px]">POs</Badge>}
                             {perms.submit_invoices && <Badge variant="outline" className="text-[10px]">Invoices</Badge>}
                             {perms.view_payments && <Badge variant="outline" className="text-[10px]">Payments</Badge>}
                           </div>
                         </TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONBOARDING TAB */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Onboarding Pipeline */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Onboarding Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Registration', 'Document Upload', 'Compliance Review', 'Approval', 'Active'].map((stage, idx) => {
                    const stageAccounts = accounts.filter((a: any) => {
                      const onboardingStage = a.permissions?.onboarding_stage || (a.is_active ? 'Active' : 'Registration');
                      return onboardingStage === stage;
                    });
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 4 ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>{idx + 1}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{stage}</span>
                            <Badge variant="outline">{stageAccounts.length}</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className="bg-primary rounded-full h-1.5" style={{ width: `${accounts.length > 0 ? (stageAccounts.length / accounts.length) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Onboarding Checklist */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" />Vendor Onboarding Checklist</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Company registration (CR)', required: true },
                    { label: 'Tax registration (VAT)', required: true },
                    { label: 'Bank details & IBAN', required: true },
                    { label: 'Insurance certificate', required: true },
                    { label: 'Trade license', required: false },
                    { label: 'ISO certifications', required: false },
                    { label: 'GOSI certificate', required: true },
                    { label: 'Saudization certificate', required: false },
                    { label: 'References (min 3)', required: true },
                    { label: 'Signed NDA', required: false },
                    { label: 'Vendor questionnaire', required: true },
                    { label: 'Sample products / capability statement', required: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50">
                      <div className="h-4 w-4 rounded border border-border" />
                      <span className="text-sm flex-1">{item.label}</span>
                      {item.required && <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/30">Required</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Onboarding Activity */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Onboarding Activity</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Stage</TableHead><TableHead>Docs Uploaded</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {accounts.filter((a: any) => !a.is_active || (a.permissions?.onboarding_stage && a.permissions.onboarding_stage !== 'Active')).length === 0 ?
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No vendors in onboarding pipeline</TableCell></TableRow> :
                    accounts.filter((a: any) => !a.is_active || (a.permissions?.onboarding_stage && a.permissions.onboarding_stage !== 'Active')).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.contact_name || '-'}</TableCell>
                        <TableCell>{a.email}</TableCell>
                        <TableCell><Badge variant="outline">{a.portal_role}</Badge></TableCell>
                        <TableCell><Badge>{a.permissions?.onboarding_stage || 'Registration'}</Badge></TableCell>
                        <TableCell>{documentList.filter((d: any) => d.portal_account_id === a.id).length}</TableCell>
                        <TableCell><Badge className={a.is_active ? statusColors.active : statusColors.pending}>{a.is_active ? 'Active' : 'Pending'}</Badge></TableCell>
                        <TableCell>
                          {!a.is_active && (
                            <Button size="sm" variant="outline" onClick={() => hub.updateAccount.mutate({ id: a.id, is_active: true })}>
                              <CheckCircle className="h-3 w-3 mr-1" />Activate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBMISSION QUEUE TAB */}
        <TabsContent value="submissions" className="space-y-4">
          {/* RFQ Responses */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">RFQ Responses ({rfqList.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>RFQ#</TableHead><TableHead>Amount</TableHead><TableHead>Delivery</TableHead><TableHead>Validity</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rfqList.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No RFQ responses</TableCell></TableRow> :
                   rfqList.map((r: any) => (
                     <TableRow key={r.id}>
                       <TableCell className="font-medium">{r.vendor_name || '-'}</TableCell>
                       <TableCell className="font-mono text-sm">{r.rfq_number || '-'}</TableCell>
                       <TableCell>{r.total_amount?.toLocaleString()} {r.currency}</TableCell>
                       <TableCell>{r.delivery_days ? `${r.delivery_days} days` : '-'}</TableCell>
                       <TableCell>{r.validity_days ? `${r.validity_days} days` : '-'}</TableCell>
                       <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                       <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                       <TableCell>
                         {r.status === 'submitted' && <div className="flex gap-1">
                           <Button size="sm" variant="outline" className="text-green-400" onClick={() => hub.reviewRfqResponse.mutate({ id: r.id, status: 'accepted' })}><CheckCircle className="h-3 w-3" /></Button>
                           <Button size="sm" variant="outline" className="text-red-400" onClick={() => hub.reviewRfqResponse.mutate({ id: r.id, status: 'rejected' })}><XCircle className="h-3 w-3" /></Button>
                         </div>}
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* PO Acknowledgements */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">PO Acknowledgements ({poAckList.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>PO#</TableHead><TableHead>Status</TableHead><TableHead>Original Delivery</TableHead><TableHead>Confirmed Delivery</TableHead><TableHead>Notes</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {poAckList.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No PO acknowledgements</TableCell></TableRow> :
                   poAckList.map((p: any) => (
                     <TableRow key={p.id}>
                       <TableCell className="font-mono text-sm">{p.po_number || '-'}</TableCell>
                       <TableCell><Badge className={statusColors[p.acknowledgement_status] || ''}>{p.acknowledgement_status}</Badge></TableCell>
                       <TableCell>{p.original_delivery_date ? format(new Date(p.original_delivery_date), 'dd MMM yyyy') : '-'}</TableCell>
                       <TableCell>{p.confirmed_delivery_date ? format(new Date(p.confirmed_delivery_date), 'dd MMM yyyy') : '-'}</TableCell>
                       <TableCell className="max-w-[200px] truncate">{p.notes || '-'}</TableCell>
                       <TableCell className="text-sm text-muted-foreground">{format(new Date(p.created_at), 'dd MMM yyyy')}</TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Invoice Submissions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Invoice Submissions ({invoiceList.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Invoice#</TableHead><TableHead>PO#</TableHead><TableHead>Amount</TableHead><TableHead>Matching</TableHead><TableHead>Approval</TableHead><TableHead>Submitted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {invoiceList.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No invoice submissions</TableCell></TableRow> :
                   invoiceList.map((inv: any) => (
                     <TableRow key={inv.id}>
                       <TableCell className="font-medium">{inv.vendor_name || '-'}</TableCell>
                       <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                       <TableCell className="font-mono text-sm">{inv.po_number || '-'}</TableCell>
                       <TableCell>{inv.total_amount?.toLocaleString()} {inv.currency}</TableCell>
                       <TableCell><Badge className={statusColors[inv.matching_status] || ''}>{inv.matching_status}</Badge></TableCell>
                       <TableCell><Badge className={statusColors[inv.approval_status] || ''}>{inv.approval_status}</Badge></TableCell>
                       <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), 'dd MMM yyyy')}</TableCell>
                       <TableCell>
                         {inv.approval_status === 'submitted' && <div className="flex gap-1">
                           <Button size="sm" variant="outline" className="text-green-400" onClick={() => hub.reviewInvoice.mutate({ id: inv.id, status: 'approved' })}><CheckCircle className="h-3 w-3" /></Button>
                           <Button size="sm" variant="outline" className="text-red-400" onClick={() => hub.reviewInvoice.mutate({ id: inv.id, status: 'rejected' })}><XCircle className="h-3 w-3" /></Button>
                         </div>}
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMUNICATIONS TAB */}
        <TabsContent value="communications">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Communication Timeline</CardTitle>
                <Button size="sm" onClick={() => setMessageOpen(true)}><Send className="h-3 w-3 mr-1" />Send Message</Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {messageList.length === 0 ? <p className="text-sm text-muted-foreground py-4">No messages yet</p> :
                  messageList.map((m: any) => (
                    <div key={m.id} className={`flex gap-3 py-3 border-b last:border-0 ${m.sender_type === 'supplier' ? '' : 'bg-muted/30 -mx-4 px-4'}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${m.sender_type === 'supplier' ? 'bg-blue-500/20' : 'bg-primary/20'}`}>
                        {m.sender_type === 'supplier' ? <Globe className="h-4 w-4 text-blue-400" /> : <Users className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{m.sender_name || (m as any).supplier_portal_accounts?.contact_name || 'Unknown'}</span>
                          <Badge variant="outline" className="text-[10px]">{m.sender_type}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{format(new Date(m.created_at), 'dd MMM yyyy HH:mm')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Thread: {m.thread_key}</p>
                        <p className="text-sm">{m.message}</p>
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS & COMPLIANCE TAB */}
        <TabsContent value="documents">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead><TableHead>Document</TableHead><TableHead>Type</TableHead>
                    <TableHead>Issue Date</TableHead><TableHead>Expiry</TableHead><TableHead>Days Left</TableHead>
                    <TableHead>OCR</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentList.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No documents uploaded</TableCell></TableRow> :
                   documentList.map((d: any) => {
                     const daysLeft = d.expiry_date ? differenceInDays(new Date(d.expiry_date), new Date()) : null;
                     const urgency = daysLeft !== null ? (daysLeft < 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-red-400' : daysLeft <= 30 ? 'text-orange-400' : daysLeft <= 90 ? 'text-yellow-400' : 'text-green-400') : '';
                     return (
                       <TableRow key={d.id}>
                         <TableCell className="font-medium">{(d as any).supplier_portal_accounts?.contact_name || '-'}</TableCell>
                         <TableCell>{d.document_name}</TableCell>
                         <TableCell><Badge variant="outline">{d.document_type?.replace(/_/g, ' ')}</Badge></TableCell>
                         <TableCell className="text-sm">{d.issue_date ? format(new Date(d.issue_date), 'dd MMM yyyy') : '-'}</TableCell>
                         <TableCell className="text-sm">{d.expiry_date ? format(new Date(d.expiry_date), 'dd MMM yyyy') : '-'}</TableCell>
                         <TableCell className={`font-medium ${urgency}`}>{daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : '-'}</TableCell>
                         <TableCell><Badge variant="outline" className="text-[10px]">{d.ocr_status}</Badge></TableCell>
                         <TableCell><Badge className={statusColors[d.status] || ''}>{d.status?.replace(/_/g, ' ')}</Badge></TableCell>
                         <TableCell>
                           {d.status === 'pending_review' && <div className="flex gap-1">
                             <Button size="sm" variant="outline" className="text-green-400" onClick={() => hub.reviewDocument.mutate({ id: d.id, status: 'approved' })}><CheckCircle className="h-3 w-3" /></Button>
                             <Button size="sm" variant="outline" className="text-red-400" onClick={() => hub.reviewDocument.mutate({ id: d.id, status: 'rejected' })}><XCircle className="h-3 w-3" /></Button>
                           </div>}
                         </TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENT EXPIRY MONITOR TAB */}
        <TabsContent value="doc-expiry" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Document Expiry Dashboard</CardTitle></CardHeader>
            <CardContent>
              {/* Urgency buckets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Expired', filter: (d: any) => d.expiry_date && isPast(new Date(d.expiry_date)), color: 'text-red-400 bg-red-500/10', border: 'border-red-500/30' },
                  { label: 'Critical (≤7d)', filter: (d: any) => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), new Date()) <= 7, color: 'text-orange-400 bg-orange-500/10', border: 'border-orange-500/30' },
                  { label: 'Warning (≤30d)', filter: (d: any) => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), new Date()) > 7 && differenceInDays(new Date(d.expiry_date), new Date()) <= 30, color: 'text-yellow-400 bg-yellow-500/10', border: 'border-yellow-500/30' },
                  { label: 'Attention (≤90d)', filter: (d: any) => d.expiry_date && !isPast(new Date(d.expiry_date)) && differenceInDays(new Date(d.expiry_date), new Date()) > 30 && differenceInDays(new Date(d.expiry_date), new Date()) <= 90, color: 'text-blue-400 bg-blue-500/10', border: 'border-blue-500/30' },
                ].map(bucket => {
                  const count = documentList.filter(bucket.filter).length;
                  return (
                    <Card key={bucket.label} className={`p-3 text-center border ${bucket.border}`}>
                      <p className={`text-2xl font-bold ${bucket.color.split(' ')[0]}`}>{count}</p>
                      <p className="text-[10px] text-muted-foreground">{bucket.label}</p>
                    </Card>
                  );
                })}
              </div>

              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Document Type</TableHead><TableHead>Expiry Date</TableHead><TableHead>Days Left</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {documentList.filter((d: any) => d.expiry_date).sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()).length === 0 ?
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents with expiry dates</TableCell></TableRow> :
                    documentList.filter((d: any) => d.expiry_date).sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()).map((d: any) => {
                      const daysLeft = differenceInDays(new Date(d.expiry_date), new Date());
                      const isExpired = isPast(new Date(d.expiry_date));
                      const urgency = isExpired ? 'Expired' : daysLeft <= 7 ? 'Critical' : daysLeft <= 30 ? 'Warning' : daysLeft <= 90 ? 'Attention' : 'OK';
                      const urgencyColor = isExpired ? 'bg-red-500/20 text-red-400' : daysLeft <= 7 ? 'bg-orange-500/20 text-orange-400' : daysLeft <= 30 ? 'bg-yellow-500/20 text-yellow-400' : daysLeft <= 90 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400';
                      return (
                        <TableRow key={d.id} className={isExpired ? 'bg-red-500/5' : ''}>
                          <TableCell className="font-medium">{(d as any).supplier_portal_accounts?.contact_name || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{d.document_type?.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell>{format(new Date(d.expiry_date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className={`font-bold ${isExpired ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : ''}`}>{isExpired ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}</TableCell>
                          <TableCell><Badge className={urgencyColor}>{urgency}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => hub.createReminder.mutate({ portal_account_id: d.portal_account_id, reminder_type: 'document_expiry', title: `Renew: ${d.document_type}`, due_date: d.expiry_date, message: `Document ${d.document_type} expires on ${d.expiry_date}` })}>
                              <Bell className="h-3 w-3 mr-1" />Remind
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NCR RESPONSE TAB */}
        <TabsContent value="ncr" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Non-Conformance Reports (NCR)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Open NCRs', count: interactionList.filter((i: any) => i.interaction_type === 'ncr_issued' && !interactionList.some((r: any) => r.interaction_type === 'ncr_response' && r.entity_reference === i.entity_reference)).length, color: 'text-red-400' },
                  { label: 'Responded', count: interactionList.filter((i: any) => i.interaction_type === 'ncr_response').length, color: 'text-green-400' },
                  { label: 'Pending Review', count: interactionList.filter((i: any) => i.interaction_type === 'ncr_response' && i.metadata?.status === 'pending_review').length, color: 'text-yellow-400' },
                  { label: 'Closed', count: interactionList.filter((i: any) => i.interaction_type === 'ncr_closed').length, color: 'text-muted-foreground' },
                ].map(kpi => (
                  <Card key={kpi.label} className="p-3 text-center"><p className={`text-2xl font-bold ${kpi.color}`}>{kpi.count}</p><p className="text-[10px] text-muted-foreground">{kpi.label}</p></Card>
                ))}
              </div>

              <Table>
                <TableHeader><TableRow><TableHead>NCR #</TableHead><TableHead>Vendor</TableHead><TableHead>Issue</TableHead><TableHead>Severity</TableHead><TableHead>Issued</TableHead><TableHead>Response</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {interactionList.filter((i: any) => i.interaction_type?.startsWith('ncr')).length === 0 ?
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No NCR records. NCRs are created from quality inspections.</TableCell></TableRow> :
                    interactionList.filter((i: any) => i.interaction_type?.startsWith('ncr')).map((ncr: any) => (
                      <TableRow key={ncr.id}>
                        <TableCell className="font-mono font-medium">{ncr.entity_reference || '-'}</TableCell>
                        <TableCell>{(ncr as any).supplier_portal_accounts?.contact_name || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{ncr.metadata?.description || ncr.notes || '-'}</TableCell>
                        <TableCell><Badge variant={ncr.metadata?.severity === 'critical' ? 'destructive' : 'outline'}>{ncr.metadata?.severity || 'medium'}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(ncr.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-sm">{ncr.metadata?.response_date ? format(new Date(ncr.metadata.response_date), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell><Badge className={ncr.interaction_type === 'ncr_closed' ? 'bg-muted text-muted-foreground' : ncr.interaction_type === 'ncr_response' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{ncr.interaction_type?.replace('ncr_', '').replace(/_/g, ' ')}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REMINDERS TAB */}
        <TabsContent value="reminders" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Reminder Engine</h3>
            <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Create Reminder</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Reminder</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={newReminder.portal_account_id} onValueChange={v => setNewReminder(p => ({ ...p, portal_account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.contact_name || a.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newReminder.reminder_type} onValueChange={v => setNewReminder(p => ({ ...p, reminder_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document_expiry">Document Expiry</SelectItem>
                      <SelectItem value="rfq_response">RFQ Response Due</SelectItem>
                      <SelectItem value="po_acknowledgement">PO Acknowledgement</SelectItem>
                      <SelectItem value="invoice_pending">Invoice Pending</SelectItem>
                      <SelectItem value="compliance_renewal">Compliance Renewal</SelectItem>
                      <SelectItem value="custom">Custom Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Reminder Title" value={newReminder.title} onChange={e => setNewReminder(p => ({ ...p, title: e.target.value }))} />
                  <Input type="date" value={newReminder.due_date} onChange={e => setNewReminder(p => ({ ...p, due_date: e.target.value }))} />
                  <Textarea placeholder="Message..." value={newReminder.message} onChange={e => setNewReminder(p => ({ ...p, message: e.target.value }))} />
                  <Button className="w-full" onClick={() => {
                    if (!newReminder.portal_account_id || !newReminder.title) { toast.error('Vendor and title required'); return; }
                    hub.createReminder.mutate(newReminder, { onSuccess: () => { setReminderOpen(false); setNewReminder({ portal_account_id: '', reminder_type: 'document_expiry', title: '', due_date: '', message: '' }); } });
                  }}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Reminder KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 text-center"><p className="text-2xl font-bold text-red-400">{reminderList.filter((r: any) => r.status === 'pending' && r.due_date && new Date(r.due_date) < new Date()).length}</p><p className="text-[10px] text-muted-foreground">Overdue</p></Card>
            <Card className="p-3 text-center"><p className="text-2xl font-bold text-orange-400">{reminderList.filter((r: any) => r.status === 'pending').length}</p><p className="text-[10px] text-muted-foreground">Pending</p></Card>
            <Card className="p-3 text-center"><p className="text-2xl font-bold text-blue-400">{reminderList.filter((r: any) => r.status === 'sent').length}</p><p className="text-[10px] text-muted-foreground">Sent</p></Card>
            <Card className="p-3 text-center"><p className="text-2xl font-bold text-green-400">{reminderList.filter((r: any) => r.status === 'resolved').length}</p><p className="text-[10px] text-muted-foreground">Resolved</p></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {reminderList.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reminders configured</TableCell></TableRow> :
                    reminderList.map((r: any) => {
                      const isOverdue = r.due_date && new Date(r.due_date) < new Date() && r.status === 'pending';
                      return (
                        <TableRow key={r.id} className={isOverdue ? 'bg-red-500/5' : ''}>
                          <TableCell className="font-medium">{(r as any).supplier_portal_accounts?.contact_name || (r as any).supplier_portal_accounts?.email || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{r.reminder_type?.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell>{r.title}</TableCell>
                          <TableCell className={isOverdue ? 'text-red-400 font-medium' : ''}>{r.due_date ? format(new Date(r.due_date), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell><Badge className={statusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                          <TableCell>
                            {r.status === 'pending' && <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => hub.updateReminder.mutate({ id: r.id, status: 'sent' })}><Send className="h-3 w-3 mr-1" />Send</Button>
                              <Button size="sm" variant="outline" onClick={() => hub.updateReminder.mutate({ id: r.id, status: 'resolved' })}><CheckCircle className="h-3 w-3" /></Button>
                            </div>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCORECARDS TAB */}
        <TabsContent value="scorecards">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Supplier Performance Rankings</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Vendor</TableHead><TableHead>Code</TableHead><TableHead>Overall</TableHead><TableHead>Delivery (35%)</TableHead><TableHead>Quality (25%)</TableHead><TableHead>Price (20%)</TableHead><TableHead>Responsiveness (10%)</TableHead><TableHead>Compliance (10%)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scorecardList.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No scorecards. Navigate to Supplier Scorecards to calculate.</TableCell></TableRow> :
                   scorecardList.map((s: any, idx: number) => (
                     <TableRow key={s.id}>
                       <TableCell className="font-bold">{idx + 1}</TableCell>
                       <TableCell className="font-medium">{s.vendor_name}</TableCell>
                       <TableCell className="font-mono text-sm">{s.vendor_code}</TableCell>
                       <TableCell><Badge className={s.overall_score >= 80 ? 'bg-green-500/20 text-green-400' : s.overall_score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}>{s.overall_score?.toFixed(1)}%</Badge></TableCell>
                       <TableCell>{s.delivery_score?.toFixed(1)}%</TableCell>
                       <TableCell>{s.quality_score?.toFixed(1)}%</TableCell>
                       <TableCell>{s.price_score?.toFixed(1)}%</TableCell>
                       <TableCell>{s.responsiveness_score?.toFixed(1)}%</TableCell>
                       <TableCell>{s.invoice_accuracy_score?.toFixed(1)}%</TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT TRAIL TAB */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />Interaction Audit Trail</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Reference</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {interactionList.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No interactions recorded</TableCell></TableRow> :
                     interactionList.map((i: any) => (
                       <TableRow key={i.id}>
                         <TableCell className="text-sm whitespace-nowrap">{format(new Date(i.created_at), 'dd MMM yyyy HH:mm:ss')}</TableCell>
                         <TableCell>{(i as any).supplier_portal_accounts?.contact_name || (i as any).supplier_portal_accounts?.email || '-'}</TableCell>
                         <TableCell><Badge variant="outline">{i.interaction_type?.replace(/_/g, ' ')}</Badge></TableCell>
                         <TableCell>{i.entity_type || '-'}</TableCell>
                         <TableCell className="font-mono text-sm">{i.entity_reference || '-'}</TableCell>
                         <TableCell className="text-xs text-muted-foreground">{i.ip_address || '-'}</TableCell>
                       </TableRow>
                     ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Portal Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={newAccount.email} onChange={e => setNewAccount(p => ({ ...p, email: e.target.value }))} placeholder="supplier@company.com" /></div>
            <div><Label>Contact Name</Label><Input value={newAccount.contact_name} onChange={e => setNewAccount(p => ({ ...p, contact_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={newAccount.contact_phone} onChange={e => setNewAccount(p => ({ ...p, contact_phone: e.target.value }))} /></div>
            <div><Label>Password</Label><Input type="password" value={newAccount.password_hash} onChange={e => setNewAccount(p => ({ ...p, password_hash: e.target.value }))} placeholder="Set initial password" /></div>
            <div><Label>Role</Label>
              <Select value={newAccount.portal_role} onValueChange={v => setNewAccount(p => ({ ...p, portal_role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} disabled={hub.createAccount.isPending}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Message to Supplier</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Account</Label>
              <Select onValueChange={v => setSelectedAccount(v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.contact_name || a.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Thread (e.g. po:123 or rfq:456)</Label><Input value={newMessage.thread_key} onChange={e => setNewMessage(p => ({ ...p, thread_key: e.target.value }))} placeholder="general" /></div>
            <div><Label>Message</Label><Textarea value={newMessage.message} onChange={e => setNewMessage(p => ({ ...p, message: e.target.value }))} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!selectedAccount || !newMessage.message) { toast.error('Select account and enter message'); return; }
              hub.sendMessage.mutate({
                portal_account_id: selectedAccount,
                thread_key: newMessage.thread_key || 'general',
                message: newMessage.message,
                sender_name: 'ERP Admin',
              }, {
                onSuccess: () => { setMessageOpen(false); setNewMessage({ thread_key: '', message: '' }); }
              });
            }} disabled={hub.sendMessage.isPending}><Send className="h-4 w-4 mr-2" />Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
