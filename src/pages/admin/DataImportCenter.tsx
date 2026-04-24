import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettingsService } from '@/hooks/useSettingsService';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { AdminPageLayout, AdminSection, SettingField } from '@/components/admin/AdminPageLayout';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Upload, Download, FileSpreadsheet, Database, AlertTriangle, CheckCircle2,
  XCircle, Clock, RefreshCw, HardDrive, Landmark, Plus, Trash2, Eye, FileText, Search
} from 'lucide-react';
import { toast } from 'sonner';

// Import targets registry
const importTargets = [
  { group: 'Master Data', items: ['Business Partners', 'Items', 'Chart of Accounts', 'Warehouses', 'Employees', 'Projects', 'Cost Centers', 'Dimensions'] },
  { group: 'Transactions', items: ['Sales Orders', 'Purchase Orders', 'AP Invoices', 'AR Invoices', 'Journal Entries', 'Payments', 'Deliveries', 'Goods Receipt PO'] },
  { group: 'Opening Balances', items: ['GL Balances', 'Customer Balances', 'Vendor Balances', 'Inventory Quantities', 'Fixed Assets'] },
  { group: 'Reference Data', items: ['Tax Codes', 'Payment Terms', 'Dimensions', 'Price Lists', 'Number Series', 'Budget Templates'] },
];

const sapTransactionGroups = [
  'Sales Quotations', 'Sales Orders', 'Deliveries', 'AR Invoices', 'Purchase Orders',
  'Goods Receipt PO', 'AP Invoices', 'Inventory Transfers', 'Journal Entries',
  'Incoming Payments', 'Outgoing Payments', 'Production Orders'
];

const fixedAssetFields = [
  'Asset Code', 'Description', 'Asset Class', 'Acquisition Date', 'Capitalization Date',
  'Acquisition Cost', 'Accumulated Depreciation', 'Useful Life', 'Depreciation Method',
  'Salvage Value', 'Location', 'Department', 'Branch', 'Serial Number', 'Supplier'
];

const financialTemplates = [
  'Chart of Accounts', 'Cost Centers', 'Dimensions', 'Tax Codes',
  'Financial Report Templates', 'Budget Templates', 'Account Determination Rules'
];

// Mock import jobs
const mockJobs = [
  { id: 'IMP-001', type: 'Business Partners', source: 'Excel', records: 245, success: 240, failed: 5, status: 'completed', date: '2026-04-12', user: 'admin@company.com', batchId: 'BATCH-001' },
  { id: 'IMP-002', type: 'Items', source: 'SAP B1', records: 1200, success: 1200, failed: 0, status: 'completed', date: '2026-04-11', user: 'admin@company.com', batchId: 'BATCH-002' },
  { id: 'IMP-003', type: 'Chart of Accounts', source: 'Template', records: 350, success: 0, failed: 0, status: 'pending_validation', date: '2026-04-14', user: 'admin@company.com', batchId: 'BATCH-003' },
  { id: 'IMP-004', type: 'Journal Entries', source: 'SAP B1', records: 5000, success: 3200, failed: 0, status: 'in_progress', date: '2026-04-14', user: 'admin@company.com', batchId: 'BATCH-004' },
];

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending_validation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    draft: 'bg-muted text-muted-foreground',
  };
  return <Badge className={map[status] || 'bg-muted'}>{status.replace(/_/g, ' ')}</Badge>;
};

