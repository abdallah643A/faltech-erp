import { usePatientTimeline, type TimelineEvent } from '@/hooks/useHospitalIntegration';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Receipt, FlaskConical, ScanLine, Pill, PackageCheck, Heart, FileText, Calendar, AlertTriangle,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  encounter: Activity, charge: Receipt, lab_order: FlaskConical, rad_order: ScanLine,
  prescription: Pill, dispense: PackageCheck, surgery: Heart, invoice: FileText, appointment: Calendar,
};

const CATEGORY_COLORS: Record<string, string> = {
  clinical:   'text-primary',
  billing:    'text-emerald-600',
  diagnostic: 'text-violet-600',
  medication: 'text-amber-600',
};

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { data: events = [], isLoading } = usePatientTimeline(patientId);

  if (isLoading) return <div className="text-sm text-muted-foreground p-6 text-center">Loading timeline…</div>;
  if (events.length === 0) return <div className="text-sm text-muted-foreground p-6 text-center border rounded-md">No activity yet</div>;

  return (
    <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
      {events.map((e: TimelineEvent, i) => {
        const Icon = ICONS[e.event_type] || Activity;
        const color = CATEGORY_COLORS[e.event_category] || 'text-foreground';
        const isCritical = e.meta?.critical || e.meta?.priority === 'stat' || e.meta?.priority === 'emergency';
        return (
          <div key={i} className="relative">
            <div className={`absolute -left-[18px] top-2 h-4 w-4 rounded-full bg-background border-2 ${isCritical ? 'border-destructive' : 'border-primary'} flex items-center justify-center`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'bg-destructive' : 'bg-primary'}`} />
            </div>
            <Card className="p-3">
              <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{e.title}</span>
                    {isCritical && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{e.event_type.replace('_', ' ')}</Badge>
                  </div>
                  {e.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{e.subtitle}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">{new Date(e.event_at).toLocaleString()}</div>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
