import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, ChevronDown, X } from 'lucide-react';

interface Region { id: string; name: string; name_ar: string | null }
interface Company { id: string; name: string; name_ar: string | null; region_id: string }
interface Branch { id: string; name: string; name_ar: string | null; company_id: string }

interface BranchHierarchyFilterProps {
  selectedRegions: string[];
  selectedCompanies: string[];
  selectedBranches: string[];
  onRegionsChange: (ids: string[]) => void;
  onCompaniesChange: (ids: string[]) => void;
  onBranchesChange: (ids: string[]) => void;
  compact?: boolean;
}

export function BranchHierarchyFilter({
  selectedRegions, selectedCompanies, selectedBranches,
  onRegionsChange, onCompaniesChange, onBranchesChange,
  compact = false,
}: BranchHierarchyFilterProps) {
  const { language } = useLanguage();
  const [openPopover, setOpenPopover] = useState<'region' | 'company' | 'branch' | null>(null);

  const { data: regions = [] } = useQuery({
    queryKey: ['filter-regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('id, name, name_ar').eq('is_active', true).order('sort_order');
      return (data || []) as Region[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['filter-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name, name_ar, region_id').eq('is_active', true).order('sort_order');
      return (data || []) as Company[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['filter-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, name_ar, company_id').eq('is_active', true).order('sort_order');
      return (data || []) as Branch[];
    },
  });

  const filteredCompanies = useMemo(() => {
    if (selectedRegions.length === 0) return companies;
    return companies.filter(c => selectedRegions.includes(c.region_id));
  }, [companies, selectedRegions]);

  const filteredBranches = useMemo(() => {
    let result = branches;
    if (selectedCompanies.length > 0) {
      result = result.filter(b => selectedCompanies.includes(b.company_id));
    } else if (selectedRegions.length > 0) {
      const companyIds = filteredCompanies.map(c => c.id);
      result = result.filter(b => companyIds.includes(b.company_id));
    }
    return result;
  }, [branches, selectedCompanies, selectedRegions, filteredCompanies]);

  const totalSelected = selectedRegions.length + selectedCompanies.length + selectedBranches.length;

  const toggleItem = (id: string, selected: string[], onChange: (ids: string[]) => void) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const clearAll = () => {
    onRegionsChange([]);
    onCompaniesChange([]);
    onBranchesChange([]);
  };

  const getName = (item: { name: string; name_ar: string | null }) =>
    language === 'ar' && item.name_ar ? item.name_ar : item.name;

  const renderMultiSelect = (
    label: string,
    items: Array<{ id: string; name: string; name_ar: string | null }>,
    selected: string[],
    onChange: (ids: string[]) => void,
    popoverKey: 'region' | 'company' | 'branch',
  ) => (
    <Popover open={openPopover === popoverKey} onOpenChange={(open) => setOpenPopover(open ? popoverKey : null)}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={compact ? 'sm' : 'default'} className="justify-between min-w-[140px]">
          <span className="truncate text-xs">
            {selected.length === 0 ? label : `${label} (${selected.length})`}
          </span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="start">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">
            {language === 'ar' ? 'لا توجد خيارات' : 'No options available'}
          </p>
        ) : (
          items.map(item => (
            <label
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
            >
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={() => toggleItem(item.id, selected, onChange)}
              />
              <span className="truncate">{getName(item)}</span>
            </label>
          ))
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      {renderMultiSelect(
        language === 'ar' ? 'المنطقة' : 'Region',
        regions, selectedRegions, onRegionsChange, 'region',
      )}
      {renderMultiSelect(
        language === 'ar' ? 'الشركة' : 'Company',
        filteredCompanies, selectedCompanies, onCompaniesChange, 'company',
      )}
      {renderMultiSelect(
        language === 'ar' ? 'الفرع' : 'Branch',
        filteredBranches, selectedBranches, onBranchesChange, 'branch',
      )}
      {totalSelected > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7">
          <X className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'مسح' : 'Clear'}
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{totalSelected}</Badge>
        </Button>
      )}
    </div>
  );
}

/** Utility: given filter selections + hierarchy data, returns the set of branch IDs to filter on. Empty means "all". */
export function getFilteredBranchIds(
  selectedRegions: string[],
  selectedCompanies: string[],
  selectedBranches: string[],
  allCompanies: Array<{ id: string; region_id: string }>,
  allBranches: Array<{ id: string; company_id: string }>,
): string[] {
  if (selectedBranches.length > 0) return selectedBranches;

  let companyIds = selectedCompanies;
  if (companyIds.length === 0 && selectedRegions.length > 0) {
    companyIds = allCompanies.filter(c => selectedRegions.includes(c.region_id)).map(c => c.id);
  }

  if (companyIds.length > 0) {
    return allBranches.filter(b => companyIds.includes(b.company_id)).map(b => b.id);
  }

  return []; // empty = no filter
}
