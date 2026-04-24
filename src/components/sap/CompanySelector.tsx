import { useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useSAPCompanies } from '@/hooks/useSAPCompanies';

export function CompanySelector() {
  const { userCompanies, activeCompany, setActiveCompany } = useSAPCompanies();

  if (userCompanies.length <= 1 && !activeCompany) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-tour="company-selector">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/10 gap-1.5 max-w-[200px]"
        >
          <Building2 className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {activeCompany?.company_name || 'Select Company'}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          SAP Company
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userCompanies.map(company => (
          <DropdownMenuItem
            key={company.id}
            onClick={() => {
              if (company.id !== activeCompany?.id) {
                setActiveCompany.mutate(company.id);
              }
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{company.company_name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{company.database_name}</div>
            </div>
            {company.id === activeCompany?.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        {userCompanies.length === 0 && (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            No companies assigned
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
