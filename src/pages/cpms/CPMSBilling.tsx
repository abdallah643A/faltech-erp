import { useState, useEffect } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import {
  BarChart3, DollarSign, Percent, FileText, RefreshCw, Smartphone,
} from 'lucide-react';
import CPMSQuickSteps, { BILLING_STEPS } from '@/components/cpms/CPMSQuickSteps';
import BankPOSPaymentDialog from '@/components/pos/BankPOSPaymentDialog';
import IPABillingPanel from '@/components/cpms/IPABillingPanel';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSBilling() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { projects, fetchTable } = useCPMS();
  const [ipas, setIPAs] = useState<any[]>([]);
  const [retention, setRetention] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showBankPOS, setShowBankPOS] = useState(false);
  const [posIPA, setPosIPA] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const filters = selectedProject !== 'all' ? { project_id: selectedProject } : {};
    const [ipaData, retData, revData] = await Promise.all([
      fetchTable('cpms_ipas', filters),
      fetchTable('cpms_retention_ledger', filters),
      fetchTable('cpms_revenue_recognition', filters, 'period'),
    ]);
    setIPAs(ipaData);
    setRetention(retData);
    setRevenue(revData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProject]);

  const totalGross = ipas.reduce((s, i) => s + (i.gross_amount || 0), 0);
  const totalCertified = ipas.reduce((s, i) => s + (i.certified_amount || 0), 0);
  const totalRetained = retention.filter((r: any) => r.transaction_type === 'retained').reduce((s, r) => s + (r.amount || 0), 0);
  const totalReleased = retention.filter((r: any) => r.transaction_type === 'released').reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6 page-enter">
      <CPMSQuickSteps
        moduleName="Billing & Revenue (IPA)"
        moduleNameAr="الفوترة والإيرادات"
        steps={BILLING_STEPS}
        tips={[
          'IPAs should follow BOQ line items for accurate progress billing.',
          'Retention is auto-calculated based on contract terms (typically 5-10%).',
          'Revenue recognition follows percentage-of-completion (IFRS 15).',
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Billing & Revenue
          </h1>
          <p className="text-muted-foreground">الفوترة والإيرادات – IPAs, Retention, Revenue Recognition</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={ipas}
            columns={[
              { key: 'ipa_no', header: 'IPA #' }, { key: 'period_from', header: 'Period From' },
              { key: 'period_to', header: 'Period To' }, { key: 'gross_amount', header: 'Gross' },
              { key: 'retention_amount', header: 'Retention' }, { key: 'net_amount', header: 'Net' },
              { key: 'certified_amount', header: 'Certified' }, { key: 'status', header: 'Status' },
            ]}
            filename="cpms-billing-ipas"
            title="Billing & IPAs"
          />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gross Billed</p><p className="text-lg font-bold">{totalGross.toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Total gross amount billed through all IPAs before deductions</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Certified</p><p className="text-lg font-bold text-green-600">{totalCertified.toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Amount certified by the engineer/consultant for payment</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Retention Held</p><p className="text-lg font-bold text-orange-600">{(totalRetained - totalReleased).toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Net retention held (retained minus released) as per contract terms</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">IPAs</p><p className="text-lg font-bold">{ipas.length}</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Interim Payment Applications submitted for progress billing</p></TooltipContent></UITooltip></TooltipProvider>
      </div>

      <Tabs defaultValue="ipas">
        <TabsList>
          <TabsTrigger value="ipas"><FileText className="h-4 w-4 mr-1" /> IPAs ({ipas.length})</TabsTrigger>
          <TabsTrigger value="retention"><Percent className="h-4 w-4 mr-1" /> Retention ({retention.length})</TabsTrigger>
          <TabsTrigger value="revenue"><DollarSign className="h-4 w-4 mr-1" /> Revenue ({revenue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ipas">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>IPA #</TableHead><TableHead>Period</TableHead><TableHead>Gross</TableHead>
                  <TableHead>Retention</TableHead><TableHead>Net</TableHead><TableHead>Certified</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Action</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ipas.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No IPAs</TableCell></TableRow>
                    : ipas.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono font-medium">{i.ipa_no}</TableCell>
                        <TableCell>{i.period_from} – {i.period_to}</TableCell>
                        <TableCell>{(i.gross_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-orange-600">{(i.retention_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{(i.net_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-bold">{(i.certified_amount || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={i.status === 'certified' ? 'default' : i.status === 'paid' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
                        <TableCell>
                          {i.status === 'certified' && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setPosIPA(i); setShowBankPOS(true); }}>
                              <Smartphone className="h-3 w-3" /> Collect
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.type')}</TableHead><TableHead>{t('common.amount')}</TableHead><TableHead>{t('common.description')}</TableHead><TableHead>{t('common.date')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {retention.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No retention records</TableCell></TableRow>
                    : retention.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant={r.transaction_type === 'retained' ? 'destructive' : 'default'}>{r.transaction_type}</Badge></TableCell>
                        <TableCell className="font-bold">{(r.amount || 0).toLocaleString()} SAR</TableCell>
                        <TableCell>{r.description || '-'}</TableCell>
                        <TableCell>{r.release_date || '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Period</TableHead><TableHead>Method</TableHead><TableHead>Completion %</TableHead>
                  <TableHead>Recognized</TableHead><TableHead>Deferred</TableHead><TableHead>Cumulative</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {revenue.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No revenue records</TableCell></TableRow>
                    : revenue.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.period}</TableCell>
                        <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                        <TableCell className="font-bold">{r.completion_pct}%</TableCell>
                        <TableCell className="text-green-600">{(r.recognized_revenue || 0).toLocaleString()}</TableCell>
                        <TableCell>{(r.deferred_revenue || 0).toLocaleString()}</TableCell>
                        <TableCell className="font-bold">{(r.cumulative_revenue || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <IPABillingPanel />

      <BankPOSPaymentDialog
        open={showBankPOS}
        onOpenChange={setShowBankPOS}
        amount={posIPA?.certified_amount || posIPA?.net_amount || 0}
        sourceModule="cpms_billing"
        sourceDocumentNumber={posIPA?.ipa_no}
        onPaymentComplete={() => { setShowBankPOS(false); loadData(); }}
      />
    </div>
  );
}
