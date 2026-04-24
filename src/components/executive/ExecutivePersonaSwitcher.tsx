import { Button } from '@/components/ui/button';
import { Crown, Landmark, Activity, Briefcase } from 'lucide-react';
import type { ExecPersona } from './PersonaDashboard';

const PERSONAS: { key: ExecPersona; label: string; labelAr: string; icon: any }[] = [
  { key: 'ceo', label: 'CEO', labelAr: 'الرئيس التنفيذي', icon: Crown },
  { key: 'cfo', label: 'CFO', labelAr: 'المدير المالي', icon: Landmark },
  { key: 'coo', label: 'COO', labelAr: 'المدير التشغيلي', icon: Activity },
  { key: 'bu_leader', label: 'BU Leader', labelAr: 'قائد الوحدة', icon: Briefcase },
];

interface Props {
  active: ExecPersona;
  onChange: (p: ExecPersona) => void;
  isAr?: boolean;
}

export function ExecutivePersonaSwitcher({ active, onChange, isAr = false }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERSONAS.map((p) => {
        const Icon = p.icon;
        return (
          <Button
            key={p.key}
            size="sm"
            variant={active === p.key ? 'default' : 'outline'}
            onClick={() => onChange(p.key)}
          >
            <Icon className="h-4 w-4 mr-1" />
            {isAr ? p.labelAr : p.label}
          </Button>
        );
      })}
    </div>
  );
}
