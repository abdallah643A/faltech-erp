import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, TrendingUp, CheckSquare, Activity,
  Package, FileText, CreditCard, BarChart3, Settings, UserCog, GitBranch,
  Shield, HardDrive, Headphones, ChevronDown, ChevronRight, X, MapPin,
  ShieldCheck, BarChart2, RefreshCw, FileSpreadsheet, Receipt, MessageCircle,
  Building2, Calendar, Clock, DollarSign, Star, FolderKanban, Layers, ListOrdered,
  GanttChart, ClipboardList, ClipboardCheck, FileDown, PenTool, Factory, Truck,
  Award, Globe, ShoppingCart, Hash, AlertTriangle, Warehouse, Percent, Database,
  BookOpen, PackagePlus, PackageMinus, ArrowRightLeft, FileX, RotateCcw,
  Volume2, GraduationCap, UserPlus, Grid3X3, Barcode, Landmark, Link2, ArrowLeftRight, ArrowLeftRight as CurrencyIcon,
  Stamp, Ship, Smartphone, Wrench, BellRing, Network, Printer, Cpu, Brain,
  Ruler, Search, ChevronLeft, ArrowUpDown, GripVertical, Zap, Bell, Heart, Wand2, Eye, Download, HardHat, Inbox, FlaskConical,
  Mail, ScanLine, Lock, Lightbulb, Bot, TrendingDown, FileSearch, ShieldAlert, GitCompare, Layout, Upload, History,
  Key, Puzzle, ListChecks, Laptop, Gauge, Fuel, Calculator, Trash2, FileSignature, Tag, Sliders, Play, Settings2, Rocket, Utensils, ChefHat, Scissors,
  Repeat, GitMerge, Archive, Globe as Globe2, Plug, Stethoscope, LogOut, MessageSquare, Briefcase, Send, Cloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  href?: string;
  children?: NavItem[];
  requiredRoles?: ('admin' | 'manager' | 'sales_rep' | 'user')[];
  badge?: string;
}

interface ModuleGroup {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  color: string;
  items: NavItem[];
}

