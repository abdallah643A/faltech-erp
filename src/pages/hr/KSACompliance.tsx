import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEmployees } from '@/hooks/useEmployees';
import { GOSICalculator } from '@/components/hr/GOSICalculator';
import { NitaqatDashboard } from '@/components/hr/NitaqatDashboard';
import { IqamaExpiryTracker } from '@/components/hr/IqamaExpiryTracker';
import { MudadPayrollExport } from '@/components/hr/MudadPayrollExport';
import { PublicHolidayConfig } from '@/components/hr/PublicHolidayConfig';
import { Calculator, Shield, FileWarning, FileSpreadsheet, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function KSACompliance() {
  const { t } = useLanguage();
  const { employees } = useEmployees(false);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">KSA Government Compliance / الامتثال الحكومي</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          GOSI, Nitaqat, Iqama Tracking, Mudad & Public Holidays / التأمينات، نطاقات، الإقامة ومدد والعطل
        </p>
      </div>

      <Tabs defaultValue="gosi" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full">
          <TabsTrigger value="gosi" className="gap-1 text-xs">
            <Calculator className="h-3 w-3" /> GOSI
          </TabsTrigger>
          <TabsTrigger value="nitaqat" className="gap-1 text-xs">
            <Shield className="h-3 w-3" /> Nitaqat
          </TabsTrigger>
          <TabsTrigger value="iqama" className="gap-1 text-xs">
            <FileWarning className="h-3 w-3" /> Documents
          </TabsTrigger>
          <TabsTrigger value="mudad" className="gap-1 text-xs">
            <FileSpreadsheet className="h-3 w-3" /> Mudad/WPS
          </TabsTrigger>
          <TabsTrigger value="holidays" className="gap-1 text-xs">
            <Calendar className="h-3 w-3" /> Holidays
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gosi">
          <GOSICalculator employees={employees} />
        </TabsContent>

        <TabsContent value="nitaqat">
          <NitaqatDashboard employees={employees} />
        </TabsContent>

        <TabsContent value="iqama">
          <IqamaExpiryTracker />
        </TabsContent>

        <TabsContent value="mudad">
          <MudadPayrollExport />
        </TabsContent>

        <TabsContent value="holidays">
          <PublicHolidayConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
