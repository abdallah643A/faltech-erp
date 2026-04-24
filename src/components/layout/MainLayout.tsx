import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatAssistant } from '@/components/ai/AIChatAssistant';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { PageHelpButton } from '@/components/shared/PageHelpButton';
import { PageHelpTrigger } from '@/components/help/PageHelpTrigger';
import { VideoHelpTrigger } from '@/components/help/VideoHelpTrigger';
import { QAModeIndicator } from '@/components/qa/QAModeIndicator';
import { QuickActionsFab } from '@/components/shared/QuickActionsFab';
import { KeyboardShortcutsProvider } from '@/components/shared/KeyboardShortcutsProvider';
import { OfflineIndicator } from '@/components/cpms/mobile/OfflineIndicator';
import { SAPSyncProgressBar } from '@/components/sap/SAPSyncProgressBar';
import { useSyncProgress } from '@/contexts/SyncProgressContext';
import { FavoritesBar } from '@/components/favorites/FavoritesBar';
import { NotificationToaster } from '@/components/notifications/NotificationToaster';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { WorkspaceTabBar } from '@/components/workspace/WorkspaceTabBar';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import { IndustryRouteGuard } from '@/components/industry/IndustryRouteGuard';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { CheckCircle2, Clock, User } from 'lucide-react';

function StatusBar() {
  const { profile, roles } = useAuth();
  const { currencyCode, currencySymbol } = useCompanyCurrency();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const primaryRole = roles[0] || 'USER';

  return (
    <footer className="hidden md:flex h-7 bg-muted/60 border-t border-border items-center justify-between px-3 text-[11px] text-muted-foreground shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-success" />
          <span>Connected</span>
        </div>
        <div className="flex items-center gap-1 border-l border-border pl-3">
          <span className="font-semibold text-foreground">{currencySymbol}</span>
          <span>{currencyCode}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{displayName} ({primaryRole.toUpperCase().replace('_', ' ')})</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </footer>
  );
}

// Convert path like "/ar-invoices" to "AR Invoices", "/sales-orders/new" to "New Sales Order"
function pathToTitle(path: string): string {
  const clean = path.replace(/^\//, '').replace(/\?.*$/, '');
  if (!clean) return 'Dashboard';
  
  const segments = clean.split('/');
  const base = segments[0]
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  if (segments.length >= 2) {
    const action = segments[segments.length - 1];
    if (action === 'new') return `New ${base.replace(/s$/, '')}`;
    if (action === 'edit') return `Edit ${base.replace(/s$/, '')}`;
  }
  
  return base;
}

// Skip tab creation for these paths
const SKIP_TAB_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const { direction } = useLanguage();
  const { syncState } = useSyncProgress();
  const location = useLocation();
  const { openTab, tabs } = useWorkspaceTabs();

  // Auto-open tabs for ALL page navigations (path-only dep to avoid loops)
  useEffect(() => {
    const path = location.pathname;
    if (SKIP_TAB_PATHS.includes(path)) return;
    openTab({ title: pathToTitle(path), path });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className={cn('h-screen flex flex-col w-full bg-background', direction === 'rtl' && 'font-arabic')}>
      <QAModeIndicator />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <FavoritesBar />
      {(syncState.isLoading || syncState.result) && (
        <div className="px-3 md:px-5 pt-1">
          <SAPSyncProgressBar
            isLoading={syncState.isLoading}
            entityLabel={syncState.entityLabel}
            result={syncState.result}
            syncedSoFar={syncState.syncedSoFar}
            totalToSync={syncState.totalToSync}
            dateFrom={syncState.dateFrom}
            dateTo={syncState.dateTo}
          />
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkspaceTabBar />
          <Breadcrumbs />
          <main id="main-content" className="flex-1 px-2 sm:px-3 md:px-5 pt-2 pb-3 md:pb-5 overflow-auto" role="main" tabIndex={-1} data-tour="kpi-cards">
            <div className="flex justify-end mb-1 gap-1">
              <VideoHelpTrigger />
              <PageHelpTrigger />
              <PageHelpButton />
            </div>
            <IndustryRouteGuard><Outlet /></IndustryRouteGuard>
          </main>
        </div>
      </div>
      
      <StatusBar />
      <AIChatAssistant />
      <OnboardingTour />
      <OfflineIndicator />
      <QuickActionsFab />
      <KeyboardShortcutsProvider />
      <NotificationToaster />
    </div>
  );
}
