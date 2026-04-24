import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarCheck, Hash, Copy, ArrowRightLeft, Trash2, RefreshCw, Layout, Users, Clock, Shield,
  AlertTriangle, CheckCircle2, XCircle, Play, Eye, Download, Wrench
} from 'lucide-react';
import { toast } from 'sonner';

const utilityPages: Record<string, { title: string; icon: any; description: string }> = {
  '/utilities/period-end-closing': { title: 'Period-End Closing', icon: CalendarCheck, description: 'Guide finance through controlled monthly/yearly period closing' },
  '/utilities/check-numbering': { title: 'Check Document Numbering', icon: Hash, description: 'Audit document series integrity for gaps and duplicates' },
  '/utilities/duplicate-layout': { title: 'Duplicate Layout Template', icon: Copy, description: 'Copy print/report layouts to create new versions' },
  '/utilities/transfer-correction': { title: 'Transfer Posting Correction', icon: ArrowRightLeft, description: 'Correct wrong posting links under controlled conditions' },
  '/utilities/master-cleanup': { title: 'Master Data Cleanup', icon: Trash2, description: 'Clean inactive, duplicate, and obsolete master data' },
  '/utilities/series-converter': { title: 'Series Converter', icon: RefreshCw, description: 'Convert numbering/coding scheme of existing master data' },
  '/utilities/ui-config': { title: 'UI Configuration Template', icon: Layout, description: 'Store reusable UI presets for forms, grids, and dashboards' },
  '/utilities/connected-clients': { title: 'Connected Clients', icon: Users, description: 'Monitor active ERP sessions and client connections' },
  '/utilities/change-logs-cleanup': { title: 'Change Logs Cleanup', icon: Clock, description: 'Manage audit and change log retention policies' },
  '/utilities/data-protection': { title: 'Data Protection Tools', icon: Shield, description: 'Privacy, masking, retention, and data subject requests' },
};

const closingSteps = [
  { module: 'General Ledger', status: 'ready', pending: 0, label: 'Open transactions verified' },
  { module: 'Accounts Payable', status: 'warning', pending: 3, label: '3 unmatched AP invoices' },
  { module: 'Accounts Receivable', status: 'ready', pending: 0, label: 'All AR reconciled' },
  { module: 'Inventory', status: 'warning', pending: 1, label: 'Pending valuation update' },
  { module: 'Fixed Assets', status: 'ready', pending: 0, label: 'Depreciation posted' },
  { module: 'Payroll', status: 'error', pending: 5, label: '5 employees missing payroll' },
];

const numberingIssues = [
  { series: 'INV-2026', docType: 'AR Invoice', issue: 'Missing number', details: 'INV-2026-0042 missing', severity: 'high' },
  { series: 'PO-2026', docType: 'Purchase Order', issue: 'Duplicate', details: 'PO-2026-0105 used twice', severity: 'critical' },
  { series: 'JE-2026', docType: 'Journal Entry', issue: 'Sequence break', details: 'Gap between 0200-0205', severity: 'medium' },
];

const connectedSessions = [
  { user: 'admin@company.com', loginTime: '2026-04-14 08:30', device: 'Desktop', browser: 'Chrome 124', ip: '10.0.1.50', branch: 'HQ', module: 'Finance', lastActivity: '2 min ago', status: 'active' },
  { user: 'sales@company.com', loginTime: '2026-04-14 09:15', device: 'Mobile', browser: 'Safari 17', ip: '10.0.2.15', branch: 'Riyadh', module: 'Sales', lastActivity: '5 min ago', status: 'active' },
  { user: 'hr@company.com', loginTime: '2026-04-14 07:00', device: 'Desktop', browser: 'Edge 124', ip: '10.0.1.22', branch: 'Jeddah', module: 'HR', lastActivity: '45 min ago', status: 'idle' },
];

