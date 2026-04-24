import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, ArrowUp, Bell, FileText, Plus, Clock, Mail, Smartphone, CheckCircle, AlertTriangle, Users, Trash2, Edit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'payment_ref', header: 'Payment Ref' },
  { key: 'filename', header: 'Filename' },
  { key: 'uploaded_by', header: 'Uploaded By' },
  { key: 'size', header: 'Size' },
];


export default function BankingWorkflowAutomation() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('approvals');

  // Approval workflows
  const workflows = [
    { id: '1', name: 'Standard Payment Approval', minAmount: 0, maxAmount: 50000, levels: 1, approvers: ['Department Head'], method: 'Any', status: 'active' },
    { id: '2', name: 'High-Value Payment', minAmount: 50001, maxAmount: 200000, levels: 2, approvers: ['Dept Head', 'Finance Manager'], method: 'Sequential', status: 'active' },
    { id: '3', name: 'Critical Payment', minAmount: 200001, maxAmount: null, levels: 3, approvers: ['Dept Head', 'Finance Dir', 'CEO'], method: 'Sequential', status: 'active' },
    { id: '4', name: 'Vendor Type - New Vendor', minAmount: 0, maxAmount: null, levels: 2, approvers: ['Procurement', 'Finance'], method: 'All Required', status: 'active' },
  ];

  // Escalation rules
  const escalations = [
    { id: '1', rule: 'Level 1 timeout', delay: '2 days', escalateTo: 'Department Manager', notifyVia: ['Email', 'SMS'], status: 'active' },
    { id: '2', rule: 'Level 2 timeout', delay: '1 day', escalateTo: 'Finance Director', notifyVia: ['Email', 'SMS', 'Push'], status: 'active' },
    { id: '3', rule: 'Critical overdue', delay: '4 hours', escalateTo: 'CEO', notifyVia: ['SMS', 'Push'], status: 'active' },
    { id: '4', rule: 'Reconciliation exception', delay: '3 days', escalateTo: 'Senior Accountant', notifyVia: ['Email'], status: 'paused' },
  ];

  // Notification templates
  const notifications = [
    { id: '1', event: 'Payment Approved', channels: ['Email', 'Push'], template: 'Payment #{doc_num} of {amount} to {vendor} has been approved.', active: true },
    { id: '2', event: 'Payment Rejected', channels: ['Email', 'Push', 'SMS'], template: 'Payment #{doc_num} rejected. Reason: {reason}', active: true },
    { id: '3', event: 'Low Cash Balance', channels: ['Email', 'SMS'], template: 'Alert: Cash balance ({balance}) below threshold ({threshold}).', active: true },
    { id: '4', event: 'Recon Exception', channels: ['Email'], template: '{count} reconciliation exceptions detected in statement {stmt_ref}.', active: true },
    { id: '5', event: 'Payment Deadline', channels: ['Email', 'Push'], template: 'Reminder: {count} payments due within {days} days.', active: false },
  ];

  // Documents
  const documents = [
    { id: '1', paymentRef: 'PAY-2026-0045', type: 'Invoice', filename: 'INV-2045.pdf', uploadedBy: 'Ahmed K.', date: '2026-03-15', size: '1.2 MB' },
    { id: '2', paymentRef: 'PAY-2026-0045', type: 'PO', filename: 'PO-1089.pdf', uploadedBy: 'Ahmed K.', date: '2026-03-14', size: '0.8 MB' },
    { id: '3', paymentRef: 'PAY-2026-0044', type: 'Receipt', filename: 'receipt-march.pdf', uploadedBy: 'Sara M.', date: '2026-03-13', size: '0.3 MB' },
    { id: '4', paymentRef: 'PAY-2026-0043', type: 'Contract', filename: 'vendor-contract.pdf', uploadedBy: 'Omar H.', date: '2026-03-10', size: '2.1 MB' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflow Automation</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="banking-workflow-automation" title="Banking Workflow Automation" />
          <p className="text-sm text-muted-foreground">Payment approvals, escalations, notifications & document management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="approvals"><Users className="h-3 w-3 mr-1" /> Approvals</TabsTrigger>
          <TabsTrigger value="escalation"><ArrowUp className="h-3 w-3 mr-1" /> Escalation</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3 w-3 mr-1" /> Alerts</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3 w-3 mr-1" /> Documents</TabsTrigger>
        </TabsList>

        {/* Approval Workflows */}
        <TabsContent value="approvals" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure multi-level approval rules by amount, vendor type, and payment method</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
          </div>

          <div className="space-y-3">
            {workflows.map(w => (
              <Card key={w.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{w.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Amount: {w.minAmount.toLocaleString()} - {w.maxAmount ? w.maxAmount.toLocaleString() : '∞'} SAR
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {w.approvers.map((a, i) => (
                          <span key={i} className="flex items-center">
                            <Badge variant="outline" className="text-[10px]">{a}</Badge>
                            {i < w.approvers.length - 1 && <span className="text-muted-foreground mx-1">→</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={w.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{w.levels} levels</Badge>
                      <Button size="sm" variant="ghost"><Edit className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Escalation Rules */}
        <TabsContent value="escalation" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Auto-escalate pending approvals after timeout</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
          </div>

          <div className="space-y-3">
            {escalations.map(e => (
              <Card key={e.id} className={e.status === 'paused' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{e.rule}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">After {e.delay}</span>
                        <span className="text-xs">→</span>
                        <Badge variant="outline" className="text-[10px]">{e.escalateTo}</Badge>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {e.notifyVia.map(ch => (
                          <Badge key={ch} variant="secondary" className="text-[9px]">
                            {ch === 'Email' && <Mail className="h-2 w-2 mr-0.5" />}
                            {ch === 'SMS' && <Smartphone className="h-2 w-2 mr-0.5" />}
                            {ch === 'Push' && <Bell className="h-2 w-2 mr-0.5" />}
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Switch checked={e.status === 'active'} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Configure transaction alerts with email, SMS & push notifications</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Template</Button>
          </div>

          <div className="space-y-3">
            {notifications.map(n => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.event}</p>
                        <div className="flex gap-1">
                          {n.channels.map(ch => (
                            <Badge key={ch} variant="secondary" className="text-[9px]">{ch}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded">{n.template}</p>
                    </div>
                    <Switch checked={n.active} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Document Management */}
        <TabsContent value="documents" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Attach invoices, POs, receipts to payment transactions</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Upload Document</Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search by reference or filename..." className="flex-1 min-w-[200px]" />
            <Select defaultValue="all">
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="po">PO</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium">Payment Ref</th>
                    <th className="text-left p-3 text-xs font-medium">{t('common.type')}</th>
                    <th className="text-left p-3 text-xs font-medium">Filename</th>
                    <th className="text-left p-3 text-xs font-medium">Uploaded By</th>
                    <th className="text-left p-3 text-xs font-medium">{t('common.date')}</th>
                    <th className="text-left p-3 text-xs font-medium">Size</th>
                    <th className="text-right p-3 text-xs font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs font-mono">{d.paymentRef}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{d.type}</Badge></td>
                      <td className="p-3 text-xs">{d.filename}</td>
                      <td className="p-3 text-xs">{d.uploadedBy}</td>
                      <td className="p-3 text-xs">{d.date}</td>
                      <td className="p-3 text-xs">{d.size}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]">View</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
