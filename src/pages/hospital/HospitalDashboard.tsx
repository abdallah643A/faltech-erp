import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useHospDashboard, useHospEncounters, useHospBeds, useHospWards } from '@/hooks/useHospital';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import {
  Hospital, UserPlus, Users, Activity, BedDouble, Stethoscope, Pill,
  Receipt, AlertTriangle, ArrowRight, ClipboardCheck, Clock, DollarSign,
} from 'lucide-react';

function KpiCard({ label, value, sub, icon: Icon, tone, onClick }: any) {
  return (
    <Card onClick={onClick} className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-md flex items-center justify-center ${tone || 'bg-primary/10 text-primary'}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { data: kpi } = useHospDashboard();
  const { data: activeEnc = [] } = useHospEncounters();
  const { data: wards = [] } = useHospWards();
  const { data: beds = [] } = useHospBeds();

  const occupancyPct = kpi?.bedsTotal ? Math.round((kpi.bedsOccupied / kpi.bedsTotal) * 100) : 0;
  const erList = activeEnc.filter((e: any) => e.encounter_type === 'er').slice(0, 6);
  const opdQueue = activeEnc.filter((e: any) => e.encounter_type === 'opd' && ['waiting', 'registered'].includes(e.status)).slice(0, 6);

  const wardOccupancy = wards.map((w: any) => {
    const wb = beds.filter((b: any) => b.ward_id === w.id);
    const occ = wb.filter((b: any) => b.status === 'occupied').length;
    return { ...w, total: wb.length, occupied: occ, pct: wb.length ? Math.round((occ / wb.length) * 100) : 0 };
  });

  return (
    <HospitalShell
      title="Hospital Operations"
      subtitle="Live patient flow, bed status, and clinical workload"
      icon={<Hospital className="h-5 w-5" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate('/hospital/reception')}>
            <UserPlus className="h-4 w-4 mr-2" />Register Patient
          </Button>
          <Button size="sm" onClick={() => navigate('/hospital/er')}>
            <Activity className="h-4 w-4 mr-2" />ER Queue
          </Button>
        </>
      }
    >
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Today's Registrations" value={kpi?.patientsToday ?? 0} icon={UserPlus} onClick={() => navigate('/hospital/reception')} />
        <KpiCard label="Waiting" value={kpi?.waiting ?? 0} icon={Clock} tone="bg-amber-500/10 text-amber-600" />
        <KpiCard label="In Consultation" value={kpi?.inConsultation ?? 0} icon={Stethoscope} onClick={() => navigate('/hospital/opd')} />
        <KpiCard label="ER Queue" value={kpi?.erQueue ?? 0} sub={`${kpi?.criticalEr ?? 0} critical`} icon={AlertTriangle}
          tone={(kpi?.criticalEr ?? 0) > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
          onClick={() => navigate('/hospital/er')} />
        <KpiCard label="Admitted" value={kpi?.admitted ?? 0} icon={Users} onClick={() => navigate('/hospital/inpatient')} />
        <KpiCard label="Beds Available" value={`${kpi?.bedsAvailable ?? 0}/${kpi?.bedsTotal ?? 0}`} sub={`${kpi?.bedsCleaning ?? 0} cleaning`} icon={BedDouble} onClick={() => navigate('/hospital/bed-management')} />
        <KpiCard label="Pending Rx" value={kpi?.pendingPrescriptions ?? 0} icon={Pill} onClick={() => navigate('/hospital/pharmacy')} />
        <KpiCard label="Discharges Pending" value={kpi?.dischargesPending ?? 0} icon={ClipboardCheck} onClick={() => navigate('/hospital/discharge')} />
        <KpiCard label="Open Invoices" value={kpi?.invoicesOpen ?? 0} icon={Receipt} onClick={() => navigate('/hospital/billing')} />
        <KpiCard label="Outstanding" value={`SAR ${(kpi?.outstanding ?? 0).toLocaleString()}`} icon={DollarSign}
          tone="bg-amber-500/10 text-amber-600" onClick={() => navigate('/hospital/billing')} />
        <KpiCard label="Bed Occupancy" value={`${occupancyPct}%`} sub={`${kpi?.bedsOccupied ?? 0} of ${kpi?.bedsTotal ?? 0}`} icon={BedDouble} />
        <KpiCard label="Active Encounters" value={activeEnc.length} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ER queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />ER Queue</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hospital/er')}>View <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {erList.length === 0 && <p className="text-sm text-muted-foreground">No active ER cases</p>}
            {erList.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between border rounded p-2 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/hospital/patient-files/${e.patient_id}`)}>
                <div>
                  <p className="text-sm font-medium">{e.patient?.first_name} {e.patient?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{e.encounter_no} · {e.chief_complaint || '—'}</p>
                </div>
                <Badge variant="outline" className={statusColor(e.visit_priority || e.status)}>
                  {e.visit_priority || e.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* OPD queue */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />OPD Waiting</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hospital/opd')}>View <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {opdQueue.length === 0 && <p className="text-sm text-muted-foreground">No patients waiting</p>}
            {opdQueue.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between border rounded p-2 hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/hospital/patient-files/${e.patient_id}`)}>
                <div>
                  <p className="text-sm font-medium">{e.patient?.first_name} {e.patient?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{e.department || '—'} · {e.doctor_name || 'Unassigned'}</p>
                </div>
                <Badge variant="outline" className={statusColor(e.status)}>{e.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ward Occupancy */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" />Ward Occupancy</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/hospital/bed-management')}>View <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {wardOccupancy.length === 0 && <p className="text-sm text-muted-foreground">No wards configured</p>}
            {wardOccupancy.map((w: any) => (
              <div key={w.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-muted-foreground">{w.occupied}/{w.total}</span>
                </div>
                <Progress value={w.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </HospitalShell>
  );
}
