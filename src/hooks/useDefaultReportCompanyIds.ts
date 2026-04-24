import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';

type HasCompanyIds = {
  companyIds: string[];
};

export function useDefaultReportCompanyIds<T extends HasCompanyIds>(
  setFilters: Dispatch<SetStateAction<T>>
) {
  const { activeCompanyId } = useActiveCompany();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !activeCompanyId) return;

    setFilters(current => {
      if (current.companyIds.length > 0) return current;
      return { ...current, companyIds: [activeCompanyId] };
    });

    initializedRef.current = true;
  }, [activeCompanyId, setFilters]);

  return activeCompanyId ? [activeCompanyId] : [];
}