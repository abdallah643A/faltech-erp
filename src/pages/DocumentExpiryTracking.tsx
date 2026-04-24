import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, Calendar, Clock, FileText, Plus, Search, Shield, RefreshCw,
  AlertCircle, CheckCircle2, XCircle, Eye, Edit, Trash2, History, Bell, Filter,
  Building2, Users, Truck, Briefcase, CreditCard, HardHat, FileCheck, RotateCcw
} from 'lucide-react';
import { useDocumentExpiry, useRenewalHistory, DOCUMENT_TYPES, DocumentExpiryRecord } from '@/hooks/useDocumentExpiry';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const URGENCY_CONFIG: Record<string, { label: string; color: string; variant: 'destructive' | 'default' | 'secondary' | 'outline'; icon: React.ReactNode }> = {
  expired: { label: 'Expired', color: 'text-red-600', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
  critical: { label: 'Critical', color: 'text-red-500', variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" /> },
  warning: { label: 'Warning', color: 'text-orange-500', variant: 'default', icon: <AlertCircle className="h-4 w-4" /> },
  attention: { label: 'Attention', color: 'text-yellow-500', variant: 'secondary', icon: <Clock className="h-4 w-4" /> },
  normal: { label: 'Normal', color: 'text-green-500', variant: 'outline', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  contract: <FileText className="h-4 w-4" />,
  license: <Shield className="h-4 w-4" />,
  certificate: <FileCheck className="h-4 w-4" />,
  employee_id: <Users className="h-4 w-4" />,
  visa: <CreditCard className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  equipment_permit: <HardHat className="h-4 w-4" />,
  vendor_registration: <Building2 className="h-4 w-4" />,
  project_approval: <Briefcase className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

function StatsCards({ stats }: { stats: ReturnType<typeof useDocumentExpiry>['stats'] }) {
  const cards = [
    { label: 'Total Documents', value: stats.total, icon: <FileText className="h-5 w-5" />, color: 'text-foreground' },
    { label: 'Expired', value: stats.expired, icon: <XCircle className="h-5 w-5" />, color: 'text-red-500' },
    { label: 'Critical (≤7 days)', value: stats.critical, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-500' },
    { label: 'Warning (≤30 days)', value: stats.warning, icon: <AlertCircle className="h-5 w-5" />, color: 'text-orange-500' },
    { label: 'Attention (≤90 days)', value: stats.attention, icon: <Clock className="h-5 w-5" />, color: 'text-yellow-500' },
    { label: 'Auto-Renew', value: stats.autoRenew, icon: <RefreshCw className="h-5 w-5" />, color: 'text-blue-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className={c.color}>{c.icon}</span>
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getDaysRemaining(expiryDate: string) {
  return differenceInDays(new Date(expiryDate), new Date());
}

function CreateEditDialog({ open, onOpenChange, record, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: DocumentExpiryRecord | null;
  onSave: (data: Partial<DocumentExpiryRecord>) => void;
}) {
  const [form, setForm] = useState<Partial<DocumentExpiryRecord>>(record || {
    document_type: 'contract',
    document_name: '',
    document_number: '',
    expiry_date: '',
    issue_date: '',
    owner_name: '',
    description: '',
    notes: '',
    auto_renew: false,
    reminder_days: [90, 60, 30, 7, 1],
    related_entity_type: '',
    related_entity_name: '',
  });

  const handleSubmit = () => {
    if (!form.document_name || !form.expiry_date) {
      toast.error('Document name and expiry date are required');
      return;
    }
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Document' : 'Add Document for Tracking'}</DialogTitle>
          <DialogDescription>Track expiry dates, set reminders, and manage renewals.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={form.document_type || 'contract'} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Document Number</Label>
            <Input value={form.document_number || ''} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} placeholder="e.g. LIC-2024-001" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Document Name *</Label>
            <Input value={form.document_name || ''} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} placeholder="e.g. Trade License" />
          </div>
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <Input type="date" value={form.issue_date || ''} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Expiry Date *</Label>
            <Input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Responsible Person</Label>
            <Input value={form.owner_name || ''} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Owner name" />
          </div>
          <div className="space-y-2">
            <Label>Related Entity Type</Label>
            <Select value={form.related_entity_type || ''} onValueChange={v => setForm(f => ({ ...f, related_entity_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Related Entity Name</Label>
            <Input value={form.related_entity_name || ''} onChange={e => setForm(f => ({ ...f, related_entity_name: e.target.value }))} placeholder="e.g. John Doe, Vendor ABC..." />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Reminder Schedule (days before expiry)</Label>
            <Input
              value={(form.reminder_days || []).join(', ')}
              onChange={e => setForm(f => ({ ...f, reminder_days: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) }))}
              placeholder="90, 60, 30, 7, 1"
            />
            <p className="text-[10px] text-muted-foreground">Comma-separated days before expiry to send reminders</p>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Switch checked={form.auto_renew || false} onCheckedChange={v => setForm(f => ({ ...f, auto_renew: v }))} />
            <Label>Auto-Renew (mark for automatic renewal processing)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>{record ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewDialog({ open, onOpenChange, record, onRenew }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record: DocumentExpiryRecord | null;
  onRenew: (data: { documentId: string; newExpiryDate: string; renewalCost?: number; renewalNotes?: string }) => void;
}) {
  const [newExpiry, setNewExpiry] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!newExpiry || !record) {
      toast.error('New expiry date is required');
      return;
    }
    onRenew({
      documentId: record.id,
      newExpiryDate: newExpiry,
      renewalCost: cost ? parseFloat(cost) : undefined,
      renewalNotes: notes || undefined,
    });
    onOpenChange(false);
    setNewExpiry('');
    setCost('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew Document</DialogTitle>
          <DialogDescription>{record?.document_name} — Current expiry: {record?.expiry_date}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Expiry Date *</Label>
            <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Renewal Cost</Label>
            <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Renewal Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-1"><RotateCcw className="h-4 w-4" /> Renew</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewalHistoryDialog({ open, onOpenChange, documentId, documentName }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string | null;
  documentName: string;
}) {
  const { data: history = [], isLoading } = useRenewalHistory(documentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Renewal History</DialogTitle>
          <DialogDescription>{documentName}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No renewal history yet</p>
          ) : (
            <div className="space-y-3">
              {history.map(h => (
                <Card key={h.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {h.previous_expiry_date} → {h.new_expiry_date}
                      </span>
                      {h.renewal_cost && (
                        <Badge variant="outline">{h.renewal_cost.toLocaleString()} SAR</Badge>
                      )}
                    </div>
                    {h.renewal_notes && <p className="text-xs text-muted-foreground">{h.renewal_notes}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      By {h.renewed_by_name || 'Unknown'} · {formatDistanceToNow(new Date(h.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentExpiryTracking() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DocumentExpiryRecord | null>(null);
  const [renewRecord, setRenewRecord] = useState<DocumentExpiryRecord | null>(null);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [historyDocName, setHistoryDocName] = useState('');

  const { records, isLoading, stats, createRecord, updateRecord, deleteRecord, renewDocument } = useDocumentExpiry({
    type: typeFilter,
    urgency: urgencyFilter,
    status: statusFilter,
  });

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r =>
      r.document_name.toLowerCase().includes(q) ||
      r.document_number?.toLowerCase().includes(q) ||
      r.owner_name?.toLowerCase().includes(q) ||
      r.related_entity_name?.toLowerCase().includes(q)
    );
  }, [records, search]);

  const handleSave = (data: Partial<DocumentExpiryRecord>) => {
    if (editRecord) {
      updateRecord.mutate({ id: editRecord.id, ...data }, {
        onSuccess: () => { toast.success('Document updated'); setEditRecord(null); },
        onError: () => toast.error('Failed to update'),
      });
    } else {
      createRecord.mutate(data, {
        onSuccess: () => toast.success('Document added for tracking'),
        onError: () => toast.error('Failed to create'),
      });
    }
  };

  const handleRenew = (data: { documentId: string; newExpiryDate: string; renewalCost?: number; renewalNotes?: string }) => {
    renewDocument.mutate(data, {
      onSuccess: () => toast.success('Document renewed successfully'),
      onError: () => toast.error('Failed to renew'),
    });
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Document Expiry & Renewal Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track contracts, licenses, certificates, visas, insurance, permits, and more
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Document
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search documents..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Document Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Urgency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="attention">Attention</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="renewed">Renewed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reminders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No documents found. Click "Add Document" to start tracking.</TableCell></TableRow>
                ) : (
                  filtered.map(r => {
                    const days = getDaysRemaining(r.expiry_date);
                    const uc = URGENCY_CONFIG[r.urgency] || URGENCY_CONFIG.normal;
                    return (
                      <TableRow key={r.id} className={r.urgency === 'expired' ? 'bg-destructive/5' : r.urgency === 'critical' ? 'bg-red-500/5' : ''}>
                        <TableCell>{TYPE_ICONS[r.document_type] || TYPE_ICONS.other}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{r.document_name}</p>
                            {r.document_number && <p className="text-[10px] text-muted-foreground">{r.document_number}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {DOCUMENT_TYPES.find(t => t.value === r.document_type)?.label || r.document_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.related_entity_name ? (
                            <div>
                              <p className="text-xs">{r.related_entity_name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{r.related_entity_type}</p>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{r.owner_name || '—'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(r.expiry_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${uc.color}`}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={uc.variant} className="gap-1 text-[10px]">
                            {uc.icon} {uc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{r.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Bell className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {(r.reminder_days || []).join(', ')}d
                            </span>
                            {r.auto_renew && (
                              <Tooltip>
                                <TooltipTrigger><RefreshCw className="h-3 w-3 text-blue-500" /></TooltipTrigger>
                                <TooltipContent>Auto-Renew enabled</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenewRecord(r); }}>
                                  <RotateCcw className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Renew</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  setHistoryDocId(r.id);
                                  setHistoryDocName(r.document_name);
                                }}>
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Renewal History</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditRecord(r); }}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                  if (confirm('Delete this document?')) {
                                    deleteRecord.mutate(r.id, {
                                      onSuccess: () => toast.success('Deleted'),
                                    });
                                  }
                                }}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateEditDialog
          open={createOpen || !!editRecord}
          onOpenChange={v => { if (!v) { setCreateOpen(false); setEditRecord(null); } }}
          record={editRecord}
          onSave={handleSave}
        />
        <RenewDialog
          open={!!renewRecord}
          onOpenChange={v => { if (!v) setRenewRecord(null); }}
          record={renewRecord}
          onRenew={handleRenew}
        />
        <RenewalHistoryDialog
          open={!!historyDocId}
          onOpenChange={v => { if (!v) setHistoryDocId(null); }}
          documentId={historyDocId}
          documentName={historyDocName}
        />
      </div>
  );
}

