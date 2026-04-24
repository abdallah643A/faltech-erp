import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, FileText, Users, Download, Search, Clock, AlertTriangle, CheckCircle, Activity, Lock, Eye, Fingerprint } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const exportColumns: ColumnDef[] = [
  { key: 'timestamp', header: 'Timestamp' },
  { key: 'user', header: 'User' },
  { key: 'action', header: 'Action' },
  { key: 'details', header: 'Details' },
  { key: 'before', header: 'Before' },
  { key: 'after', header: 'After' },
  { key: 'ip', header: 'IP' },
];


const COLORS = ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(0, 84%, 60%)'];

export default function BankingComplianceAudit() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('audit');

  // Audit log entries
  const auditLogs = [
    { id: '1', timestamp: '2026-03-17 09:15:23', user: 'Ahmed K.', action: 'Payment Created', details: 'OUT-2026-0045, 45,000 SAR to Gulf Steel', before: 'N/A', after: 'Status: Draft', ip: '192.168.1.45' },
    { id: '2', timestamp: '2026-03-17 09:18:05', user: 'Sara M.', action: 'Payment Approved', details: 'OUT-2026-0045 approved (Level 1)', before: 'Status: Draft', after: 'Status: Approved L1', ip: '192.168.1.23' },
    { id: '3', timestamp: '2026-03-17 09:20:11', user: 'Omar H.', action: 'Rate Changed', details: 'USD/SAR manual rate override', before: '3.7500', after: '3.7520', ip: '192.168.1.67' },
    { id: '4', timestamp: '2026-03-17 08:45:00', user: 'System', action: 'Auto-Reconcile', details: '134 transactions matched for Al Rajhi Bank', before: 'Pending', after: 'Reconciled', ip: 'System' },
    { id: '5', timestamp: '2026-03-16 17:30:22', user: 'Ahmed K.', action: 'Vendor Bank Changed', details: 'Gulf Steel - bank account updated', before: 'IBAN: SA44...7890', after: 'IBAN: SA55...1234', ip: '192.168.1.45' },
    { id: '6', timestamp: '2026-03-16 16:00:00', user: 'Sara M.', action: 'Statement Imported', details: 'SNB statement Feb 2026 uploaded', before: 'N/A', after: '89 transactions', ip: '192.168.1.23' },
  ];

  // Compliance reports
  const complianceReports = [
    { name: 'SWIFT MT103 Payment Report', description: 'Cross-border payment messages compliance', lastGenerated: '2026-03-15', frequency: 'Monthly', status: 'current' },
    { name: 'SAMA Regulatory Filing', description: 'Saudi Arabia Monetary Authority compliance', lastGenerated: '2026-03-01', frequency: 'Monthly', status: 'current' },
    { name: 'AML Transaction Report', description: 'Anti-money laundering screening results', lastGenerated: '2026-03-10', frequency: 'Weekly', status: 'current' },
    { name: 'Internal Control Report', description: 'Segregation of duties and limit compliance', lastGenerated: '2026-02-28', frequency: 'Monthly', status: 'overdue' },
    { name: 'Bank Reconciliation Summary', description: 'Monthly reconciliation status across all banks', lastGenerated: '2026-03-01', frequency: 'Monthly', status: 'current' },
  ];

  // SoD violations
  const sodViolations = [
    { user: 'Ahmed K.', violation: 'Created AND approved payment OUT-2026-0033', severity: 'high', date: '2026-03-12', resolved: false },
    { user: 'Omar H.', violation: 'Modified vendor bank details AND initiated payment', severity: 'critical', date: '2026-03-14', resolved: false },
    { user: 'Sara M.', violation: 'Imported statement AND performed reconciliation', severity: 'medium', date: '2026-03-10', resolved: true },
  ];

  // User activity data
  const activityByUser = [
    { user: 'Ahmed K.', payments: 23, approvals: 5, reconciliations: 0, imports: 2 },
    { user: 'Sara M.', payments: 8, approvals: 15, reconciliations: 12, imports: 6 },
    { user: 'Omar H.', payments: 15, approvals: 8, reconciliations: 3, imports: 1 },
    { user: 'Fatima A.', payments: 0, approvals: 22, reconciliations: 18, imports: 0 },
  ];

  const actionDistribution = [
    { name: 'Payments', value: 46 },
    { name: 'Approvals', value: 50 },
    { name: 'Reconciliations', value: 33 },
    { name: 'Imports', value: 9 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compliance & Audit Trail</h1>
        <ExportImportButtons data={[]} columns={exportColumns} filename="banking-compliance-audit" title="Banking Compliance Audit" />
          <p className="text-sm text-muted-foreground">Audit logging, compliance reports, user tracking & export</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="audit"><Activity className="h-3 w-3 mr-1" /> Audit Log</TabsTrigger>
          <TabsTrigger value="compliance"><FileText className="h-3 w-3 mr-1" /> Compliance</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-3 w-3 mr-1" /> User Activity</TabsTrigger>
          <TabsTrigger value="export"><Download className="h-3 w-3 mr-1" /> Export</TabsTrigger>
        </TabsList>

        {/* Audit Log */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Search audit log..." className="flex-1 min-w-[200px]" />
            <Select defaultValue="all">
              <SelectTrigger className="w-36"><SelectValue placeholder="User" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="ahmed">Ahmed K.</SelectItem>
                <SelectItem value="sara">Sara M.</SelectItem>
                <SelectItem value="omar">Omar H.</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="modified">Modified</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline"><Search className="h-3 w-3 mr-1" /> Filter</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs">Timestamp</th>
                    <th className="text-left p-3 text-xs">User</th>
                    <th className="text-left p-3 text-xs">Action</th>
                    <th className="text-left p-3 text-xs">Details</th>
                    <th className="text-left p-3 text-xs">Before</th>
                    <th className="text-left p-3 text-xs">After</th>
                    <th className="text-left p-3 text-xs">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(l => (
                    <tr key={l.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-xs font-mono">{l.timestamp}</td>
                      <td className="p-3 text-xs">{l.user}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{l.action}</Badge></td>
                      <td className="p-3 text-xs max-w-[200px] truncate">{l.details}</td>
                      <td className="p-3 text-xs text-muted-foreground">{l.before}</td>
                      <td className="p-3 text-xs">{l.after}</td>
                      <td className="p-3 text-xs font-mono">{l.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Reports */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="space-y-3">
            {complianceReports.map((r, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.name}</p>
                        <Badge variant={r.status === 'current' ? 'default' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Last: {r.lastGenerated} · {r.frequency}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs"><Eye className="h-3 w-3 mr-1" /> View</Button>
                      <Button size="sm" className="text-xs"><Download className="h-3 w-3 mr-1" /> Generate</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* User Activity */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {/* SoD Violations */}
          {sodViolations.filter(v => !v.resolved).length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Segregation of Duties Violations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sodViolations.filter(v => !v.resolved).map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-xs font-medium">{v.user}: {v.violation}</p>
                      <p className="text-[10px] text-muted-foreground">{v.date}</p>
                    </div>
                    <Badge variant={v.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{v.severity}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Activity by User</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activityByUser}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="user" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="payments" fill={COLORS[0]} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="approvals" fill={COLORS[1]} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="reconciliations" fill={COLORS[2]} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Action Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={actionDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {actionDistribution.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Export */}
        <TabsContent value="export" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Export Package</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a complete audit package with digital signatures and tamper detection for external auditors.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Date Range</label>
                  <div className="flex gap-2">
                    <Input type="date" defaultValue="2026-01-01" />
                    <Input type="date" defaultValue="2026-03-17" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Format</label>
                  <Select defaultValue="pdf">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF with Digital Signature</SelectItem>
                      <SelectItem value="excel">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML (XBRL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium">Include in Package:</p>
                {[
                  'Banking Transactions (All)',
                  'Reconciliation Details',
                  'Approval Workflow History',
                  'Audit Log (Full)',
                  'User Activity Report',
                  'SoD Violation Report',
                  'Compliance Status',
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" defaultChecked className="rounded" />
                    {item}
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">
                  <Download className="h-4 w-4 mr-2" /> Generate Export Package
                </Button>
                <Button variant="outline">
                  <Fingerprint className="h-4 w-4 mr-2" /> Verify Integrity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
