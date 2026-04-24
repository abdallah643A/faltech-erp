import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkspaceKPICard } from '@/components/workspace/WorkspaceKPICard';
import { WorkspacePendingActions, type PendingAction } from '@/components/workspace/WorkspacePendingActions';
import { WorkspaceShortcuts } from '@/components/workspace/WorkspaceShortcuts';
import { Users, AlertTriangle, FlaskConical, Receipt, Heart, Bed, ScanLine, Shield, FileSignature, Stamp, UserPlus, Calendar } from 'lucide-react';
import { useHospDashboard } from '@/hooks/useHospital';

export function HospitalWorkspace() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: k } = useHospDashboard();

  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['hosp-ws-pending'],
    queryFn: async () => {
      const sb: any = supabase;
      const actions: PendingAction[] = [];
      const { data: er } = await sb.from('hosp_encounters')
        .select('id, encounter_no, visit_priority, created_at, patient:hosp_patients(first_name,last_name,mrn)')
        .eq('encounter_type', 'er').not('status', 'in', '(discharged,cancelled)')
        .order('created_at', { ascending: false }).limit(5);
      (er || []).forEach((e: any) => actions.push({
        id: e.id,
        title: `ER — ${e.patient?.first_name} ${e.patient?.last_name}`,
        subtitle: `${e.encounter_no} • ${e.visit_priority || 'standard'}`,
        priority: e.visit_priority === 'critical' ? 'high' : 'medium',
        href: '/hospital/er',
      }));
      const { data: rx } = await sb.from('hosp_medication_orders').select('id, status').in('status', ['ordered']).limit(3);
      (rx || []).forEach((r: any) => actions.push({
        id: r.id, title: 'Pending Prescription', subtitle: 'Awaiting dispense', priority: 'medium', href: '/hospital/pharmacy',
      }));
      return actions;
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isAr ? 'مساحة المستشفى' : 'Hospital Workspace'}</h1>
        <p className="text-sm text-muted-foreground">{isAr ? 'لوحة تحكم العمليات السريرية' : 'Clinical operations dashboard'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <WorkspaceKPICard title={isAr ? 'مرضى اليوم' : 'Patients Today'} value={k?.patientsToday ?? 0} icon={UserPlus} color="text-blue-600" />
        <WorkspaceKPICard title={isAr ? 'في الانتظار' : 'Waiting'} value={k?.waiting ?? 0} icon={Users} color="text-amber-600" />
        <WorkspaceKPICard title={isAr ? 'طوارئ' : 'ER Queue'} value={k?.erQueue ?? 0} icon={AlertTriangle} color={k?.criticalEr ? 'text-destructive' : 'text-orange-600'} />
        <WorkspaceKPICard title={isAr ? 'منوّمين' : 'Admitted'} value={k?.admitted ?? 0} icon={Bed} color="text-primary" />
        <WorkspaceKPICard title={isAr ? 'الأسرّة المتاحة' : 'Beds Available'} value={`${k?.bedsAvailable ?? 0}/${k?.bedsTotal ?? 0}`} icon={Bed} color="text-emerald-600" />
        <WorkspaceKPICard title={isAr ? 'وصفات معلّقة' : 'Pending Rx'} value={k?.pendingPrescriptions ?? 0} icon={FlaskConical} color="text-violet-600" />
        <WorkspaceKPICard title={isAr ? 'فواتير مفتوحة' : 'Open Invoices'} value={k?.invoicesOpen ?? 0} icon={Receipt} color="text-rose-600" />
        <WorkspaceKPICard title={isAr ? 'قيد الخروج' : 'Discharges'} value={k?.dischargesPending ?? 0} icon={FileSignature} color="text-cyan-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <WorkspacePendingActions actions={pendingActions} title={isAr ? 'إجراءات معلّقة' : 'Pending Actions'} />
        </div>
        <WorkspaceShortcuts
          shortcuts={[
            { label: isAr ? 'الاستقبال' : 'Reception', icon: UserPlus, href: '/hospital/reception', color: 'text-blue-600' },
            { label: isAr ? 'العيادات' : 'OPD', icon: Stamp, href: '/hospital/opd', color: 'text-emerald-600' },
            { label: isAr ? 'الطوارئ' : 'ER', icon: AlertTriangle, href: '/hospital/er', color: 'text-destructive' },
            { label: isAr ? 'الأسرّة' : 'Beds', icon: Bed, href: '/hospital/bed-management', color: 'text-primary' },
            { label: isAr ? 'العمليات' : 'OR', icon: Heart, href: '/hospital/or', color: 'text-rose-600' },
            { label: isAr ? 'المختبر' : 'Lab', icon: FlaskConical, href: '/hospital/lab', color: 'text-violet-600' },
            { label: isAr ? 'الأشعة' : 'Radiology', icon: ScanLine, href: '/hospital/radiology', color: 'text-cyan-600' },
            { label: isAr ? 'التأمين' : 'Insurance', icon: Shield, href: '/hospital/insurance', color: 'text-amber-600' },
            { label: isAr ? 'المواعيد' : 'Appointments', icon: Calendar, href: '/hospital/appointments', color: 'text-indigo-600' },
          ]}
        />
      </div>
    </div>
  );
}
