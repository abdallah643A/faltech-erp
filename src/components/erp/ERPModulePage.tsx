import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Plus, Search, Filter, Download, RefreshCw, Eye,
  Edit, CheckCircle, Clock, AlertTriangle, FileText,
  BarChart3, ArrowUpDown, ChevronRight, BookOpen, Shield,
  DollarSign, TrendingUp, Package, Building2, Banknote,
  ArrowRightLeft, ClipboardCheck, Scale, Landmark, Activity,
  Receipt, AlertCircle, Lock, Unlock, Info, Layers
} from 'lucide-react';
import {
  type FinanceEffectDefinition,
  type FinancialClassification,
  classificationLabels,
  getFinanceEffect
} from '@/lib/finance-effect-registry';

export type FinanceEffectType =
  | 'none'
  | 'commitment_only'
  | 'quantity_only'
  | 'stock_value'
  | 'journal_entry'
  | 'receivable_payable'
  | 'project_cost'
  | 'budget'
  | 'forecast_only';

export type DocumentStatus = 'draft' | 'pending_approval' | 'approved' | 'open' | 'partially_processed' | 'closed' | 'canceled' | 'rejected' | 'reversed';

export interface ERPColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'status' | 'currency' | 'badge' | 'progress';
  sortable?: boolean;
  width?: string;
}

export interface ERPFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'currency' | 'email' | 'phone';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  section?: string;
  validation?: string;
}

export interface ERPAction {
  label: string;
  icon?: React.ElementType;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'ghost';
  requiresApproval?: boolean;
}

