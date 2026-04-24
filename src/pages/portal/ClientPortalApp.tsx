import { useParams, Routes, Route } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import PortalLayout from '@/components/portal/PortalLayout';
import PortalLogin from '@/components/portal/PortalLogin';
import PortalDashboard from '@/pages/portal/PortalDashboard';
import PortalProjects from '@/pages/portal/PortalProjects';
import PortalProjectDetail from '@/pages/portal/PortalProjectDetail';
import PortalInvoices from '@/pages/portal/PortalInvoices';
import PortalDocuments from '@/pages/portal/PortalDocuments';
import PortalChangeOrders from '@/pages/portal/PortalChangeOrders';
import PortalMessages from '@/pages/portal/PortalMessages';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ClientPortalApp() {
  const { t } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const { client, portal, loading, error, login, logout, trackEvent } = usePortalAuth(slug);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <Lock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Portal Not Found</h2>
            <p className="text-gray-500">This client portal doesn't exist or has been disabled.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client) {
    return <PortalLogin portal={portal} onLogin={login} />;
  }

  return (
    <PortalLayout portal={portal} clientName={client.full_name || client.email} onLogout={logout}>
      <Routes>
        <Route index element={<PortalDashboard portal={portal} client={client} />} />
        <Route path="projects" element={<PortalProjects portal={portal} />} />
        <Route path="projects/:projectId" element={<PortalProjectDetail portal={portal} />} />
        <Route path="invoices" element={<PortalInvoices portal={portal} />} />
        <Route path="documents" element={<PortalDocuments portal={portal} client={client} />} />
        <Route path="change-orders" element={<PortalChangeOrders portal={portal} client={client} />} />
        <Route path="messages" element={<PortalMessages portal={portal} client={client} />} />
      </Routes>
    </PortalLayout>
  );
}
