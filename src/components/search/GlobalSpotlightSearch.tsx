import { useState, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCommandActions, subscribeCommandActions } from '@/lib/commandActions';
import {
  Users, FileText, FolderKanban, UserCog, Package, LayoutDashboard,
  Search, Building2, Receipt, Briefcase, Hash, ShoppingCart, Truck,
  Target, Clock, CheckCircle, Star, DollarSign, CreditCard, Landmark,
  BarChart2, BarChart3, Brain, Shield, Headphones, Factory, Globe,
  HardHat, Settings, Calendar, Activity, Zap, Bell, Heart, Wand2, Eye,
  MapPin, Layers, BookOpen, Ship, AlertTriangle, Warehouse, Percent,
  Database, ArrowUpDown, ArrowLeftRight, ClipboardList, ClipboardCheck,
  FileSpreadsheet, PackagePlus, PackageMinus, RefreshCw, Lock, Bot,
  Mail, ScanLine, FileSearch, Lightbulb, Inbox, Network, Printer,
  Smartphone, Wrench, GraduationCap, UserPlus, Grid3X3, Barcode,
  GitBranch, PenTool, Award, Cpu, Ruler, Download, FlaskConical,
  MessageCircle, FileDown, RotateCcw, FileX, Link2, TrendingUp, TrendingDown,
  ShieldCheck, ShieldAlert, BellRing, Stamp, Volume2, HardDrive,
  Plus, Bookmark, BookmarkCheck, X, Filter, Sparkles, Play, Rocket,
} from 'lucide-react';

interface SpotlightProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── LocalStorage helpers ─────────────────────────────────────
const RECENT_KEY = 'erp_recent_searches';
const SAVED_KEY = 'erp_saved_searches';

interface RecentItem { label: string; href: string; group: string; timestamp: number }
interface SavedSearch { id: string; query: string; module: string; createdAt: number }

function getRecent(): RecentItem[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 10); } catch { return []; }
}
function addRecent(item: Omit<RecentItem, 'timestamp'>) {
  const recent = getRecent().filter(r => r.href !== item.href);
  recent.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 15)));
}
function clearRecent() { localStorage.setItem(RECENT_KEY, '[]'); }

function getSavedSearches(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; }
}
function addSavedSearch(query: string, module: string) {
  const saved = getSavedSearches().filter(s => s.query !== query);
  saved.unshift({ id: crypto.randomUUID(), query, module, createdAt: Date.now() });
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 20)));
}
function removeSavedSearch(id: string) {
  const saved = getSavedSearches().filter(s => s.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
}

// ─── Module filter options ─────────────────────────────────
const MODULE_FILTERS = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'crm', label: 'CRM', icon: Target },
  { key: 'sales', label: 'Sales', icon: FileText },
  { key: 'procurement', label: 'Procurement', icon: ShoppingCart },
  { key: 'finance', label: 'Finance', icon: DollarSign },
  { key: 'hr', label: 'HR', icon: Users },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'tools', label: 'Tools', icon: Settings },
];

// ─── Quick Actions ────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Personal Dashboard Builder', href: '/personal-dashboard', icon: Sparkles, group: 'Productivity', action: 'customize' },
  { label: 'Rollout Cockpit', href: '/rollout-cockpit', icon: Rocket, group: 'Implementation', action: 'launch' },
  { label: 'New Lead', href: '/leads', icon: Target, group: 'CRM', action: 'create' },
  { label: 'New Sales Order', href: '/sales-orders', icon: FileText, group: 'Sales', action: 'create' },
  { label: 'New Quote', href: '/quotes', icon: FileSpreadsheet, group: 'Sales', action: 'create' },
  { label: 'New Purchase Order', href: '/procurement?tab=po&action=new', icon: ShoppingCart, group: 'Procurement', action: 'create' },
  { label: 'New Invoice', href: '/ar-invoices', icon: Receipt, group: 'Sales', action: 'create' },
  { label: 'New Business Partner', href: '/business-partners', icon: Building2, group: 'Master Data', action: 'create' },
  { label: 'New Item', href: '/items', icon: Package, group: 'Master Data', action: 'create' },
  { label: 'New Journal Entry', href: '/general-ledger', icon: BookOpen, group: 'Finance', action: 'create' },
  { label: 'Approval Inbox', href: '/approval-inbox', icon: Inbox, group: 'Workflow', action: 'approve' },
  { label: 'Export Reports', href: '/reports', icon: Download, group: 'Reports', action: 'export' },
];

