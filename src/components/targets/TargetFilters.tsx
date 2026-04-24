import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchHierarchyFilter } from '@/components/filters/BranchHierarchyFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TargetFiltersProps {
  salesEmployeeId: string;
  onSalesEmployeeChange: (id: string) => void;
  targetType: string;
  onTargetTypeChange: (type: string) => void;
  businessLineId: string;
  onBusinessLineChange: (id: string) => void;
  selectedRegions: string[];
  selectedCompanies: string[];
  selectedBranches: string[];
  onRegionsChange: (ids: string[]) => void;
  onCompaniesChange: (ids: string[]) => void;
  onBranchesChange: (ids: string[]) => void;
}

export function TargetFilters({
  salesEmployeeId, onSalesEmployeeChange,
  targetType, onTargetTypeChange,
  businessLineId, onBusinessLineChange,
  selectedRegions, selectedCompanies, selectedBranches,
  onRegionsChange, onCompaniesChange, onBranchesChange,
}: TargetFiltersProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['sales-employees-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('sales_employees').select('id, slp_name, slp_code').eq('is_active', true).order('slp_name');
      return data || [];
    },
  });

  const { data: businessLines = [] } = useQuery({
    queryKey: ['dimensions-business-line-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('dimensions').select('id, cost_center, name').eq('dimension_type', 'business_line').eq('is_active', true).order('cost_center');
      return data || [];
    },
  });

  const hasFilters = salesEmployeeId || (targetType && targetType !== 'all') || businessLineId || selectedRegions.length > 0 || selectedCompanies.length > 0 || selectedBranches.length > 0;

  const clearAll = () => {
    onSalesEmployeeChange('');
    onTargetTypeChange('all');
    onBusinessLineChange('');
    onRegionsChange([]);
    onCompaniesChange([]);
    onBranchesChange([]);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      {/* Target Type */}
      <Select value={targetType} onValueChange={onTargetTypeChange}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={isAr ? 'نوع الهدف' : 'Target Type'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isAr ? 'الكل' : 'All Types'}</SelectItem>
          <SelectItem value="sales">{isAr ? 'مبيعات' : 'Sales'}</SelectItem>
          <SelectItem value="collection">{isAr ? 'تحصيل' : 'Collection'}</SelectItem>
          <SelectItem value="both">{isAr ? 'الاثنين' : 'Both'}</SelectItem>
        </SelectContent>
      </Select>

      {/* Sales Employee */}
      <Select value={salesEmployeeId || '__all__'} onValueChange={v => onSalesEmployeeChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder={isAr ? 'موظف المبيعات' : 'Sales Employee'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{isAr ? 'الكل' : 'All Employees'}</SelectItem>
          {salesEmployees.map(se => (
            <SelectItem key={se.id} value={se.id}>{se.slp_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Branch Hierarchy */}
      <BranchHierarchyFilter
        selectedRegions={selectedRegions}
        selectedCompanies={selectedCompanies}
        selectedBranches={selectedBranches}
        onRegionsChange={onRegionsChange}
        onCompaniesChange={onCompaniesChange}
        onBranchesChange={onBranchesChange}
        compact
      />

      {/* Business Line */}
      <Select value={businessLineId || '__all__'} onValueChange={v => onBusinessLineChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder={isAr ? 'خط الأعمال' : 'Business Line'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{isAr ? 'كل خطوط الأعمال' : 'All Business Lines'}</SelectItem>
          {businessLines.map(bl => (
            <SelectItem key={bl.id} value={bl.id}>{bl.cost_center} - {bl.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-8">
          <X className="h-3 w-3 mr-1" />
          {isAr ? 'مسح الفلاتر' : 'Clear Filters'}
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
            {[salesEmployeeId, targetType !== 'all' ? targetType : '', businessLineId, ...selectedRegions, ...selectedCompanies, ...selectedBranches].filter(Boolean).length}
          </Badge>
        </Button>
      )}
    </div>
  );
}
