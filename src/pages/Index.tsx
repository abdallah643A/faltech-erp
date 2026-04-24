import Dashboard from './Dashboard';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const { t } = useLanguage();
  return <Dashboard />;
};

export default Index;