// ─── All module pages ─────────────────────────────────────────
const modulePages = [
  // Dashboard & Analytics
  { label: 'Dashboard', href: '/', group: 'Dashboard', icon: LayoutDashboard, module: 'all' },
  { label: 'Personal Dashboard Builder', href: '/personal-dashboard', group: 'Dashboard', icon: Sparkles, module: 'all' },
  { label: 'Rollout Cockpit', href: '/rollout-cockpit', group: 'Implementation', icon: Rocket, module: 'tools' },
  { label: 'Role Workspaces', href: '/role-workspaces', group: 'Dashboard', icon: Users, module: 'all' },
  { label: 'AI Review Queue', href: '/controlled-ai/review', group: 'Dashboard', icon: Lock, module: 'all' },
  { label: 'Unified Executive', href: '/unified-executive', group: 'Dashboard', icon: Brain, module: 'all' },
  { label: 'Advanced Analytics', href: '/advanced-analytics', group: 'Dashboard', icon: TrendingUp, module: 'all' },
  { label: 'Reports', href: '/reports', group: 'Dashboard', icon: BarChart3, module: 'all' },

  // CRM
  { label: 'Leads', href: '/leads', group: 'CRM', icon: Target, module: 'crm' },
  { label: 'Opportunities', href: '/opportunities', group: 'CRM', icon: TrendingUp, module: 'crm' },
  { label: 'Sales Pipeline', href: '/sales-pipeline', group: 'CRM', icon: FolderKanban, module: 'crm' },
  { label: 'Activities', href: '/activities', group: 'CRM', icon: Activity, module: 'crm' },
  { label: 'Calendar', href: '/calendar', group: 'CRM', icon: Calendar, module: 'crm' },
  { label: 'Customer 360°', href: '/customer-360', group: 'CRM', icon: Building2, module: 'crm' },
  { label: 'Cadences', href: '/cadences', group: 'CRM', icon: ClipboardList, module: 'crm' },
  { label: 'Targets', href: '/targets', group: 'CRM', icon: Target, module: 'crm' },
  { label: 'Tasks', href: '/tasks', group: 'CRM', icon: CheckCircle, module: 'crm' },
  { label: 'Visits', href: '/visits', group: 'CRM', icon: MapPin, module: 'crm' },
  { label: 'Visit Analytics', href: '/visit-analytics', group: 'CRM', icon: BarChart2, module: 'crm' },
  { label: 'Opportunity Reports', href: '/opportunity-reports', group: 'CRM', icon: BarChart2, module: 'crm' },
  { label: 'Follow-Up Automation', href: '/follow-up-automation', group: 'CRM', icon: Clock, module: 'crm' },
  { label: 'Email Templates', href: '/email-templates', group: 'CRM', icon: MessageCircle, module: 'crm' },
  { label: 'Email Automation', href: '/email-automation', group: 'CRM', icon: Zap, module: 'crm' },
  { label: 'Document Management', href: '/document-management', group: 'CRM', icon: FileDown, module: 'crm' },

  // Sales & Transactions
  { label: 'Sales Dashboard', href: '/sales-dashboard', group: 'Sales', icon: BarChart2, module: 'sales' },
  { label: 'Smart Sales Forecasting', href: '/sales-smart-forecast', group: 'Sales', icon: Brain, module: 'sales' },
  { label: 'Lead Scoring', href: '/sales-lead-scoring', group: 'Sales', icon: Target, module: 'sales' },
  { label: 'Sales Performance', href: '/sales-performance', group: 'Sales', icon: BarChart2, module: 'sales' },
  { label: 'Order Recommendations', href: '/sales-recommendations', group: 'Sales', icon: Zap, module: 'sales' },
  { label: 'Dynamic Pricing', href: '/sales-pricing', group: 'Sales', icon: DollarSign, module: 'sales' },
  { label: 'Customer Health Score', href: '/sales-customer-health', group: 'Sales', icon: Heart, module: 'sales' },
  { label: 'Sales Cycle Prediction', href: '/sales-cycle-prediction', group: 'Sales', icon: Clock, module: 'sales' },
  { label: 'Competitor Intelligence', href: '/sales-competitor-intel', group: 'Sales', icon: Eye, module: 'sales' },
  { label: 'Sales Insights & Alerts', href: '/sales-insights-alerts', group: 'Sales', icon: Bell, module: 'sales' },
  { label: 'Customer Segmentation', href: '/sales-segmentation', group: 'Sales', icon: Users, module: 'sales' },
  { label: 'Territory Mapping', href: '/territory-mapping', group: 'Sales', icon: Globe, module: 'sales' },
  { label: 'Quotes', href: '/quotes', group: 'Sales', icon: FileSpreadsheet, module: 'sales' },
  { label: 'Sales Orders', href: '/sales-orders', group: 'Sales', icon: FileText, module: 'sales' },
  { label: 'AR Invoices', href: '/ar-invoices', group: 'Sales', icon: Receipt, module: 'sales' },
  { label: 'Delivery Notes', href: '/delivery-notes', group: 'Sales', icon: Truck, module: 'sales' },
  { label: 'Incoming Payments', href: '/incoming-payments', group: 'Sales', icon: CreditCard, module: 'sales' },
  { label: 'AR Credit Memos', href: '/ar-credit-memos', group: 'Sales', icon: FileX, module: 'sales' },
  { label: 'AR Returns', href: '/ar-returns', group: 'Sales', icon: RotateCcw, module: 'sales' },
  { label: 'POS Quick Sale', href: '/pos-quick-sale', group: 'Sales', icon: Smartphone, module: 'sales' },

  // Procurement
  { label: 'Procurement Dashboard', href: '/procurement-dashboard', group: 'Procurement', icon: BarChart2, module: 'procurement' },
  { label: 'Procurement', href: '/procurement', group: 'Procurement', icon: ShoppingCart, module: 'procurement' },
  { label: 'Material Requests', href: '/material-requests', group: 'Procurement', icon: ClipboardList, module: 'procurement' },
  { label: 'Supplier Reviews', href: '/supplier-reviews', group: 'Procurement', icon: Award, module: 'procurement' },
  { label: 'Landed Costs', href: '/landed-costs', group: 'Procurement', icon: Ship, module: 'procurement' },
  { label: 'Shipments', href: '/shipments', group: 'Procurement', icon: Truck, module: 'procurement' },

  // Finance & Banking
  { label: 'Finance Dashboard', href: '/finance-dashboard', group: 'Finance', icon: BarChart2, module: 'finance' },
  { label: 'Finance Overview', href: '/finance-overview', group: 'Finance', icon: DollarSign, module: 'finance' },
  { label: 'General Ledger', href: '/general-ledger', group: 'Finance', icon: BookOpen, module: 'finance' },
  { label: 'Finance Gates', href: '/finance-gates', group: 'Finance', icon: Shield, module: 'finance' },
  { label: 'Financial Reports', href: '/financial-reports', group: 'Finance', icon: FileSpreadsheet, module: 'finance' },
  { label: 'Budget Setup', href: '/budget-setup', group: 'Finance', icon: Landmark, module: 'finance' },
  { label: 'Budget vs Actual', href: '/budget-vs-actual', group: 'Finance', icon: BarChart2, module: 'finance' },
  { label: 'Cost Accounting', href: '/cost-accounting', group: 'Finance', icon: DollarSign, module: 'finance' },
  { label: 'Fixed Assets', href: '/fixed-assets', group: 'Finance', icon: HardDrive, module: 'finance' },
  { label: 'Contract Management', href: '/contract-management', group: 'Finance', icon: FileText, module: 'finance' },
  { label: 'Boardroom Reporting', href: '/boardroom-reporting', group: 'Finance', icon: BarChart3, module: 'finance' },
  { label: 'Accounting Determination', href: '/accounting-determination', group: 'Finance', icon: Database, module: 'finance' },
  { label: 'Banking Dashboard', href: '/banking', group: 'Finance', icon: Landmark, module: 'finance' },
  { label: 'Cash Position', href: '/cash-position', group: 'Finance', icon: DollarSign, module: 'finance' },
  { label: 'Cash Flow Forecast', href: '/cash-flow-forecast', group: 'Finance', icon: TrendingUp, module: 'finance' },
  { label: 'Exchange Rates', href: '/exchange-rates', group: 'Finance', icon: ArrowLeftRight, module: 'finance' },
  { label: 'Outgoing Payments', href: '/outgoing-payments', group: 'Finance', icon: CreditCard, module: 'finance' },
  { label: 'Bank Statements', href: '/bank-statements', group: 'Finance', icon: FileText, module: 'finance' },
  { label: 'Payment Reconciliation', href: '/payment-reconciliation', group: 'Finance', icon: CheckCircle, module: 'finance' },
  { label: 'Margin Protection', href: '/margin-protection', group: 'Finance', icon: Shield, module: 'finance' },

  // Master Data
  { label: 'Business Partners', href: '/business-partners', group: 'Master Data', icon: Users, module: 'all' },
  { label: 'Items', href: '/items', group: 'Master Data', icon: Package, module: 'inventory' },
  { label: 'Price Lists', href: '/price-lists', group: 'Master Data', icon: DollarSign, module: 'sales' },

  // Inventory
  { label: 'Inventory Dashboard', href: '/inventory-dashboard', group: 'Inventory', icon: BarChart2, module: 'inventory' },
  { label: 'Stock Transfer', href: '/stock-transfer', group: 'Inventory', icon: ArrowUpDown, module: 'inventory' },
  { label: 'Inventory Counting', href: '/inventory-counting', group: 'Inventory', icon: Hash, module: 'inventory' },
  { label: 'Bin Locations', href: '/bin-locations', group: 'Inventory', icon: Grid3X3, module: 'inventory' },
  { label: 'Batch & Serial', href: '/batch-serial-tracking', group: 'Inventory', icon: Barcode, module: 'inventory' },
  { label: 'Item Warehouse Info', href: '/item-warehouse-info', group: 'Inventory', icon: Warehouse, module: 'inventory' },

  // HR
  { label: 'HR Dashboard', href: '/hr-dashboard', group: 'HR', icon: BarChart2, module: 'hr' },
  { label: 'Employees', href: '/hr/employees', group: 'HR', icon: UserCog, module: 'hr' },
  { label: 'Departments', href: '/hr/departments', group: 'HR', icon: Building2, module: 'hr' },
  { label: 'Leave Management', href: '/hr/leave', group: 'HR', icon: Calendar, module: 'hr' },
  { label: 'Attendance', href: '/hr/attendance', group: 'HR', icon: Clock, module: 'hr' },
  { label: 'Payroll', href: '/hr/payroll', group: 'HR', icon: DollarSign, module: 'hr' },
  { label: 'Training', href: '/hr/training', group: 'HR', icon: GraduationCap, module: 'hr' },
  { label: 'Recruitment', href: '/hr/recruitment', group: 'HR', icon: UserPlus, module: 'hr' },
  { label: 'Employee Loans', href: '/employee-loans', group: 'HR', icon: CreditCard, module: 'hr' },
  { label: 'Performance Appraisals', href: '/performance-appraisals', group: 'HR', icon: Award, module: 'hr' },
  { label: 'Shift Planning', href: '/shift-planning', group: 'HR', icon: Clock, module: 'hr' },
  { label: 'HR Letters', href: '/hr-letters', group: 'HR', icon: FileText, module: 'hr' },
  { label: 'Offboarding', href: '/offboarding', group: 'HR', icon: UserCog, module: 'hr' },

  // Manufacturing & Industrial
  { label: 'Manufacturing', href: '/manufacturing', group: 'Industrial', icon: Factory, module: 'all' },
  { label: 'Design & Costing', href: '/design-costing', group: 'Industrial', icon: PenTool, module: 'all' },
  { label: 'Technical Assessment', href: '/technical-assessment', group: 'Industrial', icon: ClipboardCheck, module: 'all' },
  { label: 'Delivery & Installation', href: '/delivery-installation', group: 'Industrial', icon: Truck, module: 'all' },
  { label: 'Trading Hub', href: '/trading-hub', group: 'Industrial', icon: Globe, module: 'all' },

  // Construction (CPMS)
  { label: 'CPMS Dashboard', href: '/cpms', group: 'Construction', icon: HardHat, module: 'projects' },
  { label: 'CPMS Projects', href: '/cpms/projects', group: 'Construction', icon: FolderKanban, module: 'projects' },
  { label: 'CPMS Tenders', href: '/cpms/tenders', group: 'Construction', icon: FileSpreadsheet, module: 'projects' },
  { label: 'CPMS Expenses', href: '/cpms/expenses', group: 'Construction', icon: Receipt, module: 'projects' },
  { label: 'CPMS Daily Reports', href: '/cpms/daily-reports', group: 'Construction', icon: FileText, module: 'projects' },
  { label: 'CPMS Costs', href: '/cpms/costs', group: 'Construction', icon: DollarSign, module: 'projects' },
  { label: 'CPMS Billing', href: '/cpms/billing', group: 'Construction', icon: CreditCard, module: 'projects' },
  { label: 'CPMS Finance', href: '/cpms/finance', group: 'Construction', icon: Landmark, module: 'projects' },
  { label: 'CPMS RFIs', href: '/cpms/rfis', group: 'Construction', icon: MessageCircle, module: 'projects' },
  { label: 'CPMS Resources', href: '/cpms/resources', group: 'Construction', icon: Users, module: 'projects' },
  { label: 'CPMS Gantt Chart', href: '/cpms/gantt', group: 'Construction', icon: BarChart2, module: 'projects' },
  { label: 'CPMS Subcontractors', href: '/cpms/subcontractors', group: 'Construction', icon: HardHat, module: 'projects' },

  // AI & Automation
  { label: 'Smart Recommendations', href: '/smart-recommendations', group: 'AI & Automation', icon: Lightbulb, module: 'all' },
  { label: 'NL Assistant', href: '/nl-assistant', group: 'AI & Automation', icon: Bot, module: 'all' },
  { label: 'ERP Copilot', href: '/erp-copilot', group: 'AI & Automation', icon: Bot, module: 'all' },
  { label: 'Workflow Reminders', href: '/workflow-auto-reminders', group: 'AI & Automation', icon: Bell, module: 'all' },
  { label: 'OCR Document Capture', href: '/ocr-document-capture', group: 'AI & Automation', icon: ScanLine, module: 'all' },
  { label: 'Document Classification', href: '/document-classification', group: 'AI & Automation', icon: FileSearch, module: 'all' },
  { label: 'Email Document Capture', href: '/email-document-capture', group: 'AI & Automation', icon: Mail, module: 'all' },
  { label: 'Process Mining', href: '/process-mining', group: 'AI & Automation', icon: Activity, module: 'all' },
  { label: 'Predictive Collections', href: '/predictive-collections', group: 'AI & Automation', icon: TrendingUp, module: 'all' },
  { label: 'Predictive Project Risk', href: '/predictive-project-risk', group: 'AI & Automation', icon: Shield, module: 'all' },
  { label: 'AI Anomaly Detection', href: '/ai-anomaly-detection', group: 'AI & Automation', icon: AlertTriangle, module: 'all' },

  // Executive
  { label: 'Strategic Goals', href: '/strategic-goals', group: 'Executive', icon: Target, module: 'all' },
  { label: 'Cross-Company Analytics', href: '/cross-company-analytics', group: 'Executive', icon: Building2, module: 'all' },
  { label: 'Profitability Waterfall', href: '/profitability-waterfall', group: 'Executive', icon: TrendingDown, module: 'all' },
  { label: 'Meeting Summaries', href: '/meeting-summaries', group: 'Executive', icon: FileText, module: 'all' },
  { label: 'Enterprise Risk Register', href: '/enterprise-risk-register', group: 'Executive', icon: ShieldAlert, module: 'all' },
  { label: 'Decision Log', href: '/management-decision-log', group: 'Executive', icon: BookOpen, module: 'all' },
  { label: 'Document Expiry Tracking', href: '/document-expiry-tracking', group: 'Executive', icon: Calendar, module: 'all' },

  // Tools & Settings
  { label: 'Approval Inbox', href: '/approval-inbox', group: 'Tools', icon: Inbox, module: 'tools' },
  { label: 'Data Quality', href: '/data-quality', group: 'Tools', icon: ShieldCheck, module: 'tools' },
  { label: 'Process Health', href: '/process-health', group: 'Tools', icon: Activity, module: 'tools' },
  { label: 'QA Dashboard', href: '/qa-dashboard', group: 'Tools', icon: FlaskConical, module: 'tools' },
  { label: 'Alerts Management', href: '/alerts-management', group: 'Tools', icon: BellRing, module: 'tools' },
  { label: 'Approval Workflows', href: '/approval-workflows', group: 'Tools', icon: Stamp, module: 'tools' },
  { label: 'Workflow Builder', href: '/workflow-builder', group: 'Tools', icon: Network, module: 'tools' },
  { label: 'Exception Center', href: '/exception-center', group: 'Tools', icon: AlertTriangle, module: 'tools' },
  { label: 'SLA Engine', href: '/sla-engine', group: 'Tools', icon: Clock, module: 'tools' },
  { label: 'Business Rules Simulator', href: '/business-rules-simulator', group: 'Tools', icon: FlaskConical, module: 'tools' },
  { label: 'Operations Command Center', href: '/operations-command-center', group: 'Tools', icon: Eye, module: 'tools' },
  { label: 'Reconciliation Center', href: '/reconciliation-center', group: 'Tools', icon: Link2, module: 'tools' },
  { label: 'Drag & Relate', href: '/drag-and-relate', group: 'Tools', icon: Network, module: 'tools' },
  { label: 'Print Layout Designer', href: '/print-layout-designer', group: 'Tools', icon: Printer, module: 'tools' },
  { label: 'Advanced Numbering', href: '/advanced-numbering', group: 'Tools', icon: Hash, module: 'tools' },
  { label: 'Dynamic Form Builder', href: '/dynamic-form-builder', group: 'Tools', icon: Layers, module: 'tools' },
  { label: 'Row-Level Permissions', href: '/row-level-permissions', group: 'Tools', icon: Lock, module: 'tools' },
  { label: 'Master Data Stewardship', href: '/master-data-stewardship', group: 'Tools', icon: Database, module: 'tools' },
  { label: 'Admin Settings', href: '/admin-settings', group: 'Tools', icon: FileDown, module: 'tools' },
  { label: 'Company Settings', href: '/company-settings', group: 'Tools', icon: Building2, module: 'tools' },
  { label: 'Dimensions', href: '/dimensions', group: 'Tools', icon: Layers, module: 'tools' },
  { label: 'Numbering Series', href: '/numbering-series', group: 'Tools', icon: Hash, module: 'tools' },
  { label: 'Users', href: '/users', group: 'Tools', icon: UserCog, module: 'tools' },
  { label: 'User Defaults', href: '/user-defaults', group: 'Tools', icon: Settings, module: 'tools' },
  { label: 'SAP Integration', href: '/sap-integration', group: 'Tools', icon: RefreshCw, module: 'tools' },
  { label: 'SAP Databases', href: '/sap-databases', group: 'Tools', icon: Database, module: 'tools' },
  { label: 'ZATCA Integration', href: '/zatca', group: 'Tools', icon: Shield, module: 'tools' },
  { label: 'Workflows', href: '/workflow', group: 'Tools', icon: GitBranch, module: 'tools' },

  // Assets
  { label: 'Field Operations', href: '/field-operations', group: 'Assets', icon: Building2, module: 'all' },
];

