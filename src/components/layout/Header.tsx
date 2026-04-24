import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, User, LogOut, Globe, Menu, RefreshCw, CheckCircle2, HelpCircle } from 'lucide-react';
import { IndustryThemeSwitcher } from '@/components/layout/IndustryThemeSwitcher';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { useNavigate } from 'react-router-dom';
import { useSAPSync } from '@/hooks/useSAPSync';
import { useQueryClient } from '@tanstack/react-query';
import { SAPSyncProgressBar } from '@/components/sap/SAPSyncProgressBar';
import { Button } from '@/components/ui/button';
import { GlobalSpotlightSearch } from '@/components/search/GlobalSpotlightSearch';
import { CentralizedNotificationCenter } from '@/components/notifications/CentralizedNotificationCenter';
import { PinnedRecordsTray } from '@/components/layout/PinnedRecordsTray';
import { RecentlyViewedTray } from '@/components/layout/RecentlyViewedTray';
import { useOnboardingTour } from '@/components/onboarding/OnboardingTour';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useLanguage, LANGUAGE_OPTIONS } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
// NotificationCenter replaced by EnhancedNotificationCenter
import { CompanySelector } from '@/components/sap/CompanySelector';
import { Badge } from '@/components/ui/badge';
import { HighContrastToggle } from '@/components/accessibility/HighContrastToggle';
import { PreferencesMenu } from '@/components/preferences/PreferencesMenu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface HeaderProps {
  onMenuToggle: () => void;
}

interface SearchItem {
  label: string;
  href: string;
  group: string;
}