// ─── Module definitions ───────────────────────────────────────────
const moduleGroups: ModuleGroup[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    labelKey: 'nav.dashboard',
    color: 'from-blue-500/20 to-blue-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/' },
      { icon: Brain, labelKey: 'nav.unifiedExecutive', href: '/unified-executive' },
      { icon: TrendingUp, labelKey: 'nav.advancedAnalytics', href: '/advanced-analytics' },
      { icon: BarChart3, labelKey: 'nav.reports', href: '/reports' },
    ],
  },
  {
    id: 'executive-reporting',
    icon: BarChart3,
    labelKey: 'nav.executiveReporting',
    color: 'from-rose-500/20 to-rose-600/10',
    items: [
      { icon: Target, labelKey: 'nav.strategicGoals', href: '/strategic-goals' },
      { icon: Building2, labelKey: 'nav.crossCompanyAnalytics', href: '/cross-company-analytics' },
      { icon: TrendingDown, labelKey: 'nav.profitabilityWaterfall', href: '/profitability-waterfall' },
      { icon: FileText, labelKey: 'nav.meetingSummaries', href: '/meeting-summaries' },
      { icon: ShieldAlert, labelKey: 'nav.enterpriseRiskRegister', href: '/enterprise-risk-register' },
      { icon: BookOpen, labelKey: 'nav.managementDecisionLog', href: '/management-decision-log' },
      { icon: Calendar, labelKey: 'nav.documentExpiryTracking', href: '/document-expiry-tracking' },
    ],
  },
  {
    id: 'governance',
    icon: Shield,
    labelKey: 'nav.governanceSuite',
    color: 'from-indigo-500/20 to-indigo-600/10',
    items: [
      { icon: ClipboardCheck, labelKey: 'nav.govTaskInbox', href: '/governance/task-inbox' },
      { icon: ListChecks, labelKey: 'nav.govApprovalTemplates', href: '/governance/approval-templates' },
      { icon: Users, labelKey: 'nav.govDelegations', href: '/governance/delegations' },
      { icon: GitCompare, labelKey: 'nav.govWorkflowDesigner', href: '/governance/workflow-designer' },
      { icon: FileText, labelKey: 'nav.govRetentionRules', href: '/governance/retention-rules' },
      { icon: Eye, labelKey: 'nav.govOcrIngestion', href: '/governance/ocr-ingestion' },
      { icon: Mail, labelKey: 'nav.govExternalShares', href: '/governance/external-shares' },
      { icon: Lock, labelKey: 'nav.govSignatureEnvelopes', href: '/governance/signature-envelopes' },
      { icon: Shield, labelKey: 'nav.govComplianceAudit', href: '/governance/compliance-audit' },
    ],
  },
  {
    id: 'mdm',
    icon: Database,
    labelKey: 'nav.mdmSuite',
    color: 'from-cyan-500/20 to-cyan-600/10',
    items: [
      { icon: Database, labelKey: 'nav.mdmOverview', href: '/mdm' },
      { icon: Network, labelKey: 'nav.mdmHierarchies', href: '/mdm/hierarchies' },
      { icon: GitMerge, labelKey: 'nav.mdmDedup', href: '/mdm/dedup' },
      { icon: ShieldCheck, labelKey: 'nav.mdmValidation', href: '/mdm/validation-policies' },
      { icon: CreditCard, labelKey: 'nav.mdmCredit', href: '/mdm/credit-profiles' },
      { icon: Receipt, labelKey: 'nav.mdmTax', href: '/mdm/tax-registrations' },
      { icon: MapPin, labelKey: 'nav.mdmAddresses', href: '/mdm/addresses' },
      { icon: Users, labelKey: 'nav.mdmContacts', href: '/mdm/contacts' },
      { icon: Layers, labelKey: 'nav.mdmSegments', href: '/mdm/segments' },
      { icon: ShieldCheck, labelKey: 'nav.mdmStewardship', href: '/mdm/stewardship' },
      { icon: History, labelKey: 'nav.mdmChangeLog', href: '/mdm/change-log' },
    ],
  },
  {
    id: 'itsm',
    icon: Headphones,
    labelKey: 'nav.itsmSuite',
    color: 'from-teal-500/20 to-teal-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.itsmOverview', href: '/itsm' },
      { icon: ClipboardList, labelKey: 'nav.itsmTickets', href: '/itsm/tickets' },
      { icon: Clock, labelKey: 'nav.itsmSLA', href: '/itsm/sla-policies' },
      { icon: BookOpen, labelKey: 'nav.itsmKB', href: '/itsm/knowledge-base' },
      { icon: Calendar, labelKey: 'nav.itsmFieldService', href: '/itsm/field-service' },
      { icon: Wrench, labelKey: 'nav.itsmTechnicians', href: '/itsm/technicians' },
      { icon: FileSignature, labelKey: 'nav.itsmContracts', href: '/itsm/contracts' },
      { icon: AlertTriangle, labelKey: 'nav.itsmEscalations', href: '/itsm/escalations' },
      { icon: BarChart2, labelKey: 'nav.itsmAnalytics', href: '/itsm/analytics' },
    ],
  },
  {
    id: 'administration',
    icon: Shield,
    labelKey: 'nav.administration',
    color: 'from-slate-500/20 to-slate-600/10',
    items: [
      { icon: Building2, labelKey: 'nav.chooseCompany', href: '/company-settings' },
      { icon: Layers, labelKey: 'nav.industryPacks', href: '/settings/industry-packs' },
      { icon: CurrencyIcon, labelKey: 'nav.exchangeRates', href: '/admin/exchange-rates' },
      {
        icon: Settings, labelKey: 'nav.systemInitialization',
        children: [
          { icon: Building2, labelKey: 'nav.companyDetails', href: '/company-details' },
          { icon: Settings, labelKey: 'nav.generalSettings', href: '/admin/general-settings' },
          { icon: Calendar, labelKey: 'nav.postingPeriods', href: '/financial-periods' },
          { icon: Shield, labelKey: 'nav.authorizations', href: '/admin/authorizations' },
          { icon: Hash, labelKey: 'nav.documentNumbering', href: '/admin/document-numbering' },
          { icon: Settings, labelKey: 'nav.documentSettings', href: '/admin/document-settings' },
          { icon: Printer, labelKey: 'nav.printPreferences', href: '/admin/print-preferences' },
          { icon: Layout, labelKey: 'nav.menuStructure', href: '/admin/menu-structure' },
          { icon: Search, labelKey: 'nav.menuAlias', href: '/admin/menu-alias' },
          { icon: Mail, labelKey: 'nav.emailSettings', href: '/admin/email-settings' },
          { icon: BookOpen, labelKey: 'nav.openingBalances', href: '/admin/opening-balances' },
          { icon: Rocket, labelKey: 'nav.implementationCenter', href: '/admin/implementation-center' },
          { icon: ListChecks, labelKey: 'nav.implementationTasks', href: '/admin/implementation-tasks' },
          { icon: FolderKanban, labelKey: 'nav.implementationProject', href: '/admin/implementation-project' },
          { icon: GitCompare, labelKey: 'nav.configManagement', href: '/admin/configuration-management' },
          { icon: HardDrive, labelKey: 'nav.pathSettings', href: '/admin/path-settings' },
          { icon: Lightbulb, labelKey: 'nav.tooltipPreview', href: '/admin/tooltip-preview' },
          { icon: Rocket, labelKey: 'nav.createNewCompany', href: '/onboarding/create-company' },
          { icon: GitCompare, labelKey: 'nav.copyFromExisting', href: '/onboarding/copy-company' },
        ],
      },
      {
        icon: Settings, labelKey: 'nav.setup',
        children: [
          { icon: Settings, labelKey: 'nav.setupGeneral', href: '/setup/general' },
          { icon: Landmark, labelKey: 'nav.setupFinancials', href: '/setup/financials' },
          { icon: Target, labelKey: 'nav.setupOpportunities', href: '/setup/opportunities' },
          { icon: DollarSign, labelKey: 'nav.setupSales', href: '/setup/sales' },
          { icon: ShoppingCart, labelKey: 'nav.setupPurchasing', href: '/setup/purchasing' },
          { icon: Users, labelKey: 'nav.setupBP', href: '/setup/business-partners' },
          { icon: Landmark, labelKey: 'nav.setupBanking', href: '/setup/banking' },
          { icon: Package, labelKey: 'nav.setupInventory', href: '/setup/inventory' },
          { icon: Wrench, labelKey: 'nav.setupResources', href: '/setup/resources' },
          { icon: Headphones, labelKey: 'nav.setupService', href: '/setup/service' },
          { icon: Building2, labelKey: 'nav.setupHR', href: '/setup/human-resources' },
          { icon: Layers, labelKey: 'nav.setupProjects', href: '/setup/project-management' },
          { icon: Factory, labelKey: 'nav.setupProduction', href: '/setup/production' },
          { icon: Users, labelKey: 'nav.setupUsersBranches', href: '/setup/users-branches' },
          { icon: Globe, labelKey: 'nav.setupElectronicDocs', href: '/setup/electronic-documents' },
        ],
      },
      {
        icon: ArrowUpDown, labelKey: 'nav.dataImportExport',
        children: [
          { icon: Upload, labelKey: 'nav.dataImport', href: '/data-import' },
          { icon: FileSpreadsheet, labelKey: 'nav.importFromExcel', href: '/data-import/import-excel' },
          { icon: Database, labelKey: 'nav.importFromSAP', href: '/data-import/import-sap' },
          { icon: HardDrive, labelKey: 'nav.importAssets', href: '/data-import/import-assets' },
          { icon: Landmark, labelKey: 'nav.importFinancial', href: '/data-import/import-financial' },
          { icon: Download, labelKey: 'nav.dataExport', href: '/data-export' },
          { icon: ArrowUpDown, labelKey: 'nav.dataTransferWorkbench', href: '/data-transfer-workbench' },
        ],
      },
      {
        icon: Wrench, labelKey: 'nav.utilities',
        children: [
          { icon: CheckSquare, labelKey: 'nav.periodEndClosing', href: '/utilities/period-end-closing' },
          { icon: Hash, labelKey: 'nav.checkNumbering', href: '/utilities/check-numbering' },
          { icon: Layers, labelKey: 'nav.duplicateLayout', href: '/utilities/duplicate-layout' },
          { icon: ArrowRightLeft, labelKey: 'nav.transferCorrection', href: '/utilities/transfer-correction' },
          { icon: Trash2, labelKey: 'nav.masterCleanup', href: '/utilities/master-cleanup' },
          { icon: RefreshCw, labelKey: 'nav.seriesConverter', href: '/utilities/series-converter' },
          { icon: Layout, labelKey: 'nav.uiConfigTemplate', href: '/utilities/ui-config' },
          { icon: Laptop, labelKey: 'nav.connectedClients', href: '/utilities/connected-clients' },
          { icon: Clock, labelKey: 'nav.changeLogsCleanup', href: '/utilities/change-logs-cleanup' },
          { icon: Shield, labelKey: 'nav.dataProtection', href: '/utilities/data-protection' },
          { icon: History, labelKey: 'nav.changeLog', href: '/audit-trail' },
          { icon: Activity, labelKey: 'nav.processHealth', href: '/process-health' },
          { icon: ShieldCheck, labelKey: 'nav.dataQuality', href: '/data-quality' },
          { icon: Database, labelKey: 'nav.masterDataStewardship', href: '/master-data-stewardship' },
        ],
      },
      {
        icon: Stamp, labelKey: 'nav.approvalProcess',
        children: [
          { icon: Layers, labelKey: 'nav.approvalStages', href: '/approval/stages' },
          { icon: FileText, labelKey: 'nav.approvalTemplates', href: '/approval/templates' },
          { icon: BarChart3, labelKey: 'nav.approvalStatusReport', href: '/approval/status-report' },
          { icon: BarChart3, labelKey: 'nav.approvalDecisionReport', href: '/approval/decision-report' },
          { icon: Users, labelKey: 'nav.substituteAuthorizer', href: '/approval/substitute' },
          { icon: Stamp, labelKey: 'nav.approvalWorkflows', href: '/approval-workflows' },
          { icon: Inbox, labelKey: 'nav.approvalInbox', href: '/approval-inbox' },
          { icon: Network, labelKey: 'nav.workflowBuilder', href: '/workflow-builder' },
        ],
      },
      { icon: Key, labelKey: 'nav.licenseAdmin', href: '/admin/license-admin' },
      { icon: Puzzle, labelKey: 'nav.addonManager', href: '/admin/addon-manager' },
      { icon: BellRing, labelKey: 'nav.alertsManagement', href: '/admin/alerts-management' },
      { icon: ListChecks, labelKey: 'nav.workList', href: '/admin/work-list' },
      { icon: BookOpen, labelKey: 'nav.helpContentManager', href: '/admin/help-content' },
      {
        icon: Shield, labelKey: 'nav.license',
        children: [
          { icon: ShieldCheck, labelKey: 'nav.admin', href: '/admin' },
          { icon: UserCog, labelKey: 'nav.users', href: '/users' },
          { icon: Settings, labelKey: 'nav.userConfig', href: '/user-config' },
          { icon: Settings, labelKey: 'nav.requiredFields', href: '/required-fields' },
          { icon: Lock, labelKey: 'nav.rowLevelPermissions', href: '/row-level-permissions' },
        ],
      },
      {
        icon: RefreshCw, labelKey: 'nav.settingsIntegrations',
        children: [
          { icon: Database, labelKey: 'nav.sapDatabases', href: '/sap-databases' },
          { icon: RefreshCw, labelKey: 'nav.sapIntegration', href: '/sap-integration' },
          { icon: Activity, labelKey: 'nav.sapSyncCenter', href: '/sap-sync-center' },
          { icon: AlertTriangle, labelKey: 'nav.syncErrorLogs', href: '/sync-error-logs' },
        ],
      },
      { icon: Mail, labelKey: 'nav.emailSettings', href: '/mail-configuration' },
    ],
  },
  {
    id: 'crm',
    icon: Users,
    labelKey: 'nav.crm',
    color: 'from-emerald-500/20 to-emerald-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: Building2, labelKey: 'nav.customer360', href: '/customer-360' },
          { icon: Target, labelKey: 'nav.targets', href: '/targets' },
          { icon: ListOrdered, labelKey: 'nav.cadences', href: '/cadences' },
          { icon: MessageCircle, labelKey: 'nav.emailTemplates', href: '/email-templates' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Target, labelKey: 'nav.leads', href: '/leads' },
          { icon: TrendingUp, labelKey: 'nav.opportunities', href: '/opportunities' },
          { icon: Activity, labelKey: 'nav.activities', href: '/activities' },
          { icon: Calendar, labelKey: 'nav.calendar', href: '/calendar' },
          { icon: CheckSquare, labelKey: 'nav.tasks', href: '/tasks' },
          { icon: MapPin, labelKey: 'nav.visits', href: '/visits' },
          { icon: Clock, labelKey: 'nav.followUps', href: '/follow-up-automation' },
          { icon: Zap, labelKey: 'nav.emailAutomation', href: '/email-automation' },
          { icon: FileDown, labelKey: 'nav.documents', href: '/document-management' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: FolderKanban, labelKey: 'nav.salesPipeline', href: '/sales-pipeline' },
          { icon: BarChart2, labelKey: 'nav.visitAnalytics', href: '/visit-analytics' },
          { icon: BarChart2, labelKey: 'nav.opportunityReports', href: '/opportunity-reports' },
        ],
      },
    ],
  },
  {
    id: 'sales',
    icon: DollarSign,
    labelKey: 'nav.salesModule',
    color: 'from-amber-500/20 to-amber-600/10',
    items: [
      { icon: BarChart2, labelKey: 'nav.salesDashboard', href: '/sales-dashboard' },
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: DollarSign, labelKey: 'nav.priceLists', href: '/inventory/price-lists' },
          { icon: DollarSign, labelKey: 'nav.specialPrices', href: '/inventory/special-prices' },
          { icon: Percent, labelKey: 'nav.discountGroups', href: '/sales/discount-groups' },
          { icon: Users, labelKey: 'nav.salesEmployees', href: '/sales-employees' },
          { icon: MapPin, labelKey: 'nav.territories', href: '/sales/territories' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Target, labelKey: 'nav.leads', href: '/leads' },
          { icon: TrendingUp, labelKey: 'nav.opportunities', href: '/opportunities' },
          { icon: Activity, labelKey: 'nav.activities', href: '/activities' },
          { icon: FileText, labelKey: 'nav.blanketAgreement', href: '/sales/blanket-agreement' },
          { icon: FileSpreadsheet, labelKey: 'nav.salesQuotation', href: '/sales/quotation' },
          { icon: FileText, labelKey: 'nav.salesOrder', href: '/sales/order' },
          { icon: Truck, labelKey: 'nav.delivery', href: '/sales/delivery' },
          { icon: RotateCcw, labelKey: 'nav.returnRequest', href: '/sales/return-request' },
          { icon: RotateCcw, labelKey: 'nav.return', href: '/sales/return' },
          { icon: CreditCard, labelKey: 'nav.arDPRequest', href: '/sales/dp-request' },
          { icon: CreditCard, labelKey: 'nav.arDPInvoice', href: '/sales/dp-invoice' },
          { icon: Receipt, labelKey: 'nav.arInvoice', href: '/sales/ar-invoice' },
          { icon: Receipt, labelKey: 'nav.arInvoicePayment', href: '/sales/ar-invoice-payment' },
          { icon: FileX, labelKey: 'nav.arCreditMemo', href: '/sales/credit-memo' },
          { icon: Receipt, labelKey: 'nav.arReserveInvoice', href: '/sales/reserve-invoice' },
          { icon: CreditCard, labelKey: 'nav.incomingPayments', href: '/incoming-payments' },
          { icon: RefreshCw, labelKey: 'nav.recurringTrans', href: '/sales/recurring' },
          { icon: RefreshCw, labelKey: 'nav.recurringTemplates', href: '/sales/recurring-templates' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.salesReports',
        children: [
          { icon: BarChart2, labelKey: 'nav.salesAnalysis', href: '/sales/analysis' },
          { icon: DollarSign, labelKey: 'nav.grossProfitReport', href: '/sales/gp-report' },
          { icon: PackageMinus, labelKey: 'nav.backorderReport', href: '/sales/backorder' },
          { icon: FileSpreadsheet, labelKey: 'nav.quotationReport', href: '/sales/quotation-report' },
          { icon: FileText, labelKey: 'nav.openItemsList', href: '/sales/open-items' },
          { icon: Clock, labelKey: 'nav.receivablesAging', href: '/sales/aging' },
          { icon: TrendingUp, labelKey: 'nav.salesForecast', href: '/sales/forecast' },
          { icon: CreditCard, labelKey: 'nav.customerCreditControl', href: '/customer-credit-control' },
        ],
      },
      { icon: Wand2, labelKey: 'nav.docGenWizard', href: '/sales/doc-generation' },
      { icon: Printer, labelKey: 'nav.docPrinting', href: '/sales/doc-printing' },
      { icon: Bell, labelKey: 'nav.dunningWizard', href: '/sales/dunning' },
      {
        icon: DollarSign, labelKey: 'nav.quoteToCash',
        children: [
          { icon: FileText, labelKey: 'nav.q2cBlanketAgreements', href: '/sales/blanket-agreements' },
          { icon: BarChart2, labelKey: 'nav.q2cDiscountMatrix', href: '/sales/discount-matrix' },
          { icon: FileSpreadsheet, labelKey: 'nav.q2cPriceBooks', href: '/sales/price-books' },
          { icon: CreditCard, labelKey: 'nav.q2cCreditMgmt', href: '/sales/credit-management' },
          { icon: Bell, labelKey: 'nav.q2cDunningPolicies', href: '/sales/dunning-policies' },
          { icon: DollarSign, labelKey: 'nav.q2cCollections', href: '/sales/collections' },
          { icon: FileX, labelKey: 'nav.q2cDisputes', href: '/sales/disputes' },
          { icon: TrendingUp, labelKey: 'nav.q2cRevRec', href: '/sales/revenue-recognition' },
          { icon: Receipt, labelKey: 'nav.q2cTax', href: '/sales/tax-determination' },
          { icon: Truck, labelKey: 'nav.q2cIncoterms', href: '/sales/incoterms' },
          { icon: FileText, labelKey: 'nav.q2cExportDocs', href: '/sales/export-docs' },
          { icon: FileText, labelKey: 'nav.q2cPortalSharing', href: '/sales/portal-sharing' },
          { icon: BarChart3, labelKey: 'nav.q2cCashAnalytics', href: '/sales/cash-analytics' },
        ],
      },
    ],
  },
  {
    id: 'purchasing',
    icon: ShoppingCart,
    labelKey: 'nav.purchasingModule',
    color: 'from-violet-500/20 to-violet-600/10',
    items: [
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: FileText, labelKey: 'nav.purchBlanketAgreement', href: '/purchasing/blanket-agreement' },
          { icon: FileSpreadsheet, labelKey: 'nav.purchaseQuotation', href: '/purchasing/quotation' },
          { icon: FileText, labelKey: 'nav.purchaseOrder', href: '/purchasing/order' },
          { icon: PackagePlus, labelKey: 'nav.goodsReceiptPO', href: '/purchasing/goods-receipt' },
          { icon: RotateCcw, labelKey: 'nav.goodsReturn', href: '/purchasing/goods-return' },
          { icon: CreditCard, labelKey: 'nav.apDPRequest', href: '/purchasing/dp-request' },
          { icon: CreditCard, labelKey: 'nav.apDPInvoice', href: '/purchasing/dp-invoice' },
          { icon: Receipt, labelKey: 'nav.apInvoice', href: '/purchasing/ap-invoice' },
          { icon: Receipt, labelKey: 'nav.apInvoicePayment', href: '/purchasing/ap-invoice-payment' },
          { icon: FileX, labelKey: 'nav.apCreditMemo', href: '/purchasing/credit-memo' },
          { icon: Receipt, labelKey: 'nav.apReserveInvoice', href: '/purchasing/reserve-invoice' },
          { icon: Ship, labelKey: 'nav.landedCosts', href: '/purchasing/landed-costs' },
          { icon: DollarSign, labelKey: 'nav.vendorPaymentsWizard', href: '/purchasing/vendor-payments' },
          { icon: RefreshCw, labelKey: 'nav.recurringTrans', href: '/purchasing/recurring' },
          { icon: RefreshCw, labelKey: 'nav.recurringTemplates', href: '/purchasing/recurring-templates' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.purchasingReports',
        children: [
          { icon: BarChart2, labelKey: 'nav.purchaseAnalysis', href: '/purchasing/analysis' },
          { icon: FileSpreadsheet, labelKey: 'nav.purchQuotationReport', href: '/purchasing/quotation-report' },
          { icon: FileText, labelKey: 'nav.purchOpenItems', href: '/purchasing/open-items' },
          { icon: Clock, labelKey: 'nav.vendorLiabilitiesAging', href: '/purchasing/vendor-aging' },
          { icon: DollarSign, labelKey: 'nav.vendorBalances', href: '/purchasing/vendor-balances' },
          { icon: PackageMinus, labelKey: 'nav.purchBackorder', href: '/purchasing/backorder' },
        ],
      },
      { icon: Wand2, labelKey: 'nav.docGenWizard', href: '/purchasing/doc-generation' },
      { icon: Printer, labelKey: 'nav.docPrinting', href: '/purchasing/doc-printing' },
    ],
  },
  {
    id: 'bp',
    icon: Users,
    labelKey: 'nav.businessPartnersModule',
    color: 'from-emerald-500/20 to-emerald-600/10',
    items: [
      { icon: Users, labelKey: 'nav.bpMasterData', href: '/bp/master-data' },
      { icon: Barcode, labelKey: 'nav.bpCatalogNumbers', href: '/bp/catalog-numbers' },
      { icon: Target, labelKey: 'nav.bpLeads', href: '/bp/leads' },
      { icon: Activity, labelKey: 'nav.bpActivities', href: '/bp/activities' },
      { icon: CheckSquare, labelKey: 'nav.bpActivityStatus', href: '/bp/activity-status' },
      {
        icon: MessageCircle, labelKey: 'nav.campaignManagement',
        children: [
          { icon: Wand2, labelKey: 'nav.campaignWizard', href: '/bp/campaign-wizard' },
          { icon: FileText, labelKey: 'nav.campaignList', href: '/bp/campaigns' },
        ],
      },
      { icon: FileSpreadsheet, labelKey: 'nav.customerStatement', href: '/bp/customer-statement' },
      { icon: AlertTriangle, labelKey: 'nav.dunningHistory', href: '/bp/dunning-history' },
      {
        icon: BarChart3, labelKey: 'nav.bpReports',
        children: [
          { icon: BarChart2, labelKey: 'nav.bpReportsList', href: '/bp/reports' },
        ],
      },
    ],
  },
  {
    id: 'procurement',
    icon: ShoppingCart,
    labelKey: 'nav.procurementModule',
    color: 'from-violet-500/20 to-violet-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: Users, labelKey: 'nav.businessPartners', href: '/business-partners' },
          { icon: Globe, labelKey: 'nav.vendorPortal', href: '/vendor-portal' },
          { icon: Globe, labelKey: 'nav.supplierHub', href: '/supplier-hub', badge: 'New' },
          { icon: ShieldCheck, labelKey: 'nav.vendorPrequalification', href: '/vendor-prequalification', badge: 'New' },
          { icon: ArrowRightLeft, labelKey: 'nav.materialSubstitution', href: '/material-substitution', badge: 'New' },
          { icon: ListChecks, labelKey: 'nav.approvedVendorList', href: '/procurement/approved-vendors' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: ClipboardList, labelKey: 'nav.procurementPlanning', href: '/procurement/planning' },
          { icon: ClipboardList, labelKey: 'nav.materialDemand', href: '/procurement/material-demand' },
          { icon: FileText, labelKey: 'nav.purchaseRequests', href: '/procurement?tab=pr' },
          { icon: ClipboardCheck, labelKey: 'nav.rfqManagement', href: '/procurement/rfq-management' },
          { icon: FileText, labelKey: 'nav.supplierResponses', href: '/procurement/supplier-responses' },
          { icon: ShieldCheck, labelKey: 'nav.technicalEvaluation', href: '/procurement/technical-eval' },
          { icon: DollarSign, labelKey: 'nav.commercialEvaluation', href: '/procurement/commercial-eval' },
          { icon: Star, labelKey: 'nav.bidComparison', href: '/procurement/bid-comparison' },
          { icon: Award, labelKey: 'nav.awardRecommendation', href: '/procurement/award-recommendation' },
          { icon: FileSpreadsheet, labelKey: 'nav.purchaseOrders', href: '/procurement?tab=po' },
          { icon: FileText, labelKey: 'nav.frameworkAgreements', href: '/procurement/framework-agreements' },
          { icon: PackagePlus, labelKey: 'nav.goodsReceipt', href: '/procurement?tab=grpo' },
          { icon: Receipt, labelKey: 'nav.apInvoice', href: '/procurement?tab=ap' },
          { icon: ClipboardList, labelKey: 'nav.materialRequests', href: '/material-requests' },
          { icon: Layers, labelKey: 'nav.demandConsolidation', href: '/demand-consolidation' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: BarChart2, labelKey: 'nav.procurementDashboard', href: '/procurement-analytics' },
          { icon: Star, labelKey: 'nav.supplierComparison', href: '/supplier-comparison', badge: 'New' },
          { icon: TrendingUp, labelKey: 'nav.priceIntelligence', href: '/price-intelligence', badge: 'New' },
          { icon: Star, labelKey: 'nav.supplierScorecards', href: '/supplier-scorecards' },
          { icon: DollarSign, labelKey: 'nav.spendAnalysis', href: '/procurement/spend-analysis' },
          { icon: BarChart2, labelKey: 'nav.procurementKPIs', href: '/procurement/kpis' },
          { icon: Tag, labelKey: 'nav.categoryManagement', href: '/procurement/category-management' },
        ],
      },
      {
        icon: Target, labelKey: 'nav.strategicProcurement',
        children: [
          { icon: Target, labelKey: 'nav.sourcingEvents', href: '/procurement/sourcing-events', badge: 'New' },
          { icon: Award, labelKey: 'nav.rebateTracking', href: '/procurement/rebates', badge: 'New' },
          { icon: ShieldCheck, labelKey: 'nav.approvedVendors', href: '/procurement/approved-vendors' },
          { icon: GitBranch, labelKey: 'nav.approvalThresholds', href: '/procurement/approval-thresholds', badge: 'New' },
          { icon: Sliders, labelKey: 'nav.toleranceRules', href: '/procurement/tolerance-rules', badge: 'New' },
          { icon: ShieldAlert, labelKey: 'nav.vendorRiskScoring', href: '/procurement/vendor-risk', badge: 'New' },
          { icon: BellRing, labelKey: 'nav.complianceAlerts', href: '/procurement/compliance-alerts', badge: 'New' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    icon: Landmark,
    labelKey: 'nav.finance',
    color: 'from-sky-500/20 to-sky-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: BookOpen, labelKey: 'nav.chartOfAccounts', href: '/chart-of-accounts' },
          { icon: FolderKanban, labelKey: 'nav.costCenterDimensions', href: '/cost-center-dimensions' },
          { icon: DollarSign, labelKey: 'nav.budgetSetup', href: '/budget-setup' },
          {
            icon: Building2, labelKey: 'nav.costAccounting',
            children: [
              { icon: Building2, labelKey: 'nav.caCostCenters', href: '/cost-accounting' },
              { icon: GitBranch, labelKey: 'nav.caDistributionRules', href: '/cost-accounting/distribution-rules' },
              { icon: Network, labelKey: 'nav.caHierarchy', href: '/cost-accounting/hierarchy' },
              { icon: BarChart3, labelKey: 'nav.caCCDR', href: '/cost-accounting/cc-dr' },
              { icon: Brain, labelKey: 'nav.caAIEstimation', href: '/cost-accounting/ai-estimation' },
              { icon: BarChart3, labelKey: 'nav.caBudgetVsActual', href: '/cost-accounting/budget-vs-actual' },
              { icon: Layers, labelKey: 'nav.caWorkPackages', href: '/cost-accounting/work-packages' },
              { icon: Calculator, labelKey: 'nav.caMarkupMargin', href: '/cost-accounting/markup-margin' },
              { icon: Percent, labelKey: 'nav.caMarginAnalysis', href: '/cost-accounting/margin-analysis' },
              { icon: FileText, labelKey: 'nav.caRateCards', href: '/cost-accounting/rate-cards' },
              { icon: Package, labelKey: 'nav.caMaterials', href: '/cost-accounting/materials' },
              { icon: Wrench, labelKey: 'nav.caEquipment', href: '/cost-accounting/equipment' },
              { icon: Users, labelKey: 'nav.caSubcontractors', href: '/cost-accounting/subcontractors' },
              { icon: DollarSign, labelKey: 'nav.caProfitability', href: '/cost-accounting/profitability' },
              { icon: Target, labelKey: 'nav.caBenchmarking', href: '/cost-accounting/benchmarking' },
              { icon: TrendingUp, labelKey: 'nav.caEscalation', href: '/cost-accounting/escalation' },
              { icon: Activity, labelKey: 'nav.caCPIMonitor', href: '/cost-accounting/cpi-monitor' },
              { icon: FileText, labelKey: 'nav.caRevenueRecog', href: '/cost-accounting/revenue-recognition' },
              { icon: Target, labelKey: 'nav.caProfitForecast', href: '/cost-accounting/profit-forecast' },
              { icon: FlaskConical, labelKey: 'nav.caWhatIf', href: '/cost-accounting/what-if' },
              { icon: Award, labelKey: 'nav.caSupplierScores', href: '/cost-accounting/supplier-scores' },
              { icon: Settings, labelKey: 'nav.caAutoAllocation', href: '/cost-accounting/auto-allocation' },
              { icon: BarChart3, labelKey: 'nav.caExecutive', href: '/cost-accounting/executive' },
              { icon: FolderKanban, labelKey: 'nav.caDrillDown', href: '/cost-accounting/drill-down' },
              { icon: Zap, labelKey: 'nav.caResourceOpt', href: '/cost-accounting/resource-optimizer' },
              { icon: Lightbulb, labelKey: 'nav.caValueEng', href: '/cost-accounting/value-engineering' },
              { icon: Bell, labelKey: 'nav.caAlerts', href: '/cost-accounting/alerts' },
            ],
          },
          { icon: Calendar, labelKey: 'nav.financialPeriods', href: '/financial-periods' },
          {
            icon: Ship, labelKey: 'nav.landedCostSetup', href: '/landed-cost-setup',
            children: [
              { icon: BarChart3, labelKey: 'nav.lcDashboard', href: '/landed-cost-setup' },
              { icon: FileText, labelKey: 'nav.lcDocuments', href: '/landed-cost-setup/documents' },
              { icon: Tag, labelKey: 'nav.lcCategories', href: '/landed-cost-setup/categories' },
              { icon: Users, labelKey: 'nav.lcBrokers', href: '/landed-cost-setup/brokers' },
              { icon: Shield, labelKey: 'nav.lcMappings', href: '/landed-cost-setup/mappings' },
              { icon: Sliders, labelKey: 'nav.lcControls', href: '/landed-cost-setup/settings' },
            ],
          },
          {
            icon: Settings, labelKey: 'nav.accountingDetermination', href: '/accounting-determination',
            children: [
              { icon: BarChart3, labelKey: 'nav.adDashboard', href: '/accounting-determination' },
              { icon: Settings, labelKey: 'nav.adRules', href: '/accounting-determination/rules' },
              { icon: Layers, labelKey: 'nav.adTemplates', href: '/accounting-determination/templates' },
              { icon: BookOpen, labelKey: 'nav.adGLRoles', href: '/accounting-determination/gl-roles' },
              { icon: Clock, labelKey: 'nav.adControls', href: '/accounting-determination/controls' },
              { icon: Play, labelKey: 'nav.adSimulator', href: '/accounting-determination/simulator' },
              { icon: AlertTriangle, labelKey: 'nav.adErrors', href: '/accounting-determination/errors' },
              { icon: FileText, labelKey: 'nav.adLogs', href: '/accounting-determination/logs' },
              { icon: Shield, labelKey: 'nav.adReports', href: '/accounting-determination/reports' },
            ],
          },
          { icon: ArrowUpDown, labelKey: 'nav.jeMappingRules', href: '/je-mapping-rules' },
          { icon: BookOpen, labelKey: 'nav.clauseLibrary', href: '/clause-library' },
        ],
      },
      {
        icon: ShieldCheck, labelKey: 'nav.financeEnhanced',
        children: [
          { icon: Gauge, labelKey: 'nav.controllerDashboard', href: '/finance/controller-dashboard' },
          { icon: Building2, labelKey: 'nav.coaByEntity', href: '/finance/coa-by-entity' },
          { icon: Layers, labelKey: 'nav.dimensionAccounting', href: '/finance/dimensions' },
          { icon: Repeat, labelKey: 'nav.recurringJERunner', href: '/finance/recurring-runner' },
          { icon: GitMerge, labelKey: 'nav.eliminationsWorkflow', href: '/finance/eliminations-workflow' },
          { icon: ShieldCheck, labelKey: 'nav.sensitiveApprovals', href: '/finance/sensitive-approvals' },
          { icon: FileSpreadsheet, labelKey: 'nav.statementDesigner', href: '/finance/statement-designer' },
          { icon: BookOpen, labelKey: 'nav.ifrsViews', href: '/finance/ifrs-views' },
          { icon: Archive, labelKey: 'nav.auditPacks', href: '/finance/audit-packs' },
          { icon: Globe2, labelKey: 'nav.taxLocalization', href: '/finance/tax-localization' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: FileSpreadsheet, labelKey: 'nav.journalEntries', href: '/journal-entries' },
          { icon: FileSpreadsheet, labelKey: 'nav.journalVouchers', href: '/journal-vouchers' },
          { icon: ShieldCheck, labelKey: 'nav.financeGates', href: '/finance-gates' },
          { icon: HardDrive, labelKey: 'nav.fixedAssets', href: '/fixed-assets' },
          { icon: Ship, labelKey: 'nav.landedCosts', href: '/landed-costs' },
          { icon: AlertTriangle, labelKey: 'nav.dunning', href: '/dunning' },
          { icon: Link2, labelKey: 'nav.bankReconciliation', href: '/bank-reconciliation' },
          { icon: CreditCard, labelKey: 'nav.customerCreditControl', href: '/customer-credit-control' },
          { icon: Percent, labelKey: 'nav.marginProtection', href: '/margin-protection' },
          { icon: FileText, labelKey: 'nav.contractManagement', href: '/contract-management' },
          { icon: Calendar, labelKey: 'nav.renewalCalendar', href: '/renewal-calendar' },
          { icon: ArrowLeftRight, labelKey: 'nav.intercompanyTx', href: '/intercompany-transactions' },
          { icon: RefreshCw, labelKey: 'nav.recurringDocuments', href: '/recurring-documents' },
          { icon: ClipboardCheck, labelKey: 'nav.periodEndClosing', href: '/period-end-closing' },
          { icon: ShieldCheck, labelKey: 'nav.periodCloseControls', href: '/period-close-controls' },
          { icon: Landmark, labelKey: 'nav.treasuryWorkspace', href: '/treasury-workspace' },
          { icon: HardDrive, labelKey: 'nav.fixedAssetsRegister', href: '/fixed-assets-register' },
          { icon: FileText, labelKey: 'nav.leaseAccounting', href: '/lease-accounting' },
          { icon: Link2, labelKey: 'nav.bankReconAutomation', href: '/bank-recon-automation' },
          { icon: DollarSign, labelKey: 'nav.budgetRequestWorkflow', href: '/budget-request-workflow' },
          { icon: ClipboardCheck, labelKey: 'nav.closeDashboard', href: '/close-dashboard' },
          { icon: Calendar, labelKey: 'nav.closeCalendar', href: '/close-calendar' },
          { icon: ClipboardCheck, labelKey: 'nav.checklistBoard', href: '/checklist-board' },
          { icon: Building2, labelKey: 'nav.entityReadiness', href: '/entity-readiness' },
          { icon: Link2, labelKey: 'nav.reconciliationQueue', href: '/reconciliation-queue' },
          { icon: ShieldCheck, labelKey: 'nav.signoffMatrix', href: '/signoff-matrix' },
          { icon: FileText, labelKey: 'nav.closePackGenerator', href: '/close-pack-generator' },
          { icon: Target, labelKey: 'nav.collectionsWorkbench', href: '/collections-workbench' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: BarChart2, labelKey: 'nav.financeDashboard', href: '/finance-dashboard' },
          { icon: DollarSign, labelKey: 'nav.financeOverview', href: '/finance' },
          { icon: BarChart3, labelKey: 'nav.financialReports', href: '/financial-reports' },
          { icon: BarChart3, labelKey: 'nav.trialBalance', href: '/financial-reports/trial-balance' },
          { icon: BarChart3, labelKey: 'nav.balanceSheet', href: '/financial-reports/balance-sheet' },
          { icon: BarChart3, labelKey: 'nav.profitLoss', href: '/financial-reports/profit-loss' },
          { icon: DollarSign, labelKey: 'nav.cashFlowStatement', href: '/financial-reports/cash-flow-statement' },
          { icon: BookOpen, labelKey: 'nav.generalLedgerReport', href: '/financial-reports/general-ledger' },
          { icon: BookOpen, labelKey: 'nav.generalLedger', href: '/general-ledger' },
          { icon: Clock, labelKey: 'nav.arAging', href: '/financial-reports/ar-aging' },
          { icon: Clock, labelKey: 'nav.apAging', href: '/financial-reports/ap-aging' },
          { icon: Building2, labelKey: 'nav.costCenterSummary', href: '/financial-reports/cost-centers/summary' },
          { icon: AlertTriangle, labelKey: 'nav.costCenterVariance', href: '/financial-reports/cost-centers/variance' },
          { icon: TrendingUp, labelKey: 'nav.costCenterTrends', href: '/financial-reports/cost-centers/trends' },
          { icon: BookOpen, labelKey: 'nav.costCenterLedger', href: '/financial-reports/cost-centers/ledger' },
          { icon: Layers, labelKey: 'nav.consolidation', href: '/financial-reports/consolidation' },
          { icon: FileText, labelKey: 'nav.auditBalanceSheet', href: '/audit-balance-sheet' },
          { icon: Settings, labelKey: 'nav.bsReportConfig', href: '/bs-report-config' },
          { icon: FileText, labelKey: 'nav.financialStatements', href: '/financial-statements' },
          { icon: Shield, labelKey: 'nav.auditTrail', href: '/audit-trail' },
          { icon: BarChart2, labelKey: 'nav.budgetVsActual', href: '/budget-vs-actual' },
          { icon: TrendingUp, labelKey: 'nav.cashFlowForecastCockpit', href: '/cash-flow-forecast' },
          { icon: BarChart3, labelKey: 'nav.boardroomReporting', href: '/boardroom-reporting' },
          { icon: BarChart3, labelKey: 'nav.varianceReview', href: '/variance-review' },
        ],
      },
    ],
  },
  {
    id: 'banking',
    icon: Landmark,
    labelKey: 'nav.bankingModule',
    color: 'from-teal-500/20 to-teal-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: CurrencyIcon, labelKey: 'nav.exchangeRates', href: '/banking/exchange-rates' },
          { icon: Globe, labelKey: 'nav.enhancedFX', href: '/banking/enhanced-fx' },
          { icon: Settings, labelKey: 'nav.workflowAutomation', href: '/banking/workflow-automation' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Landmark, labelKey: 'nav.bankStatements', href: '/banking/statements' },
          { icon: DollarSign, labelKey: 'nav.outgoingPayments', href: '/banking/outgoing-payments' },
          { icon: Link2, labelKey: 'nav.reconciliation', href: '/banking/reconciliation' },
          { icon: Zap, labelKey: 'nav.smartReconciliation', href: '/banking/smart-reconciliation' },
          { icon: Landmark, labelKey: 'nav.multiBankRecon', href: '/banking/multi-bank-recon' },
          { icon: AlertTriangle, labelKey: 'nav.reconExceptions', href: '/banking/recon-exceptions' },
          { icon: Star, labelKey: 'nav.paymentOptimization', href: '/banking/payment-optimization' },
          { icon: Smartphone, labelKey: 'nav.mobileBanking', href: '/banking/mobile' },
          { icon: Download, labelKey: 'nav.statementAutomation', href: '/banking/statement-automation' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: BarChart2, labelKey: 'nav.bankingDashboard', href: '/banking/dashboard' },
          { icon: DollarSign, labelKey: 'nav.cashPosition', href: '/banking/cash-position' },
          { icon: TrendingUp, labelKey: 'nav.cashFlowForecast', href: '/banking/cash-flow-forecast' },
          { icon: GitBranch, labelKey: 'nav.scenarioPlanning', href: '/banking/cash-flow-scenarios' },
          { icon: BarChart3, labelKey: 'nav.bankingKPI', href: '/banking/kpi-dashboard' },
          { icon: Search, labelKey: 'nav.drillDownReports', href: '/banking/drill-down' },
          { icon: ArrowUpDown, labelKey: 'nav.varianceAnalysis', href: '/banking/variance-analysis' },
          { icon: Clock, labelKey: 'nav.agingAnalysis', href: '/banking/aging-analysis' },
          { icon: Brain, labelKey: 'nav.aiBankingInsights', href: '/banking/ai-insights' },
          { icon: Shield, labelKey: 'nav.bankingComplianceAudit', href: '/banking/compliance-audit' },
        ],
      },
      {
        icon: Shield, labelKey: 'nav.treasuryGovernance',
        children: [
          { icon: Landmark, labelKey: 'nav.bankAccountHierarchy', href: '/banking/account-hierarchy' },
          { icon: Plug, labelKey: 'nav.bankAdapters', href: '/banking/bank-adapters' },
          { icon: Settings, labelKey: 'nav.reconRulesEngine', href: '/banking/recon-rules' },
          { icon: ShieldCheck, labelKey: 'nav.treasuryApprovalPolicies', href: '/banking/approval-policies' },
          { icon: Globe, labelKey: 'nav.fxExposureMonitor', href: '/banking/fx-exposure' },
          { icon: AlertTriangle, labelKey: 'nav.paymentFraudRules', href: '/banking/fraud-rules' },
          { icon: Building2, labelKey: 'nav.intercompanyCash', href: '/banking/ic-cash-visibility' },
        ],
      },
    ],
  },
  {
    id: 'correspondence',
    icon: Mail,
    labelKey: 'nav.correspondence',
    color: 'from-sky-500/20 to-sky-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.correspondenceDashboard', href: '/correspondence' },
      { icon: Inbox, labelKey: 'nav.incomingCorrespondence', href: '/correspondence/incoming' },
      { icon: Send, labelKey: 'nav.outgoingCorrespondence', href: '/correspondence/outgoing' },
      { icon: Search, labelKey: 'nav.correspondenceSearch', href: '/correspondence/search' },
      { icon: BarChart3, labelKey: 'nav.correspondenceReports', href: '/correspondence/reports' },
      { icon: Cloud, labelKey: 'nav.correspondenceEcmMonitor', href: '/correspondence/ecm-monitor' },
      { icon: Settings, labelKey: 'nav.correspondenceSettings', href: '/correspondence/settings' },
    ],
  },
  {
    id: 'construction',
    icon: HardHat,
    labelKey: 'nav.constructionHub',
    color: 'from-orange-500/20 to-orange-600/10',
    items: [
      {
        icon: FileText, labelKey: 'nav.preContract',
        children: [
          { icon: Target, labelKey: 'nav.leadsOpportunities', href: '/construction/leads' },
          { icon: FileText, labelKey: 'nav.tenderRegister', href: '/construction/tender-register' },
          { icon: FileText, labelKey: 'nav.tenderDetails', href: '/construction/tender-details' },
          { icon: Upload, labelKey: 'nav.boqImport', href: '/construction/boq-import' },
          { icon: Layers, labelKey: 'nav.tenderBOQ', href: '/construction/tender-boq' },
          { icon: Calculator, labelKey: 'nav.estimationWorkbook', href: '/construction/estimation' },
          { icon: ClipboardList, labelKey: 'nav.resourceBuildUp', href: '/construction/resource-buildup' },
          { icon: AlertTriangle, labelKey: 'nav.riskContingency', href: '/construction/risk-contingency' },
          { icon: MessageCircle, labelKey: 'nav.clarificationsRFIs', href: '/construction/clarifications' },
          { icon: ClipboardCheck, labelKey: 'nav.bidReviewSheet', href: '/construction/bid-review' },
          { icon: Stamp, labelKey: 'nav.tenderApproval', href: '/construction/tender-approval' },
          { icon: Truck, labelKey: 'nav.bidSubmissionTracker', href: '/construction/bid-tracker' },
          { icon: BarChart2, labelKey: 'nav.tenderComparison', href: '/construction/tender-comparison' },
          { icon: BarChart3, labelKey: 'nav.tenderResultAnalysis', href: '/construction/tender-result' },
          { icon: Wand2, labelKey: 'nav.awardConversionWizard', href: '/construction/award-conversion' },
        ],
      },
      {
        icon: FileSpreadsheet, labelKey: 'nav.contractSetup',
        children: [
          { icon: Wand2, labelKey: 'nav.projectCreationWizard', href: '/construction/project-wizard' },
          { icon: FileText, labelKey: 'nav.contractMaster', href: '/construction/contract-master' },
          { icon: Layers, labelKey: 'nav.contractValueBreakdown', href: '/construction/contract-breakdown' },
          { icon: ListOrdered, labelKey: 'nav.boqSchedule', href: '/construction/boq-schedule' },
          { icon: Target, labelKey: 'nav.contractMilestones', href: '/construction/milestones' },
          { icon: Lock, labelKey: 'nav.retentionTerms', href: '/construction/retention-terms' },
          { icon: CreditCard, labelKey: 'nav.advancePaymentTerms', href: '/construction/advance-terms' },
          { icon: AlertTriangle, labelKey: 'nav.penaltyLDRules', href: '/construction/penalty-rules' },
          { icon: ClipboardList, labelKey: 'nav.costCodeStructure', href: '/cpms/cost-codes' },
          { icon: Layers, labelKey: 'nav.wbsActivityStructure', href: '/construction/wbs-structure' },
          { icon: DollarSign, labelKey: 'nav.budgetBaseline', href: '/construction/budget-baseline' },
          { icon: GitCompare, labelKey: 'nav.budgetVersions', href: '/construction/budget-versions' },
          { icon: Shield, labelKey: 'nav.projectApprovalMatrix', href: '/construction/approval-matrix' },
        ],
      },
      {
        icon: GanttChart, labelKey: 'nav.projectPlanning',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.projectDashboard', href: '/cpms' },
          { icon: GanttChart, labelKey: 'nav.masterSchedule', href: '/cpms/schedule-planning' },
          { icon: Calendar, labelKey: 'nav.lookaheadPlanning', href: '/construction/lookahead' },
          { icon: ShoppingCart, labelKey: 'nav.procurementPlanning', href: '/construction/procurement-plan' },
          { icon: DollarSign, labelKey: 'nav.cashFlowForecast', href: '/cpms/cash-flow' },
          { icon: TrendingUp, labelKey: 'nav.billingForecast', href: '/construction/billing-forecast' },
          { icon: AlertTriangle, labelKey: 'nav.riskRegister', href: '/construction/risk-register' },
          { icon: ClipboardCheck, labelKey: 'nav.mobilizationChecklist', href: '/construction/mobilization' },
        ],
      },
      {
        icon: ShoppingCart, labelKey: 'nav.procurementSubcontract',
        children: [
          { icon: ClipboardList, labelKey: 'nav.materialRequests', href: '/material-requests' },
          { icon: FileText, labelKey: 'nav.purchaseRequisitions', href: '/procurement?tab=pr' },
          { icon: FileSpreadsheet, labelKey: 'nav.rfqs', href: '/construction/rfqs' },
          { icon: Star, labelKey: 'nav.commercialComparison', href: '/construction/commercial-comparison' },
          { icon: FileText, labelKey: 'nav.purchaseOrder', href: '/purchasing/order' },
          { icon: Layers, labelKey: 'nav.subcontractPackages', href: '/construction/subcontract-packages' },
          { icon: Users, labelKey: 'nav.subcontractAgreement', href: '/subcontract-agreements' },
          { icon: FileText, labelKey: 'nav.subcontractBOQ', href: '/construction/subcontract-boq' },
          { icon: FileText, labelKey: 'nav.subcontractVariations', href: '/construction/subcontract-variations' },
          { icon: CreditCard, labelKey: 'nav.subcontractAdvance', href: '/construction/subcontract-advance' },
          { icon: Award, labelKey: 'nav.subcontractIPC', href: '/construction/subcontract-ipc' },
          { icon: Lock, labelKey: 'nav.subcontractRetention', href: '/construction/subcontract-retention' },
          { icon: Receipt, labelKey: 'nav.subcontractPaymentCert', href: '/construction/subcontract-payment' },
          { icon: AlertTriangle, labelKey: 'nav.backCharges', href: '/construction/back-charges' },
          { icon: Star, labelKey: 'nav.supplierPerformance', href: '/supplier-scorecards' },
        ],
      },
      {
        icon: HardHat, labelKey: 'nav.siteExecution',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.siteDashboard', href: '/construction/site-dashboard' },
          { icon: FileText, labelKey: 'nav.dailySiteReport', href: '/cpms/daily-reports' },
          { icon: Activity, labelKey: 'nav.activityProgressEntry', href: '/cpms/site-progress' },
          { icon: Layers, labelKey: 'nav.boqProgressEntry', href: '/construction/boq-progress' },
          { icon: AlertTriangle, labelKey: 'nav.ncrQualityIssues', href: '/cpms/qaqc/ncr' },
          { icon: ClipboardCheck, labelKey: 'nav.inspectionRequests', href: '/cpms/qaqc/inspections' },
          { icon: FileText, labelKey: 'nav.methodStatements', href: '/construction/method-statements' },
          { icon: FileText, labelKey: 'nav.siteIssuesLog', href: '/construction/site-issues' },
          { icon: Clock, labelKey: 'nav.delayEventsLog', href: '/construction/delay-events' },
          { icon: ShieldCheck, labelKey: 'nav.incidentSafetyLog', href: '/cpms/hse' },
          { icon: FileText, labelKey: 'nav.siteDiary', href: '/construction/site-diary' },
          { icon: MessageCircle, labelKey: 'nav.siteCorrespondence', href: '/construction/site-correspondence' },
        ],
      },
      {
        icon: Users, labelKey: 'nav.resourceLaborControl',
        children: [
          { icon: Users, labelKey: 'nav.manpowerPlanning', href: '/construction/manpower-plan' },
          { icon: FileText, labelKey: 'nav.dailyLaborReport', href: '/construction/daily-labor' },
          { icon: Clock, labelKey: 'nav.timesheets', href: '/construction/timesheets' },
          { icon: BarChart2, labelKey: 'nav.laborProductivity', href: '/cpms/labor-productivity' },
          { icon: DollarSign, labelKey: 'nav.laborCostAllocation', href: '/construction/labor-cost' },
        ],
      },
      {
        icon: Wrench, labelKey: 'nav.plantEquipment',
        children: [
          { icon: HardDrive, labelKey: 'nav.equipmentRegister', href: '/construction/equipment-register' },
          { icon: Settings, labelKey: 'nav.equipmentAllocation', href: '/equipment-allocations' },
          { icon: Clock, labelKey: 'nav.equipmentUsageLog', href: '/cpms/equipment-utilization' },
          { icon: Fuel, labelKey: 'nav.fuelConsumption', href: '/construction/fuel-consumption' },
          { icon: Wrench, labelKey: 'nav.maintenanceRequests', href: '/construction/maintenance-requests' },
          { icon: DollarSign, labelKey: 'nav.equipmentCostAllocation', href: '/construction/equipment-cost' },
          { icon: BarChart2, labelKey: 'nav.equipmentProductivity', href: '/construction/equipment-productivity' },
        ],
      },
      {
        icon: Package, labelKey: 'nav.materialStoreControl',
        children: [
          { icon: PackagePlus, labelKey: 'nav.goodsReceiptToProject', href: '/construction/goods-receipt-project' },
          { icon: ArrowRightLeft, labelKey: 'nav.siteWarehouseTransfer', href: '/construction/site-transfer' },
          { icon: PackageMinus, labelKey: 'nav.materialIssueToActivity', href: '/construction/material-issue' },
          { icon: RotateCcw, labelKey: 'nav.materialReturnFromSite', href: '/construction/material-return' },
          { icon: Package, labelKey: 'nav.materialConsumptionRegister', href: '/material-consumption' },
          { icon: AlertTriangle, labelKey: 'nav.wastageLossReport', href: '/construction/wastage-report' },
          { icon: ClipboardCheck, labelKey: 'nav.siteStockCount', href: '/construction/site-stock-count' },
          { icon: Barcode, labelKey: 'nav.materialTraceability', href: '/construction/material-trace' },
        ],
      },
      {
        icon: DollarSign, labelKey: 'nav.costControl',
        children: [
          { icon: BarChart3, labelKey: 'nav.budgetVsCommitment', href: '/construction/budget-vs-commitment' },
          { icon: BarChart3, labelKey: 'nav.budgetVsActual', href: '/construction/budget-vs-actual' },
          { icon: BookOpen, labelKey: 'nav.costLedger', href: '/construction/cost-ledger' },
          { icon: ClipboardList, labelKey: 'nav.costByCostCode', href: '/construction/cost-by-code' },
          { icon: DollarSign, labelKey: 'nav.committedCostRegister', href: '/construction/committed-cost' },
          { icon: TrendingUp, labelKey: 'nav.forecastToComplete', href: '/construction/forecast-complete' },
          { icon: Target, labelKey: 'nav.estimateAtCompletion', href: '/construction/eac' },
          { icon: AlertTriangle, labelKey: 'nav.costVarianceAnalysis', href: '/construction/cost-variance' },
          { icon: Percent, labelKey: 'nav.marginAnalysis', href: '/construction/margin-analysis' },
          { icon: Bell, labelKey: 'nav.overrunAlerts', href: '/construction/overrun-alerts' },
        ],
      },
      {
        icon: Receipt, labelKey: 'nav.clientBilling',
        children: [
          { icon: Calendar, labelKey: 'nav.billingPlan', href: '/construction/billing-plan' },
          { icon: Award, labelKey: 'nav.clientIPCValuation', href: '/construction/client-ipc' },
          { icon: Receipt, labelKey: 'nav.progressBilling', href: '/cpms/progress-billing' },
          { icon: Package, labelKey: 'nav.materialOnSiteBilling', href: '/construction/mos-billing' },
          { icon: FileText, labelKey: 'nav.variationBilling', href: '/construction/variation-billing' },
          { icon: RotateCcw, labelKey: 'nav.advanceRecovery', href: '/construction/advance-recovery' },
          { icon: Lock, labelKey: 'nav.retentionDeduction', href: '/contract-retentions' },
          { icon: Receipt, labelKey: 'nav.taxInvoice', href: '/construction/tax-invoice' },
          { icon: BarChart2, labelKey: 'nav.billingStatusDashboard', href: '/construction/billing-dashboard' },
          { icon: Clock, labelKey: 'nav.receivableAgingByProject', href: '/construction/project-aging' },
        ],
      },
      {
        icon: AlertTriangle, labelKey: 'nav.variationsClaims',
        children: [
          { icon: FileText, labelKey: 'nav.variationRequests', href: '/variation-orders' },
          { icon: Calculator, labelKey: 'nav.variationEstimates', href: '/construction/variation-estimates' },
          { icon: Stamp, labelKey: 'nav.variationApproval', href: '/construction/variation-approval' },
          { icon: FileText, labelKey: 'nav.variationRegister', href: '/construction/variation-register' },
          { icon: FileText, labelKey: 'nav.changeOrders', href: '/cpms/change-orders' },
          { icon: AlertTriangle, labelKey: 'nav.claimRegister', href: '/project-claims-disputes' },
          { icon: Clock, labelKey: 'nav.delayClaims', href: '/construction/delay-claims' },
          { icon: Calendar, labelKey: 'nav.eotRequests', href: '/construction/eot-requests' },
          { icon: FileText, labelKey: 'nav.claimValuation', href: '/construction/claim-valuation' },
        ],
      },
      {
        icon: CheckSquare, labelKey: 'nav.qualityHandoverCloseout',
        children: [
          { icon: ClipboardList, labelKey: 'nav.snagPunchList', href: '/construction/snag-list' },
          { icon: ShieldCheck, labelKey: 'nav.testingCommissioning', href: '/construction/testing' },
          { icon: AlertTriangle, labelKey: 'nav.defectRegister', href: '/construction/defect-register' },
          { icon: CheckSquare, labelKey: 'nav.handoverChecklist', href: '/construction/handover' },
          { icon: Award, labelKey: 'nav.practicalCompletion', href: '/construction/practical-completion' },
          { icon: DollarSign, labelKey: 'nav.finalAccountPrep', href: '/construction/final-account' },
          { icon: Lock, labelKey: 'nav.retentionReleaseRegister', href: '/construction/retention-release' },
          { icon: Shield, labelKey: 'nav.defectsLiability', href: '/construction/defects-liability' },
          { icon: FileText, labelKey: 'nav.projectClosureChecklist', href: '/construction/closure-checklist' },
          { icon: Database, labelKey: 'nav.archiveProject', href: '/construction/archive' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.constructionReports',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.projectKPIDashboard', href: '/cpms' },
          { icon: BarChart3, labelKey: 'nav.budgetCommitmentActual', href: '/cpms/cost-control' },
          { icon: DollarSign, labelKey: 'nav.projectProfitability', href: '/cpms/job-costing' },
          { icon: Receipt, labelKey: 'nav.billingVsCostCollection', href: '/construction/billing-vs-cost' },
          { icon: Lock, labelKey: 'nav.retentionReport', href: '/construction/retention-report' },
          { icon: Users, labelKey: 'nav.subcontractLiabilityReport', href: '/construction/subcontract-liability' },
          { icon: Package, labelKey: 'nav.materialConsumptionReport', href: '/construction/material-report' },
          { icon: Users, labelKey: 'nav.laborProductivityReport', href: '/cpms/labor-productivity' },
          { icon: Wrench, labelKey: 'nav.equipmentCostReport', href: '/construction/equipment-report' },
          { icon: TrendingUp, labelKey: 'nav.cashFlowForecastReport', href: '/cpms/cash-flow' },
          { icon: Clock, labelKey: 'nav.delayClaimReport', href: '/cpms/delay-analysis' },
          { icon: BarChart3, labelKey: 'nav.executivePortfolioDash', href: '/cpms/commercial-control-tower' },
        ],
      },
      {
        icon: Ruler, labelKey: 'nav.boqQtoEvm',
        children: [
          { icon: Ruler, labelKey: 'nav.qto', href: '/qto' },
          { icon: Layers, labelKey: 'nav.boq', href: '/boq' },
          { icon: GitCompare, labelKey: 'nav.boqComparison', href: '/boq-comparison' },
          { icon: Activity, labelKey: 'nav.evm', href: '/evm' },
          { icon: Shield, labelKey: 'nav.projectControl', href: '/project-control' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.pmo',
        children: [
          { icon: BarChart3, labelKey: 'nav.pmoExecutive', href: '/pmo/executive' },
          { icon: LayoutDashboard, labelKey: 'nav.pmoPortfolio', href: '/pmo/portfolio' },
          { icon: Layers, labelKey: 'nav.projects', href: '/pm/projects' },
          { icon: Users, labelKey: 'nav.resourceManagement', href: '/pmo/resources' },
          { icon: BookOpen, labelKey: 'nav.lessonsLearned', href: '/pmo/lessons' },
        ],
      },
      {
        icon: ShieldCheck, labelKey: 'nav.qaqcCommandCenter', badge: 'New',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.qaqcDashboard', href: '/cpms/qaqc' },
          { icon: ShieldAlert, labelKey: 'nav.qaqcTickets', href: '/cpms/qaqc/tickets' },
          { icon: ClipboardCheck, labelKey: 'nav.qaqcInspections', href: '/cpms/qaqc/inspections' },
          { icon: AlertTriangle, labelKey: 'nav.qaqcNCR', href: '/cpms/qaqc/ncr' },
          { icon: ListChecks, labelKey: 'nav.qaqcChecklists', href: '/cpms/qaqc/checklists' },
          { icon: Layout, labelKey: 'nav.qaqcDrawings', href: '/cpms/qaqc/drawings' },
          { icon: Eye, labelKey: 'nav.qaqcSiteView', href: '/cpms/qaqc/siteview' },
          { icon: Settings2, labelKey: 'nav.qaqcWorkflow', href: '/cpms/qaqc/workflow' },
          { icon: BarChart3, labelKey: 'nav.qaqcReports', href: '/cpms/qaqc/reports' },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    icon: Package,
    labelKey: 'nav.inventoryModule',
    color: 'from-cyan-500/20 to-cyan-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: Package, labelKey: 'nav.itemMasterData', href: '/inventory/item-master' },
          { icon: Package, labelKey: 'nav.items', href: '/items' },
          { icon: Layers, labelKey: 'nav.itemGroups', href: '/inventory/item-groups' },
          { icon: Warehouse, labelKey: 'nav.warehouses', href: '/warehouses' },
          { icon: Grid3X3, labelKey: 'nav.binLocations', href: '/inventory/bin-locations' },
          { icon: ArrowUpDown, labelKey: 'nav.uomGroups', href: '/inventory/uom-groups' },
          { icon: Barcode, labelKey: 'nav.batchManagement', href: '/inventory/batch-numbers' },
          { icon: Barcode, labelKey: 'nav.serialManagement', href: '/inventory/serial-numbers' },
          { icon: Percent, labelKey: 'nav.taxCodes', href: '/tax-codes' },
        ],
      },
      {
        icon: DollarSign, labelKey: 'nav.itemManagement',
        children: [
          { icon: DollarSign, labelKey: 'nav.priceLists', href: '/inventory/price-lists' },
          { icon: DollarSign, labelKey: 'nav.specialPrices', href: '/inventory/special-prices' },
          { icon: Percent, labelKey: 'nav.periodVolumeDiscounts', href: '/inventory/period-volume-discounts' },
          { icon: DollarSign, labelKey: 'nav.globalPriceUpdate', href: '/inventory/global-price-update' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: PackagePlus, labelKey: 'nav.goodsReceipt', href: '/inventory/goods-receipt' },
          { icon: PackageMinus, labelKey: 'nav.goodsIssue', href: '/inventory/goods-issue' },
          { icon: ArrowRightLeft, labelKey: 'nav.inventoryTransfer', href: '/inventory/transfer' },
          { icon: ArrowRightLeft, labelKey: 'nav.inventoryTransferRequest', href: '/inventory/transfer-request' },
          { icon: ClipboardList, labelKey: 'nav.pickList', href: '/inventory/pick-pack-manager' },
          { icon: ClipboardCheck, labelKey: 'nav.inventoryCounting', href: '/inventory/counting' },
          { icon: FileText, labelKey: 'nav.inventoryPosting', href: '/inventory/posting' },
          { icon: RefreshCw, labelKey: 'nav.cycleCountPlans', href: '/inventory/cycle-count-plans' },
          { icon: Bell, labelKey: 'nav.reorderRecommendations', href: '/inventory/reorder' },
          { icon: DollarSign, labelKey: 'nav.inventoryRevaluation', href: '/inventory/revaluation' },
          { icon: Ship, labelKey: 'nav.landedCostAllocation', href: '/inventory/landed-cost' },
          { icon: Package, labelKey: 'nav.stockReservation', href: '/stock-reservation' },
          { icon: Truck, labelKey: 'nav.transportDispatch', href: '/transport-dispatch' },
        ],
      },
      {
        icon: Barcode, labelKey: 'nav.serialBatchTracking',
        children: [
          { icon: Barcode, labelKey: 'nav.batchSerialTraceability', href: '/inventory/batch-serial' },
        ],
      },
      {
        icon: Package, labelKey: 'nav.wmsAdvanced',
        children: [
          { icon: FileText, labelKey: 'nav.wmsStockLedger', href: '/inventory/wms/stock-ledger' },
          { icon: RefreshCw, labelKey: 'nav.wmsFefoFifo', href: '/inventory/wms/fefo-fifo' },
          { icon: ArrowRightLeft, labelKey: 'nav.wmsCrossWhReservations', href: '/inventory/wms/cross-warehouse-reservations' },
          { icon: Bell, labelKey: 'nav.wmsReplenishment', href: '/inventory/wms/replenishment' },
          { icon: ClipboardCheck, labelKey: 'nav.wmsCycleCountGov', href: '/inventory/wms/cycle-count-governance' },
          { icon: Barcode, labelKey: 'nav.wmsMobileScan', href: '/inventory/wms/mobile-scan' },
          { icon: BarChart2, labelKey: 'nav.wmsKpis', href: '/inventory/wms/kpis' },
          { icon: Shield, labelKey: 'nav.wmsExceptions', href: '/inventory/wms/exceptions' },
          { icon: Package, labelKey: 'nav.wmsUomConversions', href: '/inventory/wms/uom-conversions' },
          { icon: Package, labelKey: 'nav.wmsCartonPallet', href: '/inventory/wms/carton-pallet' },
          { icon: Truck, labelKey: 'nav.wms3PL', href: '/inventory/wms/3pl' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: BarChart2, labelKey: 'nav.inventoryDashboard', href: '/inventory-dashboard' },
          { icon: BarChart2, labelKey: 'nav.inventoryReports', href: '/inventory/reports' },
          { icon: Clock, labelKey: 'nav.stockAging', href: '/inventory/stock-aging' },
          { icon: TrendingDown, labelKey: 'nav.slowMovingItems', href: '/dead-stock' },
          { icon: CheckSquare, labelKey: 'nav.availableToPromise', href: '/inventory/atp' },
          { icon: Shield, labelKey: 'nav.inventoryAuditReport', href: '/inventory/audit' },
          { icon: DollarSign, labelKey: 'nav.inventoryValuationReport', href: '/inventory/valuation' },
        ],
      },
    ],
  },
  {
    id: 'wms',
    icon: ScanLine,
    labelKey: 'nav.warehouseExecution',
    color: 'from-teal-500/20 to-teal-600/10',
    items: [
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: PackagePlus, labelKey: 'nav.wmsReceiving', href: '/wms/receiving' },
          { icon: ArrowRightLeft, labelKey: 'nav.wmsPutaway', href: '/wms/putaway' },
          { icon: ClipboardList, labelKey: 'nav.wmsPicking', href: '/wms/picking' },
          { icon: Layers, labelKey: 'nav.wmsWaves', href: '/wms/waves' },
          { icon: Package, labelKey: 'nav.wmsPacking', href: '/wms/packing' },
          { icon: Truck, labelKey: 'nav.wmsLoading', href: '/wms/loading' },
          { icon: ClipboardCheck, labelKey: 'nav.wmsCycleCount', href: '/wms/cycle-count' },
          { icon: Barcode, labelKey: 'nav.wmsLotSerial', href: '/wms/lot-serial' },
          { icon: ArrowRightLeft, labelKey: 'nav.wmsTransfer', href: '/wms/transfer' },
          { icon: RotateCcw, labelKey: 'nav.wmsReturns', href: '/wms/returns' },
          { icon: ScanLine, labelKey: 'nav.wmsBarcodeRfid', href: '/wms/barcode-rfid' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: Activity, labelKey: 'nav.wmsHeatmap', href: '/wms/heatmap' },
          { icon: AlertTriangle, labelKey: 'nav.wmsExceptions', href: '/wms/exceptions' },
        ],
      },
    ],
  },
  {
    id: 'manufacturing',
    icon: Factory,
    labelKey: 'nav.manufacturingModule',
    color: 'from-rose-500/20 to-rose-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: Layers, labelKey: 'nav.billOfMaterials', href: '/bill-of-materials' },
          { icon: GitBranch, labelKey: 'nav.bomVersions', href: '/manufacturing/bom-versions' },
          { icon: ListOrdered, labelKey: 'nav.routings', href: '/manufacturing/routings' },
          { icon: Factory, labelKey: 'nav.workCenters', href: '/manufacturing/work-centers' },
          { icon: Users, labelKey: 'nav.resources', href: '/manufacturing/resources' },
          { icon: Calendar, labelKey: 'nav.productionCalendars', href: '/manufacturing/calendars' },
          { icon: PenTool, labelKey: 'nav.designCosting', href: '/design-costing' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: TrendingUp, labelKey: 'nav.productionForecast', href: '/manufacturing/forecast' },
          { icon: ClipboardCheck, labelKey: 'nav.mrpRun', href: '/mrp-planning' },
          { icon: GanttChart, labelKey: 'nav.masterProductionSchedule', href: '/manufacturing/mps' },
          { icon: Factory, labelKey: 'nav.productionOrders', href: '/manufacturing' },
          { icon: PackageMinus, labelKey: 'nav.issueForProduction', href: '/manufacturing/issue' },
          { icon: PackagePlus, labelKey: 'nav.receiptFromProduction', href: '/manufacturing/receipt' },
          { icon: RefreshCw, labelKey: 'nav.backflushProcessing', href: '/manufacturing/backflush' },
          { icon: Layers, labelKey: 'nav.byProductsCoProducts', href: '/manufacturing/by-products' },
          { icon: ShieldCheck, labelKey: 'nav.qualityInspection', href: '/quality-management' },
          { icon: RotateCcw, labelKey: 'nav.reworkOrders', href: '/manufacturing/rework' },
          { icon: AlertTriangle, labelKey: 'nav.scrapReporting', href: '/manufacturing/scrap' },
          { icon: BarChart2, labelKey: 'nav.capacityPlanning', href: '/manufacturing/capacity' },
          { icon: ClipboardList, labelKey: 'nav.shopFloorDispatch', href: '/manufacturing/shop-floor' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.manufacturingDashboard', href: '/manufacturing/dashboard' },
          { icon: Activity, labelKey: 'nav.wipMonitor', href: '/manufacturing/wip' },
          { icon: DollarSign, labelKey: 'nav.productionCostAnalysis', href: '/production-costing' },
          { icon: BarChart3, labelKey: 'nav.productionVarianceAnalysis', href: '/manufacturing/variance' },
          { icon: Brain, labelKey: 'nav.industryIntelligence', href: '/industry-intelligence', badge: 'AI' },
        ],
      },
      {
        icon: Layers, labelKey: 'nav.projectsDelivery',
        children: [
          { icon: Layers, labelKey: 'nav.projects', href: '/pm/projects' },
          { icon: BarChart2, labelKey: 'nav.contractProgress', href: '/contract-progress' },
          { icon: Truck, labelKey: 'nav.deliveryInstallation', href: '/delivery-installation' },
          { icon: Award, labelKey: 'nav.paymentCertificates', href: '/payment-certificates' },
        ],
      },
    ],
  },
  {
    id: 'trading',
    icon: Globe,
    labelKey: 'nav.tradingHub',
    color: 'from-purple-500/20 to-purple-600/10',
    items: [
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Globe, labelKey: 'nav.tradingHub', href: '/trading' },
          { icon: Ship, labelKey: 'nav.shipments', href: '/shipments' },
          { icon: ArrowLeftRight, labelKey: 'nav.deals', href: '/deals' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: Cpu, labelKey: 'nav.tmoExecutive', href: '/tmo/executive' },
          { icon: LayoutDashboard, labelKey: 'nav.tmoDashboard', href: '/tmo' },
        ],
      },
    ],
  },
  {
    id: 'hr',
    icon: Building2,
    labelKey: 'nav.hr',
    color: 'from-pink-500/20 to-pink-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: Users, labelKey: 'nav.employees', href: '/hr/employees' },
          { icon: Building2, labelKey: 'nav.departments', href: '/hr/departments' },
          { icon: Target, labelKey: 'nav.positions', href: '/hr/positions' },
          { icon: BookOpen, labelKey: 'nav.handbook', href: '/hr/handbook' },
          { icon: Globe, labelKey: 'nav.ksaCompliance', href: '/hr/ksa-compliance' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Clock, labelKey: 'nav.attendance', href: '/hr/attendance' },
          { icon: Calendar, labelKey: 'nav.leaveManagement', href: '/hr/leave' },
          { icon: DollarSign, labelKey: 'nav.payroll', href: '/hr/payroll' },
          { icon: Star, labelKey: 'nav.performance', href: '/hr/performance' },
          { icon: UserPlus, labelKey: 'nav.recruitment', href: '/hr/recruitment' },
          { icon: GraduationCap, labelKey: 'nav.training', href: '/hr/training' },
          { icon: Users, labelKey: 'nav.selfService', href: '/hr/self-service' },
          { icon: Shield, labelKey: 'nav.compliance', href: '/hr/compliance' },
          { icon: UserPlus, labelKey: 'nav.recruitmentPipeline', href: '/recruitment-pipeline' },
          { icon: GraduationCap, labelKey: 'nav.trainingCompetency', href: '/training-competency' },
          { icon: ClipboardList, labelKey: 'nav.jobRequisitions', href: '/job-requisitions' },
          { icon: DollarSign, labelKey: 'nav.employeeLoans', href: '/employee-loans' },
          { icon: Star, labelKey: 'nav.performanceAppraisals', href: '/performance-appraisals' },
          { icon: Clock, labelKey: 'nav.shiftPlanning', href: '/shift-planning' },
          { icon: Clock, labelKey: 'nav.overtimeControl', href: '/overtime-control' },
          { icon: Building2, labelKey: 'nav.laborCamps', href: '/labor-camps' },
          { icon: Shield, labelKey: 'nav.hrGrievances', href: '/hr-grievances' },
          { icon: FileText, labelKey: 'nav.hrLetters', href: '/hr-letters' },
          { icon: Users, labelKey: 'nav.offboarding', href: '/offboarding' },
          { icon: Users, labelKey: 'nav.selfServiceHub', href: '/self-service-hub', badge: 'New' },
        ],
      },
      {
        icon: Star, labelKey: 'nav.hrEnhanced',
        children: [
          { icon: UserPlus, labelKey: 'nav.atsPipeline', href: '/hr/ats-pipeline', badge: 'New' },
          { icon: Shield, labelKey: 'nav.atsScreeningRules', href: '/hr/ats-screening-rules', badge: 'New' },
          { icon: FileText, labelKey: 'nav.contracts', href: '/hr/contracts', badge: 'New' },
          { icon: Calendar, labelKey: 'nav.regionalLeave', href: '/hr/regional-leave', badge: 'New' },
          { icon: DollarSign, labelKey: 'nav.payrollControls', href: '/hr/payroll-controls', badge: 'New' },
          { icon: Users, labelKey: 'nav.essPortal', href: '/hr/ess-portal', badge: 'New' },
          { icon: Shield, labelKey: 'nav.grievancesV2', href: '/hr/grievances-enhanced', badge: 'New' },
          { icon: Users, labelKey: 'nav.offboardingV2', href: '/hr/offboarding-enhanced', badge: 'New' },
          { icon: FileText, labelKey: 'nav.documentExpiry', href: '/hr/document-expiry', badge: 'New' },
          { icon: Clock, labelKey: 'nav.attendanceExceptionsV2', href: '/hr/attendance-exceptions-v2', badge: 'New' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.hrDashboard', href: '/hr' },
          { icon: BarChart2, labelKey: 'nav.workforcePlanning', href: '/workforce-planning' },
        ],
      },
    ],
  },
  {
    id: 'service',
    icon: Headphones,
    labelKey: 'nav.itService',
    color: 'from-lime-500/20 to-lime-600/10',
    items: [
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Headphones, labelKey: 'nav.itService', href: '/it-service' },
          { icon: Wrench, labelKey: 'nav.serviceModule', href: '/service-module' },
          { icon: Wrench, labelKey: 'nav.serviceMaintenance', href: '/service-maintenance' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: Activity, labelKey: 'nav.maintenanceReliability', href: '/maintenance-reliability', badge: 'New' },
        ],
      },
    ],
  },
  {
    id: 'ai-automation',
    icon: Brain,
    labelKey: 'nav.aiAutomation',
    color: 'from-violet-500/20 to-violet-600/10',
    items: [
      { icon: Brain, labelKey: 'nav.erpCopilot', href: '/erp-copilot' },
      { icon: Lightbulb, labelKey: 'nav.smartRecommendations', href: '/smart-recommendations' },
      { icon: Bot, labelKey: 'nav.nlAssistant', href: '/nl-assistant' },
      { icon: Bell, labelKey: 'nav.workflowAutoReminders', href: '/workflow-auto-reminders' },
      { icon: ScanLine, labelKey: 'nav.ocrDocumentCapture', href: '/ocr-document-capture' },
      { icon: FileSearch, labelKey: 'nav.documentClassification', href: '/document-classification' },
      { icon: Mail, labelKey: 'nav.emailDocumentCapture', href: '/email-document-capture' },
      { icon: Activity, labelKey: 'nav.processMining', href: '/process-mining' },
      { icon: TrendingUp, labelKey: 'nav.predictiveCollections', href: '/predictive-collections' },
      { icon: Shield, labelKey: 'nav.predictiveProjectRisk', href: '/predictive-project-risk' },
      { icon: AlertTriangle, labelKey: 'nav.aiAnomalyDetection', href: '/ai-anomaly-detection', badge: 'AI' },
    ],
  },
  {
    id: 'ecm',
    icon: FileDown,
    labelKey: 'nav.ecmModule',
    color: 'from-indigo-500/20 to-indigo-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.ecmDashboard', href: '/ecm/dashboard' },
      {
        icon: Database, labelKey: 'nav.documentManagement',
        children: [
          { icon: FolderKanban, labelKey: 'nav.ecmRepository', href: '/ecm/repository' },
          { icon: Search, labelKey: 'nav.ecmSearch', href: '/ecm/search' },
          { icon: Settings, labelKey: 'nav.ecmMetadataTemplates', href: '/ecm/metadata-templates' },
        ],
      },
      {
        icon: Mail, labelKey: 'nav.correspondence',
        children: [
          { icon: Inbox, labelKey: 'nav.ecmIncoming', href: '/ecm/correspondence/incoming' },
          { icon: Mail, labelKey: 'nav.ecmOutgoing', href: '/ecm/correspondence/outgoing' },
          { icon: Mail, labelKey: 'nav.ecmMemos', href: '/ecm/correspondence/memos' },
        ],
      },
      { icon: GitBranch, labelKey: 'nav.ecmWorkflows', href: '/ecm/workflow-designer' },
      { icon: FileSignature, labelKey: 'nav.ecmSignatures', href: '/ecm/signatures' },
      { icon: CheckSquare, labelKey: 'nav.ecmTasks', href: '/ecm/tasks' },
      { icon: Users, labelKey: 'nav.ecmDirectory', href: '/ecm/directory' },
      { icon: BarChart3, labelKey: 'nav.ecmReports', href: '/ecm/reports' },
      { icon: Shield, labelKey: 'nav.ecmAuditTrail', href: '/ecm/audit-trail' },
      { icon: Settings, labelKey: 'nav.ecmAdmin', href: '/ecm/admin' },
    ],
  },
  {
    id: 'social-inbox',
    icon: Inbox,
    labelKey: 'nav.socialInbox',
    color: 'from-cyan-500/20 to-cyan-600/10',
    items: [
      { icon: Inbox, labelKey: 'nav.socialInbox', href: '/social-inbox' },
      { icon: MessageCircle, labelKey: 'nav.whatsappInvoice', href: '/whatsapp-invoice' },
      { icon: MessageCircle, labelKey: 'nav.whatsappSettings', href: '/whatsapp-settings' },
    ],
  },
  {
    id: 'studio',
    icon: Database,
    labelKey: 'nav.studio',
    color: 'from-indigo-500/20 to-indigo-600/10',
    items: [
      { icon: Database, labelKey: 'nav.metadataStudio', href: '/metadata-studio' },
      { icon: Layers, labelKey: 'nav.screenBuilder', href: '/screen-builder' },
      { icon: Search, labelKey: 'nav.queryStudio', href: '/query-studio' },
      { icon: FileSpreadsheet, labelKey: 'nav.reportStudio', href: '/report-studio' },
      { icon: LayoutDashboard, labelKey: 'nav.roleWorkspaces', href: '/role-workspaces' },
    ],
  },
  {
    id: 'tools',
    icon: Settings,
    labelKey: 'nav.tools',
    color: 'from-gray-500/20 to-gray-600/10',
    items: [
      { icon: FlaskConical, labelKey: 'nav.qaDashboard', href: '/qa-dashboard' },
      { icon: AlertTriangle, labelKey: 'nav.exceptionCenter', href: '/exception-center' },
      { icon: AlertTriangle, labelKey: 'nav.enterpriseExceptionCenter', href: '/enterprise-exception-center' },
      { icon: Building2, labelKey: 'nav.intercompanyControlCenter', href: '/intercompany-control-center' },
      { icon: Clock, labelKey: 'nav.slaEngine', href: '/sla-engine' },
      { icon: FlaskConical, labelKey: 'nav.businessRulesSimulator', href: '/business-rules-simulator' },
      { icon: Eye, labelKey: 'nav.operationsCommandCenter', href: '/operations-command-center' },
      { icon: Link2, labelKey: 'nav.reconciliationCenter', href: '/reconciliation-center' },
      { icon: Network, labelKey: 'nav.dragAndRelate', href: '/drag-and-relate' },
      { icon: ClipboardList, labelKey: 'nav.questionnaires', href: '/questionnaires' },
      { icon: Hash, labelKey: 'nav.advancedNumbering', href: '/advanced-numbering' },
      { icon: Layers, labelKey: 'nav.dynamicFormBuilder', href: '/dynamic-form-builder' },
      {
        icon: Grid3X3, labelKey: 'nav.spreadsheetStudio',
        children: [
          { icon: FileSpreadsheet, labelKey: 'nav.ssWorkbookGallery', href: '/spreadsheet/gallery' },
          { icon: Layout, labelKey: 'nav.ssTemplateLibrary', href: '/spreadsheet/templates' },
          { icon: GitCompare, labelKey: 'nav.ssScenarioComparison', href: '/spreadsheet/scenarios' },
          { icon: MessageCircle, labelKey: 'nav.ssCommentsReview', href: '/spreadsheet/comments' },
          { icon: Upload, labelKey: 'nav.ssPublishWriteback', href: '/spreadsheet/publish' },
          { icon: History, labelKey: 'nav.ssVersionHistory', href: '/spreadsheet/versions' },
        ],
      },
      {
        icon: MessageCircle,
        labelKey: 'nav.settingsCommunications',
        children: [
          { icon: Volume2, labelKey: 'nav.elevenLabsSettings', href: '/elevenlabs-settings' },
          { icon: PenTool, labelKey: 'nav.emailSignatures', href: '/email-signatures' },
          { icon: BellRing, labelKey: 'nav.notificationPreferences', href: '/notification-preferences' },
        ],
      },
      {
        icon: Clock, labelKey: 'nav.settingsWorkflows',
        children: [
          { icon: Award, labelKey: 'nav.paymentCertificateTypes', href: '/payment-certificate-types' },
          { icon: ClipboardList, labelKey: 'nav.mrWorkflow', href: '/material-requests/workflow-settings' },
          { icon: Clock, labelKey: 'nav.slaConfiguration', href: '/sla-configuration' },
        ],
      },
    ],
  },
  {
    id: 'fleet',
    icon: Truck,
    labelKey: 'nav.fleetManagement',
    color: 'from-cyan-500/20 to-cyan-600/10',
    items: [
      { icon: Gauge, labelKey: 'nav.fleetDashboard', href: '/fleet' },
      { icon: Truck, labelKey: 'nav.fleetRegister', href: '/fleet/assets' },
      { icon: Users, labelKey: 'nav.fleetDrivers', href: '/fleet/drivers' },
      { icon: TrendingUp, labelKey: 'nav.fleetTrips', href: '/fleet/trips' },
      { icon: Fuel, labelKey: 'nav.fleetFuel', href: '/fleet/fuel' },
      { icon: Wrench, labelKey: 'nav.fleetMaintenance', href: '/fleet/maintenance' },
      { icon: Shield, labelKey: 'nav.fleetCompliance', href: '/fleet/compliance' },
      { icon: AlertTriangle, labelKey: 'nav.fleetIncidents', href: '/fleet/incidents' },
      { icon: FileText, labelKey: 'nav.fleetLeases', href: '/fleet/leases' },
    ],
  },
  {
    id: 'assets',
    icon: HardDrive,
    labelKey: 'nav.assetManagement',
    color: 'from-teal-500/20 to-teal-600/10',
    items: [
      {
        icon: Database, labelKey: 'nav.masterData',
        children: [
          { icon: HardDrive, labelKey: 'nav.assets', href: '/assets' },
          { icon: GitBranch, labelKey: 'nav.assetHierarchy', href: '/asset-hierarchy' },
          { icon: FileText, labelKey: 'nav.assetDocLibrary', href: '/asset-document-library' },
        ],
      },
      {
        icon: FileText, labelKey: 'nav.transactions',
        children: [
          { icon: Wrench, labelKey: 'nav.maintenanceHub', href: '/asset-maintenance-hub' },
          { icon: Shield, labelKey: 'nav.lifecycleCompliance', href: '/asset-lifecycle' },
          { icon: Activity, labelKey: 'nav.meterReadings', href: '/asset-meter-readings' },
          { icon: Calendar, labelKey: 'nav.assetReservations', href: '/asset-reservations' },
          { icon: AlertTriangle, labelKey: 'nav.assetIncidents', href: '/asset-incidents' },
          { icon: Wrench, labelKey: 'nav.assetOverhauls', href: '/asset-overhauls' },
          { icon: Laptop, labelKey: 'nav.itAssetIssuance', href: '/asset-it-issuance' },
          { icon: MapPin, labelKey: 'nav.assetGeoMap', href: '/asset-geo-map' },
          { icon: DollarSign, labelKey: 'nav.rentalBilling', href: '/asset-rental-billing' },
          { icon: FileText, labelKey: 'nav.leasedRegister', href: '/asset-leased-register' },
          { icon: ClipboardCheck, labelKey: 'nav.assetAudit', href: '/asset-audit-count' },
          { icon: Shield, labelKey: 'nav.warrantyTracker', href: '/asset-warranty-tracker' },
          { icon: ArrowRightLeft, labelKey: 'nav.assetCheckout', href: '/asset-checkout' },
          { icon: Truck, labelKey: 'nav.assetTransfers', href: '/asset-transfers' },
          { icon: Trash2, labelKey: 'nav.assetDisposals', href: '/asset-disposals' },
          { icon: ClipboardCheck, labelKey: 'nav.fieldInspections', href: '/asset-inspections' },
          { icon: ClipboardList, labelKey: 'nav.workOrders', href: '/asset-work-orders' },
        ],
      },
      {
        icon: Settings, labelKey: 'nav.tracking',
        children: [
          { icon: Wrench, labelKey: 'nav.spareParts', href: '/asset-spare-parts' },
          { icon: Gauge, labelKey: 'nav.calibrations', href: '/asset-calibrations' },
          { icon: Shield, labelKey: 'nav.insuranceTracker', href: '/asset-insurance' },
          { icon: Fuel, labelKey: 'nav.fuelLogs', href: '/asset-fuel-logs' },
          { icon: Calculator, labelKey: 'nav.capitalization', href: '/asset-capitalization' },
        ],
      },
      {
        icon: BarChart3, labelKey: 'nav.reports',
        children: [
          { icon: BarChart3, labelKey: 'nav.assetUtilization', href: '/asset-utilization' },
          { icon: DollarSign, labelKey: 'nav.assetFinance', href: '/asset-finance' },
          { icon: Brain, labelKey: 'nav.assetAdvancedAnalytics', href: '/asset-advanced-analytics' },
          { icon: DollarSign, labelKey: 'nav.assetBudgetPlan', href: '/asset-budget-planning' },
          { icon: Zap, labelKey: 'nav.replacementEngine', href: '/asset-replacement-engine' },
          { icon: Clock, labelKey: 'nav.downtimeAnalytics', href: '/asset-downtime-analytics' },
          { icon: Star, labelKey: 'nav.vendorScorecard', href: '/asset-vendor-scorecard' },
          { icon: LayoutDashboard, labelKey: 'nav.assetControlTower', href: '/asset-control-tower' },
        ],
      },
    ],
  },
  {
    id: 'hospital',
    icon: Heart,
    labelKey: 'nav.hospitalManagement',
    color: 'from-rose-500/20 to-rose-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.hospDashboard', href: '/hospital' },
      { icon: UserPlus, labelKey: 'nav.hospReception', href: '/hospital/reception' },
      { icon: Calendar, labelKey: 'nav.hospAppointments', href: '/hospital/appointments' },
      { icon: Users, labelKey: 'nav.hospPatientFiles', href: '/hospital/patient-files' },
      { icon: Stamp, labelKey: 'nav.hospOPD', href: '/hospital/opd' },
      { icon: AlertTriangle, labelKey: 'nav.hospER', href: '/hospital/er' },
      { icon: Building2, labelKey: 'nav.hospInpatient', href: '/hospital/inpatient' },
      { icon: Grid3X3, labelKey: 'nav.hospBedManagement', href: '/hospital/bed-management' },
      { icon: FlaskConical, labelKey: 'nav.hospPharmacy', href: '/hospital/pharmacy' },
      { icon: Receipt, labelKey: 'nav.hospBilling', href: '/hospital/billing' },
      { icon: FileSignature, labelKey: 'nav.hospDischarge', href: '/hospital/discharge' },
      { icon: Scissors, labelKey: 'nav.hospOR', href: '/hospital/or' },
      { icon: Heart, labelKey: 'nav.hospICU', href: '/hospital/icu' },
      { icon: Heart, labelKey: 'nav.hospNICU', href: '/hospital/nicu' },
      { icon: FlaskConical, labelKey: 'nav.hospLab', href: '/hospital/lab' },
      { icon: ScanLine, labelKey: 'nav.hospRadiology', href: '/hospital/radiology' },
      { icon: Shield, labelKey: 'nav.hospInsurance', href: '/hospital/insurance' },
      { icon: BarChart3, labelKey: 'nav.hospReports', href: '/hospital/reports' },
      { icon: Wrench, labelKey: 'nav.hospEquipment', href: '/hospital/equipment' },
      { icon: UserPlus, labelKey: 'nav.hospPatientMaster', href: '/hospital/patient-master', badge: 'New' },
      { icon: Activity, labelKey: 'nav.hospTriage', href: '/hospital/triage', badge: 'New' },
      { icon: Stethoscope, labelKey: 'nav.hospCPOE', href: '/hospital/physician-orders', badge: 'New' },
      { icon: ShieldCheck, labelKey: 'nav.hospPreauth', href: '/hospital/preauth', badge: 'New' },
      { icon: LogOut, labelKey: 'nav.hospDischargePlan', href: '/hospital/discharge-planning', badge: 'New' },
      { icon: Receipt, labelKey: 'nav.hospMedicalBilling', href: '/hospital/medical-billing', badge: 'New' },
      { icon: MessageSquare, labelKey: 'nav.hospPatientComms', href: '/hospital/patient-comms', badge: 'New' },
      { icon: Network, labelKey: 'nav.hospInterop', href: '/hospital/interop', badge: 'New' },
      { icon: Activity, labelKey: 'nav.hospClinicalKPI', href: '/hospital/clinical-kpi', badge: 'New' },
    ],
  },
  {
    id: 'restaurant',
    icon: Utensils,
    labelKey: 'nav.restaurantManagement',
    color: 'from-orange-500/20 to-orange-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.restDashboard', href: '/restaurant' },
      { icon: Utensils, labelKey: 'nav.restMenu', href: '/restaurant/menu' },
      { icon: ShoppingCart, labelKey: 'nav.restPOS', href: '/restaurant/pos' },
      { icon: Grid3X3, labelKey: 'nav.restTables', href: '/restaurant/tables' },
      { icon: ChefHat, labelKey: 'nav.restKitchen', href: '/restaurant/kitchen' },
      { icon: Clock, labelKey: 'nav.restShifts', href: '/restaurant/shifts' },
      { icon: Receipt, labelKey: 'nav.restOrders', href: '/restaurant/orders' },
      { icon: Calendar, labelKey: 'nav.restReservations', href: '/restaurant/reservations' },
      { icon: Truck, labelKey: 'nav.restDelivery', href: '/restaurant/delivery' },
      { icon: Heart, labelKey: 'nav.restLoyalty', href: '/restaurant/loyalty' },
      { icon: BookOpen, labelKey: 'nav.restRecipes', href: '/restaurant/recipes' },
      { icon: Package, labelKey: 'nav.restInventory', href: '/restaurant/inventory' },
      { icon: BarChart3, labelKey: 'nav.restReports', href: '/restaurant/reports' },
      { icon: Settings, labelKey: 'nav.restSettings', href: '/restaurant/settings' },
    ],
  },
  {
    id: 'point-of-sale',
    icon: ShoppingCart,
    labelKey: 'nav.pointOfSale',
    color: 'from-emerald-500/20 to-emerald-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.posDashboard', href: '/pos' },
      { icon: ShoppingCart, labelKey: 'nav.posTerminal', href: '/pos/terminal' },
      { icon: Clock, labelKey: 'nav.posSessions', href: '/pos/sessions' },
      { icon: Receipt, labelKey: 'nav.posTransactions', href: '/pos/transactions' },
      { icon: RotateCcw, labelKey: 'nav.posReturns', href: '/pos/returns' },
      { icon: Star, labelKey: 'nav.posPromotions', href: '/pos-promotions' },
      { icon: CreditCard, labelKey: 'nav.posCardReconciliation', href: '/pos-card-reconciliation' },
      { icon: RefreshCw, labelKey: 'nav.posOfflineSync', href: '/pos-offline-sync' },
      { icon: ShieldCheck, labelKey: 'nav.posFraud', href: '/pos-fraud' },
      { icon: ClipboardCheck, labelKey: 'nav.posChecklists', href: '/pos/checklists' },
      { icon: Users, labelKey: 'nav.posCashierKPI', href: '/pos/cashier-productivity' },
      { icon: Settings, labelKey: 'nav.posSettings', href: '/pos/settings' },
    ],
  },
  {
    id: 'saas-admin',
    icon: Shield,
    labelKey: 'nav.saasAdmin',
    color: 'from-violet-500/20 to-violet-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.saasOverview', href: '/saas' },
      { icon: Building2, labelKey: 'nav.saasClients', href: '/saas/clients' },
      { icon: Package, labelKey: 'nav.saasPlans', href: '/saas/plans' },
      { icon: Grid3X3, labelKey: 'nav.saasModuleMatrix', href: '/saas/module-matrix' },
      { icon: Users, labelKey: 'nav.saasSeats', href: '/saas/seats' },
      { icon: ShieldCheck, labelKey: 'nav.saasSecurity', href: '/saas/security' },
      { icon: DollarSign, labelKey: 'nav.saasBilling', href: '/saas/billing' },
      { icon: FileText, labelKey: 'nav.saasAuditLog', href: '/saas/audit-log' },
    ],
  },
  {
    id: 'portal-admin',
    icon: Users,
    labelKey: 'nav.portalAdmin',
    color: 'from-cyan-500/20 to-cyan-600/10',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.portalAdminHub', href: '/portal-admin' },
      { icon: Users, labelKey: 'nav.portalMembers', href: '/portal-admin/members' },
      { icon: FileText, labelKey: 'nav.portalDocuments', href: '/portal-admin/documents' },
      { icon: Package, labelKey: 'nav.portalRFQ', href: '/portal-admin/rfq-responses' },
      { icon: ShieldCheck, labelKey: 'nav.portalApprovals', href: '/portal-admin/approvals' },
      { icon: DollarSign, labelKey: 'nav.portalSeats', href: '/portal-admin/seats' },
      { icon: Grid3X3, labelKey: 'nav.portalBranding', href: '/portal-admin/branding' },
    ],
  },
  {
    id: 'help',
    icon: BookOpen,
    labelKey: 'nav.helpCenter',
    color: 'from-yellow-500/20 to-yellow-600/10',
    items: [
      { icon: BookOpen, labelKey: 'nav.helpCenter', href: '/help' },
    ],
  },
  // ─── Previously-unlinked but implemented modules ───────────────────
  // Surfaces routes that exist in App.tsx but were not reachable from the menu.
  {
    id: 'hidden-modules',
    icon: Eye,
    labelKey: 'nav.moreModules',
    color: 'from-indigo-500/20 to-indigo-600/10',
    items: [
      {
        icon: DollarSign, labelKey: 'nav.salesAndAR',
        children: [
          { icon: FileText, labelKey: 'nav.quotes', href: '/quotes' },
          { icon: ShoppingCart, labelKey: 'nav.salesOrders', href: '/sales-orders' },
          { icon: Truck, labelKey: 'nav.deliveryNotes', href: '/delivery-notes' },
          { icon: Truck, labelKey: 'nav.deliveryDispatch', href: '/delivery-dispatch' },
          { icon: Receipt, labelKey: 'nav.arInvoices', href: '/ar-invoices' },
          { icon: FileX, labelKey: 'nav.arCreditMemos', href: '/ar-credit-memos' },
          { icon: RotateCcw, labelKey: 'nav.arReturns', href: '/ar-returns' },
          { icon: DollarSign, labelKey: 'nav.arCollections', href: '/ar-collections' },
          { icon: Tag, labelKey: 'nav.priceLists', href: '/price-lists' },
          { icon: DollarSign, labelKey: 'nav.salesPricing', href: '/sales-pricing' },
          { icon: Wand2, labelKey: 'nav.salesQuoteBuilder', href: '/sales-quote-builder' },
          { icon: Calculator, labelKey: 'nav.salesGPRecalc', href: '/sales/gp-recalc' },
          { icon: Tag, labelKey: 'nav.retainers', href: '/retainers' },
          { icon: ListChecks, labelKey: 'nav.revenueRecognition', href: '/revenue-recognition' },
          { icon: CreditCard, labelKey: 'nav.subscriptionBilling', href: '/subscription-billing' },
        ],
      },
      {
        icon: Brain, labelKey: 'nav.salesIntelligence',
        children: [
          { icon: Target, labelKey: 'nav.salesLeadScoring', href: '/sales-lead-scoring' },
          { icon: TrendingUp, labelKey: 'nav.salesSmartForecast', href: '/sales-smart-forecast' },
          { icon: Activity, labelKey: 'nav.salesCyclePrediction', href: '/sales-cycle-prediction' },
          { icon: Heart, labelKey: 'nav.salesCustomerHealth', href: '/sales-customer-health' },
          { icon: Eye, labelKey: 'nav.salesCompetitorIntel', href: '/sales-competitor-intel' },
          { icon: Bell, labelKey: 'nav.salesInsightsAlerts', href: '/sales-insights-alerts' },
          { icon: Lightbulb, labelKey: 'nav.salesRecommendations', href: '/sales-recommendations' },
          { icon: Users, labelKey: 'nav.salesSegmentation', href: '/sales-segmentation' },
          { icon: Gauge, labelKey: 'nav.salesPerformance', href: '/sales-performance' },
          { icon: Target, labelKey: 'nav.salesTargetTracker', href: '/sales-target-tracker' },
          { icon: MapPin, labelKey: 'nav.salesTerritory', href: '/sales-territory' },
          { icon: ArrowRightLeft, labelKey: 'nav.crossSell', href: '/cross-sell' },
        ],
      },
      {
        icon: ShoppingCart, labelKey: 'nav.posAndRetail',
        children: [
          { icon: Smartphone, labelKey: 'nav.mobilePOS', href: '/mobile-pos' },
          { icon: Zap, labelKey: 'nav.posQuickSale', href: '/pos/quick-sale' },
          { icon: Landmark, labelKey: 'nav.bankPos', href: '/bank-pos' },
          { icon: Clock, labelKey: 'nav.cashierShifts', href: '/cashier-shifts' },
          { icon: Lock, labelKey: 'nav.cashierPermissions', href: '/cashier-permissions' },
          { icon: RotateCcw, labelKey: 'nav.posReturns', href: '/pos-returns' },
          { icon: Wrench, labelKey: 'nav.posRepairIntake', href: '/pos-repair-intake' },
          { icon: Package, labelKey: 'nav.posInventoryReservation', href: '/pos-inventory-reservation' },
          { icon: Receipt, labelKey: 'nav.smartReceipts', href: '/smart-receipts' },
          { icon: Tag, labelKey: 'nav.giftCards', href: '/gift-cards' },
          { icon: Heart, labelKey: 'nav.loyaltyWallet', href: '/loyalty-wallet' },
          { icon: Calendar, labelKey: 'nav.layawayInstallments', href: '/layaway-installments' },
          { icon: Inbox, labelKey: 'nav.abandonedCartRecovery', href: '/abandoned-cart-recovery' },
          { icon: Truck, labelKey: 'nav.omnichannelPickup', href: '/omnichannel-pickup' },
          { icon: Tag, labelKey: 'nav.shelfLabelManagement', href: '/shelf-label-management' },
          { icon: ChefHat, labelKey: 'nav.kitchenDisplay', href: '/kitchen-display' },
          { icon: ListChecks, labelKey: 'nav.storeTaskBoard', href: '/store-task-board' },
        ],
      },
      {
        icon: Package, labelKey: 'nav.inventoryAndProcurement',
        children: [
          { icon: Warehouse, labelKey: 'nav.itemWarehouse', href: '/inventory/item-warehouse' },
          { icon: ArrowLeftRight, labelKey: 'nav.stockTransfer', href: '/inventory/stock-transfer' },
          { icon: ArrowLeftRight, labelKey: 'nav.branchTransferSelling', href: '/branch-transfer-selling' },
          { icon: Package, labelKey: 'nav.pickAndPack', href: '/pick-and-pack' },
          { icon: ShoppingCart, labelKey: 'nav.procurement', href: '/procurement' },
          { icon: Layers, labelKey: 'nav.procurementHub', href: '/procurement-hub' },
          { icon: Grid3X3, labelKey: 'nav.procurementCategories', href: '/procurement-categories' },
          { icon: Users, labelKey: 'nav.supplierManagement', href: '/supplier-management' },
          { icon: Award, labelKey: 'nav.supplierRebates', href: '/supplier-rebates' },
          { icon: Eye, labelKey: 'nav.vendor360', href: '/vendor-360' },
        ],
      },
      {
        icon: Landmark, labelKey: 'nav.financeAndCompliance',
        children: [
          { icon: Brain, labelKey: 'nav.executiveFinance', href: '/executive-finance' },
          { icon: FileSearch, labelKey: 'nav.financeDrilldown', href: '/finance-drilldown' },
          { icon: Shield, labelKey: 'nav.financialControl', href: '/financial-control' },
          { icon: DollarSign, labelKey: 'nav.budgetControl', href: '/budget-control' },
          { icon: Layers, labelKey: 'nav.dimensions', href: '/dimensions' },
          { icon: BarChart3, labelKey: 'nav.consolidationBalanceSheet', href: '/financial-reports/consolidation/balance-sheet' },
          { icon: BarChart3, labelKey: 'nav.consolidationProfitLoss', href: '/financial-reports/consolidation/profit-loss' },
          { icon: BarChart3, labelKey: 'nav.consolidationTrialBalance', href: '/financial-reports/consolidation/trial-balance' },
          { icon: Stamp, labelKey: 'nav.zatca', href: '/zatca' },
          { icon: ShieldCheck, labelKey: 'nav.complianceObligations', href: '/compliance-obligations' },
          { icon: PenTool, labelKey: 'nav.digitalSignatureOTP', href: '/digital-signature-otp' },
        ],
      },
      {
        icon: HardHat, labelKey: 'nav.cpmsExtended',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.cpmsProjects', href: '/cpms/projects' },
          { icon: GanttChart, labelKey: 'nav.cpmsGantt', href: '/cpms/gantt' },
          { icon: Users, labelKey: 'nav.cpmsClients', href: '/cpms/clients' },
          { icon: Users, labelKey: 'nav.cpmsSubcontractors', href: '/cpms/subcontractors' },
          { icon: Award, labelKey: 'nav.cpmsSubRankings', href: '/cpms/subcontractor-rankings' },
          { icon: HardDrive, labelKey: 'nav.cpmsResources', href: '/cpms/resources' },
          { icon: Truck, labelKey: 'nav.cpmsEquipment', href: '/cpms/equipment' },
          { icon: Package, labelKey: 'nav.cpmsSiteMaterials', href: '/cpms/site-materials' },
          { icon: ClipboardList, labelKey: 'nav.cpmsRfis', href: '/cpms/rfis' },
          { icon: ClipboardCheck, labelKey: 'nav.cpmsQuality', href: '/cpms/quality' },
          { icon: ClipboardCheck, labelKey: 'nav.cpmsQAQCApprovals', href: '/cpms/qaqc/approvals' },
          { icon: Eye, labelKey: 'nav.cpmsQAQCPlanViewer', href: '/cpms/qaqc/plan-viewer' },
          { icon: Ruler, labelKey: 'nav.cpmsDrawingMeasurement', href: '/cpms/drawing-measurement' },
          { icon: BarChart3, labelKey: 'nav.cpmsMeasurementReporting', href: '/cpms/measurement-reporting' },
          { icon: FileText, labelKey: 'nav.cpmsDocuments', href: '/cpms/documents' },
          { icon: Receipt, labelKey: 'nav.cpmsBilling', href: '/cpms/billing' },
          { icon: DollarSign, labelKey: 'nav.cpmsCosts', href: '/cpms/costs' },
          { icon: DollarSign, labelKey: 'nav.cpmsExpenses', href: '/cpms/expenses' },
          { icon: Landmark, labelKey: 'nav.cpmsFinance', href: '/cpms/finance' },
          { icon: TrendingUp, labelKey: 'nav.cpmsCashPosition', href: '/cpms/cash-position' },
          { icon: BarChart3, labelKey: 'nav.cpmsAnalytics', href: '/cpms/analytics' },
          { icon: Brain, labelKey: 'nav.cpmsPredictive', href: '/cpms/predictive' },
          { icon: GitCompare, labelKey: 'nav.cpmsCompare', href: '/cpms/compare' },
          { icon: FileSpreadsheet, labelKey: 'nav.cpmsCostCodeReport', href: '/cpms/cost-code-report' },
          { icon: FileText, labelKey: 'nav.cpmsReports', href: '/cpms/reports' },
          { icon: Layout, labelKey: 'nav.cpmsReportTemplates', href: '/cpms/report-templates' },
          { icon: Bell, labelKey: 'nav.cpmsNotifications', href: '/cpms/notifications' },
          { icon: Globe, labelKey: 'nav.cpmsTenders', href: '/cpms/tenders' },
          { icon: Heart, labelKey: 'nav.cpmsSustainability', href: '/cpms/sustainability' },
          { icon: Zap, labelKey: 'nav.cpmsWeatherIot', href: '/cpms/weather-iot' },
          { icon: Smartphone, labelKey: 'nav.cpmsMobile', href: '/cpms/mobile' },
          { icon: Smartphone, labelKey: 'nav.cpmsMobileSite', href: '/cpms/mobile/site' },
          { icon: Smartphone, labelKey: 'nav.cpmsMobilePhotos', href: '/cpms/mobile/photos' },
          { icon: Smartphone, labelKey: 'nav.cpmsMobileTime', href: '/cpms/mobile/time' },
        ],
      },
      {
        icon: HardHat, labelKey: 'nav.cpmsContractor',
        children: [
          { icon: Gauge, labelKey: 'nav.cpmsControlTower', href: '/cpms/control-tower' },
          { icon: Briefcase, labelKey: 'nav.cpmsSubcontractsAdmin', href: '/cpms/subcontracts' },
          { icon: FileSignature, labelKey: 'nav.cpmsVariationOrders', href: '/cpms/variation-orders' },
          { icon: Receipt, labelKey: 'nav.cpmsClientIPC', href: '/cpms/client-ipc' },
          { icon: ShieldCheck, labelKey: 'nav.cpmsRetention', href: '/cpms/retention' },
          { icon: TrendingUp, labelKey: 'nav.cpmsCTC', href: '/cpms/ctc' },
          { icon: Clock, labelKey: 'nav.cpmsDelays', href: '/cpms/delays' },
          { icon: Activity, labelKey: 'nav.cpmsProductivityLog', href: '/cpms/productivity' },
          { icon: Send, labelKey: 'nav.cpmsTransmittals', href: '/cpms/transmittals' },
          { icon: Smartphone, labelKey: 'nav.cpmsMobileField', href: '/cpms/mobile-field' },
        ],
      },
      {
        icon: Building2, labelKey: 'nav.constructionExtended',
        children: [
          { icon: LayoutDashboard, labelKey: 'nav.projectDashboard', href: '/construction/project-dashboard' },
          { icon: GanttChart, labelKey: 'nav.masterSchedule', href: '/construction/master-schedule' },
          { icon: Activity, labelKey: 'nav.activityProgress', href: '/construction/activity-progress' },
          { icon: ClipboardList, labelKey: 'nav.dailySiteReport', href: '/construction/daily-site-report' },
          { icon: FileText, labelKey: 'nav.weeklyReport', href: '/construction/weekly-report' },
          { icon: FileText, labelKey: 'nav.monthlyReport', href: '/construction/monthly-report' },
          { icon: Bell, labelKey: 'nav.siteInstructions', href: '/construction/site-instructions' },
          { icon: TrendingUp, labelKey: 'nav.constructionCashFlow', href: '/construction/cash-flow' },
          { icon: AlertTriangle, labelKey: 'nav.safetyIncidents', href: '/safety-incidents' },
          { icon: ClipboardCheck, labelKey: 'nav.siteInspections', href: '/site-inspections' },
          { icon: Receipt, labelKey: 'nav.interimPaymentCerts', href: '/interim-payment-certs' },
          { icon: AlertTriangle, labelKey: 'nav.projectClaims', href: '/project-claims' },
          { icon: ShoppingCart, labelKey: 'nav.projectProcurement', href: '/project-procurement' },
        ],
      },
      {
        icon: FolderKanban, labelKey: 'nav.pmoExtended',
        children: [
          { icon: Network, labelKey: 'nav.pmoPortfolioGovernance', href: '/pmo-portfolio-governance' },
          { icon: GitBranch, labelKey: 'nav.pmoDependencies', href: '/pmo/dependencies' },
          { icon: Brain, labelKey: 'nav.pmoOptimization', href: '/pmo/optimization' },
          { icon: TrendingUp, labelKey: 'nav.pmoPredictive', href: '/pmo/predictive' },
          { icon: Bell, labelKey: 'nav.pmoAlerts', href: '/pmo/alerts' },
          { icon: ShieldCheck, labelKey: 'nav.pmoCompliance', href: '/pmo/compliance' },
          { icon: Users, labelKey: 'nav.pmoStakeholder', href: '/pmo/stakeholder' },
          { icon: Layers, labelKey: 'nav.bids', href: '/bids' },
        ],
      },
      {
        icon: Briefcase, labelKey: 'nav.pmoGovernance',
        children: [
          { icon: Briefcase, labelKey: 'nav.pmoBusinessCases', href: '/pmo/business-cases', badge: 'New' },
          { icon: ListOrdered, labelKey: 'nav.pmoScoring', href: '/pmo/scoring', badge: 'New' },
          { icon: Award, labelKey: 'nav.pmoBenefits', href: '/pmo/benefits', badge: 'New' },
          { icon: Activity, labelKey: 'nav.pmoFinancialHealth', href: '/pmo/financial-health', badge: 'New' },
          { icon: ShieldCheck, labelKey: 'nav.pmoGateTemplates', href: '/pmo/gate-templates', badge: 'New' },
          { icon: Users, labelKey: 'nav.pmoCapacityPlanning', href: '/pmo/capacity-planning', badge: 'New' },
        ],
      },
      {
        icon: Factory, labelKey: 'nav.manufacturingQuality',
        children: [
          { icon: Activity, labelKey: 'nav.wipMonitor', href: '/manufacturing/wip-monitor' },
          { icon: Calculator, labelKey: 'nav.manufacturingCostAnalysis', href: '/manufacturing/cost-analysis' },
          { icon: FlaskConical, labelKey: 'nav.qualityLab', href: '/quality-lab' },
          { icon: ShieldAlert, labelKey: 'nav.qualityCAPA', href: '/quality-capa' },
          { icon: GitCompare, labelKey: 'nav.engineeringChangeControl', href: '/engineering-change-control' },
          { icon: Wrench, labelKey: 'nav.preventiveMaintenance', href: '/preventive-maintenance' },
          { icon: ClipboardCheck, labelKey: 'nav.technicalAssessment', href: '/technical-assessment' },
        ],
      },
      {
        icon: Brain, labelKey: 'nav.executiveAndAnalytics',
        children: [
          { icon: FileText, labelKey: 'nav.executiveBrief', href: '/executive-brief' },
          { icon: Brain, labelKey: 'nav.executiveReportingHub', href: '/executive-reporting' },
          { icon: Smartphone, labelKey: 'nav.mobileExecutive', href: '/mobile-executive' },
          { icon: FileSpreadsheet, labelKey: 'nav.boardPackGenerator', href: '/board-pack-generator' },
          { icon: GitCompare, labelKey: 'nav.branchBenchmarking', href: '/branch-benchmarking' },
          { icon: Heart, labelKey: 'nav.branchHealth', href: '/branch-health' },
          { icon: Brain, labelKey: 'nav.scenarioPlanning', href: '/scenario-planning' },
          { icon: GitCompare, labelKey: 'nav.whatIfAnalysis', href: '/what-if-analysis' },
          { icon: Bell, labelKey: 'nav.kpiSubscriptions', href: '/kpi-subscriptions' },
          { icon: Database, labelKey: 'nav.dataLineage', href: '/data-lineage' },
        ],
      },
      {
        icon: Users, labelKey: 'nav.portalsAndCustomer',
        children: [
          { icon: Globe, labelKey: 'nav.clientPortals', href: '/client-portals' },
          { icon: Globe, labelKey: 'nav.customerPortalHub', href: '/customer-portal-hub' },
          { icon: MessageCircle, labelKey: 'nav.customerFeedback', href: '/customer-feedback' },
          { icon: MessageCircle, labelKey: 'nav.whatsappCampaign', href: '/whatsapp-campaign' },
        ],
      },
      {
        icon: Settings, labelKey: 'nav.adminAndMasterData',
        children: [
          { icon: Settings, labelKey: 'nav.adminSettings', href: '/admin-settings' },
          { icon: UserCog, labelKey: 'nav.userDefaults', href: '/user-defaults' },
          { icon: UserCog, labelKey: 'nav.adminUserDefaults', href: '/admin/user-defaults' },
          { icon: Landmark, labelKey: 'nav.adminBanks', href: '/admin/banks' },
          { icon: CreditCard, labelKey: 'nav.adminPaymentTerms', href: '/admin/payment-terms' },
          { icon: Calendar, labelKey: 'nav.adminPostingPeriods', href: '/admin/posting-periods' },
          { icon: Percent, labelKey: 'nav.adminTaxGroups', href: '/admin/tax-groups' },
          { icon: Users, labelKey: 'nav.adminCustomerGroups', href: '/admin/customer-groups' },
          { icon: Users, labelKey: 'nav.adminVendorGroups', href: '/admin/vendor-groups' },
          { icon: CreditCard, labelKey: 'nav.paymentMeansSettings', href: '/payment-means-settings' },
          { icon: Hash, labelKey: 'nav.numberingSeries', href: '/numbering-series' },
          { icon: Database, labelKey: 'nav.mdgCenter', href: '/mdg-center' },
          { icon: Layout, labelKey: 'nav.formSettings', href: '/form-settings' },
          { icon: Layout, labelKey: 'nav.printLayoutDesigner', href: '/print-layout-designer' },
          { icon: Globe, labelKey: 'nav.regionConfig', href: '/region-config' },
          { icon: Layout, labelKey: 'nav.workspaceConfig', href: '/workspace-config' },
          { icon: Bell, labelKey: 'nav.alertsManagement', href: '/alerts-management' },
          { icon: Shield, labelKey: 'nav.documentAuthorizations', href: '/document-authorizations' },
          { icon: Lock, labelKey: 'nav.documentRetention', href: '/document-retention' },
          { icon: ShieldAlert, labelKey: 'nav.riskApprovalEngine', href: '/risk-approval-engine' },
          { icon: Cpu, labelKey: 'nav.backgroundJobs', href: '/background-jobs' },
          { icon: Network, labelKey: 'nav.integrationMonitor', href: '/integration-monitor' },
          { icon: ScanLine, labelKey: 'nav.importValidation', href: '/import-validation' },
          { icon: Rocket, labelKey: 'nav.releaseReadiness', href: '/release-readiness' },
          { icon: GraduationCap, labelKey: 'nav.sandboxTraining', href: '/sandbox-training' },
          { icon: Lightbulb, labelKey: 'nav.guidedTours', href: '/guided-tours' },
          { icon: GitBranch, labelKey: 'nav.workflow', href: '/workflow' },
        ],
      },
      {
        icon: Heart, labelKey: 'nav.industrySuites',
        children: [
          { icon: Heart, labelKey: 'nav.hospitalDashboard', href: '/hospital/dashboard' },
        ],
      },
    ],
  },
];