// ─── Component ────────────────────────────────────────────────
export function GlobalSpotlightSearch({ open, onOpenChange }: SpotlightProps) {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const debouncedSearch = useDebounce(search, 250);
  const [recentItems, setRecentItems] = useState(getRecent());
  const [savedSearches, setSavedSearches] = useState(getSavedSearches());
  const [showSaved, setShowSaved] = useState(false);

  // Live subscription to module-registered command actions (verbs)
  const dynamicActions = useSyncExternalStore(
    subscribeCommandActions,
    getCommandActions,
    getCommandActions,
  );

  const filteredDynamicActions = useMemo(() => {
    if (!dynamicActions.length) return [];
    if (!search) return dynamicActions.slice(0, 6);
    const q = search.toLowerCase();
    return dynamicActions.filter(a =>
      a.label.toLowerCase().includes(q) ||
      a.group.toLowerCase().includes(q) ||
      a.keywords?.some(k => k.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [dynamicActions, search]);

  const enabled = open && debouncedSearch.length >= 2;

  // ─── DB Searches ────────────────────────────────────────────
  const { data: partners = [] } = useQuery({
    queryKey: ['spotlight-partners', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('business_partners').select('id, card_code, card_name, card_type').or(`card_name.ilike.%${debouncedSearch}%,card_code.ilike.%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'crm' || moduleFilter === 'sales'),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['spotlight-invoices', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_invoices').select('id, doc_num, customer_name, total, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales' || moduleFilter === 'finance'),
  });

  const { data: salesOrders = [] } = useQuery({
    queryKey: ['spotlight-so', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('sales_orders').select('id, doc_num, customer_name, total, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales'),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['spotlight-quotes', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('quotes').select('id, doc_num, customer_name, total, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales'),
  });

  const { data: deliveryNotes = [] } = useQuery({
    queryKey: ['spotlight-dn', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('delivery_notes').select('id, doc_num, customer_name, total, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales'),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['spotlight-po', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('purchase_orders').select('id, doc_num, vendor_name, total, status').or(`vendor_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'procurement'),
  });

  const { data: apInvoices = [] } = useQuery({
    queryKey: ['spotlight-ap', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_invoices').select('id, invoice_number, vendor_name, total, status').ilike('vendor_name', `%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'procurement'),
  });

  const { data: incomingPayments = [] } = useQuery({
    queryKey: ['spotlight-ip', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('incoming_payments').select('id, doc_num, customer_name, total_amount, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales' || moduleFilter === 'finance'),
  });

  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ['spotlight-gr', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('goods_receipts').select('id, doc_num, vendor_name, total, status').ilike('vendor_name', `%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'procurement'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['spotlight-projects', debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name, status').ilike('name', `%${debouncedSearch}%`).limit(5);
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'projects'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['spotlight-employees', debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('id, first_name, last_name, employee_id').or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,employee_id.ilike.%${debouncedSearch}%`).limit(5);
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'hr'),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['spotlight-items', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('items').select('id, item_code, item_name').or(`item_name.ilike.%${debouncedSearch}%,item_code.ilike.%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'inventory'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['spotlight-leads', debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase.from('leads' as any).select('id, name, status').ilike('name', `%${debouncedSearch}%`).limit(5);
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'crm'),
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['spotlight-opps', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('opportunities').select('id, name, stage, amount').ilike('name', `%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as any;
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'crm'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['spotlight-tasks', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('activities').select('id, subject, type, status').ilike('subject', `%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as any;
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'crm'),
  });

  const { data: arCreditMemos = [] } = useQuery({
    queryKey: ['spotlight-arcm', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ar_credit_memos').select('id, doc_num, customer_name, total, status').or(`customer_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'sales'),
  });

  const { data: apCreditMemos = [] } = useQuery({
    queryKey: ['spotlight-apcm', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('ap_credit_memos').select('id, doc_num, vendor_name, total, status').or(`vendor_name.ilike.%${debouncedSearch}%,doc_num.eq.${isNaN(Number(debouncedSearch)) ? 0 : Number(debouncedSearch)}`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'procurement'),
  });

  // NEW: Journal Entries search
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['spotlight-je', debouncedSearch, activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('finance_journal_entries').select('id, je_number, reference, memo, total_debit, status').or(`je_number.ilike.%${debouncedSearch}%,reference.ilike.%${debouncedSearch}%,memo.ilike.%${debouncedSearch}%`).limit(5);
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId) as any;
      const { data } = await q;
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'finance'),
  });

  // NEW: Approval Requests search
  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['spotlight-approvals', debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase.from('approval_requests').select('id, document_number, document_type, requester_name, amount, status').or(`document_number.ilike.%${debouncedSearch}%,document_type.ilike.%${debouncedSearch}%,requester_name.ilike.%${debouncedSearch}%`).limit(5);
      return data || [];
    },
    enabled: enabled && (moduleFilter === 'all' || moduleFilter === 'tools'),
  });

  // ─── Filtering ──────────────────────────────────────────────
  const filteredPages = useMemo(() => {
    let pages = modulePages;
    if (moduleFilter !== 'all') {
      pages = pages.filter(p => p.module === moduleFilter || p.module === 'all');
    }
    if (search) {
      pages = pages.filter(p =>
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.group.toLowerCase().includes(search.toLowerCase())
      );
    }
    return search ? pages : pages.slice(0, 8);
  }, [search, moduleFilter]);

  const groupedPages = useMemo(() => {
    return filteredPages.reduce<Record<string, typeof modulePages>>((acc, page) => {
      if (!acc[page.group]) acc[page.group] = [];
      acc[page.group].push(page);
      return acc;
    }, {});
  }, [filteredPages]);

  const filteredQuickActions = useMemo(() => {
    if (!search) return QUICK_ACTIONS;
    const q = search.toLowerCase();
    return QUICK_ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q) || a.action.includes(q)
    );
  }, [search]);

  const handleSelect = useCallback((href: string, label: string, group: string) => {
    addRecent({ label, href, group });
    setRecentItems(getRecent());
    onOpenChange(false);
    setSearch('');
    setModuleFilter('all');
    navigate(href);
  }, [navigate, onOpenChange]);

  const handleSaveSearch = useCallback(() => {
    if (search.length >= 2) {
      addSavedSearch(search, moduleFilter);
      setSavedSearches(getSavedSearches());
    }
  }, [search, moduleFilter]);

  const handleLoadSavedSearch = useCallback((query: string, module: string) => {
    setSearch(query);
    setModuleFilter(module);
    setShowSaved(false);
  }, []);

  useEffect(() => {
    if (!open) { setSearch(''); setModuleFilter('all'); setShowSaved(false); }
    else { setRecentItems(getRecent()); setSavedSearches(getSavedSearches()); }
  }, [open]);

  const hasDbResults = partners.length > 0 || invoices.length > 0 || projects.length > 0 ||
    employees.length > 0 || items.length > 0 || salesOrders.length > 0 ||
    leads.length > 0 || opportunities.length > 0 || tasks.length > 0 ||
    quotes.length > 0 || deliveryNotes.length > 0 || purchaseOrders.length > 0 ||
    apInvoices.length > 0 || incomingPayments.length > 0 || goodsReceipts.length > 0 ||
    arCreditMemos.length > 0 || apCreditMemos.length > 0 ||
    journalEntries.length > 0 || approvalRequests.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Module filter bar */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b overflow-x-auto">
        {MODULE_FILTERS.map(m => (
          <Button
            key={m.key}
            variant={moduleFilter === m.key ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] gap-1 px-2 shrink-0"
            onClick={() => setModuleFilter(m.key)}
          >
            <m.icon className="h-3 w-3" />
            {m.label}
          </Button>
        ))}
        <div className="flex-1" />
        {search.length >= 2 && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 shrink-0" onClick={handleSaveSearch}>
            <Bookmark className="h-3 w-3" /> Save
          </Button>
        )}
        {savedSearches.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 shrink-0" onClick={() => setShowSaved(!showSaved)}>
            <BookmarkCheck className="h-3 w-3" /> Saved
          </Button>
        )}
      </div>

      <CommandInput
        placeholder="Search pages, documents, partners, items, employees... (Ctrl+K)"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[500px]">
        <CommandEmpty>No results found. Try different keywords or change the module filter.</CommandEmpty>

        {/* Saved searches dropdown */}
        {showSaved && savedSearches.length > 0 && (
          <CommandGroup heading="Saved Searches">
            {savedSearches.map(s => (
              <CommandItem key={s.id} value={`saved-${s.query}`} onSelect={() => handleLoadSavedSearch(s.query, s.module)}>
                <BookmarkCheck className="mr-2 h-4 w-4 text-primary" />
                <span>{s.query}</span>
                <Badge variant="outline" className="ml-auto text-[9px]">{s.module}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={(e) => {
                  e.stopPropagation();
                  removeSavedSearch(s.id);
                  setSavedSearches(getSavedSearches());
                }}>
                  <X className="h-3 w-3" />
                </Button>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Dynamic Command Actions (verbs registered by mounted modules) */}
        {!showSaved && filteredDynamicActions.length > 0 && (
          <CommandGroup heading="🎯 Actions">
            {filteredDynamicActions.map(a => (
              <CommandItem
                key={a.id}
                value={`cmdaction-${a.id}-${a.label}`}
                onSelect={async () => {
                  onOpenChange(false);
                  try { await a.perform(); } catch (err) { console.error('[CommandAction]', a.id, err); }
                }}
                className={a.destructive ? 'text-destructive' : undefined}
              >
                <a.icon className={`mr-2 h-4 w-4 ${a.destructive ? 'text-destructive' : 'text-primary'}`} />
                <span>{a.label}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px]">{a.group}</Badge>
                  {a.shortcut && <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">{a.shortcut}</kbd>}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        {!search && !showSaved && (
          <CommandGroup heading="⚡ Quick Actions">
            {filteredQuickActions.slice(0, 6).map(a => (
              <CommandItem key={a.href} value={`action-${a.label}`} onSelect={() => handleSelect(a.href, a.label, a.group)}>
                <a.icon className="mr-2 h-4 w-4 text-primary" />
                <span>{a.label}</span>
                <Badge variant="secondary" className="ml-auto text-[9px]">{a.action}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent searches */}
        {!search && !showSaved && recentItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recentItems.slice(0, 6).map((r, i) => (
                <CommandItem key={`recent-${i}`} value={`recent-${r.label}`} onSelect={() => handleSelect(r.href, r.label, r.group)}>
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{r.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{r.group}</span>
                </CommandItem>
              ))}
              <CommandItem value="clear-recent" onSelect={() => { clearRecent(); setRecentItems([]); }}>
                <X className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Clear recent items</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* ─── Master Data Results ─── */}
        {partners.length > 0 && (
          <CommandGroup heading="Customers & Vendors">
            {partners.map((p: any) => (
              <CommandItem key={p.id} value={`partner-${p.card_name}-${p.card_code}`} onSelect={() => handleSelect('/business-partners', p.card_name, 'Customer')}>
                <Users className="mr-2 h-4 w-4 text-primary" />
                <span>{p.card_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.card_code} • {p.card_type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {items.length > 0 && (
          <CommandGroup heading="Items">
            {items.map((it: any) => (
              <CommandItem key={it.id} value={`item-${it.item_name}-${it.item_code}`} onSelect={() => handleSelect('/items', it.item_name, 'Item')}>
                <Package className="mr-2 h-4 w-4 text-primary" />
                <span>{it.item_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{it.item_code}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {employees.length > 0 && (
          <CommandGroup heading="Employees">
            {employees.map((e: any) => (
              <CommandItem key={e.id} value={`emp-${e.first_name} ${e.last_name}`} onSelect={() => handleSelect('/hr/employees', `${e.first_name} ${e.last_name}`, 'Employee')}>
                <UserCog className="mr-2 h-4 w-4 text-primary" />
                <span>{e.first_name} {e.last_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.employee_id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Transaction Documents ─── */}
        {quotes.length > 0 && (
          <CommandGroup heading="Quotes">
            {quotes.map((q: any) => (
              <CommandItem key={q.id} value={`qt-${q.doc_num}-${q.customer_name}`} onSelect={() => handleSelect('/quotes', `QT-${q.doc_num}`, 'Quote')}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-500" />
                <span>QT-{q.doc_num} — {q.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {q.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {salesOrders.length > 0 && (
          <CommandGroup heading="Sales Orders">
            {salesOrders.map((so: any) => (
              <CommandItem key={so.id} value={`so-${so.doc_num}-${so.customer_name}`} onSelect={() => handleSelect('/sales-orders', `SO-${so.doc_num}`, 'Sales Order')}>
                <FileText className="mr-2 h-4 w-4 text-green-500" />
                <span>SO-{so.doc_num} — {so.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {so.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {deliveryNotes.length > 0 && (
          <CommandGroup heading="Delivery Notes">
            {deliveryNotes.map((dn: any) => (
              <CommandItem key={dn.id} value={`dn-${dn.doc_num}-${dn.customer_name}`} onSelect={() => handleSelect('/delivery-notes', `DN-${dn.doc_num}`, 'Delivery Note')}>
                <Truck className="mr-2 h-4 w-4 text-orange-500" />
                <span>DN-{dn.doc_num} — {dn.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {dn.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {invoices.length > 0 && (
          <CommandGroup heading="AR Invoices">
            {invoices.map((inv: any) => (
              <CommandItem key={inv.id} value={`inv-${inv.doc_num}-${inv.customer_name}`} onSelect={() => handleSelect('/ar-invoices', `INV-${inv.doc_num}`, 'Invoice')}>
                <Receipt className="mr-2 h-4 w-4 text-purple-500" />
                <span>INV-{inv.doc_num} — {inv.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {inv.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {arCreditMemos.length > 0 && (
          <CommandGroup heading="AR Credit Memos">
            {arCreditMemos.map((cm: any) => (
              <CommandItem key={cm.id} value={`arcm-${cm.doc_num}-${cm.customer_name}`} onSelect={() => handleSelect('/ar-credit-memos', `CM-${cm.doc_num}`, 'AR Credit Memo')}>
                <FileX className="mr-2 h-4 w-4 text-red-500" />
                <span>CM-{cm.doc_num} — {cm.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {cm.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {incomingPayments.length > 0 && (
          <CommandGroup heading="Incoming Payments">
            {incomingPayments.map((ip: any) => (
              <CommandItem key={ip.id} value={`ip-${ip.doc_num}-${ip.customer_name}`} onSelect={() => handleSelect('/incoming-payments', `PAY-${ip.doc_num}`, 'Incoming Payment')}>
                <CreditCard className="mr-2 h-4 w-4 text-emerald-500" />
                <span>PAY-{ip.doc_num} — {ip.customer_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {ip.total_amount?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {purchaseOrders.length > 0 && (
          <CommandGroup heading="Purchase Orders">
            {purchaseOrders.map((po: any) => (
              <CommandItem key={po.id} value={`po-${po.doc_num}-${po.vendor_name}`} onSelect={() => handleSelect('/procurement?tab=po', `PO-${po.doc_num}`, 'Purchase Order')}>
                <ShoppingCart className="mr-2 h-4 w-4 text-violet-500" />
                <span>PO-{po.doc_num} — {po.vendor_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {po.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {goodsReceipts.length > 0 && (
          <CommandGroup heading="Goods Receipts">
            {goodsReceipts.map((gr: any) => (
              <CommandItem key={gr.id} value={`gr-${gr.doc_num}-${gr.vendor_name}`} onSelect={() => handleSelect('/procurement?tab=grpo', `GR-${gr.doc_num}`, 'Goods Receipt')}>
                <PackagePlus className="mr-2 h-4 w-4 text-teal-500" />
                <span>GR-{gr.doc_num} — {gr.vendor_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {gr.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {apInvoices.length > 0 && (
          <CommandGroup heading="AP Invoices">
            {apInvoices.map((ap: any) => (
              <CommandItem key={ap.id} value={`ap-${ap.invoice_number}-${ap.vendor_name}`} onSelect={() => handleSelect('/procurement?tab=ap', ap.invoice_number, 'AP Invoice')}>
                <Receipt className="mr-2 h-4 w-4 text-rose-500" />
                <span>{ap.invoice_number} — {ap.vendor_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {ap.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {apCreditMemos.length > 0 && (
          <CommandGroup heading="AP Credit Memos">
            {apCreditMemos.map((cm: any) => (
              <CommandItem key={cm.id} value={`apcm-${cm.doc_num}-${cm.vendor_name}`} onSelect={() => handleSelect('/procurement?tab=ap', `APCM-${cm.doc_num}`, 'AP Credit Memo')}>
                <FileX className="mr-2 h-4 w-4 text-pink-500" />
                <span>APCM-{cm.doc_num} — {cm.vendor_name}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {cm.total?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Journal Entries ─── */}
        {journalEntries.length > 0 && (
          <CommandGroup heading="Journal Entries">
            {journalEntries.map((je: any) => (
              <CommandItem key={je.id} value={`je-${je.je_number}-${je.reference || ''}`} onSelect={() => handleSelect('/general-ledger', je.je_number, 'Journal Entry')}>
                <BookOpen className="mr-2 h-4 w-4 text-indigo-500" />
                <span>{je.je_number} {je.reference ? `— ${je.reference}` : ''}</span>
                <span className="ml-auto text-xs text-muted-foreground">SAR {je.total_debit?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Approval Requests ─── */}
        {approvalRequests.length > 0 && (
          <CommandGroup heading="Approval Requests">
            {approvalRequests.map((ar: any) => (
              <CommandItem key={ar.id} value={`ar-${ar.document_number}-${ar.document_type}`} onSelect={() => handleSelect('/approval-inbox', ar.document_number || ar.document_type, 'Approval')}>
                <Stamp className="mr-2 h-4 w-4 text-amber-500" />
                <span>{ar.document_number || ar.document_type} — {ar.requester_name}</span>
                <Badge variant={ar.status === 'pending' ? 'default' : 'secondary'} className="ml-auto text-[9px]">{ar.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── CRM Records ─── */}
        {leads.length > 0 && (
          <CommandGroup heading="Leads">
            {leads.map((l: any) => (
              <CommandItem key={l.id} value={`lead-${l.name}`} onSelect={() => handleSelect('/leads', l.name, 'Lead')}>
                <Target className="mr-2 h-4 w-4 text-primary" />
                <span>{l.name}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{l.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {opportunities.length > 0 && (
          <CommandGroup heading="Opportunities">
            {opportunities.map((o: any) => (
              <CommandItem key={o.id} value={`opp-${o.name}`} onSelect={() => handleSelect(`/opportunities/${o.id}`, o.name, 'Opportunity')}>
                <Briefcase className="mr-2 h-4 w-4 text-amber-500" />
                <span>{o.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{o.stage} • SAR {o.amount?.toLocaleString()}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p: any) => (
              <CommandItem key={p.id} value={`proj-${p.name}`} onSelect={() => handleSelect('/pm/projects', p.name, 'Project')}>
                <FolderKanban className="mr-2 h-4 w-4 text-primary" />
                <span>{p.name}</span>
                <Badge variant="outline" className="ml-auto text-[10px] capitalize">{p.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks.length > 0 && (
          <CommandGroup heading="Tasks & Activities">
            {tasks.map((t: any) => (
              <CommandItem key={t.id} value={`task-${t.subject}`} onSelect={() => handleSelect('/tasks', t.subject, 'Task')}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span>{t.subject}</span>
                <Badge variant="outline" className="ml-auto text-[10px]">{t.type} • {t.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasDbResults && <CommandSeparator />}

        {/* ─── Pages & Modules (grouped) ─── */}
        {Object.entries(groupedPages).map(([group, pages]) => (
          <CommandGroup key={group} heading={group}>
            {pages.slice(0, search ? 10 : 4).map((page) => (
              <CommandItem key={page.href} value={`page-${page.group}-${page.label}`} onSelect={() => handleSelect(page.href, page.label, page.group)}>
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{page.label}</span>
                {!search && <span className="ml-auto text-xs text-muted-foreground">{page.group}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-between px-3 py-2 border-t text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">↑↓</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">↵</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Esc</kbd> Close</span>
        </div>
        <div className="flex items-center gap-2">
          {moduleFilter !== 'all' && (
            <Badge variant="secondary" className="text-[9px]">
              <Filter className="h-2.5 w-2.5 mr-0.5" />{MODULE_FILTERS.find(m => m.key === moduleFilter)?.label}
            </Badge>
          )}
          <span>Ctrl+K to open anytime</span>
        </div>
      </div>
    </CommandDialog>
  );
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
