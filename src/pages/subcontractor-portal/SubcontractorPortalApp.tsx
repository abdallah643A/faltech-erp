import { Routes, Route } from 'react-router-dom';
import { useSubcontractorPortalAuth } from '@/hooks/useSubcontractorPortalAuth';
import SubPortalLayout from '@/components/subcontractor-portal/SubPortalLayout';
import SubPortalLogin from '@/components/subcontractor-portal/SubPortalLogin';
import SubPortalDashboard from './SubPortalDashboard';
import SubPortalClaims from './SubPortalClaims';
import SubPortalInvoices from './SubPortalInvoices';
import SubPortalManpower from './SubPortalManpower';
import SubPortalProgress from './SubPortalProgress';
import SubPortalVariations from './SubPortalVariations';
import SubPortalPunchList from './SubPortalPunchList';
import SubPortalPayments from './SubPortalPayments';
import { Loader2 } from 'lucide-react';

export default function SubcontractorPortalApp() {
  const { account, subcontractor, loading, login, logout, isAuthenticated } = useSubcontractorPortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !account || !subcontractor) {
    return <SubPortalLogin onLogin={login} />;
  }

  return (
    <SubPortalLayout
      subName={subcontractor.name}
      contactName={account.contact_name}
      onLogout={logout}
    >
      <Routes>
        <Route index element={<SubPortalDashboard account={account} subcontractor={subcontractor} />} />
        <Route path="claims" element={<SubPortalClaims subcontractor={subcontractor} />} />
        <Route path="invoices" element={<SubPortalInvoices subcontractor={subcontractor} />} />
        <Route path="manpower" element={<SubPortalManpower subcontractor={subcontractor} />} />
        <Route path="progress" element={<SubPortalProgress subcontractor={subcontractor} />} />
        <Route path="variations" element={<SubPortalVariations subcontractor={subcontractor} />} />
        <Route path="punch-list" element={<SubPortalPunchList subcontractor={subcontractor} />} />
        <Route path="payments" element={<SubPortalPayments subcontractor={subcontractor} />} />
      </Routes>
    </SubPortalLayout>
  );
}