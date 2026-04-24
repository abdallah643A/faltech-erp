import { useState, useEffect } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import CPMSSAPSync from '@/components/cpms/CPMSSAPSync';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, RefreshCw,
} from 'lucide-react';
import CPMSQuickSteps, { COSTS_STEPS } from '@/components/cpms/CPMSQuickSteps';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSCosts() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { projects, fetchTable } = useCPMS();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [commitments, setCommitments] = useState<any[]>([]);
  const [evmSnapshots, setEvmSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    const filters = selectedProject !== 'all' ? { project_id: selectedProject } : {};
    const [bud, com, evm] = await Promise.all([
      fetchTable('cpms_budgets', filters),
      fetchTable('cpms_commitments', filters),
      fetchTable('cpms_evm_snapshots', filters, 'snapshot_date'),
    ]);
    setBudgets(bud);
    setCommitments(com);
    setEvmSnapshots(evm);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProject]);

  const totalBudget = budgets.reduce((s, b) => s + (b.total_value || 0), 0);
  const totalCommitted = commitments.reduce((s, c) => s + (c.committed_amount || 0), 0);
  const totalInvoiced = commitments.reduce((s, c) => s + (c.invoiced_amount || 0), 0);
  const latestEVM = evmSnapshots[0];

  return (
    <div className="space-y-6 page-enter">
      <CPMSQuickSteps
        moduleName="Cost Management & EVM"
        moduleNameAr="إدارة التكاليف والقيمة المكتسبة"
        steps={COSTS_STEPS}
        tips={[
          'Budget must be allocated per WBS node before commitments can be tracked.',
          'Take EVM snapshots weekly for accurate CPI/SPI trends.',
          'Review cost variances monthly to catch overruns early.',
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Cost Management & EVM
          </h1>
          <p className="text-muted-foreground">إدارة التكاليف – Budget, Commitments, Earned Value</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <CPMSSAPSync onSyncComplete={loadData} />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id!}>{p.code} – {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cost KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Budget (BAC)</p><p className="text-lg font-bold">{totalBudget.toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Budget at Completion – total approved budget for all selected projects</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Committed</p><p className="text-lg font-bold">{totalCommitted.toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Total committed through POs and subcontracts</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Invoiced (Actual)</p><p className="text-lg font-bold">{totalInvoiced.toLocaleString()} SAR</p></CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Actual cost invoiced from committed amounts</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CPI</p>
            <p className={`text-lg font-bold ${latestEVM?.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
              {latestEVM ? latestEVM.cpi?.toFixed(2) : '-'}
              {latestEVM?.cpi >= 1 ? <TrendingUp className="h-4 w-4 inline ml-1" /> : latestEVM ? <TrendingDown className="h-4 w-4 inline ml-1" /> : null}
            </p>
          </CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Cost Performance Index – EV/AC. ≥1.0 means under budget</p></TooltipContent></UITooltip></TooltipProvider>
        <TooltipProvider><UITooltip><TooltipTrigger asChild>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">SPI</p>
            <p className={`text-lg font-bold ${latestEVM?.spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
              {latestEVM ? latestEVM.spi?.toFixed(2) : '-'}
            </p>
          </CardContent></Card>
        </TooltipTrigger><TooltipContent><p className="text-xs max-w-[200px]">Schedule Performance Index – EV/PV. ≥1.0 means ahead of schedule</p></TooltipContent></UITooltip></TooltipProvider>
      </div>

      {/* EVM Summary */}
      {latestEVM && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Latest EVM Snapshot</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><p className="text-muted-foreground">BCWS (PV)</p><p className="font-bold">{(latestEVM.bcws || 0).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">BCWP (EV)</p><p className="font-bold">{(latestEVM.bcwp || 0).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">ACWP (AC)</p><p className="font-bold">{(latestEVM.acwp || 0).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">EAC</p><p className="font-bold">{(latestEVM.eac || 0).toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">VAC</p><p className={`font-bold ${(latestEVM.vac || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(latestEVM.vac || 0).toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="commitments">
        <TabsList>
          <TabsTrigger value="commitments">Commitments ({commitments.length})</TabsTrigger>
          <TabsTrigger value="budgets">Budgets ({budgets.length})</TabsTrigger>
          <TabsTrigger value="evm">EVM History ({evmSnapshots.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="commitments">
          <div className="flex justify-end mb-2">
            <ExportImportButtons
              data={commitments}
              columns={[
                { key: 'ref_number', header: 'Ref #' }, { key: 'type', header: 'Type' },
                { key: 'vendor_name', header: 'Vendor' }, { key: 'committed_amount', header: 'Committed' },
                { key: 'invoiced_amount', header: 'Invoiced' }, { key: 'remaining_amount', header: 'Remaining' },
                { key: 'status', header: 'Status' },
              ]}
              filename="cpms-commitments"
              title="Commitments"
            />
          </div>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Ref #</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Vendor</TableHead>
                  <TableHead>Committed</TableHead><TableHead>Invoiced</TableHead><TableHead>Remaining</TableHead><TableHead>{t('common.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {commitments.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No commitments</TableCell></TableRow>
                    : commitments.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">{c.ref_number || '-'}</TableCell>
                        <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                        <TableCell>{c.vendor_name || '-'}</TableCell>
                        <TableCell className="font-medium">{(c.committed_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>{(c.invoiced_amount || 0).toLocaleString()}</TableCell>
                        <TableCell>{(c.remaining_amount || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="budgets">
          <div className="flex justify-end mb-2">
            <ExportImportButtons
              data={budgets}
              columns={[
                { key: 'name', header: 'Name' }, { key: 'version', header: 'Version' },
                { key: 'total_value', header: 'Total Value' }, { key: 'contingency_pct', header: 'Contingency %' },
                { key: 'status', header: 'Status' },
              ]}
              filename="cpms-budgets"
              title="Budgets"
            />
          </div>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.name')}</TableHead><TableHead>Version</TableHead><TableHead>Total Value</TableHead>
                  <TableHead>Contingency</TableHead><TableHead>{t('common.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {budgets.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No budgets</TableCell></TableRow>
                    : budgets.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>v{b.version}</TableCell>
                        <TableCell className="font-bold">{(b.total_value || 0).toLocaleString()} SAR</TableCell>
                        <TableCell>{b.contingency_pct}%</TableCell>
                        <TableCell><Badge>{b.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="evm">
          <div className="flex justify-end mb-2">
            <ExportImportButtons
              data={evmSnapshots}
              columns={[
                { key: 'snapshot_date', header: 'Date' }, { key: 'bcws', header: 'BCWS' },
                { key: 'bcwp', header: 'BCWP' }, { key: 'acwp', header: 'ACWP' },
                { key: 'spi', header: 'SPI' }, { key: 'cpi', header: 'CPI' },
                { key: 'eac', header: 'EAC' }, { key: 'vac', header: 'VAC' },
              ]}
              filename="cpms-evm-snapshots"
              title="EVM Snapshots"
            />
          </div>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.date')}</TableHead><TableHead>BCWS</TableHead><TableHead>BCWP</TableHead>
                  <TableHead>ACWP</TableHead><TableHead>SPI</TableHead><TableHead>CPI</TableHead><TableHead>EAC</TableHead><TableHead>VAC</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {evmSnapshots.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No EVM snapshots</TableCell></TableRow>
                    : evmSnapshots.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.snapshot_date}</TableCell>
                        <TableCell>{(e.bcws || 0).toLocaleString()}</TableCell>
                        <TableCell>{(e.bcwp || 0).toLocaleString()}</TableCell>
                        <TableCell>{(e.acwp || 0).toLocaleString()}</TableCell>
                        <TableCell className={e.spi >= 1 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{e.spi?.toFixed(2)}</TableCell>
                        <TableCell className={e.cpi >= 1 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{e.cpi?.toFixed(2)}</TableCell>
                        <TableCell>{(e.eac || 0).toLocaleString()}</TableCell>
                        <TableCell className={e.vac >= 0 ? 'text-green-600' : 'text-red-600'}>{(e.vac || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