export default function DataImportCenter() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('import');
  const [wizardStep, setWizardStep] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('insert');
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'reject' | 'update' | 'ask'>('reject');
  const [dryRun, setDryRun] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { entries: auditEntries } = useAuditTrail('data_import');

  // Determine sub-tab from URL
  const path = location.pathname;
  const subTab = path.includes('excel') ? 'excel' : path.includes('sap') ? 'sap' :
    path.includes('fixed-assets') ? 'assets' : path.includes('financial-template') ? 'financial' :
    path.includes('export') ? 'export' : 'import';

  const wizardSteps = ['Select Target', 'Upload & Map', 'Validate', 'Import'];

  const filteredJobs = mockJobs.filter(j =>
    !searchTerm || j.type.toLowerCase().includes(searchTerm.toLowerCase()) || j.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminPageLayout
      title="Data Import/Export Center" titleAr="مركز استيراد/تصدير البيانات"
      description="Controlled data migration and bulk data movement with validation, mapping, and audit trails"
      descriptionAr="نقل البيانات المنظم مع التحقق والتعيين وسجل المراجعة"
      icon={<Database className="h-6 w-6" />} module="data_import"
      auditEntries={auditEntries}
      affectedModules={['All Modules']}
      showAuditPanel
    >
      <Tabs value={subTab === 'import' ? activeTab : subTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="import" className="gap-1"><Upload className="h-3 w-3" />Data Import</TabsTrigger>
          <TabsTrigger value="excel" className="gap-1"><FileSpreadsheet className="h-3 w-3" />Excel Import</TabsTrigger>
          <TabsTrigger value="sap" className="gap-1"><Database className="h-3 w-3" />SAP B1 Migration</TabsTrigger>
          <TabsTrigger value="assets" className="gap-1"><HardDrive className="h-3 w-3" />Fixed Assets</TabsTrigger>
          <TabsTrigger value="financial" className="gap-1"><Landmark className="h-3 w-3" />Financial Templates</TabsTrigger>
          <TabsTrigger value="export" className="gap-1"><Download className="h-3 w-3" />Data Export</TabsTrigger>
        </TabsList>

        {/* Generic Data Import */}
        <TabsContent value="import" className="space-y-4">
          <AdminSection title="Import Wizard" description="Step-by-step guided data import process">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {wizardSteps.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= wizardStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>{i + 1}</div>
                  <span className={`text-xs ${i <= wizardStep ? 'font-medium' : 'text-muted-foreground'}`}>{step}</span>
                  {i < wizardSteps.length - 1 && <div className="w-8 h-px bg-border" />}
                </div>
              ))}
            </div>

            {wizardStep === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Import Mode</Label>
                    <Select value={importMode} onValueChange={(v: 'insert' | 'upsert') => setImportMode(v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="insert">Insert Only (New Records)</SelectItem>
                        <SelectItem value="upsert">Upsert (Insert or Update)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duplicate Handling</Label>
                    <Select value={duplicateHandling} onValueChange={(v: any) => setDuplicateHandling(v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip Duplicates</SelectItem>
                        <SelectItem value="reject">Reject with Error</SelectItem>
                        <SelectItem value="update">Update Existing</SelectItem>
                        <SelectItem value="ask">Ask for Each</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={dryRun} onCheckedChange={setDryRun} />
                  <Label className="text-sm">Dry Run (validate without committing)</Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {importTargets.map(group => (
                    <div key={group.group} className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">{group.group}</h4>
                      {group.items.map(item => (
                        <button key={item} onClick={() => { setSelectedTarget(item); setWizardStep(1); }}
                          className={`block w-full text-left text-xs p-2 rounded hover:bg-accent/50 transition-colors ${selectedTarget === item ? 'bg-primary/10 font-medium' : ''}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Upload file for: {selectedTarget}</p>
                  <p className="text-xs text-muted-foreground mt-1">Supported: .xlsx, .csv, .json</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download Template</Button>
                    <Button size="sm"><Upload className="h-4 w-4 mr-1" />Upload File</Button>
                  </div>
                </div>
                <AdminSection title="Column Mapping" description="Map source file columns to ERP fields">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Source Column</TableHead><TableHead>Target Field</TableHead><TableHead>Status</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {['Code', 'Name', 'Group', 'Address'].map(col => (
                        <TableRow key={col}>
                          <TableCell className="text-sm">{col}</TableCell>
                          <TableCell><Select><SelectTrigger className="h-8"><SelectValue placeholder="Select field..." /></SelectTrigger><SelectContent>
                            <SelectItem value={col.toLowerCase()}>{col}</SelectItem>
                          </SelectContent></Select></TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">Mapped</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AdminSection>
                <div className="flex gap-2"><Button variant="outline" onClick={() => setWizardStep(0)}>Back</Button><Button onClick={() => setWizardStep(2)}>Validate</Button></div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center"><CheckCircle2 className="h-5 w-5 mx-auto text-emerald-600" /><div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">238</div><div className="text-xs text-emerald-600">Valid Records</div></div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center"><AlertTriangle className="h-5 w-5 mx-auto text-amber-600" /><div className="text-lg font-bold text-amber-700 dark:text-amber-400">5</div><div className="text-xs text-amber-600">Warnings</div></div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center"><XCircle className="h-5 w-5 mx-auto text-red-600" /><div className="text-lg font-bold text-red-700 dark:text-red-400">2</div><div className="text-xs text-red-600">Errors</div></div>
                </div>
                <AdminSection title="Validation Errors" description="Fix these issues before importing" badge="2 errors">
                  <Table>
                    <TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Field</TableHead><TableHead>Issue</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <TableRow><TableCell>15</TableCell><TableCell>Tax Number</TableCell><TableCell className="text-destructive">Duplicate tax number exists</TableCell><TableCell>1234567890</TableCell></TableRow>
                      <TableRow><TableCell>42</TableCell><TableCell>Group</TableCell><TableCell className="text-destructive">Group code not found in master data</TableCell><TableCell>GRP-999</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </AdminSection>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                  <Button variant="outline"><Download className="h-4 w-4 mr-1" />Download Error File</Button>
                  <Button onClick={() => setWizardStep(3)} disabled={false}>{dryRun ? 'Run Dry Import' : 'Commit Import'}</Button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-4 text-center p-6">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600" />
                <h3 className="text-lg font-bold">{dryRun ? 'Dry Run Complete' : 'Import Complete'}</h3>
                <p className="text-sm text-muted-foreground">238 records processed successfully. {dryRun ? 'No data was committed.' : 'Batch ID: BATCH-005'}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => { setWizardStep(0); setSelectedTarget(''); }}>New Import</Button>
                  {dryRun && <Button onClick={() => { setDryRun(false); toast.success('Committing import...'); }}>Commit to Database</Button>}
                </div>
              </div>
            )}
          </AdminSection>

          {/* Job History */}
          <AdminSection title="Import Job History" description="Track all import operations and their results">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by type or batch ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead>
                  <TableHead>Records</TableHead><TableHead>Success</TableHead><TableHead>Failed</TableHead>
                  <TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.batchId}</TableCell>
                    <TableCell className="text-sm">{job.type}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{job.source}</Badge></TableCell>
                    <TableCell>{job.records}</TableCell>
                    <TableCell className="text-emerald-600">{job.success}</TableCell>
                    <TableCell className={job.failed > 0 ? 'text-destructive' : ''}>{job.failed}</TableCell>
                    <TableCell><StatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-xs">{job.date}</TableCell>
                    <TableCell className="text-xs">{job.user}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminSection>
        </TabsContent>

        {/* Excel Import */}
        <TabsContent value="excel" className="space-y-4">
          <AdminSection title="Excel Import Wizard" description="Upload and import data from Excel spreadsheets with auto-detection and validation">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Upload Excel File (.xlsx / .csv)</p>
              <p className="text-xs text-muted-foreground mt-1">Headers will be auto-detected and mapped to ERP fields</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download BP Template</Button>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download Items Template</Button>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Download JV Template</Button>
                <Button size="sm"><Upload className="h-4 w-4 mr-1" />Upload File</Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
              <strong>Supported imports:</strong> Business Partners, Items, Employees, Price Lists, Journal Vouchers, Stock Opening Balances, Chart of Accounts
            </div>
          </AdminSection>
        </TabsContent>

        {/* SAP B1 Migration */}
        <TabsContent value="sap" className="space-y-4">
          <AdminSection title="SAP Business One Transaction Migration" description="Import historical and open transactions from SAP B1 export files" badge="Migration">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {sapTransactionGroups.map(g => (
                <label key={g} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/30 cursor-pointer text-sm">
                  <input type="checkbox" className="rounded" />
                  {g}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Code Remapping File" helpText="Upload CSV with old_code → new_code mappings">
                <div className="flex gap-2"><Input type="file" className="h-8 text-xs" /><Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button></div>
              </SettingField>
              <SettingField label="Import Mode" helpText="How to handle migrated transactions">
                <Select><SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>
                  <SelectItem value="history">Locked History (Read-only)</SelectItem>
                  <SelectItem value="live">Live Transactions</SelectItem>
                  <SelectItem value="draft">Draft Documents</SelectItem>
                </SelectContent></Select>
              </SettingField>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch /><Label className="text-sm">Preserve Original Document References</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch defaultChecked /><Label className="text-sm">Dry Run Before Commit</Label>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline"><Eye className="h-4 w-4 mr-1" />Preview Migration</Button>
              <Button><Upload className="h-4 w-4 mr-1" />Start Migration</Button>
            </div>
          </AdminSection>
        </TabsContent>

        {/* Fixed Assets */}
        <TabsContent value="assets" className="space-y-4">
          <AdminSection title="Fixed Asset Master Data Import" description="Import asset register with acquisition data, depreciation, and opening balances">
            <div className="border-2 border-dashed rounded-lg p-6 text-center mb-4">
              <HardDrive className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <Button variant="outline" size="sm" className="mr-2"><Download className="h-4 w-4 mr-1" />Download Template</Button>
              <Button size="sm"><Upload className="h-4 w-4 mr-1" />Upload Asset File</Button>
            </div>
            <div className="text-xs">
              <strong>Required fields:</strong>
              <div className="flex flex-wrap gap-1 mt-1">
                {fixedAssetFields.map(f => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
              Validates: asset class existence, depreciation method compatibility, acquisition cost vs accumulated depreciation, duplicate asset codes
            </div>
          </AdminSection>
        </TabsContent>

        {/* Financial Template Import */}
        <TabsContent value="financial" className="space-y-4">
          <AdminSection title="Financial Template Import Wizard" description="Import structured financial templates with hierarchy and validation">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {financialTemplates.map(t => (
                <button key={t} className="p-3 border rounded text-sm text-left hover:bg-accent/30 transition-colors">
                  <FileText className="h-4 w-4 mb-1 text-primary" />{t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Import Action">
                <Select><SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>
                  <SelectItem value="append">Append to Existing</SelectItem>
                  <SelectItem value="replace">Replace All</SelectItem>
                </SelectContent></Select>
              </SettingField>
              <SettingField label="Version Label" helpText="Tag this import for rollback tracking">
                <Input placeholder="e.g. v2.0 - IFRS alignment" className="h-8" />
              </SettingField>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline"><Download className="h-4 w-4 mr-1" />Download Current Template</Button>
              <Button><Upload className="h-4 w-4 mr-1" />Import Template</Button>
            </div>
          </AdminSection>
        </TabsContent>

        {/* Data Export */}
        <TabsContent value="export" className="space-y-4">
          <AdminSection title="Data Export Center" description="Extract data in controlled formats with field-level permissions and masking">
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Entity/Module">
                <Select><SelectTrigger className="h-8"><SelectValue placeholder="Select entity..." /></SelectTrigger><SelectContent>
                  <SelectItem value="bp">Business Partners</SelectItem>
                  <SelectItem value="items">Items</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="journal">Journal Entries</SelectItem>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="audit">Audit Logs</SelectItem>
                  <SelectItem value="config">Configuration</SelectItem>
                </SelectContent></Select>
              </SettingField>
              <SettingField label="Export Format">
                <Select><SelectTrigger className="h-8"><SelectValue placeholder="Select format..." /></SelectTrigger><SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                </SelectContent></Select>
              </SettingField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SettingField label="Date Range">
                <div className="flex gap-2"><Input type="date" className="h-8" /><Input type="date" className="h-8" /></div>
              </SettingField>
              <SettingField label="Branch Filter">
                <Select><SelectTrigger className="h-8"><SelectValue placeholder="All Branches" /></SelectTrigger><SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="hq">Headquarters</SelectItem>
                </SelectContent></Select>
              </SettingField>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2"><Switch /><Label className="text-sm">Mask Sensitive Data</Label></div>
              <div className="flex items-center gap-2"><Switch /><Label className="text-sm">Require Approval for Export</Label></div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="outline"><Eye className="h-4 w-4 mr-1" />Preview</Button>
              <Button><Download className="h-4 w-4 mr-1" />Export</Button>
            </div>
          </AdminSection>

          <AdminSection title="Export History" description="Track past export operations">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Entity</TableHead><TableHead>Format</TableHead><TableHead>Records</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>User</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>EXP-001</TableCell><TableCell>Business Partners</TableCell><TableCell>Excel</TableCell><TableCell>1,245</TableCell><TableCell><StatusBadge status="completed" /></TableCell><TableCell>2026-04-13</TableCell><TableCell>admin@company.com</TableCell></TableRow>
                <TableRow><TableCell>EXP-002</TableCell><TableCell>Journal Entries</TableCell><TableCell>CSV</TableCell><TableCell>15,000</TableCell><TableCell><StatusBadge status="completed" /></TableCell><TableCell>2026-04-12</TableCell><TableCell>finance@company.com</TableCell></TableRow>
              </TableBody>
            </Table>
          </AdminSection>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