export default function UtilitiesCenter() {
  const location = useLocation();
  const path = location.pathname;
  const page = utilityPages[path];

  if (!page) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> Utilities</h1><p className="text-sm text-muted-foreground">System administration tools</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(utilityPages).map(([href, p]) => {
            const Icon = p.icon;
            return (
              <Card key={href} className="hover:border-primary/50 cursor-pointer transition-colors" onClick={() => window.location.href = href}>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" /> {p.title}</CardTitle></CardHeader>
                <CardContent><p className="text-xs text-muted-foreground">{p.description}</p></CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const Icon = page.icon;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Icon className="h-6 w-6" /> {page.title}</h1><p className="text-sm text-muted-foreground">{page.description}</p></div>
      </div>

      {path === '/utilities/period-end-closing' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select><SelectTrigger className="w-48"><SelectValue placeholder="March 2026" /></SelectTrigger><SelectContent><SelectItem value="mar2026">March 2026</SelectItem><SelectItem value="feb2026">February 2026</SelectItem></SelectContent></Select>
            <Button variant="outline"><Eye className="h-4 w-4 mr-1" /> Preview</Button>
            <Button variant="outline"><Play className="h-4 w-4 mr-1" /> Run Checks</Button>
          </div>
          <div className="space-y-2">
            {closingSteps.map(step => (
              <Card key={step.module}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {step.status === 'ready' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : step.status === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                    <div><p className="font-medium text-sm">{step.module}</p><p className="text-xs text-muted-foreground">{step.label}</p></div>
                  </div>
                  <Badge variant={step.status === 'ready' ? 'default' : 'destructive'}>{step.status === 'ready' ? 'Ready' : `${step.pending} Issues`}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-2"><Button>Close Period</Button><Button variant="outline">Generate Report</Button></div>
        </div>
      )}

      {path === '/utilities/check-numbering' && (
        <div className="space-y-4">
          <div className="flex gap-2"><Button><Play className="h-4 w-4 mr-1" /> Run Audit</Button><Button variant="outline"><Download className="h-4 w-4 mr-1" /> Export Report</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead>Series</TableHead><TableHead>Document Type</TableHead><TableHead>Issue</TableHead><TableHead>Details</TableHead><TableHead>Severity</TableHead></TableRow></TableHeader>
            <TableBody>{numberingIssues.map((issue, i) => (
              <TableRow key={i}><TableCell className="font-mono text-xs">{issue.series}</TableCell><TableCell>{issue.docType}</TableCell><TableCell>{issue.issue}</TableCell><TableCell className="text-xs">{issue.details}</TableCell>
                <TableCell><Badge variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}>{issue.severity}</Badge></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}

      {path === '/utilities/connected-clients' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Active Sessions</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">Idle Sessions</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">0</p><p className="text-xs text-muted-foreground">Suspicious</p></CardContent></Card>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Login</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>IP</TableHead><TableHead>Branch</TableHead><TableHead>Module</TableHead><TableHead>Last Activity</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{connectedSessions.map((s, i) => (
              <TableRow key={i}><TableCell className="text-xs">{s.user}</TableCell><TableCell className="text-xs">{s.loginTime}</TableCell><TableCell>{s.device}</TableCell><TableCell className="text-xs">{s.browser}</TableCell><TableCell className="font-mono text-xs">{s.ip}</TableCell><TableCell>{s.branch}</TableCell><TableCell>{s.module}</TableCell>
                <TableCell><Badge variant={s.status === 'idle' ? 'secondary' : 'default'}>{s.lastActivity}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="sm" className="text-red-500 text-xs">Terminate</Button></TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}

      {path === '/utilities/master-cleanup' && (
        <div className="space-y-4">
          <Tabs defaultValue="duplicates">
            <TabsList><TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger><TabsTrigger value="inactive">Inactive Records</TabsTrigger><TabsTrigger value="incomplete">Incomplete Data</TabsTrigger></TabsList>
            <TabsContent value="duplicates" className="mt-4 space-y-4">
              <div className="flex gap-2"><Select><SelectTrigger className="w-48"><SelectValue placeholder="Entity type" /></SelectTrigger><SelectContent>{['Business Partners', 'Items', 'Employees'].map(e => <SelectItem key={e} value={e.toLowerCase()}>{e}</SelectItem>)}</SelectContent></Select><Button><Play className="h-4 w-4 mr-1" /> Scan</Button></div>
              <Card><CardContent className="p-6 text-center text-muted-foreground"><p>Select an entity and run scan to detect duplicates</p></CardContent></Card>
            </TabsContent>
            <TabsContent value="inactive" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground"><p>Run scan to identify records inactive for 12+ months</p></CardContent></Card></TabsContent>
            <TabsContent value="incomplete" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground"><p>Run scan to find records with missing mandatory fields</p></CardContent></Card></TabsContent>
          </Tabs>
        </div>
      )}

      {path === '/utilities/data-protection' && (
        <div className="space-y-4">
          <Tabs defaultValue="masking">
            <TabsList><TabsTrigger value="masking">Data Masking</TabsTrigger><TabsTrigger value="retention">Retention Policies</TabsTrigger><TabsTrigger value="requests">Subject Requests</TabsTrigger><TabsTrigger value="consent">Consent Records</TabsTrigger></TabsList>
            <TabsContent value="masking" className="mt-4 space-y-4">
              <Card><CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4"><div><label className="text-sm font-medium">Field Category</label><Select><SelectTrigger><SelectValue placeholder="Personal Data" /></SelectTrigger><SelectContent><SelectItem value="personal">Personal Data</SelectItem><SelectItem value="financial">Financial Data</SelectItem><SelectItem value="health">Health Data</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium">Masking Pattern</label><Select><SelectTrigger><SelectValue placeholder="Partial Mask" /></SelectTrigger><SelectContent><SelectItem value="partial">Partial Mask (***1234)</SelectItem><SelectItem value="full">Full Mask (********)</SelectItem><SelectItem value="hash">Hash</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium">Applies To Roles</label><Select><SelectTrigger><SelectValue placeholder="All non-admin" /></SelectTrigger><SelectContent><SelectItem value="non-admin">All Non-Admin</SelectItem><SelectItem value="viewer">Viewer Only</SelectItem></SelectContent></Select></div></div>
                <Button size="sm">Apply Rule</Button>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="retention" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground">Configure data retention periods by module and record type</CardContent></Card></TabsContent>
            <TabsContent value="requests" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground">No pending data subject requests</CardContent></Card></TabsContent>
            <TabsContent value="consent" className="mt-4"><Card><CardContent className="p-6 text-center text-muted-foreground">Consent tracking and management</CardContent></Card></TabsContent>
          </Tabs>
        </div>
      )}

      {/* Generic content for other utility pages */}
      {!['/utilities/period-end-closing', '/utilities/check-numbering', '/utilities/connected-clients', '/utilities/master-cleanup', '/utilities/data-protection'].includes(path) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">{page.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{page.description}</p>
            <Button onClick={() => toast.info('Feature ready for implementation')}><Play className="h-4 w-4 mr-1" /> Launch Wizard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
