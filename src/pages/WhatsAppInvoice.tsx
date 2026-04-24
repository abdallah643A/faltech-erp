import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LayoutDashboard, Send, Users, AlertTriangle, ClipboardList, Settings, History, Zap
} from 'lucide-react';
import { AutomationDashboard } from '@/components/whatsapp/automation/AutomationDashboard';
import { ManualSendTab } from '@/components/whatsapp/automation/ManualSendTab';
import { AccountManagement } from '@/components/whatsapp/automation/AccountManagement';
import { FailedInvoicesManager } from '@/components/whatsapp/automation/FailedInvoicesManager';
import { TransactionLog } from '@/components/whatsapp/automation/TransactionLog';
import { AutomationSettings } from '@/components/whatsapp/automation/AutomationSettings';
import { ExecutionHistory } from '@/components/whatsapp/automation/ExecutionHistory';

export default function WhatsAppInvoice() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {isAr ? 'أتمتة إرسال الفواتير عبر واتساب' : 'WhatsApp Invoice Automation'}
          </h1>
          <p className="text-muted-foreground">
            {isAr
              ? 'إرسال تلقائي للفواتير عبر واتساب والبريد الإلكتروني مع إعادة المحاولة التلقائية ولوحة المراقبة'
              : 'Automatically send invoices via WhatsApp & Email with auto-retry and performance monitoring'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'لوحة المراقبة' : 'Dashboard'}</span>
            </TabsTrigger>
            <TabsTrigger value="send" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'إرسال يدوي' : 'Manual Send'}</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'الحسابات' : 'Accounts'}</span>
            </TabsTrigger>
            <TabsTrigger value="failed" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'الفواتير الفاشلة' : 'Failed'}</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'السجل' : 'Logs'}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'التنفيذ' : 'Runs'}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? 'الإعدادات' : 'Settings'}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard"><AutomationDashboard /></TabsContent>
        <TabsContent value="send"><ManualSendTab /></TabsContent>
        <TabsContent value="accounts"><AccountManagement /></TabsContent>
        <TabsContent value="failed"><FailedInvoicesManager /></TabsContent>
        <TabsContent value="logs"><TransactionLog /></TabsContent>
        <TabsContent value="history"><ExecutionHistory /></TabsContent>
        <TabsContent value="settings"><AutomationSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