// ─── Leaf link component ──────────────────────────────────────────
function LeafNavLink({ item, depth = 0, onNavigate }: { item: NavItem; depth?: number; onNavigate?: () => void }) {
  const { t } = useLanguage();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href || '/'}
      end={item.href === '/'}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        cn(
          'group/link flex items-center gap-2 rounded-sm px-2 py-[5px] text-[12.5px] transition-all duration-100',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
          isActive && 'bg-sidebar-primary/15 text-sidebar-primary font-medium',
        )
      }
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover/link:opacity-100" />
      <span className="truncate flex-1">{t(item.labelKey)}</span>
      {item.badge && (
        <span className={cn(
          'text-[8px] px-1 py-0.5 rounded font-semibold shrink-0',
          item.badge === 'AI' ? 'bg-purple-500/20 text-purple-400' :
          item.badge === 'Beta' ? 'bg-amber-500/20 text-amber-400' :
          'bg-primary/20 text-primary'
        )}>
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── Nested sub-group (for settings etc.) ─────────────────────────
function hasActiveDescendant(items: NavItem[], pathname: string): boolean {
  return items.some(c => c.href === pathname || (c.children && hasActiveDescendant(c.children, pathname)));
}

function SubGroup({ item, depth = 0, onNavigate }: { item: NavItem; depth?: number; onNavigate?: () => void }) {
  const location = useLocation();
  const { t } = useLanguage();
  const { canViewByLabel } = useRolePermissions();
  const Icon = item.icon;

  const visibleChildren = item.children?.filter(c => canViewByLabel(c.labelKey)) || [];
  const hasActiveChild = hasActiveDescendant(visibleChildren, location.pathname);
  const [open, setOpen] = useState(hasActiveChild);

  if (visibleChildren.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 rounded-sm px-2 py-[5px] text-[12.5px] font-medium transition-all duration-100',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
          hasActiveChild && 'text-sidebar-foreground',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform duration-150', open && 'rotate-90')} />
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="truncate">{t(item.labelKey)}</span>
      </button>
      {open && (
        <div className="border-l border-sidebar-border/30 ml-[18px]">
          {visibleChildren.map((child, i) =>
            child.children ? (
              <SubGroup key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ) : (
              <LeafNavLink key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
            )
          )}
        </div>
      )}
    </div>
  );
}



// ─── Module tree group (SAP B1 style) ─────────────────────────────
function ModuleTreeGroup({
  group,
  onNavigate,
}: {
  group: ModuleGroup;
  onNavigate?: () => void;
}) {
  const { t } = useLanguage();
  const { canViewByLabel } = useRolePermissions();
  const location = useLocation();
  const Icon = group.icon;

  const visibleItems = group.items.filter(item => canViewByLabel(item.labelKey));
  const isActive = visibleItems.some(item => {
    if (item.href === location.pathname) return true;
    if (item.children) return hasActiveDescendant(item.children, location.pathname);
    return false;
  });
  const [open, setOpen] = useState(isActive);

  if (visibleItems.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-[7px] text-[13px] font-semibold transition-colors',
          'hover:bg-sidebar-accent/50',
          isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/80',
        )}
      >
        <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform duration-150', open && 'rotate-90')} />
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{t(group.labelKey)}</span>
      </button>
      {open && (
        <div className="border-l border-sidebar-border/40 ml-[18px]">
          {visibleItems.map((item, i) =>
            item.children ? (
              <SubGroup key={i} item={item} depth={1} onNavigate={onNavigate} />
            ) : (
              <LeafNavLink key={i} item={item} depth={1} onNavigate={onNavigate} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Resize handle ────────────────────────────────────────────────
function ResizeHandle({ onResize, direction }: { onResize: (deltaX: number) => void; direction: string }) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = direction === 'rtl' ? lastX.current - ev.clientX : ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onResize(delta);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onResize, direction]);

  return (
    <div
      ref={handleRef}
      onMouseDown={onMouseDown}
      className="absolute top-0 bottom-0 w-3 cursor-col-resize z-50 group hover:bg-sidebar-primary/20 transition-colors"
      style={{ [direction === 'rtl' ? 'left' : 'right']: '-6px' }}
    >
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-5 w-5 text-sidebar-primary/60" />
      </div>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────
export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, width, onWidthChange }: SidebarProps) {
  const { direction, t } = useLanguage();
  const location = useLocation();
  const { canViewByLabel } = useRolePermissions();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered module groups for search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return moduleGroups;
    const q = searchQuery.toLowerCase();
    return moduleGroups.filter(g =>
      t(g.labelKey).toLowerCase().includes(q) ||
      g.items.some(item => t(item.labelKey).toLowerCase().includes(q))
    );
  }, [searchQuery, t]);

  // Flat search results: individual items matching the query
  const flatSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { item: NavItem; group: ModuleGroup }[] = [];
    const collectItems = (items: NavItem[], group: ModuleGroup) => {
      for (const item of items) {
        if (!canViewByLabel(item.labelKey)) continue;
        if (t(item.labelKey).toLowerCase().includes(q)) {
          results.push({ item, group });
        }
        if (item.children) collectItems(item.children, group);
      }
    };
    moduleGroups.forEach(g => collectItems(g.items, g));
    return results;
  }, [searchQuery, t, canViewByLabel]);

  // Auto-collapse on navigation (desktop)
  const handleNavigate = useCallback(() => {
    // Close mobile sidebar
    onClose();
    // Collapse desktop sidebar
    if (!isCollapsed && window.innerWidth >= 1024) {
      onToggleCollapse();
    }
  }, [onClose, isCollapsed, onToggleCollapse]);

  const handleResize = useCallback((delta: number) => {
    onWidthChange(Math.max(220, Math.min(420, width + delta)));
  }, [width, onWidthChange]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Desktop collapsed: show thin strip with expand button */}
      {isCollapsed && (
        <div className="hidden lg:flex flex-col items-center w-12 bg-sidebar border-r border-sidebar-border shrink-0">
          <button
            onClick={onToggleCollapse}
            className="mt-3 h-8 w-8 rounded-md flex items-center justify-center hover:bg-sidebar-accent/60 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {/* Mini module icons */}
          <ScrollArea className="flex-1 w-full mt-2">
            <div className="flex flex-col items-center gap-1 px-1.5 py-1">
              {moduleGroups.map(group => {
                const visible = group.items.filter(i => canViewByLabel(i.labelKey));
                if (visible.length === 0) return null;
                const GroupIcon = group.icon;
                return (
                  <button
                    key={group.id}
                    onClick={onToggleCollapse}
                    title={t(group.labelKey)}
                    className="h-8 w-8 rounded-md flex items-center justify-center transition-colors text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  >
                    <GroupIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      <aside
        data-tour="sidebar"
        className={cn(
          'fixed top-0 h-full bg-sidebar z-50 flex flex-col transition-transform duration-300 border-r border-sidebar-border shadow-xl shadow-sidebar-border/10',
          'lg:relative lg:static lg:shadow-none',
          isCollapsed && 'lg:hidden',
          !isOpen && 'max-lg:pointer-events-none',
          direction === 'ltr' ? 'left-0' : 'right-0',
          isOpen
            ? 'translate-x-0'
            : direction === 'ltr'
            ? '-translate-x-full lg:translate-x-0'
            : 'translate-x-full lg:translate-x-0'
        )}
        style={{ width: `${width}px` }}
      >
        {/* Resize handle (desktop only) */}
        <div className="hidden lg:block">
          <ResizeHandle onResize={handleResize} direction={direction} />
        </div>

        {/* Header */}
        <div className="h-11 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center">
              <span className="text-[10px] font-bold text-sidebar-primary-foreground">AR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-sidebar-foreground leading-tight">SAP B1 Addon</span>
              <span className="text-[9px] text-sidebar-foreground/40">Enterprise Suite</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="text-sidebar-foreground h-7 w-7 hover:bg-sidebar-accent hidden lg:flex"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground h-7 w-7 hover:bg-sidebar-accent lg:hidden">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content area - SAP B1 style tree menu */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search */}
          <div className="px-2 py-2 border-b border-sidebar-border/30 shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/30" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchModules') || 'Search...'}
                className="h-8 pl-7 text-xs bg-sidebar-accent/30 border-sidebar-border/30 text-sidebar-foreground placeholder:text-sidebar-foreground/30 rounded"
              />
            </div>
          </div>

          {/* Tree menu */}
          <ScrollArea className="flex-1">
            <div className="py-1">
              {searchQuery.trim() && flatSearchResults.length > 0 ? (
                <div className="px-1 space-y-0.5">
                  {flatSearchResults.slice(0, 30).map(({ item, group }, idx) => {
                    const ItemIcon = item.icon || FileText;
                    const GroupIcon = group.icon;
                    return (
                      <NavLink
                        key={`${item.href}-${idx}`}
                        to={item.href}
                        onClick={handleNavigate}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 px-3 py-[5px] rounded-sm text-[12.5px] transition-colors',
                            'hover:bg-sidebar-accent/50',
                            isActive
                              ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/70',
                          )
                        }
                      >
                        <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{t(item.labelKey)}</span>
                          <span className="text-[9px] text-sidebar-foreground/40 truncate flex items-center gap-1">
                            <GroupIcon className="h-2.5 w-2.5" />
                            {t(group.labelKey)}
                          </span>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              ) : searchQuery.trim() ? (
                <p className="text-xs text-sidebar-foreground/30 text-center py-6">No items found</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredGroups.map(group => {
                    const visible = group.items.filter(i => canViewByLabel(i.labelKey));
                    if (visible.length === 0) return null;
                    return (
                      <ModuleTreeGroup
                        key={group.id}
                        group={group}
                        onNavigate={handleNavigate}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
