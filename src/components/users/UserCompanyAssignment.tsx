import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';

interface UserCompanyAssignmentProps {
  selectedCompanyIds: string[];
  onCompanyIdsChange: (ids: string[]) => void;
}

export function UserCompanyAssignment({ selectedCompanyIds, onCompanyIdsChange }: UserCompanyAssignmentProps) {
  const { allCompanies, isLoadingAll } = useSAPCompanies();

  if (isLoadingAll) return <span className="text-xs text-muted-foreground">Loading companies...</span>;

  if (allCompanies.length === 0) {
    return <span className="text-xs text-muted-foreground">No SAP companies configured</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 mb-1">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {selectedCompanyIds.length} assigned
        </span>
      </div>
      <div className="max-h-[120px] overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/20">
        {allCompanies.map(company => (
          <div key={company.id} className="flex items-center gap-2">
            <Checkbox
              checked={selectedCompanyIds.includes(company.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onCompanyIdsChange([...selectedCompanyIds, company.id]);
                } else {
                  onCompanyIdsChange(selectedCompanyIds.filter(id => id !== company.id));
                }
              }}
            />
            <Label className="text-xs font-normal cursor-pointer flex items-center gap-1.5">
              {company.company_name}
              <span className="text-[10px] text-muted-foreground">({company.database_name})</span>
              {!company.is_active && (
                <Badge variant="outline" className="text-[9px] h-4">Inactive</Badge>
              )}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
