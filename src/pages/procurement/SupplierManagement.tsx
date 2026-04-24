import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Smartphone, AlertTriangle, BarChart3, MessageSquare, LineChart, RefreshCw } from 'lucide-react';
import { SupplierDirectory } from '@/components/procurement/supplier/SupplierDirectory';
import { MobileVerification } from '@/components/procurement/supplier/MobileVerification';
import { SupplierIssueTracker } from '@/components/procurement/supplier/SupplierIssueTracker';
import { CrossSitePerformance } from '@/components/procurement/supplier/CrossSitePerformance';
import { MobileFeedbackCapture } from '@/components/procurement/supplier/MobileFeedbackCapture';
import { FeedbackAnalyticsDashboard } from '@/components/procurement/supplier/FeedbackAnalyticsDashboard';
import { ClosedLoopFeedback } from '@/components/procurement/supplier/ClosedLoopFeedback';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupplierManagement() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Management</h1>
            <p className="text-xs text-muted-foreground">Multi-site directory, feedback, analytics & closed-loop tracking</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="directory" className="text-xs flex-shrink-0">
            <MapPin className="h-3 w-3 mr-1" /> Directory
          </TabsTrigger>
          <TabsTrigger value="verification" className="text-xs flex-shrink-0">
            <Smartphone className="h-3 w-3 mr-1" /> Verification
          </TabsTrigger>
          <TabsTrigger value="feedback" className="text-xs flex-shrink-0">
            <MessageSquare className="h-3 w-3 mr-1" /> Feedback
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs flex-shrink-0">
            <LineChart className="h-3 w-3 mr-1" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-xs flex-shrink-0">
            <AlertTriangle className="h-3 w-3 mr-1" /> Issues
          </TabsTrigger>
          <TabsTrigger value="closedloop" className="text-xs flex-shrink-0">
            <RefreshCw className="h-3 w-3 mr-1" /> Closed-Loop
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs flex-shrink-0">
            <BarChart3 className="h-3 w-3 mr-1" /> Cross-Site
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory"><SupplierDirectory /></TabsContent>
        <TabsContent value="verification"><MobileVerification /></TabsContent>
        <TabsContent value="feedback"><MobileFeedbackCapture /></TabsContent>
        <TabsContent value="analytics"><FeedbackAnalyticsDashboard /></TabsContent>
        <TabsContent value="issues"><SupplierIssueTracker /></TabsContent>
        <TabsContent value="closedloop"><ClosedLoopFeedback /></TabsContent>
        <TabsContent value="performance"><CrossSitePerformance /></TabsContent>
      </Tabs>
    </div>
  );
}
