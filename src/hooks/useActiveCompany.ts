import { useSAPCompanies } from '@/hooks/useSAPCompanies';

/**
 * Returns the active company ID for the current user.
 * Use this in all hooks to filter data by company.
 */
export function useActiveCompany() {
  const { activeCompany, activeCompanyId } = useSAPCompanies();
  return {
    activeCompanyId: activeCompanyId as string | null,
    activeCompany,
  };
}
