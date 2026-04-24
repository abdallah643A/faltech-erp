import { useState } from 'react';
import { Baby, Heart, Link2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HospitalShell, statusColor } from '@/components/hospital/HospitalShell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHospCriticalCare } from '@/hooks/useHospital';
import { NeonatalRecordDialog } from '@/components/hospital/NeonatalRecordDialog';
import { useNeonatalRecord } from '@/hooks/useNeonatal';

function NeonatalBedCard({ bed, adm, onOpenNeonatal }: any) {
  const { data: neo } = useNeonatalRecord(adm?.patient?.id);
  const apgarLow = neo?.apgar_5min !== null && neo?.apgar_5min !== undefined && neo.apgar_5min < 7;
  return (
    <Card className={`p-3 ${bed.status === 'occupied' ? 'border-primary' : ''} ${apgarLow ? 'border-destructive' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm flex items-center gap-1">
          <Baby className="h-3 w-3" /> {bed.bed_no}
        </span>
        <Badge variant="outline" className={statusColor(bed.status)}>{bed.status}</Badge>
      </div>
      {adm ? (
        <div className="mt-2 space-y-1">
          <div className="text-xs font-medium truncate">{adm.patient?.first_name} {adm.patient?.last_name}</div>
          <div className="text-[10px] text-muted-foreground">{adm.patient?.mrn}</div>
          {neo && (
            <div className="text-[10px] space-y-0.5 mt-1 p-1.5 rounded bg-muted/40">
              {neo.birth_weight_grams && <div>BW: <b>{neo.birth_weight_grams}g</b></div>}
              {neo.gestational_age_weeks && <div>GA: <b>{neo.gestational_age_weeks}w</b></div>}
              {neo.apgar_5min !== null && (
                <div className={apgarLow ? 'text-destructive font-semibold' : ''}>
                  APGAR 5m: {neo.apgar_5min}/10
                </div>
              )}
              {neo.mother_name && (
                <div className="flex items-center gap-1 text-primary"><Link2 className="h-2.5 w-2.5" />{neo.mother_name}</div>
              )}
            </div>
          )}
          <div className="flex gap-1 mt-1">
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex-1" onClick={() => onOpenNeonatal(adm.patient)}>
              {neo ? 'Edit neonatal' : <><Plus className="h-2.5 w-2.5 mr-0.5" />Neonatal</>}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground mt-2">Empty</div>
      )}
    </Card>
  );
}

export default function HospitalNICU() {
  const nav = useNavigate();
  const { data, isLoading } = useHospCriticalCare('nicu');
  const [neoBaby, setNeoBaby] = useState<any | null>(null);

  const beds = data?.beds || [];
  const admissions = data?.admissions || [];
  const occupied = beds.filter((b: any) => b.status === 'occupied').length;

  return (
    <HospitalShell
      title="NICU — Neonatal Critical Care"
      subtitle={`${occupied} / ${beds.length} cots occupied`}
      icon={<Heart className="h-5 w-5" />}
    >
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {beds.map((b: any) => {
          const adm = admissions.find((a: any) => a.bed?.id === b.id);
          return (
            <div key={b.id} onClick={() => adm && nav(`/hospital/patient-files/${adm.patient?.id}`)} className={adm ? 'cursor-pointer' : ''}>
              <NeonatalBedCard bed={b} adm={adm} onOpenNeonatal={(p: any) => { setNeoBaby(p); }} />
            </div>
          );
        })}
        {!isLoading && beds.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground text-center p-6">No NICU cots configured</div>
        )}
      </div>

      {neoBaby && (
        <NeonatalRecordDialog
          baby={neoBaby}
          open={!!neoBaby}
          onClose={() => setNeoBaby(null)}
        />
      )}
    </HospitalShell>
  );
}
