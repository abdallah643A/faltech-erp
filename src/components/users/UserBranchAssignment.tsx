import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Building2, GitBranch } from 'lucide-react';

interface Region { id: string; name: string; name_ar: string | null; is_active: boolean; }
interface Company { id: string; name: string; name_ar: string | null; region_id: string; is_active: boolean; }
interface Branch { id: string; name: string; name_ar: string | null; company_id: string; is_active: boolean; }

interface UserBranchAssignmentProps {
  selectedBranchIds: string[];
  onBranchIdsChange: (ids: string[]) => void;
}

export function UserBranchAssignment({ selectedBranchIds, onBranchIdsChange }: UserBranchAssignmentProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const { data: regions = [] } = useQuery({
    queryKey: ['assign-regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as Region[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['assign-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as Company[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['assign-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as Branch[];
    },
  });

  const getName = (item: { name: string; name_ar: string | null }) =>
    isAr && item.name_ar ? item.name_ar : item.name;

  // Get all branch IDs for a region
  const getRegionBranchIds = (regionId: string) => {
    const regionCompanyIds = companies.filter(c => c.region_id === regionId).map(c => c.id);
    return branches.filter(b => regionCompanyIds.includes(b.company_id)).map(b => b.id);
  };

  // Get all branch IDs for a company
  const getCompanyBranchIds = (companyId: string) => {
    return branches.filter(b => b.company_id === companyId).map(b => b.id);
  };

  // Check if all branches in a region are selected
  const isRegionAllSelected = (regionId: string) => {
    const ids = getRegionBranchIds(regionId);
    return ids.length > 0 && ids.every(id => selectedBranchIds.includes(id));
  };

  const isRegionPartial = (regionId: string) => {
    const ids = getRegionBranchIds(regionId);
    const some = ids.some(id => selectedBranchIds.includes(id));
    return some && !isRegionAllSelected(regionId);
  };

  // Check if all branches in a company are selected
  const isCompanyAllSelected = (companyId: string) => {
    const ids = getCompanyBranchIds(companyId);
    return ids.length > 0 && ids.every(id => selectedBranchIds.includes(id));
  };

  const isCompanyPartial = (companyId: string) => {
    const ids = getCompanyBranchIds(companyId);
    const some = ids.some(id => selectedBranchIds.includes(id));
    return some && !isCompanyAllSelected(companyId);
  };

  // Select All
  const allBranchIds = branches.map(b => b.id);
  const isAllSelected = allBranchIds.length > 0 && allBranchIds.every(id => selectedBranchIds.includes(id));

  const toggleAll = () => {
    if (isAllSelected) {
      onBranchIdsChange([]);
    } else {
      onBranchIdsChange([...allBranchIds]);
    }
  };

  const toggleRegion = (regionId: string) => {
    const ids = getRegionBranchIds(regionId);
    if (isRegionAllSelected(regionId)) {
      onBranchIdsChange(selectedBranchIds.filter(id => !ids.includes(id)));
    } else {
      onBranchIdsChange([...new Set([...selectedBranchIds, ...ids])]);
    }
  };

  const toggleCompany = (companyId: string) => {
    const ids = getCompanyBranchIds(companyId);
    if (isCompanyAllSelected(companyId)) {
      onBranchIdsChange(selectedBranchIds.filter(id => !ids.includes(id)));
    } else {
      onBranchIdsChange([...new Set([...selectedBranchIds, ...ids])]);
    }
  };

  const toggleBranch = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      onBranchIdsChange(selectedBranchIds.filter(id => id !== branchId));
    } else {
      onBranchIdsChange([...selectedBranchIds, branchId]);
    }
  };

  if (regions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 border rounded-md">
        {isAr ? 'لا توجد مناطق/شركات/فروع مُعَرَّفة بعد. يرجى إعدادها أولاً.' : 'No regions/companies/branches configured yet. Please set them up first.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        {isAr ? 'تعيين الفروع' : 'Branch Assignment'}
      </Label>
      <ScrollArea className="h-[280px] border rounded-md p-3">
        {/* Select All */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleAll}
          />
          <span className="font-semibold text-sm">{isAr ? 'تحديد الكل' : 'Select All'}</span>
          <Badge variant="secondary" className="ml-auto">{selectedBranchIds.length}/{allBranchIds.length}</Badge>
        </div>

        {regions.map(region => {
          const regionCompanies = companies.filter(c => c.region_id === region.id);
          if (regionCompanies.length === 0) return null;

          return (
            <div key={region.id} className="mb-3">
              {/* Region level */}
              <div className="flex items-center gap-2 mb-1">
                <Checkbox
                  checked={isRegionAllSelected(region.id)}
                  // @ts-ignore
                  indeterminate={isRegionPartial(region.id)}
                  onCheckedChange={() => toggleRegion(region.id)}
                />
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{getName(region)}</span>
              </div>

              {regionCompanies.map(company => {
                const companyBranches = branches.filter(b => b.company_id === company.id);
                if (companyBranches.length === 0) return null;

                return (
                  <div key={company.id} className="ml-6 mb-2">
                    {/* Company level */}
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        checked={isCompanyAllSelected(company.id)}
                        onCheckedChange={() => toggleCompany(company.id)}
                      />
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{getName(company)}</span>
                    </div>

                    {/* Branch level */}
                    {companyBranches.map(branch => (
                      <div key={branch.id} className="ml-6 flex items-center gap-2 py-0.5">
                        <Checkbox
                          checked={selectedBranchIds.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id)}
                        />
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getName(branch)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
