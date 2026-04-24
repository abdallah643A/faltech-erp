import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CreditCard, 
  ShieldCheck, 
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FinanceAlertsList } from '@/components/finance/FinanceAlertsList';
import { PaymentVerificationList } from '@/components/finance/PaymentVerificationList';
import { FinancialClearanceList } from '@/components/finance/FinancialClearanceList';
import { FinanceReports } from '@/components/finance/FinanceReports';
import { FinanceAgingReport } from '@/components/finance/FinanceAgingReport';
import { useFinanceStats } from '@/hooks/useFinance';
import { useLanguage } from '@/contexts/LanguageContext';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';

export default function Finance() {
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { t, language } = useLanguage();
  const stats = useFinanceStats();
  const [activeTab, setActiveTab] = useState('alerts');
  const [searchQuery, setSearchQuery] = useState('');

  const collectionRate = stats.totalContractValue > 0
    ? ((stats.totalReceived / stats.totalContractValue) * 100)
    : 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-foreground">
            {language === 'ar' ? 'الوحدة المالية' : 'Finance Module'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {language === 'ar' 
              ? 'إدارة التحققات والتصاريح المالية وتتبع المدفوعات المستحقة'
              : 'Manage payment verifications, financial clearances, and track outstanding payments'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SAPSyncButton entity="financial_clearance" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('alerts')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تنبيهات معلقة' : 'Pending Alerts'}
                </p>
                <p className="text-2xl font-bold">{stats.pendingAlertsCount}</p>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('verifications')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تحققات معلقة' : 'Verifications'}
                </p>
                <p className="text-2xl font-bold">{stats.pendingVerificationsCount}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('clearances')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'تصاريح معلقة' : 'Clearances'}
                </p>
                <p className="text-2xl font-bold">{stats.pendingClearancesCount}</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('reports')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'معدل التحصيل' : 'Collection Rate'}
                </p>
                <p className="text-2xl font-bold">{collectionRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {collectionRate >= 50 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-[10px] ${collectionRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                    {collectionRate >= 50 ? 'On track' : 'Below target'}
                  </span>
                </div>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer col-span-2 lg:col-span-1" onClick={() => setActiveTab('aging')}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'إجمالي المستحق' : 'Outstanding'}
                </p>
                <p className="text-xl font-bold">SAR {stats.totalOutstanding.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === 'ar' ? 'بحث في السجلات المالية...' : 'Search finance records...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="alerts" className="flex items-center gap-1.5 text-xs md:text-sm">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'التنبيهات' : 'Alerts'}</span>
            {stats.pendingAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {stats.pendingAlertsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verifications" className="flex items-center gap-1.5 text-xs md:text-sm">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'التحققات' : 'Verification'}</span>
            {stats.pendingVerificationsCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {stats.pendingVerificationsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clearances" className="flex items-center gap-1.5 text-xs md:text-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'التصاريح' : 'Clearance'}</span>
            {stats.pendingClearancesCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {stats.pendingClearancesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-1.5 text-xs md:text-sm">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'تقادم المديونية' : 'Aging'}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs md:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{language === 'ar' ? 'التقارير' : 'Reports'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <FinanceAlertsList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="verifications">
          <PaymentVerificationList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="clearances">
          <FinancialClearanceList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="aging">
          <FinanceAgingReport />
        </TabsContent>

        <TabsContent value="reports">
          <FinanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
