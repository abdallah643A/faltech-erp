import BranchCompanyHealthDashboard from '@/components/health/BranchCompanyHealthDashboard';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BranchHealthPage() {
  const { t } = useLanguage();
  return <BranchCompanyHealthDashboard />;
}