const searchItems: SearchItem[] = [
  { label: 'Dashboard', href: '/', group: 'Main' },
  { label: 'POS Quick Sale', href: '/pos', group: 'Main' },
  { label: 'Bank POS Terminal', href: '/bank-pos', group: 'Main' },
  { label: 'Quotes', href: '/quotes', group: 'Transactions' },
  { label: 'Sales Orders', href: '/sales-orders', group: 'Transactions' },
  { label: 'Delivery Notes', href: '/delivery-notes', group: 'Transactions' },
  { label: 'AR Invoices', href: '/ar-invoices', group: 'Transactions' },
  { label: 'AR Credit Memos', href: '/ar-credit-memos', group: 'Transactions' },
  { label: 'AR Returns', href: '/ar-returns', group: 'Transactions' },
  { label: 'Incoming Payments', href: '/incoming-payments', group: 'Transactions' },
  { label: 'Material Requests', href: '/material-requests', group: 'Procurement' },
  { label: 'Procurement', href: '/procurement', group: 'Procurement' },
  { label: 'Finance Overview', href: '/finance', group: 'Finance' },
  { label: 'Finance Gates', href: '/finance-gates', group: 'Finance' },
  { label: 'Exchange Rates', href: '/banking/exchange-rates', group: 'Finance' },
  { label: 'Bank Statements', href: '/banking/statements', group: 'Finance' },
  { label: 'Payment Reconciliation', href: '/banking/reconciliation', group: 'Finance' },
  { label: 'Landed Costs', href: '/landed-costs', group: 'Finance' },
  { label: 'General Ledger', href: '/general-ledger', group: 'Finance' },
  { label: 'Chart of Accounts', href: '/chart-of-accounts', group: 'Finance' },
  { label: 'Journal Entries', href: '/journal-entries', group: 'Finance' },
  { label: 'Journal Vouchers', href: '/journal-vouchers', group: 'Finance' },
  { label: 'Goods Receipt', href: '/inventory/goods-receipt', group: 'Inventory' },
  { label: 'Goods Issue', href: '/inventory/goods-issue', group: 'Inventory' },
  { label: 'Stock Transfer', href: '/inventory/stock-transfer', group: 'Inventory' },
  { label: 'Inventory Counting', href: '/inventory/counting', group: 'Inventory' },
  { label: 'Bin Locations', href: '/inventory/bin-locations', group: 'Inventory' },
  { label: 'Batch & Serial Tracking', href: '/inventory/batch-serial', group: 'Inventory' },
  { label: 'Item Warehouse Info', href: '/inventory/item-warehouse', group: 'Inventory' },
  { label: 'Leads', href: '/leads', group: 'CRM' },
  { label: 'Opportunities', href: '/opportunities', group: 'CRM' },
  { label: 'Activities', href: '/activities', group: 'CRM' },
  { label: 'Calendar', href: '/calendar', group: 'CRM' },
  { label: 'Tasks', href: '/tasks', group: 'CRM' },
  { label: 'Visits', href: '/visits', group: 'CRM' },
  { label: 'Visit Analytics', href: '/visit-analytics', group: 'CRM' },
  { label: 'Customer 360', href: '/customer-360', group: 'CRM' },
  { label: 'Sales Pipeline', href: '/sales-pipeline', group: 'CRM' },
  { label: 'Follow-Up Automation', href: '/follow-up-automation', group: 'CRM' },
  { label: 'Email Templates', href: '/email-templates', group: 'CRM' },
  { label: 'Document Management', href: '/document-management', group: 'CRM' },
  { label: 'Business Partners', href: '/business-partners', group: 'Master Data' },
  { label: 'Items', href: '/items', group: 'Master Data' },
  { label: 'Warehouses', href: '/warehouses', group: 'Master Data' },
  { label: 'Price Lists', href: '/price-lists', group: 'Master Data' },
  { label: 'Tax Codes', href: '/tax-codes', group: 'Master Data' },
  { label: 'Reports', href: '/reports', group: 'Main' },
  { label: 'Workflow Setup', href: '/approval-workflows', group: 'Main' },
  { label: 'Questionnaires', href: '/questionnaires', group: 'Main' },
  { label: 'Targets', href: '/targets', group: 'Main' },
  { label: 'Assets', href: '/assets', group: 'Main' },
  { label: 'IT Service', href: '/it-service', group: 'Main' },
  { label: 'Advanced Analytics', href: '/advanced-analytics', group: 'Main' },
  { label: 'HR Dashboard', href: '/hr', group: 'HR' },
  { label: 'Employees', href: '/hr/employees', group: 'HR' },
  { label: 'Departments', href: '/hr/departments', group: 'HR' },
  { label: 'Positions', href: '/hr/positions', group: 'HR' },
  { label: 'Leave Management', href: '/hr/leave', group: 'HR' },
  { label: 'Attendance', href: '/hr/attendance', group: 'HR' },
  { label: 'Payroll', href: '/hr/payroll', group: 'HR' },
  { label: 'Performance', href: '/hr/performance', group: 'HR' },
  { label: 'Training', href: '/hr/training', group: 'HR' },
  { label: 'Recruitment', href: '/hr/recruitment', group: 'HR' },
  { label: 'Self-Service', href: '/hr/self-service', group: 'HR' },
  { label: 'Projects', href: '/pm/projects', group: 'Industry' },
  { label: 'Technical Assessment', href: '/technical-assessment', group: 'Industry' },
  { label: 'Design & Costing', href: '/design-costing', group: 'Industry' },
  { label: 'Manufacturing', href: '/manufacturing', group: 'Industry' },
  { label: 'Delivery & Installation', href: '/delivery-installation', group: 'Industry' },
  { label: 'Payment Certificates', href: '/payment-certificates', group: 'Industry' },
  { label: 'Contract Progress', href: '/contract-progress', group: 'Industry' },
  { label: 'CPMS Dashboard', href: '/cpms', group: 'CPMS' },
  { label: 'CPMS Daily Reports', href: '/cpms/daily-reports', group: 'CPMS' },
  { label: 'CPMS Costs', href: '/cpms/costs', group: 'CPMS' },
  { label: 'CPMS Billing', href: '/cpms/billing', group: 'CPMS' },
  { label: 'CPMS Documents', href: '/cpms/documents', group: 'CPMS' },
  { label: 'CPMS HSE', href: '/cpms/hse', group: 'CPMS' },
  { label: 'Admin Panel', href: '/admin', group: 'Settings' },
  { label: 'Admin Settings', href: '/admin-settings', group: 'Settings' },
  { label: 'Users', href: '/users', group: 'Settings' },
  { label: 'User Config', href: '/user-config', group: 'Settings' },
  { label: 'Authorization', href: '/authorization', group: 'Settings' },
  { label: 'Region Config', href: '/region-config', group: 'Settings' },
  { label: 'Dimensions', href: '/dimensions', group: 'Settings' },
  { label: 'Sales Employees', href: '/sales-employees', group: 'Settings' },
  { label: 'Numbering Series', href: '/numbering-series', group: 'Settings' },
  { label: 'Workflows', href: '/workflow', group: 'Settings' },
  { label: 'SLA Configuration', href: '/sla-configuration', group: 'Settings' },
  { label: 'Payment Certificate Types', href: '/payment-certificate-types', group: 'Settings' },
  { label: 'Payment Means Settings', href: '/payment-means-settings', group: 'Settings' },
  { label: 'SAP Integration', href: '/sap-integration', group: 'Settings' },
  { label: 'ZATCA Integration', href: '/zatca', group: 'Settings' },
  { label: 'Sync Error Logs', href: '/sync-error-logs', group: 'Settings' },
  { label: 'WhatsApp Settings', href: '/whatsapp-settings', group: 'Settings' },
  { label: 'WhatsApp Invoice Automation', href: '/whatsapp-invoice', group: 'Settings' },
  { label: 'Mail Configuration', href: '/mail-configuration', group: 'Settings' },
  { label: 'ElevenLabs Settings', href: '/elevenlabs-settings', group: 'Settings' },
];

