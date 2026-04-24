import { CadenceManager } from '@/components/crm/CadenceManager';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Cadences() {
  const { t } = useLanguage();
  return (
    <div className="page-enter">
      <CadenceManager />
    </div>
  );
}
