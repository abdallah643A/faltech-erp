import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLeaveRequests, useLeaveTypes, useHRManagers, LeaveRequest } from '@/hooks/useLeaveManagement';
import { useEmployees } from '@/hooks/useEmployees';
import { Plus, Check, X, Loader2, Users, ChevronRight, Settings } from 'lucide-react';
import { LeaveRequestDialog } from '@/components/hr/LeaveRequestDialog';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const leaveColumns: ColumnDef[] = [
  { key: 'leave_type', header: 'Leave Type' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'end_date', header: 'End Date' },
  { key: 'days_count', header: 'Days' },
  { key: 'status', header: 'Status' },
  { key: 'approval_stage', header: 'Approval Stage' },
];

export default function LeaveManagement() {
  const { t } = useLanguage();
  const { leaveRequests, isLoading, approveLeaveStage, rejectLeaveRequest } = useLeaveRequests();
  const { leaveTypes } = useLeaveTypes();
  const { employees } = useEmployees();
  const { hrManagers, addHRManager, removeHRManager } = useHRManagers();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [hrSettingsOpen, setHrSettingsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedHREmployee, setSelectedHREmployee] = useState('');

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const processedRequests = leaveRequests.filter(r => r.status !== 'pending');

  const handleAction = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setReviewNotes('');
    setActionDialogOpen(true);
  };

  const getCurrentApprovalStage = (request: LeaveRequest): 'direct_manager' | 'dept_manager' | 'hr_manager' | null => {
    switch (request.approval_stage) {
      case 'pending_direct_manager':
        return 'direct_manager';
      case 'pending_dept_manager':
        return 'dept_manager';
      case 'pending_hr_manager':
        return 'hr_manager';
      default:
        return null;
    }
  };

  const confirmAction = () => {
    if (selectedRequest && actionType) {
      if (actionType === 'approve') {
        const stage = getCurrentApprovalStage(selectedRequest);
        if (stage) {
          approveLeaveStage.mutate({
            id: selectedRequest.id,
            stage,
            notes: reviewNotes,
          });
        }
      } else {
        rejectLeaveRequest.mutate({
          id: selectedRequest.id,
          notes: reviewNotes,
        });
      }
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
  const { t } = useLanguage();

    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{t('common.pending')}</Badge>;
    }
  };

  const getApprovalStageBadge = (stage: string | null) => {
  const { t } = useLanguage();

    switch (stage) {
      case 'pending_direct_manager':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Awaiting Direct Manager</Badge>;
      case 'pending_dept_manager':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Awaiting Dept Manager</Badge>;
      case 'pending_hr_manager':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Awaiting HR Manager</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Fully Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{t('common.pending')}</Badge>;
    }
  };

  const renderApprovalWorkflow = (request: LeaveRequest) => {
    const stages = [
      { 
        label: 'Direct Manager', 
        person: request.direct_manager ? `${request.direct_manager.first_name} ${request.direct_manager.last_name}` : 'Not Assigned',
        approved: !!request.direct_manager_approved_at,
        notes: request.direct_manager_notes,
      },
      { 
        label: 'Dept Manager', 
        person: request.dept_manager ? `${request.dept_manager.first_name} ${request.dept_manager.last_name}` : 'Not Assigned',
        approved: !!request.dept_manager_approved_at,
        notes: request.dept_manager_notes,
      },
      { 
        label: 'HR Manager', 
        person: request.hr_manager ? `${request.hr_manager.first_name} ${request.hr_manager.last_name}` : 'Not Assigned',
        approved: !!request.hr_manager_approved_at,
        notes: request.hr_manager_notes,
      },
    ];

    return (
      <div className="flex items-center gap-1 text-xs">
        {stages.map((stage, idx) => (
          <Tooltip key={stage.label}>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <div className={`px-2 py-1 rounded ${
                  stage.approved 
                    ? 'bg-green-100 text-green-700' 
                    : request.approval_stage === 'rejected' 
                      ? 'bg-red-100 text-red-700'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {stage.approved ? '✓' : idx + 1}
                </div>
                {idx < stages.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-medium">{stage.label}</p>
                <p>{stage.person}</p>
                {stage.approved && <p className="text-green-600">✓ Approved</p>}
                {stage.notes && <p className="text-muted-foreground mt-1">{stage.notes}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  };

  const handleAddHRManager = () => {
    if (selectedHREmployee) {
      addHRManager.mutate(selectedHREmployee);
      setSelectedHREmployee('');
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Leave Management</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage employee leave requests with 3-level approval</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={leaveRequests} columns={leaveColumns} filename="leave-requests" title="Leave Requests" />
          <Button variant="outline" size="sm" onClick={() => setHrSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">HR Settings</span>
          </Button>
          <Button size="sm" onClick={() => setRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Leave Request</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      <Card className="bg-muted/50 hidden sm:block">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-medium">1</div>
              <span>Direct Manager</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">2</div>
              <span>Department Manager</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-medium">3</div>
              <span>HR Manager</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium">✓</div>
              <span>Approved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending requests</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('hr.employee')}</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="hidden md:table-cell">Period</TableHead>
                      <TableHead className="hidden sm:table-cell">Days</TableHead>
                      <TableHead className="hidden lg:table-cell">Approval Stage</TableHead>
                      <TableHead className="hidden lg:table-cell">Workflow</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.employee?.employee_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.leave_type?.name}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{request.total_days}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {getApprovalStageBadge(request.approval_stage)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {renderApprovalWorkflow(request)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleAction(request, 'approve')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleAction(request, 'reject')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : processedRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No processed requests</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('hr.employee')}</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="hidden md:table-cell">Period</TableHead>
                      <TableHead className="hidden sm:table-cell">Days</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead className="hidden lg:table-cell">Workflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.employee?.employee_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.leave_type?.name}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{request.total_days}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {renderApprovalWorkflow(request)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LeaveRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        employees={employees}
        leaveTypes={leaveTypes}
      />

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' 
                ? `This will approve at the current stage (${selectedRequest?.approval_stage?.replace('pending_', '').replace('_', ' ')}).`
                : 'This will reject the leave request at the current stage.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Add notes (optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={actionType === 'reject' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HR Settings Dialog */}
      <Dialog open={hrSettingsOpen} onOpenChange={setHrSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              HR Manager Settings
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Designate employees who can perform HR Manager approvals for leave requests.
            </p>
            
            <div className="space-y-2">
              <Label>Add HR Manager</Label>
              <div className="flex gap-2">
                <Select value={selectedHREmployee} onValueChange={setSelectedHREmployee}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(e => !hrManagers.some(hm => hm.employee_id === e.id))
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddHRManager} disabled={!selectedHREmployee || addHRManager.isPending}>
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current HR Managers</Label>
              {hrManagers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No HR Managers assigned</p>
              ) : (
                <div className="space-y-2">
                  {hrManagers.map((hm: any) => (
                    <div key={hm.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">
                        {hm.employee?.first_name} {hm.employee?.last_name} ({hm.employee?.employee_code})
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => removeHRManager.mutate(hm.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
