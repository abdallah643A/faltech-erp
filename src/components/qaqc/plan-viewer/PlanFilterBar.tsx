import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  filters: { search: string; status: string; priority: string; type: string; assignee: string; trade: string };
  onClear: () => void;
  resultCount: number;
  isAr: boolean;
}

export function PlanFilterBar({ filters, onClear, resultCount, isAr }: Props) {
  const activeFilters = Object.entries(filters).filter(([_, v]) => v !== '').map(([k, v]) => `${k}: ${v}`);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b text-xs">
      <Badge variant="secondary" className="text-[10px]">
        {resultCount} {isAr ? 'نتيجة' : 'results'}
      </Badge>
      {activeFilters.map((f, i) => (
        <Badge key={i} variant="outline" className="text-[10px] capitalize">{f.replace('_', ' ')}</Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={onClear}>
        <X className="h-3 w-3 mr-1" />{isAr ? 'مسح' : 'Clear'}
      </Button>
    </div>
  );
}
