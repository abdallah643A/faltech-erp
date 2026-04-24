import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Search, MoreVertical, Eye, Edit, Trash2, Filter, Printer, Send, CheckCircle, XCircle, Settings, ShoppingCart, X } from 'lucide-react';
import { useMaterialRequests, useMaterialRequestLines, MaterialRequest } from '@/hooks/useMaterialRequests';
import { useMRApprovalActions, useMRApprovers } from '@/hooks/useMRWorkflow';
import { MaterialRequestFormDialog } from '@/components/material-request/MaterialRequestFormDialog';
import { MaterialRequestPrintDialog } from '@/components/material-request/MaterialRequestPrintDialog';
import { MRApprovalStatus } from '@/components/material-request/MRApprovalStatus';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-primary/10 text-primary',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function MaterialRequests() {
  const { language } = useLanguage();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { materialRequests, isLoading, createMaterialRequest, updateMaterialRequest, deleteMaterialRequest } = useMaterialRequests();
  const { approvers } = useMRApprovers();
  const { submitForApproval, approveLevel1, approveLevel2, approveLevel3, rejectRequest, getApprovalStatus } = useMRApprovalActions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [viewingRequestId, setViewingRequestId] = useState<string | undefined>(undefined);
  const [defaultProjectName, setDefaultProjectName] = useState<string>('');
  
  const { lines: viewingLines } = useMaterialRequestLines(viewingRequestId);

  // Fetch procurement_start alerts
  const { data: procurementAlerts } = useQuery({
    queryKey: ['procurement-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`*, sales_order:sales_orders(doc_num, customer_name, contract_value)`)
        .eq('alert_type', 'procurement_start')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('finance_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['procurement-alerts'] }),
  });

  // Complete procurement phase
  const completeProcurement = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('complete_procurement_phase', { p_project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-alerts'] });
      toast({ title: 'Procurement completed', description: 'Project advanced to Manufacturing phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error completing procurement', description: error.message, variant: 'destructive' });
    },
  });

  const filteredRequests = (materialRequests || []).filter((mr) => {
    const matchesSearch =
      mr.mr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mr.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mr.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || mr.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = (projectName?: string) => {
    setSelectedRequest(null);
    setDefaultProjectName(projectName || '');
    setIsFormOpen(true);
  };

  const handleEdit = (mr: MaterialRequest) => {
    setViewingRequestId(mr.id);
    setSelectedRequest(mr);
    setIsFormOpen(true);
  };

  const handleView = (mr: MaterialRequest) => {
    setViewingRequestId(mr.id);
    setSelectedRequest(mr);
    setIsPrintOpen(true);
  };

  const handlePrint = (mr: MaterialRequest) => {
    setViewingRequestId(mr.id);
    setSelectedRequest(mr);
    setIsPrintOpen(true);
  };

  const handleSubmit = (data: { request: Partial<MaterialRequest>; lines: any[] }) => {
    if (selectedRequest?.id) {
      updateMaterialRequest.mutate({ id: selectedRequest.id, ...data }, {
        onSuccess: () => setIsFormOpen(false),
      });
    } else {
      createMaterialRequest.mutate(data, {
        onSuccess: () => setIsFormOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) {
      deleteMaterialRequest.mutate(id);
    }
  };

  const canApproveLevel = (mr: MaterialRequest, level: number): boolean => {
    const approvalStatus = getApprovalStatus(mr);
    const levelApprovers = approvers?.filter(a => a.approval_level === level && a.is_active) || [];
    const isDesignatedApprover = levelApprovers.some(a => a.user_id === user?.id);
    const isAdmin = hasRole('admin');
    
    if (level === 1 && approvalStatus.status === 'pending_level_1') {
      return isDesignatedApprover || isAdmin;
    }
    if (level === 2 && approvalStatus.status === 'pending_level_2') {
      return isDesignatedApprover || isAdmin;
    }
    if (level === 3 && approvalStatus.status === 'pending_level_3') {
      return isDesignatedApprover || isAdmin;
    }
    return false;
  };

  const handleApprove = (mr: MaterialRequest) => {
    const approvalStatus = getApprovalStatus(mr);
    if (approvalStatus.status === 'pending_level_1') {
      approveLevel1.mutate(mr.id);
    } else if (approvalStatus.status === 'pending_level_2') {
      approveLevel2.mutate(mr.id);
    } else if (approvalStatus.status === 'pending_level_3') {
      approveLevel3.mutate(mr.id);
    }
  };

  const getCurrentApprovalLevel = (mr: MaterialRequest): number => {
    const status = getApprovalStatus(mr);
    if (status.status === 'pending_level_1') return 1;
    if (status.status === 'pending_level_2') return 2;
    if (status.status === 'pending_level_3') return 3;
    return 0;
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'طلبات المواد' : 'Material Requests'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إدارة طلبات المواد والمشتريات' : 'Manage material and procurement requests'}
          </p>
        </div>
        <div className="flex gap-2">
          <SAPSyncButton entity="purchase_request" />
          {hasRole('admin') && (
            <Button variant="outline" onClick={() => navigate('/material-requests/workflow-settings')} className="gap-2">
              <Settings className="h-4 w-4" />
              {language === 'ar' ? 'إعدادات سير العمل' : 'Workflow Settings'}
            </Button>
          )}
          <Button onClick={() => handleCreate()} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'طلب جديد' : 'New Request'}
          </Button>
        </div>
      </div>

      {/* Procurement Alerts */}
      {procurementAlerts && procurementAlerts.length > 0 && (
        <div className="space-y-3">
          {procurementAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="border-purple-500 bg-purple-50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200">
              <ShoppingCart className="h-4 w-4 !text-purple-600" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resolveAlert.mutate(alert.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {alert.description}
                {alert.sales_order && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">SO-{alert.sales_order.doc_num}</Badge>
                    <span className="text-xs">{alert.sales_order.customer_name}</span>
                    {alert.sales_order.contract_value && (
                      <Badge variant="secondary" className="text-xs">{alert.sales_order.contract_value.toLocaleString()} SAR</Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-end mt-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleCreate(alert.sales_order?.customer_name || '')}>
                    <Plus className="h-4 w-4 mr-1" />Create Material Request
                  </Button>
                  {alert.project_id && (
                    <Button size="sm" onClick={() => completeProcurement.mutate(alert.project_id)} disabled={completeProcurement.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" />Complete Procurement
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="enterprise-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
              <SelectItem value="draft">{language === 'ar' ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</SelectItem>
              <SelectItem value="approved">{language === 'ar' ? 'موافق عليه' : 'Approved'}</SelectItem>
              <SelectItem value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="enterprise-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'ar' ? 'رقم الطلب' : 'MR#'}</TableHead>
              <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead>{language === 'ar' ? 'المشروع' : 'Project'}</TableHead>
              <TableHead>{language === 'ar' ? 'القسم' : 'Department'}</TableHead>
              <TableHead>{language === 'ar' ? 'حالة الموافقة' : 'Approval Status'}</TableHead>
              <TableHead className="text-right">{language === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {language === 'ar' ? 'لا توجد طلبات' : 'No requests found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((mr) => {
                const approvalStatus = getApprovalStatus(mr);
                const currentLevel = getCurrentApprovalLevel(mr);
                const canApprove = currentLevel > 0 && canApproveLevel(mr, currentLevel);
                
                return (
                  <TableRow key={mr.id}>
                    <TableCell className="font-medium">{mr.mr_number}</TableCell>
                    <TableCell>{format(new Date(mr.request_date), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{mr.project_name || '-'}</TableCell>
                    <TableCell>{mr.department || '-'}</TableCell>
                    <TableCell>
                      <MRApprovalStatus materialRequest={mr} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Submit for Approval Button */}
                        {mr.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => submitForApproval.mutate(mr.id)}
                            className="gap-1"
                          >
                            <Send className="h-3 w-3" />
                            {language === 'ar' ? 'إرسال' : 'Submit'}
                          </Button>
                        )}
                        
                        {/* Approve Button */}
                        {canApprove && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(mr)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {language === 'ar' ? `موافقة ${currentLevel}` : `Approve L${currentLevel}`}
                          </Button>
                        )}
                        
                        {/* Reject Button */}
                        {canApprove && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectRequest.mutate(mr.id)}
                            className="gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            {language === 'ar' ? 'رفض' : 'Reject'}
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(mr)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'عرض' : 'View'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(mr)}>
                              <Printer className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'طباعة' : 'Print'}
                            </DropdownMenuItem>
                            {mr.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleEdit(mr)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(mr.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {language === 'ar' ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <MaterialRequestFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        materialRequest={selectedRequest ? { ...selectedRequest, lines: viewingLines || [] } : null}
        onSubmit={handleSubmit}
        defaultProjectName={defaultProjectName}
      />

      {/* Print Dialog */}
      <MaterialRequestPrintDialog
        open={isPrintOpen}
        onOpenChange={setIsPrintOpen}
        materialRequest={selectedRequest}
        lines={viewingLines || []}
      />
    </div>
  );
}