export interface ERPModulePageConfig {
  title: string;
  description: string;
  businessPurpose: string;
  financeEffect: FinanceEffectType;
  financeEffectDescription: string;
  module: string;
  documentType?: string;
  /** Key into the finance-effect registry for deep metadata */
  financeRegistryKey?: string;
  statusFlow?: DocumentStatus[];
  columns: ERPColumn[];
  formFields: ERPFormField[];
  sampleData?: Record<string, any>[];
  actions?: ERPAction[];
  approvalRequired?: boolean;
  approvalConditions?: string[];
  validationRules?: string[];
  downstreamDocs?: string[];
  upstreamDocs?: string[];
  reversalRules?: string[];
  kpis?: { label: string; value: string; trend?: 'up' | 'down' | 'neutral'; color?: string }[];
  tabs?: { id: string; label: string; content?: React.ReactNode }[];
  dimensionRequirements?: {
    branch?: boolean;
    project?: boolean;
    costCenter?: boolean;
    costCode?: boolean;
    activity?: boolean;
  };
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  approved: 'bg-green-500/10 text-green-700 dark:text-green-400',
  open: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  partially_processed: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  closed: 'bg-muted text-muted-foreground',
  canceled: 'bg-red-500/10 text-red-700 dark:text-red-400',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400',
  reversed: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  // Extended statuses
  new: 'bg-blue-500/10 text-blue-700',
  contacted: 'bg-cyan-500/10 text-cyan-700',
  qualified: 'bg-teal-500/10 text-teal-700',
  converted: 'bg-green-500/10 text-green-700',
  lost: 'bg-red-500/10 text-red-700',
  submitted: 'bg-indigo-500/10 text-indigo-700',
  under_review: 'bg-amber-500/10 text-amber-700',
  awarded: 'bg-emerald-500/10 text-emerald-700',
  withdrawn: 'bg-slate-500/10 text-slate-700',
  in_progress: 'bg-blue-500/10 text-blue-700',
  completed: 'bg-green-500/10 text-green-700',
  initiated: 'bg-blue-500/10 text-blue-700',
  active: 'bg-green-500/10 text-green-700',
  amended: 'bg-amber-500/10 text-amber-700',
  substantially_complete: 'bg-teal-500/10 text-teal-700',
  posted: 'bg-green-500/10 text-green-700',
  partially_paid: 'bg-orange-500/10 text-orange-700',
  fully_paid: 'bg-green-500/10 text-green-700',
  reconciled: 'bg-emerald-500/10 text-emerald-700',
  applied: 'bg-green-500/10 text-green-700',
  imported: 'bg-blue-500/10 text-blue-700',
  reviewed: 'bg-amber-500/10 text-amber-700',
  frozen: 'bg-slate-500/10 text-slate-700',
  pending: 'bg-yellow-500/10 text-yellow-700',
  counting: 'bg-cyan-500/10 text-cyan-700',
  variance_review: 'bg-amber-500/10 text-amber-700',
  in_transit: 'bg-indigo-500/10 text-indigo-700',
  received: 'bg-green-500/10 text-green-700',
  certified: 'bg-emerald-500/10 text-emerald-700',
  revised: 'bg-amber-500/10 text-amber-700',
  invoiced: 'bg-green-500/10 text-green-700',
  partially_collected: 'bg-orange-500/10 text-orange-700',
  fully_collected: 'bg-green-500/10 text-green-700',
  negotiation: 'bg-amber-500/10 text-amber-700',
  won: 'bg-green-500/10 text-green-700',
  sent: 'bg-blue-500/10 text-blue-700',
  accepted: 'bg-green-500/10 text-green-700',
  expired: 'bg-muted text-muted-foreground',
  partially_delivered: 'bg-orange-500/10 text-orange-700',
  fully_delivered: 'bg-green-500/10 text-green-700',
  partially_received: 'bg-orange-500/10 text-orange-700',
  fully_received: 'bg-green-500/10 text-green-700',
  partially_invoiced: 'bg-orange-500/10 text-orange-700',
  fully_invoiced: 'bg-green-500/10 text-green-700',
  returned: 'bg-red-500/10 text-red-700',
  partially_ordered: 'bg-orange-500/10 text-orange-700',
  fully_ordered: 'bg-green-500/10 text-green-700',
  preparation: 'bg-blue-500/10 text-blue-700',
  agreed: 'bg-green-500/10 text-green-700',
  selected: 'bg-green-500/10 text-green-700',
  evaluated: 'bg-amber-500/10 text-amber-700',
  responses_received: 'bg-cyan-500/10 text-cyan-700',
  issued: 'bg-blue-500/10 text-blue-700',
  recommended: 'bg-teal-500/10 text-teal-700',
  planned: 'bg-blue-500/10 text-blue-700',
  released: 'bg-green-500/10 text-green-700',
  running: 'bg-blue-500/10 text-blue-700',
  processed: 'bg-green-500/10 text-green-700',
  under_negotiation: 'bg-amber-500/10 text-amber-700',
  partially_approved: 'bg-orange-500/10 text-orange-700',
  settled: 'bg-green-500/10 text-green-700',
  review: 'bg-amber-500/10 text-amber-700',
  obsolete: 'bg-muted text-muted-foreground',
  inactive: 'bg-muted text-muted-foreground',
};

const financeEffectLabels: Record<FinanceEffectType, { label: string; color: string }> = {
  none: { label: 'No Finance Effect', color: 'bg-muted text-muted-foreground' },
  commitment_only: { label: 'Commitment Only', color: 'bg-blue-500/10 text-blue-700' },
  quantity_only: { label: 'Quantity Effect', color: 'bg-cyan-500/10 text-cyan-700' },
  stock_value: { label: 'Stock Value Effect', color: 'bg-orange-500/10 text-orange-700' },
  journal_entry: { label: 'Creates Journal Entry', color: 'bg-red-500/10 text-red-700' },
  receivable_payable: { label: 'Updates AR/AP', color: 'bg-amber-500/10 text-amber-700' },
  project_cost: { label: 'Project Cost Impact', color: 'bg-emerald-500/10 text-emerald-700' },
  budget: { label: 'Budget Impact', color: 'bg-violet-500/10 text-violet-700' },
  forecast_only: { label: 'Forecast Only', color: 'bg-sky-500/10 text-sky-700' },
};

