import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';
import { cn } from '@/lib/utils';

interface CompanyMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  className?: string;
  /** When true, shows "All Companies" option */
  allowAll?: boolean;
}

export function CompanyMultiSelect({ selectedIds, onChange, label = 'Company', className, allowAll = true }: CompanyMultiSelectProps) {
  const { companies } = useSAPCompanies();
  const [open, setOpen] = useState(false);

  const allSelected = selectedIds.length === companies.length && companies.length > 0;

  const toggleCompany = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(c => c !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(companies.map(c => c.id));
    }
  };

  const selectedNames = companies.filter(c => selectedIds.includes(c.id)).map(c => c.company_name);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs justify-between min-w-[180px] max-w-[320px]">
            <span className="truncate">
              {selectedIds.length === 0
                ? 'Select companies...'
                : allSelected
                  ? 'All Companies'
                  : selectedNames.length <= 2
                    ? selectedNames.join(', ')
                    : `${selectedNames.length} companies`}
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-2" align="start">
          {allowAll && (
            <div
              className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-accent/50 border-b mb-1"
              onClick={toggleAll}
            >
              <Checkbox checked={allSelected} />
              <span className="text-xs font-semibold">All Companies</span>
            </div>
          )}
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {companies.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-accent/50"
                onClick={() => toggleCompany(c.id)}
              >
                <Checkbox checked={selectedIds.includes(c.id)} />
                <span className="text-xs truncate">{c.company_name}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">({c.database_name})</span>
              </div>
            ))}
          </div>
          {selectedIds.length > 0 && (
            <div className="border-t mt-1 pt-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => { onChange([]); }}>
                <X className="h-3 w-3 mr-1" /> Clear Selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {selectedIds.length > 0 && selectedIds.length <= 3 && !allSelected && (
        <div className="flex gap-1 flex-wrap">
          {selectedNames.map((name, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] h-5">
              {name}
              <X className="h-2.5 w-2.5 ml-1 cursor-pointer" onClick={() => toggleCompany(selectedIds[i])} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
