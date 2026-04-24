import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useApprovalInbox, UnifiedApprovalItem } from '@/hooks/useApprovalInbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, isAfter, subDays } from 'date-fns';
import {
  Inbox, CheckCircle2, XCircle, ExternalLink, Filter, Clock, AlertTriangle,
  ShoppingCart, FileText, CalendarDays, Factory, DollarSign, Layers,
  BarChart3, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules', icon: Layers },
  { value: 'sales_order', label: 'Sales Orders', icon: ShoppingCart },
  { value: 'purchase_order', label: 'Purchase Orders', icon: FileText },
  { value: 'leave_request', label: 'Leave Requests', icon: CalendarDays },
  { value: 'material_request', label: 'Material Requests', icon: Factory },
  { value: 'finance_gate', label: 'Finance Gates', icon: DollarSign },
  { value: 'approval_request', label: 'Workflow Approvals', icon: Layers },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const MODULE_COLORS: Record<string, string> = {
  sales_order: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purchase_order: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  leave_request: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  material_request: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  finance_gate: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  approval_request: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const MODULE_LABELS: Record<string, string> = {
  sales_order: 'Sales Order',
  purchase_order: 'Purchase Order',
  leave_request: 'Leave Request',
  material_request: 'Material Request',
  finance_gate: 'Finance Gate',
  approval_request: 'Workflow',
};

export default function ApprovalInbox() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useApprovalInbox();

  const [moduleFilter, setModuleFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionDialog, setActionDialog] = useState<{ item: UnifiedApprovalItem; action: 'approve' | 'reject' } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const departments = useMemo(() => {
    const set = new Set(items.map(i => i.department).filter(Boolean));
    return Array.from(set) as string[];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (moduleFilter !== 'all' && item.module !== moduleFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.documentNumber.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.requesterName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, moduleFilter, priorityFilter, departmentFilter, searchQuery]);

  // Dashboard stats
  const stats = useMemo(() => {
    const byDept: Record<string, number> = {};
    let overdue = 0;
    const threeDaysAgo = subDays(new Date(), 3);

    items.forEach(item => {
      const dept = item.department || 'Other';
      byDept[dept] = (byDept[dept] || 0) + 1;
      if (item.dueDate && isAfter(new Date(), new Date(item.dueDate))) {
        overdue++;
      } else if (!item.dueDate && isAfter(threeDaysAgo, new Date(item.createdAt))) {
        overdue++;
      }
    });

    return { total: items.length, overdue, byDept };
  }, [items]);

  const handleAction = async () => {
    if (!actionDialog) return;
    setActionLoading(true);
    try {
      const { item, action } = actionDialog;
      const { data: { user } } = await supabase.auth.getUser();

      if (item.module === 'purchase_order') {
        const update: any = action === 'approve'
          ? { approval_status: 'approved', approved_by: user?.id, approved_by_name: user?.email, approved_at: new Date().toISOString() }
          : { approval_status: 'rejected', rejected_by: user?.id, rejected_reason: actionComment };
        await supabase.from('purchase_orders').update(update).eq('id', item.sourceId);
      } else if (item.module === 'leave_request') {
        const update: any = action === 'approve'
          ? { status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: actionComment }
          : { status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_notes: actionComment };
        await supabase.from('leave_requests').update(update).eq('id', item.sourceId);
      } else if (item.module === 'material_request') {
        const update: any = action === 'approve'
          ? { status: 'approved' }
          : { status: 'rejected' };
        await supabase.from('material_requests').update(update).eq('id', item.sourceId);
      } else if (item.module === 'approval_request') {
        // Use the existing approval actions
        if (action === 'approve') {
          await (supabase.from('approval_requests' as any).update({ status: 'approved', final_approved_at: new Date().toISOString(), final_approved_by: user?.id }).eq('id', item.sourceId) as any);
        } else {
          await (supabase.from('approval_requests' as any).update({ status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: user?.id, rejection_reason: actionComment }).eq('id', item.sourceId) as any);
        }
      }

      toast.success(action === 'approve' ? (isAr ? 'تمت الموافقة' : 'Approved successfully') : (isAr ? 'تم الرفض' : 'Rejected successfully'));
      qc.invalidateQueries({ queryKey: ['approval-inbox'] });
      setActionDialog(null);
      setActionComment('');
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            {isAr ? 'صندوق الموافقات' : 'Approval Inbox'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr ? 'جميع الموافقات المعلقة في مكان واحد' : 'All pending approvals across modules in one place'}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {stats.total} {isAr ? 'معلق' : 'Pending'}
        </Badge>
      </div>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Clock className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي المعلقة' : 'Total Pending'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'متأخرة' : 'Overdue'}</p>
            </div>
          </CardContent>
        </Card>
        {Object.entries(stats.byDept).slice(0, 2).map(([dept, count]) => (
          <Card key={dept}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><BarChart3 className="h-5 w-5 text-secondary-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{dept}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department breakdown */}
      {Object.keys(stats.byDept).length > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{isAr ? 'حسب القسم' : 'By Department'}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stats.byDept).map(([dept, count]) => (
              <Badge key={dept} variant="secondary" className="cursor-pointer" onClick={() => setDepartmentFilter(dept)}>
                {dept}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search documents...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODULE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          {(moduleFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all' || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => { setModuleFilter('all'); setPriorityFilter('all'); setDepartmentFilter('all'); setSearchQuery(''); }}>
              {isAr ? 'مسح' : 'Clear'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'الوحدة' : 'Module'}</TableHead>
                <TableHead>{isAr ? 'المستند' : 'Document'}</TableHead>
                <TableHead className="hidden md:table-cell">{isAr ? 'الطالب' : 'Requester'}</TableHead>
                <TableHead className="hidden md:table-cell">{isAr ? 'القسم' : 'Department'}</TableHead>
                <TableHead>{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead className="hidden lg:table-cell">{isAr ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className="text-center">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {isAr ? 'لا توجد موافقات معلقة' : 'No pending approvals'}
                </TableCell></TableRow>
              ) : filtered.map(item => {
                const isOverdue = item.dueDate ? isAfter(new Date(), new Date(item.dueDate)) : isAfter(subDays(new Date(), 3), new Date(item.createdAt));
                return (
                  <TableRow key={item.id} className={cn(isOverdue && 'bg-destructive/5')}>
                    <TableCell>
                      <Badge className={cn('text-[10px]', MODULE_COLORS[item.module])}>
                        {MODULE_LABELS[item.module]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{item.documentNumber}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">{item.title}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{item.requesterName || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{item.department || '—'}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {item.amount != null ? item.amount.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', PRIORITY_COLORS[item.priority])}>
                        {item.priority}
                      </Badge>
                      {isOverdue && <Badge variant="destructive" className="text-[10px] ml-1">Overdue</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {/* Only allow approve/reject for actionable modules */}
                        {['purchase_order', 'leave_request', 'material_request', 'approval_request'].includes(item.module) && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="Approve"
                              onClick={() => { setActionDialog({ item, action: 'approve' }); setActionComment(''); }}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Reject"
                              onClick={() => { setActionDialog({ item, action: 'reject' }); setActionComment(''); }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Open Document"
                          onClick={() => navigate(item.sourceRoute)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              {isAr ? `عرض ${filtered.length} من ${items.length}` : `Showing ${filtered.length} of ${items.length} items`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'approve' ? (isAr ? 'تأكيد الموافقة' : 'Confirm Approval') : (isAr ? 'تأكيد الرفض' : 'Confirm Rejection')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="font-medium">{actionDialog?.item.documentNumber}</p>
              <p className="text-muted-foreground">{actionDialog?.item.title}</p>
              {actionDialog?.item.amount != null && <p className="mt-1 font-medium">{isAr ? 'المبلغ' : 'Amount'}: {actionDialog.item.amount.toLocaleString()}</p>}
            </div>
            <Textarea
              placeholder={actionDialog?.action === 'reject' ? (isAr ? 'سبب الرفض (مطلوب)' : 'Rejection reason (required)') : (isAr ? 'ملاحظات (اختياري)' : 'Comments (optional)')}
              value={actionComment}
              onChange={e => setActionComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button
              variant={actionDialog?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading || (actionDialog?.action === 'reject' && !actionComment.trim())}
            >
              {actionLoading ? '...' : actionDialog?.action === 'approve' ? (isAr ? 'موافقة' : 'Approve') : (isAr ? 'رفض' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
