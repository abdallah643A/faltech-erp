import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, ArrowRight, Lightbulb, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowStep {
  step: number;
  title: string;
  titleAr?: string;
  description: string;
  route: string;
  icon?: React.ReactNode;
  sapEquivalent?: string;
}

interface ModuleWorkflowDiagramProps {
  moduleName: string;
  moduleNameAr?: string;
  steps: WorkflowStep[];
  tips?: string[];
  defaultOpen?: boolean;
}

export default function ModuleWorkflowDiagram({
  moduleName,
  moduleNameAr,
  steps,
  tips,
  defaultOpen = false
}: ModuleWorkflowDiagramProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const navigate = useNavigate();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors rounded-t-lg pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Process Flow – {moduleName}
                  </CardTitle>
                  {moduleNameAr &&
                  <p className="text-xs text-muted-foreground mt-0.5">{moduleNameAr}</p>
                  }
                </div>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {steps.length} Steps
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? <ChevronDown className="rounded-md shadow-sm border-green-500 w-[20px] h-[20px] mx-px" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {/* Horizontal flow on desktop, vertical on mobile */}
            <div className="hidden md:flex items-start gap-1 overflow-x-auto pb-2">
              {steps.map((step, idx) =>
              <div key={step.step} className="flex items-center flex-shrink-0">
                  <button
                  onClick={() => navigate(step.route)}
                  className={cn(
                    "group relative flex flex-col items-center p-3 rounded-xl border-2 border-transparent",
                    "hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer",
                    "min-w-[120px] max-w-[150px]"
                  )}>
                  
                    <div className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full text-sm font-bold",
                    "bg-primary/10 text-primary border-2 border-primary/30",
                    "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary",
                    "transition-all duration-200"
                  )}>
                      {step.icon || step.step}
                    </div>
                    <span className="text-xs font-semibold text-foreground mt-2 text-center leading-tight">
                      {step.title}
                    </span>
                    {step.titleAr &&
                  <span className="text-[10px] text-muted-foreground mt-0.5 text-center">{step.titleAr}</span>
                  }
                    <p className="text-[10px] text-muted-foreground mt-1 text-center line-clamp-2">{step.description}</p>
                    <ExternalLink className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                  </button>
                  {idx < steps.length - 1 &&
                <ArrowRight className="h-4 w-4 text-primary/40 flex-shrink-0 mx-0.5" />
                }
                </div>
              )}
            </div>

            {/* Vertical flow on mobile */}
            <div className="md:hidden space-y-1">
              {steps.map((step, idx) =>
              <button
                key={step.step}
                onClick={() => navigate(step.route)}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-lg",
                  "hover:bg-primary/5 transition-colors cursor-pointer text-left"
                )}>
                
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold",
                    "bg-primary/10 text-primary border-2 border-primary/30"
                  )}>
                      {step.step}
                    </div>
                    {idx < steps.length - 1 &&
                  <div className="w-0.5 h-4 bg-primary/20 mt-1" />
                  }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{step.title}</span>
                      <ExternalLink className="h-3 w-3 text-primary/50" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </button>
              )}
            </div>

            {/* Tips */}
            {tips && tips.length > 0 &&
            <div className="mt-3 pt-3 border-t border-primary/10">
                <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Tips
                </p>
                <ul className="space-y-1">
                  {tips.map((tip, i) =>
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary/60 mt-0.5">•</span>
                      {tip}
                    </li>
                )}
                </ul>
              </div>
            }
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>);

}

// ====== Pre-defined workflow steps per module ======

export const CRM_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Manage Leads', titleAr: 'إدارة العملاء المحتملين', description: 'Capture and qualify leads from various sources', route: '/leads' },
{ step: 2, title: 'Create Opportunity', titleAr: 'إنشاء فرصة', description: 'Convert qualified leads into sales opportunities', route: '/opportunities' },
{ step: 3, title: 'Send Quotation', titleAr: 'إرسال عرض سعر', description: 'Prepare and send price quotations to prospects', route: '/quotes' },
{ step: 4, title: 'Sales Order', titleAr: 'أمر بيع', description: 'Create sales order upon customer acceptance', route: '/sales-orders' },
{ step: 5, title: 'Delivery', titleAr: 'التسليم', description: 'Process delivery notes and fulfillment', route: '/delivery-notes' },
{ step: 6, title: 'Invoice', titleAr: 'فاتورة', description: 'Generate AR invoices for delivered goods/services', route: '/ar-invoices' },
{ step: 7, title: 'Payment', titleAr: 'الدفع', description: 'Record and reconcile incoming payments', route: '/incoming-payments' }];


export const SALES_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Quotation', titleAr: 'عرض سعر', description: 'Create detailed quotations with pricing', route: '/quotes' },
{ step: 2, title: 'Sales Order', titleAr: 'أمر بيع', description: 'Confirm order with customer approval', route: '/sales-orders' },
{ step: 3, title: 'Delivery Note', titleAr: 'إذن تسليم', description: 'Ship goods and create delivery note', route: '/delivery-notes' },
{ step: 4, title: 'AR Invoice', titleAr: 'فاتورة مبيعات', description: 'Bill customer for delivered items', route: '/ar-invoices' },
{ step: 5, title: 'Payment', titleAr: 'تحصيل', description: 'Receive and allocate payments', route: '/incoming-payments' },
{ step: 6, title: 'Returns', titleAr: 'مرتجعات', description: 'Process returns and credit memos if needed', route: '/ar-returns' }];