export function Header({ onMenuToggle }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const { sync: headerSync, isLoading: headerSyncing, lastResult: headerSyncResult } = useSAPSync();
  const { startTour } = useOnboardingTour();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Language is now handled via dropdown below

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSelect = useCallback((href: string) => {
    setCommandOpen(false);
    navigate(href);
  }, [navigate]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    searchItems.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, []);

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const primaryRole = roles[0] || 'user';

  return (
    <>
      <header className="h-12 bg-primary flex items-center justify-between px-2 md:px-3 sticky top-0 z-50 shadow-md">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onMenuToggle} title="Toggle sidebar navigation" className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden lg:flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary-foreground/15 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">SAP</span>
            </div>
            <span className="text-sm font-semibold text-primary-foreground tracking-wide">SAP B1 POS</span>
          </div>
          <CompanySelector />
        </div>

        {/* Center search - opens command palette */}
        <div className="hidden md:flex items-center flex-1 max-w-lg mx-6" data-tour="search">
          <button
            onClick={() => setCommandOpen(true)}
            title="Search everything (Ctrl+K)"
            className="relative w-full flex items-center h-8 bg-primary-foreground/10 border border-primary-foreground/20 rounded-md px-3 text-xs text-primary-foreground/40 hover:bg-primary-foreground/15 transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 mr-2 text-primary-foreground/50" />
            {t('header.search')}
            <kbd className="ml-auto text-[10px] bg-primary-foreground/10 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          {/* Sync to SAP */}
          <Button
            variant="ghost"
            size="sm"
            title="Open SAP integration & sync settings"
            className="h-7 px-2.5 text-xs font-medium bg-success/90 text-success-foreground hover:bg-success hover:text-success-foreground rounded-md gap-1.5"
            onClick={() => navigate('/sap-integration')}
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Sync to SAP</span>
          </Button>

          {/* Refresh Data */}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
            onClick={() => queryClient.invalidateQueries()}
            title="Refresh all data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Connection status - desktop only */}
          <button type="button" title="SAP connection is active" className="hidden lg:flex items-center gap-1 px-2 cursor-default">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </button>

          {/* High Contrast Toggle - hidden on mobile */}
          <div className="hidden md:block">
            <HighContrastToggle />
          </div>

          <div className="hidden md:block">
            <PreferencesMenu />
          </div>

          {/* Theme Switcher - hidden on small mobile */}
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>

          {/* Industry Theme Switcher - hidden on mobile */}
          <div className="hidden md:block">
            <IndustryThemeSwitcher />
          </div>

          {/* Language Selector - hidden on small mobile */}
          <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
                title="Change display language"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>{t('header.language')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LANGUAGE_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={language === opt.code ? 'bg-accent font-semibold' : ''}
                >
                  <span className="flex-1">{opt.nativeLabel}</span>
                  <span className="text-xs text-muted-foreground">{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>

          {/* Recently viewed tray */}
          <RecentlyViewedTray />

          {/* Pinned records tray */}
          <PinnedRecordsTray />

          {/* Notifications */}
          <div className="[&_button]:text-primary-foreground [&_button]:hover:bg-primary-foreground/10" title="View notifications & alerts">
            <CentralizedNotificationCenter />
          </div>

          {/* Tour restart - hidden on mobile */}
          <Button variant="ghost" size="icon" title="Start guided tour" className="hidden sm:flex text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8" onClick={startTour}>
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-8 px-2 text-primary-foreground hover:bg-primary-foreground/10" title="Account settings & logout">
                <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center ring-1 ring-primary-foreground/30">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={displayName} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  )}
                </div>
                <span className="hidden md:inline text-xs font-medium text-primary-foreground">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">{displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                  <Badge variant="outline" className="mt-1 w-fit text-[10px] capitalize">{primaryRole.replace('_', ' ')}</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {t('header.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global sync progress bar below header */}
      {(headerSyncing || headerSyncResult) && (
        <div className="px-3 py-1 bg-background border-b">
          <SAPSyncProgressBar isLoading={headerSyncing} result={headerSyncResult} compact />
        </div>
      )}

      <GlobalSpotlightSearch open={commandOpen} onOpenChange={setCommandOpen} />
    </>

  );
}
