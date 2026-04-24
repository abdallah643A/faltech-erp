import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle2, XCircle, Clock, RotateCcw, MessageSquare, User, Calendar, AlertTriangle } from 'lucide-react';

const sampleApprovals = [
  { id: 'APR-001', title: 'Concrete pour approval – Column Grid C1-C5', type: 'Inspection', status: 'Pending', requester: 'Eng. Ahmed', date: '2026-04-13', project: 'Al-Noor Tower', priority: 'High', slaHours: 24, elapsed: 6 },
  { id: 'APR-002', title: 'NCR-001 corrective action sign-off', type: 'NCR', status: 'Pending', requester: 'Eng. Khalid', date: '2026-04-12', project: 'Al-Noor Tower', priority: 'Critical', slaHours: 48, elapsed: 30 },
  { id: 'APR-003', title: 'Waterproofing rework approval', type: 'Defect', status: 'Pending', requester: 'Eng. Omar', date: '2026-04-11', project: 'Riyadh Metro Hub', priority: 'High', slaHours: 24, elapsed: 48 },
  { id: 'APR-004', title: 'Material receiving – Steel batch #42 rejection', type: 'Material', status: 'Approved', requester: 'Eng. Fahad', date: '2026-04-09', project: 'Riyadh Metro Hub', priority: 'Medium', slaHours: 24, elapsed: 12 },
  { id: 'APR-005', title: 'Mock-up room final sign-off', type: 'Handover', status: 'Approved', requester: 'Eng. Hassan', date: '2026-04-08', project: 'King Fahd Complex', priority: 'Medium', slaHours: 72, elapsed: 48 },
  { id: 'APR-006', title: 'Fire stopping checklist review', type: 'Checklist', status: 'Rejected', requester: 'Eng. Youssef', date: '2026-04-07', project: 'King Fahd Complex', priority: 'High', slaHours: 24, elapsed: 28 },
  { id: 'APR-007', title: 'Rebar placement re-inspection', type: 'Inspection', status: 'Returned', requester: 'Eng. Tariq', date: '2026-04-06', project: 'Al-Noor Tower', priority: 'Low', slaHours: 48, elapsed: 20 },
];

const statusColor: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-800', 'Approved': 'bg-green-100 text-green-800',
  'Rejected': 'bg-red-100 text-red-800', 'Returned': 'bg-blue-100 text-blue-800',
};

export function QAQCApprovals() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [approvalTab, setApprovalTab] = useState('pending');

  const pendingItems = sampleApprovals.filter(a => a.status === 'Pending');
  const approvedItems = sampleApprovals.filter(a => a.status === 'Approved');
  const rejectedItems = sampleApprovals.filter(a => a.status === 'Rejected');
  const returnedItems = sampleApprovals.filter(a => a.status === 'Returned');

  const renderItems = (items: typeof sampleApprovals) => (
    <div className="space-y-3">
      {items.map(apr => {
        const isOverdue = apr.elapsed > apr.slaHours;
        return (
          <Card key={apr.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg shrink-0 ${apr.status === 'Pending' ? isOverdue ? 'bg-red-50 dark:bg-red-950' : 'bg-amber-50 dark:bg-amber-950' : apr.status === 'Approved' ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  {apr.status === 'Approved' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : apr.status === 'Rejected' ? <XCircle className="h-5 w-5 text-red-600" /> : apr.status === 'Returned' ? <RotateCcw className="h-5 w-5 text-blue-600" /> : isOverdue ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <Clock className="h-5 w-5 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{apr.id}</p>
                      <h4 className="text-sm font-medium">{apr.title}</h4>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${statusColor[apr.status]}`}>{apr.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{apr.requester}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{apr.date}</span>
                    <Badge variant="outline" className="text-[9px]">{apr.type}</Badge>
                    <Badge variant="outline" className="text-[9px]">{apr.project}</Badge>
                    {isOverdue && <Badge variant="destructive" className="text-[9px]">SLA Exceeded</Badge>}
                  </div>
                  {apr.status === 'Pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />{isAr ? 'موافقة' : 'Approve'}</Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs"><XCircle className="h-3 w-3 mr-1" />{isAr ? 'رفض' : 'Reject'}</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"><RotateCcw className="h-3 w-3 mr-1" />{isAr ? 'إرجاع' : 'Return'}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"><MessageSquare className="h-3 w-3 mr-1" />{isAr ? 'تعليق' : 'Comment'}</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{isAr ? 'لا توجد عناصر' : 'No items'}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={`cursor-pointer hover:shadow-md transition-all ${approvalTab === 'pending' ? 'ring-2 ring-amber-500' : ''}`} onClick={() => setApprovalTab('pending')}>
          <CardContent className="p-3 text-center"><Clock className="h-5 w-5 mx-auto text-amber-600 mb-1" /><div className="text-lg font-bold">{pendingItems.length}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'بانتظار' : 'Pending'}</p></CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-all ${approvalTab === 'approved' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setApprovalTab('approved')}>
          <CardContent className="p-3 text-center"><CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" /><div className="text-lg font-bold">{approvedItems.length}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'معتمدة' : 'Approved'}</p></CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-all ${approvalTab === 'rejected' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setApprovalTab('rejected')}>
          <CardContent className="p-3 text-center"><XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" /><div className="text-lg font-bold">{rejectedItems.length}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'مرفوضة' : 'Rejected'}</p></CardContent>
        </Card>
        <Card className={`cursor-pointer hover:shadow-md transition-all ${approvalTab === 'returned' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setApprovalTab('returned')}>
          <CardContent className="p-3 text-center"><RotateCcw className="h-5 w-5 mx-auto text-blue-600 mb-1" /><div className="text-lg font-bold">{returnedItems.length}</div><p className="text-[11px] text-muted-foreground">{isAr ? 'مرجعة' : 'Returned'}</p></CardContent>
        </Card>
      </div>

      <Tabs value={approvalTab} onValueChange={setApprovalTab}>
        <TabsList>
          <TabsTrigger value="pending">{isAr ? 'بانتظار' : 'Pending'} ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="approved">{isAr ? 'معتمدة' : 'Approved'}</TabsTrigger>
          <TabsTrigger value="rejected">{isAr ? 'مرفوضة' : 'Rejected'}</TabsTrigger>
          <TabsTrigger value="returned">{isAr ? 'مرجعة' : 'Returned'}</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{renderItems(pendingItems)}</TabsContent>
        <TabsContent value="approved">{renderItems(approvedItems)}</TabsContent>
        <TabsContent value="rejected">{renderItems(rejectedItems)}</TabsContent>
        <TabsContent value="returned">{renderItems(returnedItems)}</TabsContent>
      </Tabs>
    </div>
  );
}
