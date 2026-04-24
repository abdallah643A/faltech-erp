import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuickStep {
  step: number;
  title: string;
  titleAr?: string;
  description: string;
  sapEquivalent?: string;
  icon?: React.ReactNode;
}

interface CPMSQuickStepsProps {
  moduleName: string;
  moduleNameAr?: string;
  steps: QuickStep[];
  tips?: string[];
}

export default function CPMSQuickSteps({ moduleName, moduleNameAr, steps, tips }: CPMSQuickStepsProps) {
  const [isOpen, setIsOpen] = useState(false);

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
                    Quick Steps – {moduleName}
                  </CardTitle>
                  {moduleNameAr && (
                    <p className="text-xs text-muted-foreground mt-0.5">{moduleNameAr}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {steps.length} Steps
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {/* Steps Flow */}
            <div className="relative">
              {steps.map((step, idx) => (
                <div key={step.step} className="flex items-start gap-3 mb-3 last:mb-0">
                  {/* Step number indicator */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold border-2",
                      "border-primary/40 bg-primary/10 text-primary"
                    )}>
                      {step.step}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="w-0.5 h-full min-h-[16px] bg-primary/20 mt-1" />
                    )}
                  </div>
                  {/* Step content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{step.title}</span>
                      {step.titleAr && (
                        <span className="text-xs text-muted-foreground">({step.titleAr})</span>
                      )}
                      {idx < steps.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:inline" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    {step.sapEquivalent && (
                      <Badge variant="secondary" className="text-[10px] mt-1 h-4 px-1.5">
                        SAP: {step.sapEquivalent}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {tips && tips.length > 0 && (
              <div className="mt-4 pt-3 border-t border-primary/10">
                <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> Tips
                </p>
                <ul className="space-y-1">
                  {tips.map((tip, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ====== Pre-defined step templates per module ======

export const DASHBOARD_STEPS: QuickStep[] = [
  { step: 1, title: 'Create Project', titleAr: 'إنشاء مشروع', description: 'Define project code, name, type, client, and contract value.', sapEquivalent: 'Project Management → Project' },
  { step: 2, title: 'Define WBS Structure', titleAr: 'هيكل تقسيم العمل', description: 'Build the Work Breakdown Structure with phases, disciplines, and work packages.', sapEquivalent: 'Project Management → WBS' },
  { step: 3, title: 'Assign Contracts & Team', titleAr: 'تعيين العقود والفريق', description: 'Link contracts, subcontracts, and assign project team members with roles.' },
  { step: 4, title: 'Set Budget & Milestones', titleAr: 'الميزانية والمراحل', description: 'Allocate budget per WBS node and define key project milestones.' },
  { step: 5, title: 'Track Site Progress', titleAr: 'تتبع تقدم الموقع', description: 'Upload GPS-tagged photos, submit daily reports, and monitor area-specific progress.' },
  { step: 6, title: 'Manage Equipment', titleAr: 'إدارة المعدات', description: 'Track fleet inventory, log utilization hours, schedule maintenance, and monitor depreciation.' },
  { step: 7, title: 'Monitor & Forecast', titleAr: 'المراقبة والتنبؤ', description: 'Use predictive analytics (EVM), compare projects, and run what-if scenarios.' },
  { step: 8, title: 'Sustainability & ESG', titleAr: 'الاستدامة', description: 'Track carbon, waste, water, and energy. Monitor weather impact and IoT sensors.' },
];

export const COSTS_STEPS: QuickStep[] = [
  { step: 1, title: 'Allocate Budget', titleAr: 'تخصيص الميزانية', description: 'Set original budget per WBS node / cost category (materials, labor, equipment, subcontract).', sapEquivalent: 'Budgets → Budget Scenarios' },
  { step: 2, title: 'Record Commitments', titleAr: 'تسجيل الالتزامات', description: 'Log POs, subcontracts, and change orders as committed costs.' },
  { step: 3, title: 'Track Actual Costs', titleAr: 'تتبع التكاليف الفعلية', description: 'Record actual invoiced costs against budget lines.' },
  { step: 4, title: 'Capture EVM Snapshots', titleAr: 'لقطات القيمة المكتسبة', description: 'Calculate PV, EV, AC, CPI, SPI, and EAC at regular intervals.', sapEquivalent: 'EVM Analysis' },
  { step: 5, title: 'Analyze Variances', titleAr: 'تحليل الانحرافات', description: 'Review cost/schedule variances (CV, SV) and forecast completion costs.' },
];

export const BILLING_STEPS: QuickStep[] = [
  { step: 1, title: 'Prepare IPA (Progress Claim)', titleAr: 'إعداد مطالبة التقدم', description: 'Create Interim Payment Application based on measured quantities and unit rates.', sapEquivalent: 'A/R Invoice → Down Payment' },
  { step: 2, title: 'Submit for Approval', titleAr: 'تقديم للموافقة', description: 'Route IPA through consultant/client approval workflow.' },
  { step: 3, title: 'Process Retention', titleAr: 'معالجة الاحتجاز', description: 'Auto-calculate retention (5-10%) and track in retention ledger.', sapEquivalent: 'Retention Management' },
  { step: 4, title: 'Issue Invoice', titleAr: 'إصدار الفاتورة', description: 'Generate AR invoice from approved IPA with certified amounts.' },
  { step: 5, title: 'Revenue Recognition', titleAr: 'الاعتراف بالإيراد', description: 'Recognize revenue per period using percentage-of-completion method.' },
];

export const DOCUMENTS_STEPS: QuickStep[] = [
  { step: 1, title: 'Register Document', titleAr: 'تسجيل مستند', description: 'Upload drawings, specifications, or correspondence with proper numbering.' },
  { step: 2, title: 'Submit RFI', titleAr: 'تقديم طلب معلومات', description: 'Create Request for Information with clear question and required response date.', sapEquivalent: 'Service → RFI' },
  { step: 3, title: 'Process Submittal', titleAr: 'معالجة التقديمات', description: 'Submit material/shop drawings for consultant review and approval.' },
  { step: 4, title: 'Log NCR', titleAr: 'تسجيل عدم مطابقة', description: 'Record Non-Conformance Reports with corrective actions and follow-up.' },
  { step: 5, title: 'Track Revisions', titleAr: 'تتبع المراجعات', description: 'Manage document versions, approval status, and distribution.' },
];

export const DAILY_REPORTS_STEPS: QuickStep[] = [
  { step: 1, title: 'Create Daily Report', titleAr: 'إنشاء تقرير يومي', description: 'Select project, date, weather conditions, and general site summary.' },
  { step: 2, title: 'Log Manpower', titleAr: 'تسجيل العمالة', description: 'Record workforce counts by trade/category with hours worked.' },
  { step: 3, title: 'Log Equipment', titleAr: 'تسجيل المعدات', description: 'Track equipment usage, idle time, and operating hours.' },
  { step: 4, title: 'Record Progress', titleAr: 'تسجيل التقدم', description: 'Update quantity installed per BOQ item / WBS activity.' },
  { step: 5, title: 'Submit & Approve', titleAr: 'تقديم وموافقة', description: 'Submit report for site engineer / PM review and approval.' },
];

export const HSE_STEPS: QuickStep[] = [
  { step: 1, title: 'Report Incident', titleAr: 'الإبلاغ عن حادث', description: 'Log incident type (near miss, first aid, lost time, fatality) with date and location.' },
  { step: 2, title: 'Assess Severity', titleAr: 'تقييم الخطورة', description: 'Classify severity level (low, medium, high, critical) and affected persons.' },
  { step: 3, title: 'Investigate Root Cause', titleAr: 'تحقيق السبب الجذري', description: 'Conduct investigation, document findings, and identify root causes.' },
  { step: 4, title: 'Define Corrective Actions', titleAr: 'تحديد الإجراءات التصحيحية', description: 'Assign corrective/preventive actions with responsible person and deadline.' },
  { step: 5, title: 'Close & Audit', titleAr: 'إغلاق ومراجعة', description: 'Verify actions completed, update HSE statistics, and close incident.' },
];

export const EQUIPMENT_STEPS: QuickStep[] = [
  { step: 1, title: 'Register Equipment', titleAr: 'تسجيل المعدات', description: 'Add equipment with code, make, model, serial number, and purchase details. Auto-generates QR code.' },
  { step: 2, title: 'Assign to Project', titleAr: 'تعيين لمشروع', description: 'Assign equipment to a project site and set daily/hourly/monthly rental rates.' },
  { step: 3, title: 'Log Daily Usage', titleAr: 'تسجيل الاستخدام اليومي', description: 'Record hours used, idle time, maintenance hours, fuel consumed, and operator details.' },
  { step: 4, title: 'Schedule Maintenance', titleAr: 'جدولة الصيانة', description: 'Create preventive/corrective maintenance records with costs and vendor details.' },
  { step: 5, title: 'Track Depreciation', titleAr: 'تتبع الاستهلاك', description: 'Monitor asset value using straight-line or declining-balance depreciation methods.' },
];

export const SITE_PROGRESS_STEPS: QuickStep[] = [
  { step: 1, title: 'Upload Photos', titleAr: 'رفع الصور', description: 'Upload GPS-tagged site photos organized by area (foundation, structure, MEP, finishes, external).' },
  { step: 2, title: 'Submit Daily Report', titleAr: 'تقديم تقرير يومي', description: 'Record weather, manpower count, work performed, delays, and general notes.' },
  { step: 3, title: 'Update Progress', titleAr: 'تحديث التقدم', description: 'Set actual vs. planned progress percentage per area.' },
  { step: 4, title: 'Review Timeline', titleAr: 'مراجعة الجدول الزمني', description: 'View progress snapshots over time and identify trends.' },
];

export const PREDICTIVE_STEPS: QuickStep[] = [
  { step: 1, title: 'Select Project', titleAr: 'اختيار مشروع', description: 'Choose an active project with EVM data to generate forecasts.' },
  { step: 2, title: 'Review Forecasts', titleAr: 'مراجعة التنبؤات', description: 'View predicted completion date and final cost with 80% and 95% confidence intervals.' },
  { step: 3, title: 'Analyze Trends', titleAr: 'تحليل الاتجاهات', description: 'Review SPI/CPI trend lines and burndown charts for remaining work.' },
  { step: 4, title: 'Run Scenarios', titleAr: 'تشغيل السيناريوهات', description: 'Use what-if sliders to model changes in SPI/CPI and see impact on completion.' },
];

export const SUSTAINABILITY_STEPS: QuickStep[] = [
  { step: 1, title: 'Log Environmental Data', titleAr: 'تسجيل بيانات بيئية', description: 'Record carbon emissions, waste, water usage, or energy consumption per project.' },
  { step: 2, title: 'Set ESG Targets', titleAr: 'تحديد أهداف ESG', description: 'Define monthly/quarterly/annual targets for each environmental category.' },
  { step: 3, title: 'Monitor Progress', titleAr: 'مراقبة التقدم', description: 'Track current values against targets with on-track/at-risk/behind indicators.' },
  { step: 4, title: 'Analyze Trends', titleAr: 'تحليل الاتجاهات', description: 'Review monthly trend charts and impact distribution across categories.' },
];

export const WEATHER_IOT_STEPS: QuickStep[] = [
  { step: 1, title: 'Log Weather', titleAr: 'تسجيل الطقس', description: 'Record daily temperature, humidity, wind, rain, and conditions with work impact assessment.' },
  { step: 2, title: 'Configure Sensors', titleAr: 'إعداد المستشعرات', description: 'Register IoT sensors with type, location, and alert thresholds.' },
  { step: 3, title: 'Record Readings', titleAr: 'تسجيل القراءات', description: 'Add sensor readings — auto-classified as normal, warning, or critical based on thresholds.' },
  { step: 4, title: 'Monitor Dashboard', titleAr: 'مراقبة لوحة التحكم', description: 'View temperature trends, sensor status cards, and critical alerts in real-time.' },
];