// ============================================================
// FINANCE EFFECT FLAGS PANEL
// ============================================================
function FinanceEffectFlags({ fe }: { fe: FinanceEffectDefinition }) {
  const flags = [
    { label: 'Creates Journal Entry', value: fe.createsJournalEntry, icon: BookOpen },
    { label: 'Updates A/R', value: fe.updatesAR, icon: TrendingUp },
    { label: 'Updates A/P', value: fe.updatesAP, icon: Banknote },
    { label: 'Updates Inventory Qty', value: fe.updatesInventoryQty, icon: Package },
    { label: 'Updates Inventory Value', value: fe.updatesInventoryValue, icon: DollarSign },
    { label: 'Updates Fixed Assets', value: fe.updatesFixedAssets, icon: Building2 },
    { label: 'Updates Project Budget', value: fe.updatesProjectBudgetCommitment, icon: ClipboardCheck },
    { label: 'Updates Project Actual Cost', value: fe.updatesProjectActualCost, icon: Activity },
    { label: 'Updates Project Revenue', value: fe.updatesProjectRevenue, icon: TrendingUp },
    { label: 'Updates Cash Flow Forecast', value: fe.updatesCashFlowForecast, icon: ArrowRightLeft },
    { label: 'Updates Tax Ledger', value: fe.updatesTaxLedger, icon: Landmark },
    { label: 'Updates Retention Balance', value: fe.updatesRetentionBalance, icon: Lock },
    { label: 'Updates Advance Balance', value: fe.updatesAdvanceBalance, icon: Receipt },
    { label: 'Updates WIP', value: fe.updatesWIP, icon: Layers },
    { label: 'Updates Budget Consumed', value: fe.updatesBudgetConsumed, icon: Scale },
    { label: 'Updates Commitment', value: fe.updatesCommitmentAmount, icon: Shield },
    { label: 'Updates COGS', value: fe.updatesCOGS, icon: DollarSign },
    { label: 'Updates Subcontract Liability', value: fe.updatesSubcontractLiability, icon: Banknote },
  ];

  const activeFlags = flags.filter(f => f.value);
  const inactiveFlags = flags.filter(f => !f.value);

  return (
    <div className="space-y-3">
      {activeFlags.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" /> Active Finance Effects
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {activeFlags.map(f => (
              <div key={f.label} className="flex items-center gap-1.5 text-xs bg-green-500/5 border border-green-500/20 rounded px-2 py-1">
                <f.icon className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-green-700 dark:text-green-400">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {inactiveFlags.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Inactive Effects</h4>
          <div className="grid grid-cols-2 gap-1">
            {inactiveFlags.map(f => (
              <div key={f.label} className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-0.5">
                <f.icon className="w-3 h-3 shrink-0 opacity-30" />
                <span className="opacity-50">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// POSTING LOGIC PANEL
// ============================================================
function PostingLogicPanel({ fe }: { fe: FinanceEffectDefinition }) {
  return (
    <div className="space-y-4">
      {/* Typical Postings */}
      {fe.typicalPostings && fe.typicalPostings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
            <BookOpen className="w-4 h-4 text-primary" /> Journal Entry Template
          </h4>
          {fe.typicalPostings.map((posting, i) => (
            <Card key={i} className="mb-2">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">{posting.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Debit (Dr)</p>
                    {posting.debit.map((d, j) => (
                      <div key={j} className="text-xs bg-green-500/5 border border-green-500/20 rounded px-2 py-1 mb-1">{d}</div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Credit (Cr)</p>
                    {posting.credit.map((c, j) => (
                      <div key={j} className="text-xs bg-red-500/5 border border-red-500/20 rounded px-2 py-1 mb-1">{c}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Account Determination Source */}
      {fe.accountDeterminationSource.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
            <Landmark className="w-4 h-4" /> Account Determination Source
          </h4>
          <div className="flex gap-1.5 flex-wrap">
            {fe.accountDeterminationSource.map(s => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Posting Prerequisites */}
      {fe.postingPrerequisites.length > 0 && (
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
            <Shield className="w-4 h-4 text-amber-600" /> Posting Prerequisites
          </h4>
          <ul className="space-y-1">
            {fe.postingPrerequisites.map((p, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <AlertCircle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trigger Point */}
      <div>
        <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
          <Clock className="w-4 h-4" /> Journal Trigger Point
        </h4>
        <Badge variant="outline" className="text-xs">
          {fe.journalTriggerPoint === 'none' ? 'No Journal' : fe.journalTriggerPoint.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================
// CANCELLATION / REVERSAL PANEL
// ============================================================
function ReversalPanel({ fe }: { fe: FinanceEffectDefinition }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h4 className="text-xs font-medium mb-1">Cancellation Method</h4>
          <Badge variant="outline" className="text-xs">
            {fe.cancellationMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>
        <div>
          <h4 className="text-xs font-medium mb-1">Reversal Method</h4>
          <Badge variant="outline" className="text-xs">
            {fe.reversalMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>
      </div>
      {fe.reversalRules.length > 0 && (
        <div>
          <h4 className="text-xs font-medium mb-1">Rules</h4>
          <ul className="space-y-1">
            {fe.reversalRules.map((r, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN ERP MODULE PAGE
// ============================================================

export function ERPModulePage({ config }: { config: ERPModulePageConfig }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('list');

  const feInfo = financeEffectLabels[config.financeEffect];
  const registryDef = config.financeRegistryKey ? getFinanceEffect(config.financeRegistryKey) : undefined;
  const classInfo = registryDef ? classificationLabels[registryDef.financialClassification] : null;

  // Merge registry data with config for display
  const effectiveApproval = registryDef?.approvalRequired ?? config.approvalRequired;
  const effectiveApprovalConditions = registryDef?.approvalConditions ?? config.approvalConditions ?? [];
  const effectiveValidationRules = registryDef?.validationRules ?? config.validationRules ?? [];
  const effectiveReversalRules = registryDef?.reversalRules ?? config.reversalRules ?? [];
  const effectiveUpstream = registryDef?.upstreamDocuments ?? config.upstreamDocs ?? [];
  const effectiveDownstream = registryDef?.downstreamDocuments ?? config.downstreamDocs ?? [];
  const effectiveStatusFlow = registryDef?.statusFlow ?? config.statusFlow?.map(String) ?? [];
  const effectiveDimensions = registryDef?.dimensionRequirements ?? config.dimensionRequirements;

  const handleCreate = () => {
    const missing = config.formFields
      .filter(f => f.required && !formData[f.key])
      .map(f => f.label);
    if (missing.length > 0) {
      toast.error(`Required fields missing: ${missing.join(', ')}`);
      return;
    }
    toast.success(`${config.documentType || 'Record'} created successfully`);
    setShowCreate(false);
    setFormData({});
  };

  const filteredData = (config.sampleData || []).filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{config.title}</h1>
              {classInfo ? (
                <Badge className={classInfo.color}>{classInfo.label}</Badge>
              ) : (
                <Badge className={feInfo.color}>{feInfo.label}</Badge>
              )}
              {effectiveApproval && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  <CheckCircle className="w-3 h-3 mr-1" /> Approval Required
                </Badge>
              )}
              {registryDef?.createsJournalEntry && (
                <Badge variant="outline" className="border-red-500 text-red-600">
                  <BookOpen className="w-3 h-3 mr-1" /> Posts Journal
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            {registryDef && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{config.businessPurpose}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInfo(true)}>
              <FileText className="w-4 h-4 mr-1" /> Doc Info
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New {config.documentType || 'Record'}
            </Button>
          </div>
        </div>

        {/* KPIs from registry or config */}
        {(config.kpis && config.kpis.length > 0) ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {config.kpis.map((kpi, i) => (
              <Card key={i} className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : registryDef?.kpiImpact && registryDef.kpiImpact.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {registryDef.kpiImpact.map((kpi, i) => (
              <Card key={i} className="border">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{kpi}</p>
                  <p className="text-lg font-bold text-foreground">—</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="list">
              <FileText className="w-3 h-3 mr-1" /> List
            </TabsTrigger>
            <TabsTrigger value="workflow">
              <ArrowUpDown className="w-3 h-3 mr-1" /> Workflow
            </TabsTrigger>
            {registryDef && (
              <TabsTrigger value="finance">
                <DollarSign className="w-3 h-3 mr-1" /> Finance Effect
              </TabsTrigger>
            )}
            {registryDef?.createsJournalEntry && (
              <TabsTrigger value="posting">
                <BookOpen className="w-3 h-3 mr-1" /> Posting Logic
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics">
              <BarChart3 className="w-3 h-3 mr-1" /> Analytics
            </TabsTrigger>
            {config.tabs?.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* LIST TAB */}
          <TabsContent value="list">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${config.title.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filter</Button>
              <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {config.columns.map(col => (
                        <TableHead key={col.key} style={col.width ? { width: col.width } : undefined}>
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && <ArrowUpDown className="w-3 h-3" />}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? filteredData.map((row, idx) => (
                      <TableRow key={idx}>
                        {config.columns.map(col => (
                          <TableCell key={col.key}>
                            {col.type === 'status' ? (
                              <Badge className={statusColors[row[col.key]] || 'bg-muted'}>
                                {String(row[col.key]).replace(/_/g, ' ')}
                              </Badge>
                            ) : col.type === 'currency' ? (
                              <span className="font-mono">{Number(row[col.key]).toLocaleString('en', { minimumFractionDigits: 2 })}</span>
                            ) : col.type === 'progress' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-muted rounded-full">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${row[col.key]}%` }} />
                                </div>
                                <span className="text-xs">{row[col.key]}%</span>
                              </div>
                            ) : (
                              String(row[col.key] ?? '-')
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={config.columns.length + 1} className="text-center py-8 text-muted-foreground">
                          No records found. Click "New {config.documentType || 'Record'}" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WORKFLOW TAB */}
          <TabsContent value="workflow">
            <div className="space-y-4">
              {/* Status Flow */}
              {effectiveStatusFlow.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Document Lifecycle</CardTitle>
                    <CardDescription>Status transitions for {config.documentType || config.title}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {effectiveStatusFlow.map((status, i) => (
                        <div key={status} className="flex items-center gap-2">
                          <Badge className={statusColors[status] || 'bg-muted'}>{status.replace(/_/g, ' ')}</Badge>
                          {i < effectiveStatusFlow.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Validation Rules */}
              {effectiveValidationRules.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Validation Rules</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {effectiveValidationRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Approval Conditions */}
              {effectiveApprovalConditions.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Approval Conditions</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {effectiveApprovalConditions.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Shield className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <span className="text-muted-foreground">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Reversal Rules */}
              {effectiveReversalRules.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Cancellation / Reversal Rules</CardTitle></CardHeader>
                  <CardContent>
                    {registryDef && <ReversalPanel fe={registryDef} />}
                    {!registryDef && (
                      <ul className="space-y-1.5">
                        {effectiveReversalRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                            <span className="text-muted-foreground">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Document Flow */}
              {(effectiveUpstream.length > 0 || effectiveDownstream.length > 0) && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Document Flow</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 flex-wrap">
                      {effectiveUpstream.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Copy From (Upstream)</p>
                          <div className="flex gap-1 flex-wrap">
                            {effectiveUpstream.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                          </div>
                        </div>
                      )}
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      <div className="px-3 py-2 border rounded bg-primary/5">
                        <p className="text-sm font-medium text-foreground">{config.documentType || config.title}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      {effectiveDownstream.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Copy To (Downstream)</p>
                          <div className="flex gap-1 flex-wrap">
                            {effectiveDownstream.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* FINANCE EFFECT TAB */}
          {registryDef && (
            <TabsContent value="finance">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Finance Effect Flags */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Finance Effect Flags
                    </CardTitle>
                    <CardDescription>{config.financeEffectDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FinanceEffectFlags fe={registryDef} />
                  </CardContent>
                </Card>

                {/* Dimension Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Required Dimensions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(registryDef.dimensionRequirements).map(([key, required]) => (
                        <div key={key} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${required ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}>
                          {required ? <Lock className="w-3 h-3 text-primary shrink-0" /> : <Unlock className="w-3 h-3 text-muted-foreground shrink-0" />}
                          <span className={required ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          </span>
                          <Badge variant={required ? 'default' : 'outline'} className="text-[10px] ml-auto h-4 px-1">
                            {required ? 'Required' : 'Optional'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Reporting Effect */}
                {registryDef.reportingEffect.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Reporting Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-1.5 flex-wrap">
                        {registryDef.reportingEffect.map(r => (
                          <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* KPI Impact */}
                {registryDef.kpiImpact.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> KPI Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-1.5 flex-wrap">
                        {registryDef.kpiImpact.map(k => (
                          <Badge key={k} className="bg-primary/10 text-primary text-xs">{k}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {/* POSTING LOGIC TAB */}
          {registryDef?.createsJournalEntry && (
            <TabsContent value="posting">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Posting Logic & Journal Template
                  </CardTitle>
                  <CardDescription>
                    Account determination, posting prerequisites, and journal entry structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PostingLogicPanel fe={registryDef} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Analytics & KPIs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Analytics dashboard for {config.title} will display trends, distributions, and performance metrics.</p>
                {effectiveDimensions && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Required Dimensions</h4>
                    <div className="flex gap-2 flex-wrap">
                      {effectiveDimensions.branch && <Badge variant="outline">Branch</Badge>}
                      {effectiveDimensions.project && <Badge variant="outline">Project</Badge>}
                      {effectiveDimensions.costCenter && <Badge variant="outline">Cost Center</Badge>}
                      {effectiveDimensions.costCode && <Badge variant="outline">Cost Code</Badge>}
                      {effectiveDimensions.activity && <Badge variant="outline">Activity</Badge>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New {config.documentType || 'Record'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {config.formFields.map(field => (
                <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                  <label className="text-sm font-medium text-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <Select value={formData[field.key] || ''} onValueChange={v => setFormData({ ...formData, [field.key]: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={field.placeholder || `Select ${field.label}`} /></SelectTrigger>
                      <SelectContent>
                        {field.options?.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      className="mt-1"
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      className="mt-1"
                      type={field.type === 'currency' ? 'number' : field.type}
                      placeholder={field.placeholder}
                      value={formData[field.key] || ''}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              {effectiveApproval && (
                <Button variant="outline" onClick={handleCreate}>
                  <Clock className="w-4 h-4 mr-1" /> Save as Draft
                </Button>
              )}
              <Button onClick={handleCreate}>
                {effectiveApproval ? 'Submit for Approval' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Info Dialog */}
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Document Information — {config.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="text-sm font-medium">Business Purpose</h4>
                  <p className="text-sm text-muted-foreground mt-1">{config.businessPurpose}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium">Financial Classification</h4>
                  {classInfo ? (
                    <Badge className={classInfo.color + ' mt-1'}>{classInfo.label}</Badge>
                  ) : (
                    <Badge className={feInfo.color + ' mt-1'}>{feInfo.label}</Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{config.financeEffectDescription}</p>
                </div>

                {registryDef && (
                  <>
                    <Separator />
                    <FinanceEffectFlags fe={registryDef} />
                    {registryDef.createsJournalEntry && (
                      <>
                        <Separator />
                        <PostingLogicPanel fe={registryDef} />
                      </>
                    )}
                    <Separator />
                    <ReversalPanel fe={registryDef} />
                  </>
                )}

                {effectiveUpstream.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Copy From (Upstream)</h4>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {effectiveUpstream.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                    </div>
                  </div>
                )}
                {effectiveDownstream.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Copy To (Downstream)</h4>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {effectiveDownstream.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default ERPModulePage;
