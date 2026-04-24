import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCountryPacks, useGlobalComplianceMutations, useStatutoryReports } from '@/hooks/useGlobalCompliance';
import { ScrollText, Plus } from 'lucide-react';

export default function StatutoryReports() {
  const { data: reports } = useStatutoryReports();
  const { data: packs } = useCountryPacks();
  const { upsertReport } = useGlobalComplianceMutations();
  const seed = () => {
    const packId = packs?.[0]?.id;
    if (!packId) return;
    [
      { report_code: 'VAT_RETURN_GENERIC', report_name: 'Generic VAT/GST Return', report_domain: 'tax', filing_frequency: 'monthly', due_day: 20, output_formats: ['pdf','xlsx','xml'] },
      { report_code: 'WHT_RETURN_GENERIC', report_name: 'Generic Withholding Return', report_domain: 'withholding', filing_frequency: 'monthly', due_day: 15, output_formats: ['pdf','xlsx'] },
      { report_code: 'PAYROLL_STAT_GENERIC', report_name: 'Generic Payroll Statutory Report', report_domain: 'payroll', filing_frequency: 'monthly', due_day: 10, output_formats: ['xlsx','xml'] },
      { report_code: 'EINV_SUMMARY_GENERIC', report_name: 'Generic E-Invoice Summary', report_domain: 'e_documents', filing_frequency: 'daily', due_day: null, output_formats: ['json','xml'] },
    ].forEach((r) => upsertReport.mutate({ ...r, country_pack_id: packId, data_sources: [{ table: 'journal_entries' }, { table: 'ar_invoices' }], calculation_rules: { formulaMode: 'low_code' }, status: 'active' }));
  };
  return <div className="p-4 md:p-6 space-y-6"><div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6 text-primary" /> Statutory Reports</h1><p className="text-sm text-muted-foreground">Configurable report obligations, due dates, formats, sources and formulas</p></div><Button onClick={seed} disabled={!packs?.length}><Plus className="h-4 w-4 mr-2" /> Seed Reports</Button></div><Card><CardHeader><CardTitle className="text-sm">Report Obligations</CardTitle></CardHeader><CardContent className="space-y-2">{(reports || []).map((r: any) => <div key={r.id} className="flex items-center gap-3 p-3 border rounded-md"><div className="flex-1"><p className="font-medium text-sm">{r.report_name}</p><p className="text-xs text-muted-foreground">{r.global_country_packs?.pack_name || 'Pack'} · {r.filing_frequency} · due day {r.due_day || 'event-based'}</p></div><Badge>{r.report_domain}</Badge><Badge variant="outline">{(r.output_formats || []).join(', ')}</Badge><Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge></div>)}{!reports?.length && <p className="text-sm text-muted-foreground text-center py-8">No statutory reports configured</p>}</CardContent></Card></div>;
}
