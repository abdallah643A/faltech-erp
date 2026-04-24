import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Database, Plus, CheckCircle2, AlertTriangle, Loader2, Copy, Download,
  Settings2, Code, Package, FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UDOField {
  name: string;
  type: string;
  size?: number;
  description: string;
}

interface UDODefinition {
  key: string;
  tableName: string;
  description: string;
  descriptionAr: string;
  fields: UDOField[];
}

interface ModuleGroup {
  module: string;
  moduleAr: string;
  icon: string;
  udos: UDODefinition[];
}

const MODULE_UDO_DEFINITIONS: ModuleGroup[] = [
  {
    module: 'CRM & Sales',
    moduleAr: 'إدارة العلاقات والمبيعات',
    icon: '💼',
    udos: [
      {
        key: 'leads', tableName: 'CRM_LEADS', description: 'CRM Leads Management',
        descriptionAr: 'إدارة العملاء المحتملين',
        fields: [
          { name: 'U_LeadName', type: 'db_Alpha', size: 200, description: 'Lead Name' },
          { name: 'U_Company', type: 'db_Alpha', size: 200, description: 'Company' },
          { name: 'U_Email', type: 'db_Alpha', size: 100, description: 'Email' },
          { name: 'U_Phone', type: 'db_Alpha', size: 50, description: 'Phone' },
          { name: 'U_Source', type: 'db_Alpha', size: 50, description: 'Lead Source' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_Score', type: 'db_Numeric', description: 'Lead Score' },
          { name: 'U_AssignedTo', type: 'db_Alpha', size: 100, description: 'Assigned To' },
        ],
      },
      {
        key: 'visits', tableName: 'CRM_VISITS', description: 'CRM Sales Visits',
        descriptionAr: 'زيارات المبيعات',
        fields: [
          { name: 'U_VisitDate', type: 'db_Date', description: 'Visit Date' },
          { name: 'U_CardCode', type: 'db_Alpha', size: 50, description: 'Business Partner Code' },
          { name: 'U_SalesRep', type: 'db_Alpha', size: 100, description: 'Sales Rep' },
          { name: 'U_Purpose', type: 'db_Alpha', size: 200, description: 'Visit Purpose' },
          { name: 'U_Notes', type: 'db_Alpha', size: 500, description: 'Notes' },
          { name: 'U_CheckInLat', type: 'db_Float', description: 'Check-in Latitude' },
          { name: 'U_CheckInLng', type: 'db_Float', description: 'Check-in Longitude' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'sales_targets', tableName: 'CRM_TARGETS', description: 'Sales Targets',
        descriptionAr: 'أهداف المبيعات',
        fields: [
          { name: 'U_SalesRepCode', type: 'db_Numeric', description: 'Sales Employee Code' },
          { name: 'U_Period', type: 'db_Alpha', size: 20, description: 'Period (Monthly/Quarterly)' },
          { name: 'U_TargetAmt', type: 'db_Float', description: 'Target Amount' },
          { name: 'U_ActualAmt', type: 'db_Float', description: 'Actual Amount' },
          { name: 'U_Year', type: 'db_Numeric', description: 'Year' },
          { name: 'U_Month', type: 'db_Numeric', description: 'Month' },
        ],
      },
    ],
  },
  {
    module: 'CPMS - Cost Management',
    moduleAr: 'إدارة التكاليف',
    icon: '📊',
    udos: [
      {
        key: 'cpms_budgets', tableName: 'CPMS_BUDGETS', description: 'CPMS Budget Management',
        descriptionAr: 'إدارة الميزانيات',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Name', type: 'db_Alpha', size: 200, description: 'Budget Name' },
          { name: 'U_Version', type: 'db_Numeric', description: 'Version' },
          { name: 'U_TotalValue', type: 'db_Float', description: 'Total Value' },
          { name: 'U_ContingencyPct', type: 'db_Float', description: 'Contingency %' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'cpms_commitments', tableName: 'CPMS_COMMITMENTS', description: 'CPMS Commitments Register',
        descriptionAr: 'سجل الالتزامات',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_RefNumber', type: 'db_Alpha', size: 50, description: 'Reference Number' },
          { name: 'U_Type', type: 'db_Alpha', size: 30, description: 'Type (PO/Subcon/Other)' },
          { name: 'U_VendorName', type: 'db_Alpha', size: 200, description: 'Vendor Name' },
          { name: 'U_CommittedAmt', type: 'db_Float', description: 'Committed Amount' },
          { name: 'U_InvoicedAmt', type: 'db_Float', description: 'Invoiced Amount' },
          { name: 'U_RemainingAmt', type: 'db_Float', description: 'Remaining Amount' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'cpms_evm', tableName: 'CPMS_EVM', description: 'Earned Value Management',
        descriptionAr: 'إدارة القيمة المكتسبة',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_SnapshotDate', type: 'db_Date', description: 'Snapshot Date' },
          { name: 'U_BCWS', type: 'db_Float', description: 'BCWS (Planned Value)' },
          { name: 'U_BCWP', type: 'db_Float', description: 'BCWP (Earned Value)' },
          { name: 'U_ACWP', type: 'db_Float', description: 'ACWP (Actual Cost)' },
          { name: 'U_SPI', type: 'db_Float', description: 'Schedule Performance Index' },
          { name: 'U_CPI', type: 'db_Float', description: 'Cost Performance Index' },
          { name: 'U_EAC', type: 'db_Float', description: 'Estimate at Completion' },
        ],
      },
    ],
  },
  {
    module: 'Project Management',
    moduleAr: 'إدارة المشاريع',
    icon: '🏗️',
    udos: [
      {
        key: 'project_tasks', tableName: 'PM_TASKS', description: 'Project Tasks',
        descriptionAr: 'مهام المشروع',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Title', type: 'db_Alpha', size: 200, description: 'Task Title' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_Priority', type: 'db_Alpha', size: 20, description: 'Priority' },
          { name: 'U_AssigneeCode', type: 'db_Numeric', description: 'Assignee Employee Code' },
          { name: 'U_DueDate', type: 'db_Date', description: 'Due Date' },
          { name: 'U_Progress', type: 'db_Numeric', description: 'Progress %' },
        ],
      },
      {
        key: 'project_milestones', tableName: 'PM_MILESTONES', description: 'Project Milestones',
        descriptionAr: 'معالم المشروع',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Name', type: 'db_Alpha', size: 200, description: 'Milestone Name' },
          { name: 'U_TargetDate', type: 'db_Date', description: 'Target Date' },
          { name: 'U_ActualDate', type: 'db_Date', description: 'Actual Date' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_PaymentPct', type: 'db_Float', description: 'Payment %' },
        ],
      },
    ],
  },
  {
    module: 'HR & Payroll',
    moduleAr: 'الموارد البشرية والرواتب',
    icon: '👥',
    udos: [
      {
        key: 'attendance', tableName: 'HR_ATTENDANCE', description: 'Employee Attendance',
        descriptionAr: 'حضور الموظفين',
        fields: [
          { name: 'U_EmpCode', type: 'db_Numeric', description: 'Employee Code' },
          { name: 'U_Date', type: 'db_Date', description: 'Attendance Date' },
          { name: 'U_CheckIn', type: 'db_Alpha', size: 20, description: 'Check-in Time' },
          { name: 'U_CheckOut', type: 'db_Alpha', size: 20, description: 'Check-out Time' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_OvertimeHrs', type: 'db_Float', description: 'Overtime Hours' },
        ],
      },
      {
        key: 'leave_requests', tableName: 'HR_LEAVE', description: 'Leave Requests',
        descriptionAr: 'طلبات الإجازات',
        fields: [
          { name: 'U_EmpCode', type: 'db_Numeric', description: 'Employee Code' },
          { name: 'U_LeaveType', type: 'db_Alpha', size: 30, description: 'Leave Type' },
          { name: 'U_StartDate', type: 'db_Date', description: 'Start Date' },
          { name: 'U_EndDate', type: 'db_Date', description: 'End Date' },
          { name: 'U_Days', type: 'db_Numeric', description: 'Total Days' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Approval Status' },
          { name: 'U_ApprovedBy', type: 'db_Numeric', description: 'Approved By Employee Code' },
        ],
      },
      {
        key: 'payroll', tableName: 'HR_PAYROLL', description: 'Payroll Records',
        descriptionAr: 'سجلات الرواتب',
        fields: [
          { name: 'U_EmpCode', type: 'db_Numeric', description: 'Employee Code' },
          { name: 'U_Period', type: 'db_Alpha', size: 20, description: 'Pay Period' },
          { name: 'U_BasicSalary', type: 'db_Float', description: 'Basic Salary' },
          { name: 'U_Allowances', type: 'db_Float', description: 'Total Allowances' },
          { name: 'U_Deductions', type: 'db_Float', description: 'Total Deductions' },
          { name: 'U_GOSI', type: 'db_Float', description: 'GOSI Amount' },
          { name: 'U_NetPay', type: 'db_Float', description: 'Net Pay' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
    ],
  },
  {
    module: 'Quality Management',
    moduleAr: 'إدارة الجودة',
    icon: '✅',
    udos: [
      {
        key: 'quality_inspections', tableName: 'QM_INSPECTIONS', description: 'Quality Inspections',
        descriptionAr: 'فحوصات الجودة',
        fields: [
          { name: 'U_InspType', type: 'db_Alpha', size: 30, description: 'Inspection Type' },
          { name: 'U_RefDocEntry', type: 'db_Numeric', description: 'Reference Doc Entry' },
          { name: 'U_RefDocType', type: 'db_Alpha', size: 20, description: 'Reference Doc Type' },
          { name: 'U_ItemCode', type: 'db_Alpha', size: 50, description: 'Item Code' },
          { name: 'U_Result', type: 'db_Alpha', size: 20, description: 'Result (Pass/Fail)' },
          { name: 'U_Inspector', type: 'db_Alpha', size: 100, description: 'Inspector Name' },
          { name: 'U_InspDate', type: 'db_Date', description: 'Inspection Date' },
        ],
      },
      {
        key: 'ncrs', tableName: 'QM_NCR', description: 'Non-Conformance Reports',
        descriptionAr: 'تقارير عدم المطابقة',
        fields: [
          { name: 'U_NCRNumber', type: 'db_Alpha', size: 30, description: 'NCR Number' },
          { name: 'U_Category', type: 'db_Alpha', size: 30, description: 'Category' },
          { name: 'U_Severity', type: 'db_Alpha', size: 20, description: 'Severity' },
          { name: 'U_Description', type: 'db_Alpha', size: 500, description: 'Description' },
          { name: 'U_RootCause', type: 'db_Alpha', size: 500, description: 'Root Cause' },
          { name: 'U_CorrectiveAction', type: 'db_Alpha', size: 500, description: 'Corrective Action' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
    ],
  },
  {
    module: 'IT Service Management',
    moduleAr: 'إدارة خدمات تقنية المعلومات',
    icon: '🖥️',
    udos: [
      {
        key: 'it_tickets', tableName: 'IT_TICKETS', description: 'IT Service Tickets',
        descriptionAr: 'تذاكر خدمات تقنية المعلومات',
        fields: [
          { name: 'U_TicketNo', type: 'db_Alpha', size: 30, description: 'Ticket Number' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Priority', type: 'db_Alpha', size: 20, description: 'Priority' },
          { name: 'U_Subject', type: 'db_Alpha', size: 200, description: 'Subject' },
          { name: 'U_Description', type: 'db_Alpha', size: 500, description: 'Description' },
          { name: 'U_AssignedTo', type: 'db_Alpha', size: 100, description: 'Assigned To' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_Resolution', type: 'db_Alpha', size: 500, description: 'Resolution' },
        ],
      },
    ],
  },
  {
    module: 'Manufacturing',
    moduleAr: 'التصنيع',
    icon: '🏭',
    udos: [
      {
        key: 'production_orders', tableName: 'MFG_PROD_ORDERS', description: 'Production Orders (Extended)',
        descriptionAr: 'أوامر الإنتاج (موسعة)',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_BOMDocEntry', type: 'db_Numeric', description: 'BOM Doc Entry' },
          { name: 'U_PlannedQty', type: 'db_Float', description: 'Planned Quantity' },
          { name: 'U_CompletedQty', type: 'db_Float', description: 'Completed Quantity' },
          { name: 'U_WasteQty', type: 'db_Float', description: 'Waste Quantity' },
          { name: 'U_StartDate', type: 'db_Date', description: 'Start Date' },
          { name: 'U_EndDate', type: 'db_Date', description: 'End Date' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
    ],
  },
  {
    module: 'Finance Extensions',
    moduleAr: 'الإضافات المالية',
    icon: '💰',
    udos: [
      {
        key: 'payment_certificates', tableName: 'FIN_PAY_CERTS', description: 'Payment Certificates',
        descriptionAr: 'شهادات الدفع',
        fields: [
          { name: 'U_CertNumber', type: 'db_Alpha', size: 30, description: 'Certificate Number' },
          { name: 'U_SODocEntry', type: 'db_Numeric', description: 'Sales Order Doc Entry' },
          { name: 'U_CertType', type: 'db_Alpha', size: 30, description: 'Certificate Type' },
          { name: 'U_Amount', type: 'db_Float', description: 'Amount' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_ApprovedBy', type: 'db_Alpha', size: 100, description: 'Approved By' },
          { name: 'U_ApprovedDate', type: 'db_Date', description: 'Approved Date' },
        ],
      },
      {
        key: 'bank_reconciliation', tableName: 'FIN_BANK_RECON', description: 'Bank Reconciliation',
        descriptionAr: 'التسوية البنكية',
        fields: [
          { name: 'U_AccountCode', type: 'db_Alpha', size: 50, description: 'GL Account Code' },
          { name: 'U_StatementDate', type: 'db_Date', description: 'Statement Date' },
          { name: 'U_StatementBal', type: 'db_Float', description: 'Statement Balance' },
          { name: 'U_BookBal', type: 'db_Float', description: 'Book Balance' },
          { name: 'U_Difference', type: 'db_Float', description: 'Difference' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Reconciliation Status' },
        ],
      },
    ],
  },
  {
    module: 'Asset Management',
    moduleAr: 'إدارة الأصول',
    icon: '🏢',
    udos: [
      {
        key: 'asset_tracking', tableName: 'AM_ASSETS', description: 'Asset Tracking',
        descriptionAr: 'تتبع الأصول',
        fields: [
          { name: 'U_AssetCode', type: 'db_Alpha', size: 50, description: 'Asset Code' },
          { name: 'U_Name', type: 'db_Alpha', size: 200, description: 'Asset Name' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Location', type: 'db_Alpha', size: 100, description: 'Location' },
          { name: 'U_SerialNo', type: 'db_Alpha', size: 50, description: 'Serial Number' },
          { name: 'U_PurchaseDate', type: 'db_Date', description: 'Purchase Date' },
          { name: 'U_PurchaseValue', type: 'db_Float', description: 'Purchase Value' },
          { name: 'U_Condition', type: 'db_Alpha', size: 20, description: 'Condition' },
          { name: 'U_AssignedTo', type: 'db_Alpha', size: 100, description: 'Assigned To' },
        ],
      },
    ],
  },
  {
    module: 'HSE (Health, Safety & Environment)',
    moduleAr: 'الصحة والسلامة والبيئة',
    icon: '🦺',
    udos: [
      {
        key: 'hse_incidents', tableName: 'HSE_INCIDENTS', description: 'HSE Incidents',
        descriptionAr: 'حوادث الصحة والسلامة',
        fields: [
          { name: 'U_IncidentNo', type: 'db_Alpha', size: 30, description: 'Incident Number' },
          { name: 'U_Type', type: 'db_Alpha', size: 30, description: 'Incident Type' },
          { name: 'U_Severity', type: 'db_Alpha', size: 20, description: 'Severity' },
          { name: 'U_Location', type: 'db_Alpha', size: 200, description: 'Location' },
          { name: 'U_Date', type: 'db_Date', description: 'Incident Date' },
          { name: 'U_Description', type: 'db_Alpha', size: 500, description: 'Description' },
          { name: 'U_RootCause', type: 'db_Alpha', size: 500, description: 'Root Cause' },
          { name: 'U_CorrectiveAction', type: 'db_Alpha', size: 500, description: 'Corrective Action' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'hse_daily_reports', tableName: 'HSE_DAILY', description: 'HSE Daily Reports',
        descriptionAr: 'التقارير اليومية للسلامة',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Date', type: 'db_Date', description: 'Report Date' },
          { name: 'U_WorkersOnSite', type: 'db_Numeric', description: 'Workers on Site' },
          { name: 'U_NearMisses', type: 'db_Numeric', description: 'Near Misses' },
          { name: 'U_ToolboxTalk', type: 'db_Alpha', size: 10, description: 'Toolbox Talk Done (Y/N)' },
          { name: 'U_WeatherCond', type: 'db_Alpha', size: 50, description: 'Weather Conditions' },
        ],
      },
    ],
  },
  {
    module: 'PMO - Portfolio Management',
    moduleAr: 'إدارة المحافظ والبرامج',
    icon: '📋',
    udos: [
      {
        key: 'pmo_programs', tableName: 'PMO_PROGRAMS', description: 'PMO Programs',
        descriptionAr: 'برامج مكتب إدارة المشاريع',
        fields: [
          { name: 'U_ProgramName', type: 'db_Alpha', size: 200, description: 'Program Name' },
          { name: 'U_Manager', type: 'db_Alpha', size: 100, description: 'Program Manager' },
          { name: 'U_StartDate', type: 'db_Date', description: 'Start Date' },
          { name: 'U_EndDate', type: 'db_Date', description: 'End Date' },
          { name: 'U_Budget', type: 'db_Float', description: 'Total Budget' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_HealthScore', type: 'db_Numeric', description: 'Health Score' },
        ],
      },
      {
        key: 'pmo_risks', tableName: 'PMO_RISKS', description: 'PMO Risk Register',
        descriptionAr: 'سجل المخاطر',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_RiskTitle', type: 'db_Alpha', size: 200, description: 'Risk Title' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Probability', type: 'db_Alpha', size: 20, description: 'Probability' },
          { name: 'U_Impact', type: 'db_Alpha', size: 20, description: 'Impact' },
          { name: 'U_RiskScore', type: 'db_Numeric', description: 'Risk Score' },
          { name: 'U_Mitigation', type: 'db_Alpha', size: 500, description: 'Mitigation Plan' },
          { name: 'U_Owner', type: 'db_Alpha', size: 100, description: 'Risk Owner' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'pmo_issues', tableName: 'PMO_ISSUES', description: 'PMO Issue Log',
        descriptionAr: 'سجل القضايا',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Title', type: 'db_Alpha', size: 200, description: 'Issue Title' },
          { name: 'U_Priority', type: 'db_Alpha', size: 20, description: 'Priority' },
          { name: 'U_AssignedTo', type: 'db_Alpha', size: 100, description: 'Assigned To' },
          { name: 'U_DueDate', type: 'db_Date', description: 'Due Date' },
          { name: 'U_Resolution', type: 'db_Alpha', size: 500, description: 'Resolution' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'pmo_lessons', tableName: 'PMO_LESSONS', description: 'Lessons Learned',
        descriptionAr: 'الدروس المستفادة',
        fields: [
          { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Description', type: 'db_Alpha', size: 500, description: 'Description' },
          { name: 'U_Impact', type: 'db_Alpha', size: 20, description: 'Impact Level' },
          { name: 'U_Recommendation', type: 'db_Alpha', size: 500, description: 'Recommendation' },
          { name: 'U_RecordedBy', type: 'db_Alpha', size: 100, description: 'Recorded By' },
        ],
      },
    ],
  },
  {
    module: 'TMO - Technology Management',
    moduleAr: 'مكتب إدارة التقنية',
    icon: '⚙️',
    udos: [
      {
        key: 'tmo_tech_assets', tableName: 'TMO_TECH_ASSETS', description: 'Technology Asset Registry',
        descriptionAr: 'سجل الأصول التقنية',
        fields: [
          { name: 'U_AssetName', type: 'db_Alpha', size: 200, description: 'Asset Name' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Vendor', type: 'db_Alpha', size: 200, description: 'Vendor' },
          { name: 'U_LicenseType', type: 'db_Alpha', size: 30, description: 'License Type' },
          { name: 'U_ExpiryDate', type: 'db_Date', description: 'Expiry Date' },
          { name: 'U_AnnualCost', type: 'db_Float', description: 'Annual Cost' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
          { name: 'U_Criticality', type: 'db_Alpha', size: 20, description: 'Criticality' },
        ],
      },
      {
        key: 'tmo_roadmap', tableName: 'TMO_ROADMAP', description: 'Technology Roadmap Items',
        descriptionAr: 'عناصر خارطة الطريق التقنية',
        fields: [
          { name: 'U_Initiative', type: 'db_Alpha', size: 200, description: 'Initiative Name' },
          { name: 'U_Category', type: 'db_Alpha', size: 50, description: 'Category' },
          { name: 'U_Priority', type: 'db_Alpha', size: 20, description: 'Priority' },
          { name: 'U_Quarter', type: 'db_Alpha', size: 10, description: 'Target Quarter' },
          { name: 'U_Year', type: 'db_Numeric', description: 'Target Year' },
          { name: 'U_Budget', type: 'db_Float', description: 'Budget' },
          { name: 'U_Owner', type: 'db_Alpha', size: 100, description: 'Owner' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'tmo_standards', tableName: 'TMO_STANDARDS', description: 'TMO Standards Register',
        descriptionAr: 'سجل المعايير التقنية',
        fields: [
          { name: 'U_StandardName', type: 'db_Alpha', size: 200, description: 'Standard Name' },
          { name: 'U_Domain', type: 'db_Alpha', size: 50, description: 'Domain' },
          { name: 'U_Version', type: 'db_Alpha', size: 20, description: 'Version' },
          { name: 'U_Compliance', type: 'db_Alpha', size: 20, description: 'Compliance Level' },
          { name: 'U_ReviewDate', type: 'db_Date', description: 'Next Review Date' },
          { name: 'U_Owner', type: 'db_Alpha', size: 100, description: 'Owner' },
        ],
      },
    ],
  },
  {
    module: 'Cost Accounting',
    moduleAr: 'محاسبة التكاليف',
    icon: '📈',
    udos: [
      {
        key: 'cost_centers_ext', tableName: 'COST_CENTERS_EXT', description: 'Cost Centers (Extended)',
        descriptionAr: 'مراكز التكلفة (موسعة)',
        fields: [
          { name: 'U_CenterCode', type: 'db_Alpha', size: 50, description: 'Cost Center Code' },
          { name: 'U_CenterName', type: 'db_Alpha', size: 200, description: 'Cost Center Name' },
          { name: 'U_Department', type: 'db_Alpha', size: 100, description: 'Department' },
          { name: 'U_Manager', type: 'db_Alpha', size: 100, description: 'Manager' },
          { name: 'U_BudgetAmt', type: 'db_Float', description: 'Budget Amount' },
          { name: 'U_ActualAmt', type: 'db_Float', description: 'Actual Amount' },
          { name: 'U_Variance', type: 'db_Float', description: 'Variance' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'cost_allocations', tableName: 'COST_ALLOCATIONS', description: 'Cost Allocation Rules',
        descriptionAr: 'قواعد توزيع التكاليف',
        fields: [
          { name: 'U_RuleName', type: 'db_Alpha', size: 200, description: 'Rule Name' },
          { name: 'U_SourceCenter', type: 'db_Alpha', size: 50, description: 'Source Cost Center' },
          { name: 'U_TargetCenter', type: 'db_Alpha', size: 50, description: 'Target Cost Center' },
          { name: 'U_AllocMethod', type: 'db_Alpha', size: 30, description: 'Allocation Method' },
          { name: 'U_Percentage', type: 'db_Float', description: 'Allocation %' },
          { name: 'U_Period', type: 'db_Alpha', size: 20, description: 'Period' },
          { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
        ],
      },
      {
        key: 'cost_variance_reports', tableName: 'COST_VARIANCE', description: 'Cost Variance Reports',
        descriptionAr: 'تقارير انحراف التكاليف',
        fields: [
          { name: 'U_ReportPeriod', type: 'db_Alpha', size: 20, description: 'Report Period' },
          { name: 'U_CostCenter', type: 'db_Alpha', size: 50, description: 'Cost Center' },
          { name: 'U_PlannedCost', type: 'db_Float', description: 'Planned Cost' },
          { name: 'U_ActualCost', type: 'db_Float', description: 'Actual Cost' },
          { name: 'U_Variance', type: 'db_Float', description: 'Variance' },
          { name: 'U_VariancePct', type: 'db_Float', description: 'Variance %' },
          { name: 'U_Analysis', type: 'db_Alpha', size: 500, description: 'Analysis Notes' },
        ],
      },
    ],
  },
];

function generateSAPScript(udos: UDODefinition[]): string {
  let script = `-- =====================================================\n`;
  script += `-- SAP Business One - UDO & UDF Creation Script\n`;
  script += `-- Generated: ${new Date().toISOString().split('T')[0]}\n`;
  script += `-- Execute via SAP B1 Service Layer or DI API\n`;
  script += `-- =====================================================\n\n`;

  for (const udo of udos) {
    script += `-- -----------------------------------------------\n`;
    script += `-- Table: ${udo.tableName} (${udo.description})\n`;
    script += `-- -----------------------------------------------\n\n`;

    // Step 1: Create UDT (User-Defined Table)
    script += `-- Step 1: Create User-Defined Table\n`;
    script += `-- POST /UserTablesMD\n`;
    script += `{\n`;
    script += `  "TableName": "${udo.tableName}",\n`;
    script += `  "TableDescription": "${udo.description}",\n`;
    script += `  "TableType": "bott_Document"\n`;
    script += `}\n\n`;

    // Step 2: Create UDFs
    script += `-- Step 2: Create User-Defined Fields\n`;
    for (const field of udo.fields) {
      script += `-- POST /UserFieldsMD\n`;
      script += `{\n`;
      script += `  "TableName": "@${udo.tableName}",\n`;
      script += `  "Name": "${field.name}",\n`;
      script += `  "Description": "${field.description}",\n`;
      script += `  "Type": "${field.type}"`;
      if (field.size) {
        script += `,\n  "Size": ${field.size}`;
      }
      script += `\n}\n\n`;
    }

    // Step 3: Create UDO
    script += `-- Step 3: Register User-Defined Object\n`;
    script += `-- POST /UserObjectsMD\n`;
    script += `{\n`;
    script += `  "TableName": "${udo.tableName}",\n`;
    script += `  "Code": "${udo.tableName}",\n`;
    script += `  "Name": "${udo.description}",\n`;
    script += `  "ObjectType": "bot_Document",\n`;
    script += `  "CanFind": "tYES",\n`;
    script += `  "CanDelete": "tYES",\n`;
    script += `  "CanCancel": "tYES",\n`;
    script += `  "CanClose": "tYES",\n`;
    script += `  "ManageSeries": "tYES",\n`;
    script += `  "CanCreateDefaultForm": "tYES",\n`;
    script += `  "EnableEnhancedForm": "tYES"\n`;
    script += `}\n\n`;
  }

  return script;
}

export function SAPUDOManager() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [selectedUDOs, setSelectedUDOs] = useState<string[]>([]);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [udoResults, setUdoResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [creatingUDOs, setCreatingUDOs] = useState(false);

  const allUDOs = MODULE_UDO_DEFINITIONS.flatMap(m => m.udos);

  const toggleUDO = (key: string) => {
    setSelectedUDOs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleModule = (module: ModuleGroup) => {
    const moduleKeys = module.udos.map(u => u.key);
    const allSelected = moduleKeys.every(k => selectedUDOs.includes(k));
    if (allSelected) {
      setSelectedUDOs(prev => prev.filter(k => !moduleKeys.includes(k)));
    } else {
      setSelectedUDOs(prev => [...new Set([...prev, ...moduleKeys])]);
    }
  };

  const selectAll = () => {
    if (selectedUDOs.length === allUDOs.length) {
      setSelectedUDOs([]);
    } else {
      setSelectedUDOs(allUDOs.map(u => u.key));
    }
  };

  const handleShowScript = () => {
    const selected = allUDOs.filter(u => selectedUDOs.includes(u.key));
    if (selected.length === 0) {
      toast({ title: isAr ? 'لم يتم التحديد' : 'No Selection', description: isAr ? 'اختر جدول واحد على الأقل' : 'Select at least one table', variant: 'destructive' });
      return;
    }
    setGeneratedScript(generateSAPScript(selected));
    setShowScriptDialog(true);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    toast({ title: isAr ? 'تم النسخ' : 'Copied', description: isAr ? 'تم نسخ السكربت إلى الحافظة' : 'Script copied to clipboard' });
  };

  const handleDownloadScript = () => {
    const blob = new Blob([generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAP_UDO_UDF_Script_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateUDOs = async () => {
    const selected = allUDOs.filter(u => selectedUDOs.includes(u.key));
    if (selected.length === 0) return;

    setCreatingUDOs(true);
    setUdoResults({});
    const results: Record<string, { success: boolean; message: string }> = {};

    for (const udo of selected) {
      try {
        const { data, error } = await supabase.functions.invoke('sap-sync', {
          body: {
            action: 'create_udo',
            udo_table: udo.tableName,
            udo_description: udo.description,
            udo_fields: udo.fields,
          },
        });
        if (error) throw error;
        results[udo.key] = {
          success: data?.success ?? true,
          message: data?.message || 'UDO/UDFs created successfully',
        };
      } catch (err: any) {
        results[udo.key] = { success: false, message: err.message };
      }
    }

    setUdoResults(results);
    setCreatingUDOs(false);

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;
    toast({
      title: isAr ? 'نتيجة إنشاء UDO' : 'UDO Creation Result',
      description: `${successCount} ${isAr ? 'نجح' : 'succeeded'}, ${failCount} ${isAr ? 'فشل' : 'failed'}`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>{isAr ? 'إنشاء UDOs/UDFs في SAP B1' : 'Create UDOs/UDFs in SAP B1'}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedUDOs.length} / {allUDOs.length} {isAr ? 'محدد' : 'selected'}
            </Badge>
          </div>
          <CardDescription>
            {isAr
              ? 'اختر الوحدات لإنشاء الجداول والحقول المخصصة في SAP Business One. يمكنك معاينة السكربت قبل التنفيذ.'
              : 'Select modules to create custom tables and fields in SAP Business One. Preview the script before execution.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <Checkbox checked={selectedUDOs.length === allUDOs.length} className="mr-2 h-3.5 w-3.5" />
              {isAr ? 'تحديد الكل' : 'Select All'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShowScript} disabled={selectedUDOs.length === 0}>
              <Code className="h-3.5 w-3.5 mr-1.5" />
              {isAr ? 'عرض السكربت' : 'Preview Script'}
            </Button>
            <Button size="sm" onClick={handleCreateUDOs} disabled={creatingUDOs || selectedUDOs.length === 0}>
              {creatingUDOs ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              {isAr
                ? `إنشاء ${selectedUDOs.length} في SAP`
                : `Create ${selectedUDOs.length} UDO(s) in SAP`}
            </Button>
          </div>

          {/* Module groups */}
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-4">
              {MODULE_UDO_DEFINITIONS.map((group) => {
                const moduleKeys = group.udos.map(u => u.key);
                const allModuleSelected = moduleKeys.every(k => selectedUDOs.includes(k));
                const someModuleSelected = moduleKeys.some(k => selectedUDOs.includes(k));

                return (
                  <div key={group.module} className="border rounded-lg">
                    {/* Module header */}
                    <div
                      className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
                      onClick={() => toggleModule(group)}
                    >
                      <Checkbox
                        checked={allModuleSelected}
                        className={someModuleSelected && !allModuleSelected ? 'opacity-50' : ''}
                      />
                      <span className="text-lg">{group.icon}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-sm">{isAr ? group.moduleAr : group.module}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({group.udos.length} {isAr ? 'جدول' : 'table(s)'})
                        </span>
                      </div>
                    </div>

                    {/* UDOs list */}
                    <div className="divide-y">
                      {group.udos.map((udo) => {
                        const result = udoResults[udo.key];
                        return (
                          <div
                            key={udo.key}
                            className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/20 transition-colors ${
                              result?.success === false ? 'bg-destructive/5' : result?.success ? 'bg-green-500/5' : ''
                            }`}
                            onClick={() => toggleUDO(udo.key)}
                          >
                            <Checkbox
                              checked={selectedUDOs.includes(udo.key)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{isAr ? udo.descriptionAr : udo.description}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">@{udo.tableName}</Badge>
                                {result && (
                                  result.success
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {udo.fields.map(f => (
                                  <Badge key={f.name} variant="secondary" className="text-[9px] font-mono">
                                    {f.name}
                                  </Badge>
                                ))}
                              </div>
                              {result && !result.success && (
                                <p className="text-xs text-destructive">{result.message}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Script Preview Dialog */}
      <Dialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {isAr ? 'سكربت SAP B1 Service Layer' : 'SAP B1 Service Layer Script'}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? 'هذا السكربت يمكن تنفيذه عبر SAP B1 Service Layer API أو DI API لإنشاء الجداول والحقول المخصصة.'
                : 'This script can be executed via SAP B1 Service Layer API or DI API to create custom tables and fields.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] border rounded-md">
            <pre className="p-4 text-xs font-mono bg-muted/30 whitespace-pre-wrap">
              {generatedScript}
            </pre>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCopyScript}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              {isAr ? 'نسخ' : 'Copy'}
            </Button>
            <Button variant="outline" onClick={handleDownloadScript}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isAr ? 'تحميل' : 'Download'}
            </Button>
            <Button onClick={() => setShowScriptDialog(false)}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
