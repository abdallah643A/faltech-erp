import { useLocation } from 'react-router-dom';
import { useSettingsService } from '@/hooks/useSettingsService';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { AdminPageLayout, AdminSection, SettingField } from '@/components/admin/AdminPageLayout';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target, DollarSign, ShoppingCart, Users, Landmark, Package, Wrench, Headphones,
  Building2, Layers, Factory, Globe, FileText, Settings
} from 'lucide-react';

interface ModuleConfig {
  title: string;
  titleAr: string;
  icon: any;
  description: string;
  settingsGroup: string;
  affectedModules: string[];
  sections: {
    name: string;
    description?: string;
    badge?: string;
    fields: {
      label: string;
      key: string;
      type: 'text' | 'number' | 'switch' | 'select';
      options?: { value: string; label: string }[];
      help?: string;
      effect?: string;
      required?: boolean;
    }[];
  }[];
}

const configs: Record<string, ModuleConfig> = {
  '/setup/opportunities': {
    title: 'Opportunities Setup', titleAr: 'إعداد الفرص', icon: Target,
    description: 'CRM pipeline, stages, probabilities, and forecast configuration',
    settingsGroup: 'setup_opportunities', affectedModules: ['CRM', 'Sales', 'Forecasting'],
    sections: [
      { name: 'Sales Pipeline', description: 'Configure opportunity lifecycle and sales funnel', fields: [
        { label: 'Default Pipeline', key: 'default_pipeline', type: 'select', options: [{ value: 'standard', label: 'Standard' }, { value: 'enterprise', label: 'Enterprise' }, { value: 'smb', label: 'SMB' }], effect: 'future_transactions' },
        { label: 'Auto-calculate Probability', key: 'auto_calc_probability', type: 'switch', help: 'Automatically set probability based on stage', effect: 'immediate' },
        { label: 'Forecast Categories Enabled', key: 'forecast_categories', type: 'switch', effect: 'immediate' },
        { label: 'Default Expected Duration (days)', key: 'default_duration', type: 'number', help: 'Default expected close duration', effect: 'future_transactions' },
      ]},
      { name: 'Win/Loss Tracking', description: 'Controls for opportunity closure analysis', fields: [
        { label: 'Mandatory Win/Loss Reason', key: 'mandatory_winloss_reason', type: 'switch', help: 'Require reason when closing opportunities', effect: 'immediate' },
        { label: 'Competitor Tracking Enabled', key: 'competitor_tracking', type: 'switch', effect: 'immediate' },
        { label: 'Alert for Overdue Opportunities', key: 'overdue_alerts', type: 'switch', help: 'Notify owner when opportunity exceeds expected duration', effect: 'immediate' },
        { label: 'Lead Source Mandatory', key: 'lead_source_mandatory', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'Activity Defaults', fields: [
        { label: 'Default Activity Template', key: 'default_activity_template', type: 'select', options: [{ value: 'none', label: 'None' }, { value: 'first_contact', label: 'First Contact' }, { value: 'follow_up', label: 'Follow-up' }], effect: 'future_transactions' },
        { label: 'Auto-Create Activity on Stage Change', key: 'auto_activity_stage', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/sales': {
    title: 'Sales Setup', titleAr: 'إعداد المبيعات', icon: DollarSign,
    description: 'Sales cycle defaults, pricing, credit control, delivery, and approval rules',
    settingsGroup: 'setup_sales', affectedModules: ['Sales', 'AR', 'Inventory', 'Approval'],
    sections: [
      { name: 'Document Defaults', description: 'Default values for new sales documents', fields: [
        { label: 'Default Quotation Validity (days)', key: 'quotation_validity', type: 'number', effect: 'future_transactions' },
        { label: 'Default Sales Employee', key: 'default_sales_employee', type: 'select', options: [{ value: 'auto', label: 'Auto-assign' }, { value: 'manual', label: 'Manual' }], effect: 'future_transactions' },
        { label: 'Default Warehouse', key: 'default_sales_warehouse', type: 'select', options: [{ value: 'main', label: 'Main Warehouse' }, { value: 'sales', label: 'Sales WH' }], effect: 'future_transactions' },
        { label: 'Default Price List', key: 'default_price_list', type: 'select', options: [{ value: 'standard', label: 'Standard' }, { value: 'wholesale', label: 'Wholesale' }, { value: 'retail', label: 'Retail' }], effect: 'future_transactions' },
      ]},
      { name: 'Credit Control', badge: 'Critical', description: 'How the system enforces customer credit limits', fields: [
        { label: 'Credit Limit Enforcement', key: 'credit_limit_enforcement', type: 'select', options: [{ value: 'disabled', label: 'Disabled' }, { value: 'warning', label: 'Warning' }, { value: 'block', label: 'Block' }], effect: 'immediate', help: 'Controls behavior when customer exceeds credit limit' },
        { label: 'Customer Aging Check', key: 'aging_check', type: 'switch', help: 'Check customer aging before accepting orders', effect: 'immediate' },
        { label: 'Negative Margin Warning', key: 'negative_margin_warning', type: 'select', options: [{ value: 'none', label: 'No Warning' }, { value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block' }], effect: 'immediate' },
      ]},
      { name: 'Delivery & Returns', fields: [
        { label: 'Partial Delivery Allowed', key: 'partial_delivery', type: 'switch', effect: 'immediate' },
        { label: 'Freight Mandatory', key: 'freight_mandatory', type: 'switch', effect: 'immediate' },
        { label: 'Return Request Workflow Required', key: 'return_workflow_required', type: 'switch', help: 'Require approval before processing returns', effect: 'immediate' },
      ]},
      { name: 'Approval Rules', description: 'Sales-specific approval thresholds', fields: [
        { label: 'Approval Required Above Amount', key: 'approval_threshold', type: 'number', help: 'Sales orders above this amount require approval', effect: 'immediate' },
        { label: 'Discount Authorization Required', key: 'discount_auth_required', type: 'switch', help: 'Discounts beyond limit need manager approval', effect: 'immediate' },
        { label: 'Customer Reference Uniqueness', key: 'customer_ref_unique', type: 'select', options: [{ value: 'none', label: 'No Check' }, { value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block Duplicate' }], effect: 'immediate' },
      ]},
    ],
  },
  '/setup/purchasing': {
    title: 'Purchasing Setup', titleAr: 'إعداد المشتريات', icon: ShoppingCart,
    description: 'Procurement configuration, matching rules, tolerance, and landed costs',
    settingsGroup: 'setup_purchasing', affectedModules: ['Purchasing', 'AP', 'Inventory', 'Approval'],
    sections: [
      { name: 'Document Defaults', fields: [
        { label: 'Default Purchase Warehouse', key: 'default_purchase_wh', type: 'select', options: [{ value: 'main', label: 'Main Warehouse' }, { value: 'purchasing', label: 'Purchasing WH' }], effect: 'future_transactions' },
        { label: 'Default Buyer Assignment', key: 'default_buyer', type: 'select', options: [{ value: 'auto', label: 'Auto-assign' }, { value: 'manual', label: 'Manual' }], effect: 'future_transactions' },
        { label: 'Supplier Catalog Usage', key: 'supplier_catalog', type: 'switch', help: 'Use supplier item catalogs for pricing', effect: 'immediate' },
      ]},
      { name: 'Matching & Tolerance', badge: 'Critical', description: 'PO to GRPO to AP Invoice matching rules', fields: [
        { label: 'Matching Method', key: 'matching_method', type: 'select', options: [{ value: '2way', label: '2-Way (PO ↔ Invoice)' }, { value: '3way', label: '3-Way (PO ↔ GRPO ↔ Invoice)' }], effect: 'immediate', required: true },
        { label: 'Price Deviation Tolerance (%)', key: 'price_tolerance', type: 'number', help: 'Allow price variance up to this %', effect: 'immediate' },
        { label: 'Quantity Tolerance (%)', key: 'qty_tolerance', type: 'number', help: 'Allow quantity variance up to this %', effect: 'immediate' },
        { label: 'Base Document Matching Mandatory', key: 'base_doc_matching', type: 'switch', help: 'Require AP invoice to reference GRPO/PO', effect: 'immediate' },
      ]},
      { name: 'Landed Costs', fields: [
        { label: 'Landed Cost Allocation Method', key: 'landed_cost_method', type: 'select', options: [{ value: 'quantity', label: 'By Quantity' }, { value: 'value', label: 'By Value' }, { value: 'volume', label: 'By Volume' }, { value: 'weight', label: 'By Weight' }], effect: 'future_transactions' },
        { label: 'Auto-Create AP from GRPO', key: 'auto_ap_from_grpo', type: 'switch', help: 'Automatically generate AP invoice from Goods Receipt', effect: 'future_transactions' },
      ]},
      { name: 'Supplier Rules', fields: [
        { label: 'Blocked Supplier Behavior', key: 'blocked_supplier_behavior', type: 'select', options: [{ value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block All Transactions' }], effect: 'immediate' },
        { label: 'Supplier Lead Time Default (days)', key: 'supplier_lead_time', type: 'number', effect: 'future_transactions' },
        { label: 'Approval Threshold by PO Value', key: 'po_approval_threshold', type: 'number', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/business-partners': {
    title: 'Business Partners Setup', titleAr: 'إعداد شركاء الأعمال', icon: Users,
    description: 'Customer, vendor, and lead master data creation and maintenance rules',
    settingsGroup: 'setup_bp', affectedModules: ['Sales', 'Purchasing', 'Finance'],
    sections: [
      { name: 'Master Data Defaults', fields: [
        { label: 'Auto-Numbering for BP Codes', key: 'auto_bp_numbering', type: 'switch', effect: 'immediate' },
        { label: 'Separate Numbering by Type', key: 'separate_numbering', type: 'switch', help: 'Different series for Customer/Vendor/Lead', effect: 'immediate' },
        { label: 'Group Mandatory', key: 'group_mandatory', type: 'switch', effect: 'immediate' },
        { label: 'Territory Mandatory', key: 'territory_mandatory', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'Credit & Risk', fields: [
        { label: 'Default Payment Terms', key: 'default_payment_terms', type: 'select', options: [{ value: 'net30', label: 'Net 30' }, { value: 'net60', label: 'Net 60' }, { value: 'cod', label: 'COD' }], effect: 'future_transactions' },
        { label: 'Credit Limit Control', key: 'credit_limit_control', type: 'select', options: [{ value: 'none', label: 'No Control' }, { value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block' }], effect: 'immediate' },
        { label: 'Risk Classification Model', key: 'risk_model', type: 'select', options: [{ value: 'none', label: 'None' }, { value: 'simple', label: 'Simple (Low/Med/High)' }, { value: 'scoring', label: 'Risk Score' }], effect: 'immediate' },
      ]},
      { name: 'Validation Rules', fields: [
        { label: 'Duplicate Tax Number Check', key: 'dup_tax_check', type: 'select', options: [{ value: 'none', label: 'No Check' }, { value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block' }], effect: 'immediate' },
        { label: 'Mandatory Address Fields', key: 'mandatory_address', type: 'switch', help: 'Require city, country, and postal code', effect: 'immediate' },
        { label: 'Multiple Contacts Required', key: 'multi_contacts_required', type: 'switch', effect: 'immediate' },
        { label: 'Inactive BP Auto-Archive (days)', key: 'inactive_archive_days', type: 'number', help: '0 = no auto-archive', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/banking': {
    title: 'Banking Setup', titleAr: 'إعداد البنوك', icon: Landmark,
    description: 'House banks, payment methods, reconciliation, and cash flow configuration',
    settingsGroup: 'setup_banking', affectedModules: ['Treasury', 'AP', 'AR', 'Reconciliation'],
    sections: [
      { name: 'House Banks & Payment Methods', fields: [
        { label: 'Default House Bank', key: 'default_house_bank', type: 'text', effect: 'future_transactions' },
        { label: 'Outgoing Payment Method', key: 'outgoing_payment_method', type: 'select', options: [{ value: 'check', label: 'Check' }, { value: 'wire', label: 'Wire Transfer' }, { value: 'ach', label: 'ACH' }], effect: 'future_transactions' },
        { label: 'Incoming Payment Method', key: 'incoming_payment_method', type: 'select', options: [{ value: 'check', label: 'Check' }, { value: 'wire', label: 'Wire Transfer' }, { value: 'cash', label: 'Cash' }], effect: 'future_transactions' },
        { label: 'Approval Required for Payment Runs', key: 'payment_run_approval', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'Check Management', fields: [
        { label: 'Check Numbering', key: 'check_numbering', type: 'select', options: [{ value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' }], effect: 'immediate' },
        { label: 'Postdated Check Handling', key: 'postdated_check', type: 'select', options: [{ value: 'standard', label: 'Standard' }, { value: 'separate_ledger', label: 'Separate Ledger' }], effect: 'immediate' },
      ]},
      { name: 'Reconciliation', fields: [
        { label: 'Auto Bank Reconciliation Rules', key: 'auto_recon_rules', type: 'switch', help: 'Enable fuzzy matching for bank statement reconciliation', effect: 'immediate' },
        { label: 'Bank Statement Import Format', key: 'statement_format', type: 'select', options: [{ value: 'mt940', label: 'MT940' }, { value: 'csv', label: 'CSV' }, { value: 'ofx', label: 'OFX' }], effect: 'immediate' },
      ]},
    ],
  },
  '/setup/inventory': {
    title: 'Inventory Setup', titleAr: 'إعداد المخزون', icon: Package,
    description: 'Warehouse, costing, valuation, bin locations, batch/serial, and reorder controls',
    settingsGroup: 'setup_inventory', affectedModules: ['Inventory', 'Sales', 'Purchasing', 'Production', 'Finance'],
    sections: [
      { name: 'Warehouse & Stock', fields: [
        { label: 'Default Warehouse', key: 'default_warehouse', type: 'text', effect: 'future_transactions', required: true },
        { label: 'Negative Inventory Allowed', key: 'negative_inventory', type: 'select', options: [{ value: 'none', label: 'Not Allowed' }, { value: 'warn', label: 'Warning' }, { value: 'allow', label: 'Allow' }], effect: 'immediate' },
        { label: 'Bin Locations Enabled', key: 'bin_locations', type: 'switch', help: 'Enable warehouse bin management', effect: 'immediate' },
        { label: 'Mandatory Bin by Warehouse', key: 'mandatory_bin', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'Costing & Valuation', badge: 'Critical', description: 'Cannot be changed after go-live without migration', fields: [
        { label: 'Costing Method', key: 'costing_method', type: 'select', options: [{ value: 'moving_avg', label: 'Moving Average' }, { value: 'fifo', label: 'FIFO' }, { value: 'standard', label: 'Standard Cost' }], effect: 'future_transactions', required: true },
        { label: 'Inventory Valuation Method', key: 'valuation_method', type: 'select', options: [{ value: 'perpetual', label: 'Perpetual' }, { value: 'periodic', label: 'Periodic' }], effect: 'future_transactions', required: true },
      ]},
      { name: 'Batch/Serial Control', fields: [
        { label: 'Batch Management Required', key: 'batch_required', type: 'switch', effect: 'future_transactions' },
        { label: 'Serial Number Generation', key: 'serial_generation', type: 'select', options: [{ value: 'manual', label: 'Manual' }, { value: 'auto', label: 'Automatic' }], effect: 'immediate' },
      ]},
      { name: 'Planning & Counting', fields: [
        { label: 'Reorder Calculation Basis', key: 'reorder_basis', type: 'select', options: [{ value: 'min_max', label: 'Min-Max' }, { value: 'rop', label: 'Reorder Point' }, { value: 'mps', label: 'MPS' }], effect: 'immediate' },
        { label: 'Cycle Count Frequency', key: 'cycle_count_freq', type: 'select', options: [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }], effect: 'immediate' },
        { label: 'Stock Transfer Approval Required', key: 'transfer_approval', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/resources': {
    title: 'Resources Setup', titleAr: 'إعداد الموارد', icon: Wrench,
    description: 'Non-human resources: machines, equipment, rooms, tools',
    settingsGroup: 'setup_resources', affectedModules: ['Production', 'Service', 'Projects'],
    sections: [
      { name: 'Resource Types & Capacity', fields: [
        { label: 'Resource Code Series', key: 'resource_code_series', type: 'text', effect: 'future_transactions' },
        { label: 'Default Unit of Measure', key: 'default_uom', type: 'select', options: [{ value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' }, { value: 'unit', label: 'Unit' }], effect: 'future_transactions' },
        { label: 'Booking Conflict Rules', key: 'booking_conflict', type: 'select', options: [{ value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block' }], effect: 'immediate' },
        { label: 'Utilization Threshold (%)', key: 'utilization_threshold', type: 'number', help: 'Alert when resource exceeds this utilization', effect: 'immediate' },
      ]},
      { name: 'Cost Rates', fields: [
        { label: 'Default Hourly Cost Rate', key: 'hourly_rate', type: 'number', effect: 'future_transactions' },
        { label: 'Overtime Cost Rate Multiplier', key: 'overtime_multiplier', type: 'number', help: 'e.g. 1.5 = 150% of hourly rate', effect: 'future_transactions' },
        { label: 'Project Assignment Allowed', key: 'project_assignment', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/service': {
    title: 'Service Setup', titleAr: 'إعداد الخدمات', icon: Headphones,
    description: 'After-sales service, warranties, SLA, technician dispatch, and escalation',
    settingsGroup: 'setup_service', affectedModules: ['Service', 'CRM', 'Inventory'],
    sections: [
      { name: 'Service Calls', fields: [
        { label: 'Service Call Numbering', key: 'service_numbering', type: 'select', options: [{ value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' }], effect: 'immediate' },
        { label: 'Default Priority', key: 'default_priority', type: 'select', options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }], effect: 'future_transactions' },
        { label: 'Closure Code Mandatory', key: 'closure_code_mandatory', type: 'switch', effect: 'immediate' },
        { label: 'Customer Equipment Tracking', key: 'equipment_tracking', type: 'switch', help: 'Track equipment linked to customers', effect: 'immediate' },
      ]},
      { name: 'SLA & Warranty', fields: [
        { label: 'SLA Response Time (hours)', key: 'sla_response_hours', type: 'number', effect: 'immediate' },
        { label: 'Warranty Validation Required', key: 'warranty_validation', type: 'switch', help: 'Check warranty before service call', effect: 'immediate' },
        { label: 'Contract Renewal Reminder (days)', key: 'renewal_reminder_days', type: 'number', effect: 'immediate' },
        { label: 'Escalation Threshold (hours)', key: 'escalation_hours', type: 'number', help: 'Escalate if not resolved within', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/human-resources': {
    title: 'Human Resources Setup', titleAr: 'إعداد الموارد البشرية', icon: Users,
    description: 'Employee master, attendance, leave, payroll, and compliance defaults',
    settingsGroup: 'setup_hr', affectedModules: ['HR', 'Payroll', 'Finance'],
    sections: [
      { name: 'Employee Master', fields: [
        { label: 'Employee Code Numbering', key: 'emp_code_numbering', type: 'select', options: [{ value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' }], effect: 'immediate' },
        { label: 'Branch/Department Mandatory', key: 'branch_dept_mandatory', type: 'switch', effect: 'immediate' },
        { label: 'Probation Period Default (days)', key: 'probation_days', type: 'number', effect: 'future_transactions' },
        { label: 'Employee Self-Service Enabled', key: 'self_service', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'Attendance & Leave', fields: [
        { label: 'Default Working Calendar', key: 'working_calendar', type: 'select', options: [{ value: 'sun_thu', label: 'Sun-Thu' }, { value: 'mon_fri', label: 'Mon-Fri' }], effect: 'immediate' },
        { label: 'Overtime Approval Required', key: 'overtime_approval', type: 'switch', effect: 'immediate' },
        { label: 'Leave Accrual Method', key: 'leave_accrual', type: 'select', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }], effect: 'future_transactions' },
      ]},
      { name: 'Payroll & Compliance', fields: [
        { label: 'Payroll Frequency', key: 'payroll_frequency', type: 'select', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'bi_weekly', label: 'Bi-weekly' }], effect: 'future_transactions' },
        { label: 'Payroll Posting Method', key: 'payroll_posting', type: 'select', options: [{ value: 'single_je', label: 'Single JE' }, { value: 'per_employee', label: 'Per Employee JE' }], effect: 'future_transactions' },
        { label: 'Document Expiry Alerts (days)', key: 'doc_expiry_alert_days', type: 'number', help: 'Alert before employee documents expire', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/project-management': {
    title: 'Project Management Setup', titleAr: 'إعداد إدارة المشاريع', icon: Layers,
    description: 'Project codes, phases, cost control, billing, and governance',
    settingsGroup: 'setup_projects', affectedModules: ['Projects', 'Finance', 'HR'],
    sections: [
      { name: 'Project Structure', fields: [
        { label: 'Project Code Series', key: 'project_code_series', type: 'text', effect: 'future_transactions' },
        { label: 'Mandatory Phase Structure', key: 'mandatory_phases', type: 'switch', effect: 'immediate' },
        { label: 'Budget Baseline Required', key: 'budget_baseline', type: 'switch', help: 'Require approved budget before project starts', effect: 'immediate' },
        { label: 'Project Code Mandatory in Transactions', key: 'project_mandatory_tx', type: 'switch', help: 'Require project code on all financial documents', effect: 'immediate' },
      ]},
      { name: 'Billing & Cost', fields: [
        { label: 'Progress Billing Enabled', key: 'progress_billing', type: 'switch', effect: 'immediate' },
        { label: 'Retention Rules', key: 'retention_rules', type: 'switch', effect: 'future_transactions' },
        { label: 'Time Entry Approval Required', key: 'time_entry_approval', type: 'switch', effect: 'immediate' },
        { label: 'Expense Claim Approval Required', key: 'expense_approval', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/production': {
    title: 'Production Setup', titleAr: 'إعداد الإنتاج', icon: Factory,
    description: 'Manufacturing control: production orders, BOM, routing, quality, MRP',
    settingsGroup: 'setup_production', affectedModules: ['Production', 'Inventory', 'Finance'],
    sections: [
      { name: 'Production Order Defaults', fields: [
        { label: 'Production Order Numbering', key: 'prod_order_numbering', type: 'select', options: [{ value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' }], effect: 'immediate' },
        { label: 'Default Issue Method', key: 'issue_method', type: 'select', options: [{ value: 'manual', label: 'Manual' }, { value: 'backflush', label: 'Backflush' }], effect: 'future_transactions', required: true },
        { label: 'Backflush Enabled', key: 'backflush_enabled', type: 'switch', effect: 'immediate' },
        { label: 'Scrap Percentage Default', key: 'scrap_pct', type: 'number', effect: 'future_transactions' },
      ]},
      { name: 'Quality & Routing', fields: [
        { label: 'Routing Mandatory', key: 'routing_mandatory', type: 'switch', effect: 'immediate' },
        { label: 'Quality Inspection at Receipt', key: 'quality_at_receipt', type: 'switch', effect: 'immediate' },
        { label: 'Quality Inspection at Production', key: 'quality_at_production', type: 'switch', effect: 'immediate' },
      ]},
      { name: 'MRP & Planning', fields: [
        { label: 'MRP Horizon (days)', key: 'mrp_horizon', type: 'number', effect: 'immediate' },
        { label: 'Planning Method', key: 'planning_method', type: 'select', options: [{ value: 'mrp', label: 'MRP' }, { value: 'mps', label: 'MPS' }, { value: 'manual', label: 'Manual' }], effect: 'immediate' },
        { label: 'Capacity Planning Enabled', key: 'capacity_planning', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/users-branches': {
    title: 'Users Branches Setup', titleAr: 'إعداد فروع المستخدمين', icon: Building2,
    description: 'User branch assignment, cross-branch access, and transaction visibility',
    settingsGroup: 'setup_user_branches', affectedModules: ['All Modules'],
    sections: [
      { name: 'Branch Assignment Rules', fields: [
        { label: 'Multi-Branch Assignment', key: 'multi_branch_assignment', type: 'switch', help: 'Allow users to be assigned to multiple branches', effect: 'immediate' },
        { label: 'Default Branch Auto-Set', key: 'auto_default_branch', type: 'switch', help: 'Automatically set first assigned branch as default', effect: 'immediate' },
        { label: 'Restrict Posting by Branch', key: 'restrict_posting_branch', type: 'switch', help: 'Users can only post to assigned branches', effect: 'immediate' },
      ]},
      { name: 'Data Visibility', fields: [
        { label: 'Restrict Warehouse Access by Branch', key: 'restrict_warehouse_branch', type: 'switch', effect: 'immediate' },
        { label: 'Restrict BP Visibility by Branch', key: 'restrict_bp_branch', type: 'switch', help: 'Users only see customers/vendors in their branch', effect: 'immediate' },
        { label: 'Branch-Based Approval Authority', key: 'branch_approval_authority', type: 'switch', effect: 'immediate' },
        { label: 'Temporary Branch Delegation', key: 'temp_branch_delegation', type: 'switch', help: 'Allow temporary access to another branch', effect: 'immediate' },
      ]},
    ],
  },
  '/setup/electronic-documents': {
    title: 'Electronic Documents Setup', titleAr: 'إعداد المستندات الإلكترونية', icon: Globe,
    description: 'E-invoicing, regulatory profiles, XML/UBL, digital signatures, and compliance',
    settingsGroup: 'setup_edocuments', affectedModules: ['Sales', 'Finance', 'AP', 'AR'],
    sections: [
      { name: 'Regulatory Profile', fields: [
        { label: 'Country Localization', key: 'country_localization', type: 'select', options: [{ value: 'sa', label: 'Saudi Arabia (ZATCA)' }, { value: 'ae', label: 'UAE' }, { value: 'eg', label: 'Egypt' }], effect: 'immediate', required: true },
        { label: 'E-Invoice Format', key: 'einvoice_format', type: 'select', options: [{ value: 'xml_ubl', label: 'UBL 2.1 XML' }, { value: 'peppol', label: 'PEPPOL' }], effect: 'immediate' },
        { label: 'Digital Certificate Storage', key: 'cert_storage', type: 'select', options: [{ value: 'local', label: 'Local Vault' }, { value: 'hsm', label: 'HSM' }], effect: 'immediate' },
      ]},
      { name: 'Submission & Validation', fields: [
        { label: 'QR Code Generation', key: 'qr_code_enabled', type: 'switch', effect: 'immediate' },
        { label: 'Submission Retry Policy', key: 'submission_retry', type: 'select', options: [{ value: 'auto', label: 'Auto Retry (3x)' }, { value: 'manual', label: 'Manual Resubmit' }], effect: 'immediate' },
        { label: 'Rejection Handling Flow', key: 'rejection_flow', type: 'select', options: [{ value: 'draft', label: 'Revert to Draft' }, { value: 'correction', label: 'Create Correction Note' }], effect: 'immediate' },
        { label: 'Archive Retention (years)', key: 'archive_retention_years', type: 'number', help: 'Regulatory minimum retention period', effect: 'immediate' },
        { label: 'Signed PDF Generation', key: 'signed_pdf', type: 'switch', effect: 'immediate' },
      ]},
    ],
  },
};

export default function SetupModule() {
  const location = useLocation();
  const path = location.pathname;
  const config = configs[path];

  if (!config) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-semibold">Setup Module Not Found</h2>
        <p className="text-sm">The requested setup page is not configured.</p>
      </div>
    );
  }

  return <SetupModuleContent config={config} />;
}

function SetupModuleContent({ config }: { config: ModuleConfig }) {
  const s = useSettingsService(config.settingsGroup);
  const { entries: auditEntries } = useAuditTrail(config.settingsGroup);
  const Icon = config.icon;

  return (
    <AdminPageLayout
      title={config.title} titleAr={config.titleAr}
      description={config.description}
      icon={<Icon className="h-6 w-6" />} module={config.settingsGroup}
      isDirty={s.isDirty} isLoading={s.isLoading} isSaving={s.isSaving}
      onSave={() => s.save([])} onReset={s.reset} onResetToDefaults={() => s.resetToDefaults([])}
      changeSummary={s.getChangeSummary()} auditEntries={auditEntries}
      affectedModules={config.affectedModules}
    >
      <div className="space-y-4">
        {config.sections.map(section => (
          <AdminSection key={section.name} title={section.name} description={section.description} badge={section.badge}>
            {section.fields.map(field => (
              <SettingField key={field.key} label={field.label} helpText={field.help} error={s.validationErrors[field.key]} effectType={field.effect} required={field.required}>
                {field.type === 'switch' ? (
                  <Switch checked={s.getValue(field.key) === 'true'} onCheckedChange={v => s.setValue(field.key, v ? 'true' : 'false')} />
                ) : field.type === 'select' && field.options ? (
                  <Select value={s.getValue(field.key)} onValueChange={v => s.setValue(field.key, v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{field.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={s.getValue(field.key)}
                    onChange={e => s.setValue(field.key, e.target.value)}
                    className="h-8"
                  />
                )}
              </SettingField>
            ))}
          </AdminSection>
        ))}
      </div>
    </AdminPageLayout>
  );
}
