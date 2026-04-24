import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  RefreshCw, ArrowDown, ArrowUp, ArrowLeftRight, Loader2,
  Database, Plus, CheckCircle2, AlertTriangle, Settings2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

// CPMS tables that don't exist natively in SAP B1 and need UDOs/UDFs
const CPMS_UDO_DEFINITIONS = [
  {
    key: 'cpms_budgets',
    tableName: 'CPMS_BUDGETS',
    description: 'CPMS Budget Management',
    descriptionAr: 'إدارة الميزانيات',
    fields: [
      { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
      { name: 'U_Name', type: 'db_Alpha', size: 200, description: 'Budget Name' },
      { name: 'U_Version', type: 'db_Numeric', description: 'Version' },
      { name: 'U_TotalValue', type: 'db_Float', description: 'Total Value' },
      { name: 'U_ContingencyPct', type: 'db_Float', description: 'Contingency %' },
      { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
    ],
  },
  {
    key: 'cpms_commitments',
    tableName: 'CPMS_COMMITMENTS',
    description: 'CPMS Commitments Register',
    descriptionAr: 'سجل الالتزامات',
    fields: [
      { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
      { name: 'U_RefNumber', type: 'db_Alpha', size: 50, description: 'Reference Number' },
      { name: 'U_Type', type: 'db_Alpha', size: 30, description: 'Type (PO/Subcon/Other)' },
      { name: 'U_VendorName', type: 'db_Alpha', size: 200, description: 'Vendor Name' },
      { name: 'U_CommittedAmt', type: 'db_Float', description: 'Committed Amount' },
      { name: 'U_InvoicedAmt', type: 'db_Float', description: 'Invoiced Amount' },
      { name: 'U_RemainingAmt', type: 'db_Float', description: 'Remaining Amount' },
      { name: 'U_Status', type: 'db_Alpha', size: 20, description: 'Status' },
    ],
  },
  {
    key: 'cpms_evm_snapshots',
    tableName: 'CPMS_EVM',
    description: 'CPMS Earned Value Management',
    descriptionAr: 'إدارة القيمة المكتسبة',
    fields: [
      { name: 'U_ProjectID', type: 'db_Alpha', size: 50, description: 'Project ID' },
      { name: 'U_SnapshotDate', type: 'db_Date', description: 'Snapshot Date' },
      { name: 'U_BCWS', type: 'db_Float', description: 'Budgeted Cost of Work Scheduled' },
      { name: 'U_BCWP', type: 'db_Float', description: 'Budgeted Cost of Work Performed' },
      { name: 'U_ACWP', type: 'db_Float', description: 'Actual Cost of Work Performed' },
      { name: 'U_SPI', type: 'db_Float', description: 'Schedule Performance Index' },
      { name: 'U_CPI', type: 'db_Float', description: 'Cost Performance Index' },
      { name: 'U_EAC', type: 'db_Float', description: 'Estimate at Completion' },
      { name: 'U_VAC', type: 'db_Float', description: 'Variance at Completion' },
    ],
  },
];

interface CPMSSAPSyncProps {
  onSyncComplete?: () => void;
}

export default function CPMSSAPSync({ onSyncComplete }: CPMSSAPSyncProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [syncing, setSyncing] = useState(false);
  const [showUDODialog, setShowUDODialog] = useState(false);
  const [selectedUDOs, setSelectedUDOs] = useState<string[]>(CPMS_UDO_DEFINITIONS.map(u => u.key));
  const [udoResults, setUdoResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [creatingUDOs, setCreatingUDOs] = useState(false);

  const handleSync = async (direction: 'from_sap' | 'to_sap' | 'bidirectional') => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sap-sync', {
        body: {
          action: 'sync',
          entity: 'cpms_cost_data',
          direction,
          limit: 500,
        },
      });
      if (error) throw error;
      toast({
        title: isAr ? 'تمت المزامنة' : 'Sync Complete',
        description: data?.message || `${isAr ? 'تمت المزامنة بنجاح' : 'Successfully synced cost data'}`,
      });
      onSyncComplete?.();
    } catch (err: any) {
      toast({ title: isAr ? 'خطأ في المزامنة' : 'Sync Error', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateUDOs = async () => {
    setCreatingUDOs(true);
    setUdoResults({});
    const results: Record<string, { success: boolean; message: string }> = {};

    for (const udo of CPMS_UDO_DEFINITIONS) {
      if (!selectedUDOs.includes(udo.key)) continue;
      try {
        const { data, error } = await supabase.functions.invoke('sap-sync', {
          body: {
            action: 'create_udo',
            udo_table: udo.tableName,
            udo_description: udo.description,
            udo_fields: udo.fields,
          },
        });
        if (error) throw error;
        results[udo.key] = {
          success: data?.success ?? true,
          message: data?.message || 'UDO/UDFs created successfully',
        };
      } catch (err: any) {
        results[udo.key] = { success: false, message: err.message };
      }
    }

    setUdoResults(results);
    setCreatingUDOs(false);

    const successCount = Object.values(results).filter(r => r.success).length;
    const failCount = Object.values(results).filter(r => !r.success).length;

    toast({
      title: isAr ? 'نتيجة إنشاء UDO' : 'UDO Creation Result',
      description: `${successCount} ${isAr ? 'نجح' : 'succeeded'}, ${failCount} ${isAr ? 'فشل' : 'failed'}`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
  };

  const toggleUDO = (key: string) => {
    setSelectedUDOs(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isAr ? 'مزامنة SAP' : 'SAP Sync'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={() => handleSync('from_sap')}>
            <ArrowDown className="mr-2 h-4 w-4" />
            {isAr ? 'سحب من SAP' : 'Pull from SAP'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync('to_sap')}>
            <ArrowUp className="mr-2 h-4 w-4" />
            {isAr ? 'دفع إلى SAP' : 'Push to SAP'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSync('bidirectional')}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {isAr ? 'مزامنة ثنائية' : 'Two-way Sync'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => { setShowUDODialog(true); setUdoResults({}); }}>
            <Settings2 className="mr-2 h-4 w-4 text-amber-600" />
            <span className="font-medium">{isAr ? 'إنشاء UDOs/UDFs في SAP' : 'Create UDOs/UDFs in SAP'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* UDO/UDF Creation Dialog */}
      <Dialog open={showUDODialog} onOpenChange={setShowUDODialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              {isAr ? 'إنشاء جداول مخصصة في SAP B1' : 'Create Custom Tables in SAP B1'}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? 'سيتم إنشاء جداول UDO وحقول UDF المطلوبة في SAP B1 لمزامنة بيانات إدارة التكاليف التي لا تتوفر أصلاً في SAP.'
                : 'This will create the required UDO tables and UDF fields in SAP B1 to sync Cost Management data that is not natively available in SAP.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3 py-2">
              {CPMS_UDO_DEFINITIONS.map((udo) => {
                const result = udoResults[udo.key];
                return (
                  <Card key={udo.key} className={`transition-all ${result?.success === false ? 'border-destructive' : result?.success ? 'border-green-500' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedUDOs.includes(udo.key)}
                          onCheckedChange={() => toggleUDO(udo.key)}
                          disabled={creatingUDOs}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{udo.description}</span>
                            <Badge variant="outline" className="text-xs font-mono">@{udo.tableName}</Badge>
                            {result && (
                              result.success
                                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                : <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{isAr ? udo.descriptionAr : udo.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {udo.fields.map((f) => (
                              <Badge key={f.name} variant="secondary" className="text-[10px] font-mono">
                                {f.name}
                              </Badge>
                            ))}
                          </div>
                          {result && !result.success && (
                            <p className="text-xs text-destructive mt-1">{result.message}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUDODialog(false)}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
            <Button
              onClick={handleCreateUDOs}
              disabled={creatingUDOs || selectedUDOs.length === 0}
              className="gap-2"
            >
              {creatingUDOs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isAr
                ? `إنشاء ${selectedUDOs.length} جدول`
                : `Create ${selectedUDOs.length} UDO(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
