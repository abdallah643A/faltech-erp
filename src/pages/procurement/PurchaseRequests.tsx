import { useState } from 'react';
import { ConvertPRtoPODialog } from '@/components/procurement/ConvertPRtoPODialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Eye, CheckCircle, XCircle, Link as LinkIcon, FileText, ShoppingCart, MoreVertical, Mail, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { ItemCombobox } from '@/components/items/ItemCombobox';
import { TransactionToolbar } from '@/components/shared/TransactionToolbar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { ClearAllButton } from '@/components/shared/ClearAllButton';
import type { ColumnDef } from '@/utils/exportImportUtils';

const prColumns: ColumnDef[] = [
  { key: 'pr_number', header: 'PR #' },
  { key: 'requester_name', header: 'Requester' },
  { key: 'department', header: 'Department' },
  { key: 'doc_date', header: 'Date' },
  { key: 'required_date', header: 'Required Date' },
  { key: 'status', header: 'Status' },
];
import { usePurchaseRequests } from '@/hooks/useProcurement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartments } from '@/hooks/useEmployees';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { CopyFromPR } from './ProcurementDashboard';
import { useLanguage } from '@/contexts/LanguageContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  partially_ordered: 'bg-yellow-100 text-yellow-800',
  fully_ordered: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface PRLine {
  item_code: string;
  item_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

interface Props {
  onCopyToPQ?: (data: CopyFromPR) => void;
  onCopyToPO?: (data: CopyFromPR) => void;
  autoOpenCreate?: boolean;
}

export default function PurchaseRequests({ onCopyToPQ, onCopyToPO, autoOpenCreate }: Props) {
  const { t } = useLanguage();
  const { purchaseRequests, isLoading, getPRLines, createPurchaseRequest } = usePurchaseRequests();
  const { departments } = useDepartments();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewPR, setViewPR] = useState<any>(null);
  const [viewLines, setViewLines] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConvertPO, setShowConvertPO] = useState(false);
  const [showCreate, setShowCreate] = useState(autoOpenCreate || false);
  const [newPR, setNewPR] = useState({ department: '', required_date: format(new Date(), 'yyyy-MM-dd'), remarks: '' });
  const [newLines, setNewLines] = useState<PRLine[]>([{ item_code: '', item_description: '', quantity: 1, unit: 'EA', unit_price: 0 }]);

  const filtered = purchaseRequests?.filter(pr =>
    pr.pr_number.toLowerCase().includes(search.toLowerCase()) ||
    (pr.requester_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (pr.remarks || '').toLowerCase().includes(search.toLowerCase())
  ) || [];

  const addLine = () => setNewLines([...newLines, { item_code: '', item_description: '', quantity: 1, unit: 'EA', unit_price: 0 }]);
  const removeLine = (i: number) => setNewLines(newLines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof PRLine, value: any) => {
    const updated = [...newLines];
    (updated[i] as any)[field] = value;
    setNewLines(updated);
  };

  const handleCreate = async () => {
    const validLines = newLines.filter(l => l.item_description.trim());
    if (validLines.length === 0) {
      toast({ title: 'Add at least one item line', variant: 'destructive' });
      return;
    }
    createPurchaseRequest.mutate({
      department: newPR.department || undefined,
      required_date: newPR.required_date || undefined,
      remarks: newPR.remarks || undefined,
      lines: validLines,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewPR({ department: '', required_date: format(new Date(), 'yyyy-MM-dd'), remarks: '' });
        setNewLines([{ item_code: '', item_description: '', quantity: 1, unit: 'EA', unit_price: 0 }]);
      },
    });
  };

  const handleView = async (pr: any) => {
    setViewPR(pr);
    const lines = await getPRLines(pr.id);
    setViewLines(lines);
  };

  const handleApprove = async () => {
    if (!viewPR) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_by_name: profile?.full_name,
          approved_at: new Date().toISOString(),
        } as any)
        .eq('id', viewPR.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase Request approved' });
      setViewPR(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!viewPR) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_reason: rejectReason,
        } as any)
        .eq('id', viewPR.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase Request rejected' });
      setViewPR(null);
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyTo = async (pr: any, target: 'pq' | 'po') => {
    const lines = await getPRLines(pr.id);
    const copyData: CopyFromPR = {
      pr_id: pr.id,
      pr_number: pr.pr_number,
      department: pr.department,
      project_id: pr.project_id,
      branch_id: pr.branch_id,
      remarks: pr.remarks,
      lines: lines.map(l => ({
        item_code: l.item_code,
        item_description: l.item_description,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price || 0,
      })),
    };
    if (target === 'pq') onCopyToPQ?.(copyData);
    else onCopyToPO?.(copyData);
    setViewPR(null);
  };

  const canApproveReject = viewPR && viewPR.status === 'open';
  const canCopy = viewPR && (viewPR.status === 'open' || viewPR.status === 'approved');

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Requests</h1>
          <p className="text-muted-foreground">Manage purchase requisitions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransactionToolbar
            onAdd={() => setShowCreate(true)}
            addLabel="New Purchase Request"
            onFind={(q) => setSearch(q)}
          />
          <ExportImportButtons data={filtered} columns={prColumns} filename="purchase-requests" title="Purchase Requests" />
          <SAPSyncButton entity="purchase_request" />
          <ClearAllButton tableName="purchase_requests" displayName="Purchase Requests" queryKeys={['purchase-requests']} relatedTables={['purchase_request_lines']} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search purchase requests..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No purchase requests found. They are auto-created when Material Requests are approved.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR Number</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>{t('hr.department')}</TableHead>
                  <TableHead>Required Date</TableHead>
                  <TableHead>Source MR</TableHead>
                   <TableHead>{t('common.status')}</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(pr => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-mono font-medium">{pr.pr_number}</TableCell>
                    <TableCell>{format(new Date(pr.doc_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{pr.requester_name || '-'}</TableCell>
                    <TableCell>{pr.department || '-'}</TableCell>
                    <TableCell>{pr.required_date ? format(new Date(pr.required_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      {pr.material_request_id ? (
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={() => navigate('/material-requests')}>
                          <LinkIcon className="h-3 w-3 mr-1" /> View MR
                        </Button>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pr.status] || ''}>{pr.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        (pr as any).sync_status === 'synced' ? 'border-success text-success' :
                        (pr as any).sync_status === 'error' ? 'border-destructive text-destructive' :
                        'border-muted-foreground text-muted-foreground'
                      }`}>
                        {(pr as any).sync_status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(pr)}>
                            <Eye className="h-4 w-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyTo(pr, 'pq')}>
                            <FileText className="h-4 w-4 mr-2" /> Copy to Quotation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyTo(pr, 'po')}>
                            <ShoppingCart className="h-4 w-4 mr-2" /> Copy to PO
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" /> Send by Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageCircle className="h-4 w-4 mr-2 text-success" /> Send via WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewPR && !showRejectDialog} onOpenChange={() => setViewPR(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Request: {viewPR?.pr_number}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {viewPR?.doc_date ? format(new Date(viewPR.doc_date), 'dd/MM/yyyy') : '-'}</div>
            <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[viewPR?.status] || ''}>{viewPR?.status}</Badge></div>
            <div><span className="text-muted-foreground">Requester:</span> {viewPR?.requester_name || '-'}</div>
            <div><span className="text-muted-foreground">Department:</span> {viewPR?.department || '-'}</div>
            <div><span className="text-muted-foreground">Required Date:</span> {viewPR?.required_date ? format(new Date(viewPR.required_date), 'dd/MM/yyyy') : '-'}</div>
            <div>
              <span className="text-muted-foreground">Source:</span>{' '}
              {viewPR?.material_request_id ? (
                <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={() => { setViewPR(null); navigate('/material-requests'); }}>
                  <LinkIcon className="h-3 w-3 mr-1" /> Material Request
                </Button>
              ) : 'Manual'}
            </div>
            <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span> {viewPR?.remarks || '-'}</div>
          </div>
          {viewLines.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewLines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_num}</TableCell>
                    <TableCell>{line.item_code || '-'}</TableCell>
                    <TableCell>{line.item_description}</TableCell>
                    <TableCell>{line.quantity}</TableCell>
                    <TableCell>{line.unit || '-'}</TableCell>
                    <TableCell>{line.unit_price?.toFixed(2)}</TableCell>
                    <TableCell>{line.line_total?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            {viewPR?.status === 'approved' && (
              <Button onClick={() => { setShowConvertPO(true); }}>
                <ShoppingCart className="h-4 w-4 mr-1" /> Convert to Purchase Order
              </Button>
            )}
            {canCopy && (
              <>
                <Button variant="outline" onClick={() => handleCopyTo(viewPR, 'pq')}>
                  <FileText className="h-4 w-4 mr-1" /> Copy to Quotation
                </Button>
                <Button variant="outline" onClick={() => handleCopyTo(viewPR, 'po')}>
                  <ShoppingCart className="h-4 w-4 mr-1" /> Copy to PO
                </Button>
              </>
            )}
            {canApproveReject && (
              <>
                <Button variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={actionLoading}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={handleApprove} disabled={actionLoading}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert PR to PO Dialog */}
      {viewPR && (
        <ConvertPRtoPODialog
          open={showConvertPO}
          onOpenChange={setShowConvertPO}
          pr={viewPR}
          prLines={viewLines}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={() => { setShowRejectDialog(false); setRejectReason(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Purchase Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Please provide a reason for rejection:</p>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PR Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('hr.department')}</Label>
              <Select value={newPR.department} onValueChange={v => setNewPR({ ...newPR, department: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Required Date</Label>
              <Input type="date" value={newPR.required_date} onChange={e => setNewPR({ ...newPR, required_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Remarks</Label>
              <Textarea value={newPR.remarks} onChange={e => setNewPR({ ...newPR, remarks: e.target.value })} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="w-[90px]">Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[110px]">Unit Price</TableHead>
                  <TableHead className="w-[100px]">{t('common.total')}</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {newLines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{i + 1}</TableCell>
                    <TableCell>
                      <ItemCombobox
                        value={line.item_code}
                        onSelect={(item) => {
                          if (item) {
                            const updated = [...newLines];
                            updated[i] = { ...updated[i], item_code: item.item_code, item_description: item.description, unit_price: item.default_price || updated[i].unit_price, unit: item.uom || updated[i].unit };
                            setNewLines(updated);
                          } else {
                            updateLine(i, 'item_code', '');
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell><Input value={line.item_description} onChange={e => updateLine(i, 'item_description', e.target.value)} placeholder="Description *" className="h-8 text-xs" /></TableCell>
                    <TableCell><Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} className="h-8 text-xs" min={1} /></TableCell>
                    <TableCell><Input value={line.unit} onChange={e => updateLine(i, 'unit', e.target.value)} className="h-8 text-xs" /></TableCell>
                    <TableCell><Input type="number" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} className="h-8 text-xs" min={0} step={0.01} /></TableCell>
                    <TableCell className="text-xs font-mono">{(line.quantity * line.unit_price).toFixed(2)}</TableCell>
                    <TableCell>
                      {newLines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right text-sm font-semibold">
              Grand Total: {newLines.reduce((s, l) => s + l.quantity * l.unit_price, 0).toFixed(2)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} disabled={createPurchaseRequest.isPending}>
              {createPurchaseRequest.isPending ? 'Creating...' : 'Create Purchase Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
