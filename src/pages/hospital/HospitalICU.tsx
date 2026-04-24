import { Activity, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHospCriticalCare } from '@/hooks/useHospital';

interface Props { variant?: 'icu' | 'nicu' }

export default function HospitalICU({ variant = 'icu' }: Props) {
  const nav = useNavigate();
  const { data, isLoading } = useHospCriticalCare(variant);
  const title = variant === 'nicu' ? 'NICU' : 'ICU';

  const beds = data?.beds || [];
  const admissions = data?.admissions || [];
  const occupied = beds.filter((b: any) => b.status === 'occupied').length;

  return (
    <HospitalShell
      title={`${title} — Critical Care`}
      subtitle={`${occupied} / ${beds.length} beds occupied`}
      icon={<Heart className="h-5 w-5" />}
    >
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {beds.map((b: any) => {
          const adm = admissions.find((a: any) => a.bed?.id === b.id);
          return (
            <Card key={b.id} className={`p-3 ${b.status === 'occupied' ? 'border-primary' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{b.bed_no}</span>
                <Badge variant="outline" className={statusColor(b.status)}>{b.status}</Badge>
              </div>
              {adm ? (
                <div className="mt-2 space-y-1">
                  <div className="text-xs font-medium truncate">{adm.patient?.first_name} {adm.patient?.last_name}</div>
                  <div className="text-[10px] text-muted-foreground">{adm.patient?.mrn}</div>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs w-full" onClick={() => nav(`/hospital/patient-files/${adm.patient?.id}`)}>
                    <Activity className="h-3 w-3 mr-1" /> Open
                  </Button>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground mt-2">Empty</div>
              )}
            </Card>
          );
        })}
        {!isLoading && beds.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center p-6">No {title} beds configured</div>}
      </div>
    </HospitalShell>
  );
}