export const HR_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Departments', titleAr: 'الأقسام', description: 'Setup organizational departments', route: '/hr/departments' },
{ step: 2, title: 'Positions', titleAr: 'المناصب', description: 'Define job positions and grades', route: '/hr/positions' },
{ step: 3, title: 'Employees', titleAr: 'الموظفون', description: 'Onboard and manage employee records', route: '/hr/employees' },
{ step: 4, title: 'Attendance', titleAr: 'الحضور', description: 'Track daily attendance and work hours', route: '/hr/attendance' },
{ step: 5, title: 'Leave', titleAr: 'الإجازات', description: 'Manage leave requests and balances', route: '/hr/leave' },
{ step: 6, title: 'Payroll', titleAr: 'الرواتب', description: 'Process monthly payroll and payslips', route: '/hr/payroll' },
{ step: 7, title: 'Performance', titleAr: 'الأداء', description: 'Conduct performance reviews and evaluations', route: '/hr/performance' }];


export const PROCUREMENT_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Purchase Request', titleAr: 'طلب شراء', description: 'Raise internal purchase requisition', route: '/procurement' },
{ step: 2, title: 'Quotation', titleAr: 'عرض سعر مورد', description: 'Request and compare vendor quotations', route: '/procurement' },
{ step: 3, title: 'Purchase Order', titleAr: 'أمر شراء', description: 'Issue approved purchase order to vendor', route: '/procurement' },
{ step: 4, title: 'Goods Receipt', titleAr: 'استلام بضاعة', description: 'Receive and inspect delivered goods', route: '/procurement' },
{ step: 5, title: 'AP Invoice', titleAr: 'فاتورة مورد', description: 'Process vendor invoice for payment', route: '/procurement' }];


export const FINANCE_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Chart of Accounts', titleAr: 'دليل الحسابات', description: 'Setup GL account structure', route: '/chart-of-accounts' },
{ step: 2, title: 'Journal Entries', titleAr: 'قيود يومية', description: 'Post manual journal entries', route: '/general-ledger' },
{ step: 3, title: 'AR Invoices', titleAr: 'فواتير العملاء', description: 'Track customer receivables', route: '/ar-invoices' },
{ step: 4, title: 'AP Invoices', titleAr: 'فواتير الموردين', description: 'Manage vendor payables', route: '/procurement' },
{ step: 5, title: 'Payments', titleAr: 'المدفوعات', description: 'Process incoming/outgoing payments', route: '/incoming-payments' },
{ step: 6, title: 'Reports', titleAr: 'التقارير', description: 'Generate financial statements and reports', route: '/financial-reports' }];


export const INVENTORY_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Items', titleAr: 'الأصناف', description: 'Define items master data and pricing', route: '/items' },
{ step: 2, title: 'Warehouses', titleAr: 'المستودعات', description: 'Setup warehouse locations', route: '/warehouses' },
{ step: 3, title: 'Goods Receipt', titleAr: 'إدخال بضاعة', description: 'Receive stock into warehouse', route: '/inventory/goods-receipt' },
{ step: 4, title: 'Goods Issue', titleAr: 'إخراج بضاعة', description: 'Issue stock from warehouse', route: '/inventory/goods-issue' },
{ step: 5, title: 'Transfer', titleAr: 'تحويل مخزون', description: 'Transfer between warehouses', route: '/inventory/stock-transfer' },
{ step: 6, title: 'Counting', titleAr: 'الجرد', description: 'Physical inventory counting', route: '/inventory/counting' }];


export const CPMS_WORKFLOW: WorkflowStep[] = [
{ step: 1, title: 'Create Project', titleAr: 'إنشاء مشروع', description: 'Define project details and contract', route: '/cpms?action=create' },
{ step: 2, title: 'WBS Structure', titleAr: 'هيكل العمل', description: 'Build work breakdown structure', route: '/cpms?tab=projects' },
{ step: 3, title: 'Budget & Costs', titleAr: 'الميزانية', description: 'Allocate budget and track costs', route: '/cpms/costs' },
{ step: 4, title: 'Daily Reports', titleAr: 'التقارير اليومية', description: 'Log daily site progress', route: '/cpms/daily-reports' },
{ step: 5, title: 'Site Progress', titleAr: 'تقدم الموقع', description: 'Photos, reports, area tracking', route: '/cpms/site-progress' },
{ step: 6, title: 'Equipment', titleAr: 'المعدات', description: 'Fleet, utilization, maintenance', route: '/cpms/equipment' },
{ step: 7, title: 'HSE', titleAr: 'السلامة', description: 'Track safety incidents', route: '/cpms/hse' },
{ step: 8, title: 'Billing', titleAr: 'الفوترة', description: 'Process progress billing (IPA)', route: '/cpms/billing' },
{ step: 9, title: 'Analytics', titleAr: 'التحليلات', description: 'Predictive forecasting & comparison', route: '/cpms/predictive' },
{ step: 10, title: 'Sustainability', titleAr: 'الاستدامة', description: 'ESG tracking & weather monitoring', route: '/cpms/sustainability' }];