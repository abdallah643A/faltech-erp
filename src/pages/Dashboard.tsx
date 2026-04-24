import { useState, useEffect } from 'react';
import { useWorkspace, type WorkspaceKey } from '@/hooks/useWorkspace';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { GeneralDashboard } from '@/components/workspace/GeneralDashboard';
import { SalesWorkspace } from '@/components/workspace/SalesWorkspace';
import { ProcurementWorkspace } from '@/components/workspace/ProcurementWorkspace';
import { HRWorkspace } from '@/components/workspace/HRWorkspace';
import { FinanceWorkspace } from '@/components/workspace/FinanceWorkspace';
import { ManufacturingWorkspace } from '@/components/workspace/ManufacturingWorkspace';
import { ConstructionWorkspace } from '@/components/workspace/ConstructionWorkspace';
import { ExecutiveWorkspace } from '@/components/workspace/ExecutiveWorkspace';
import { HospitalWorkspace } from '@/components/workspace/HospitalWorkspace';
import { Button } from '@/components/ui/button';
import { Settings2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { ExecutiveBriefCard } from '@/components/dashboard/ExecutiveBriefCard';
import { PersonaSwitcher } from '@/components/dashboard/PersonaSwitcher';

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { preferredWorkspace, setWorkspace, isSettingWorkspace, needsSelection } = useWorkspace();
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (needsSelection) setShowSelector(true);
  }, [needsSelection]);

  const handleWorkspaceSelect = (key: WorkspaceKey) => {
    setWorkspace(key);
    setShowSelector(false);
  };

  const switchBtn = (
    <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowSelector(true)}>
      <Settings2 className="h-3.5 w-3.5" /> {t('dashboard.switchWorkspace')}
    </Button>
  );

  const renderWorkspace = () => {
    switch (preferredWorkspace) {
      case 'sales': return <SalesWorkspace />;
      case 'procurement': return <ProcurementWorkspace />;
      case 'hr': return <HRWorkspace />;
      case 'finance': return <FinanceWorkspace />;
      case 'manufacturing': return <ManufacturingWorkspace />;
      case 'construction': return <ConstructionWorkspace />;
      case 'executive': return <ExecutiveWorkspace />;
      case 'hospital': return <HospitalWorkspace />;
      default: return <GeneralDashboard extraActions={switchBtn} />;
    }
  };

  return (
    <div>
      <div className="flex justify-end items-center gap-2 mb-2">
        <PeriodSelector />
        <PersonaSwitcher />
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => navigate('/personal-dashboard')}>
          <Sparkles className="h-3.5 w-3.5" /> Builder
        </Button>
        {preferredWorkspace && preferredWorkspace !== 'general' && switchBtn}
      </div>
      <div className="mb-3"><ExecutiveBriefCard /></div>
      {renderWorkspace()}
      <WorkspaceSelector
        open={showSelector}
        onSelect={handleWorkspaceSelect}
        loading={isSettingWorkspace}
        currentWorkspace={preferredWorkspace}
      />
    </div>
  );
}
