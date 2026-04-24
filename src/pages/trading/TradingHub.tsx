import { useState } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Users, DollarSign, TrendingUp, Shield } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const OrderFulfillment = lazy(() => import('./OrderFulfillment'));
const VendorManagement = lazy(() => import('./VendorManagement'));
const PricingMargin = lazy(() => import('./PricingMargin'));
const SalesForecasting = lazy(() => import('./SalesForecasting'));
const CreditManagement = lazy(() => import('./CreditManagement'));

function TabLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}

export default function TradingHub() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const [activeTab, setActiveTab] = useState('fulfillment');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trading Hub</h1>
        <p className="text-muted-foreground">Comprehensive trading operations management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fulfillment" className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> <span className="hidden md:inline">Order Fulfillment</span>
          </TabsTrigger>
          <TabsTrigger value="vendor" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> <span className="hidden md:inline">Vendor Mgmt</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> <span className="hidden md:inline">Pricing & Margin</span>
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> <span className="hidden md:inline">Forecasting</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> <span className="hidden md:inline">Credit Mgmt</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<TabLoader />}>
          <TabsContent value="fulfillment"><OrderFulfillment /></TabsContent>
          <TabsContent value="vendor"><VendorManagement /></TabsContent>
          <TabsContent value="pricing"><PricingMargin /></TabsContent>
          <TabsContent value="forecasting"><SalesForecasting /></TabsContent>
          <TabsContent value="credit"><CreditManagement /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
