import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIntegrationMutations, useIntegrationTemplates } from '@/hooks/useIntegrationLayer';
import { FileSpreadsheet, Map, DatabaseZap, Plus } from 'lucide-react';

const templateSamples = [
  { template_name: 'Business Partner CSV Import', template_type: 'import', entity_name: 'business_partners', file_format: 'csv', column_definitions: [{ key: 'card_code', required: true }, { key: 'card_name', required: true }, { key: 'phone' }] },
  { template_name: 'Item Master Export', template_type: 'export', entity_name: 'items', file_format: 'xlsx', column_definitions: [{ key: 'item_code' }, { key: 'item_name' }, { key: 'on_hand' }] },
];
const mappingSamples = [
  { mapping_name: 'Shopify Customer to BP', connector_code: 'shopify', source_system: 'shopify', target_entity: 'business_partners', mapping_rules: [{ source: 'email', target: 'email' }, { source: 'first_name', target: 'card_name' }] },
  { mapping_name: 'Bank Statement to Incoming Payment', connector_code: 'mt940_bank', source_system: 'banking', target_entity: 'incoming_payments', mapping_rules: [{ source: 'amount', target: 'transfer_sum' }, { source: 'value_date', target: 'doc_date' }] },
];
const syncSamples = [
  { connector_code: 'shopify', entity_name: 'items', sync_direction: 'outbound', conflict_strategy: 'erp_wins', schedule_cron: '*/30 * * * *' },
  { connector_code: 'payroll_mudad', entity_name: 'employees', sync_direction: 'bidirectional', conflict_strategy: 'latest_update_wins', schedule_cron: '0 2 * * *' },
];

export default function IntegrationTemplates() {
  const { data } = useIntegrationTemplates();
  const { upsertTemplate, upsertMapping, upsertSyncControl } = useIntegrationMutations();

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-primary" /> Import/Export & Mapping Governance</h1><p className="text-sm text-muted-foreground">Templates, field mapping approvals, and master-data sync controls</p></div>
    <div className="grid md:grid-cols-3 gap-3">
      <Button variant="outline" onClick={() => templateSamples.forEach((x) => upsertTemplate.mutate(x))}><Plus className="h-4 w-4 mr-2" /> Seed Templates</Button>
      <Button variant="outline" onClick={() => mappingSamples.forEach((x) => upsertMapping.mutate(x))}><Plus className="h-4 w-4 mr-2" /> Seed Mappings</Button>
      <Button variant="outline" onClick={() => syncSamples.forEach((x) => upsertSyncControl.mutate(x))}><Plus className="h-4 w-4 mr-2" /> Seed Sync Controls</Button>
    </div>
    <Section title="Import / Export Templates" icon={FileSpreadsheet} rows={data?.templates || []} primary="template_name" secondary={(r: any) => `${r.template_type} · ${r.entity_name} · ${r.file_format}`} status="status" />
    <Section title="Field Mappings" icon={Map} rows={data?.mappings || []} primary="mapping_name" secondary={(r: any) => `${r.source_system} → ${r.target_entity} · v${r.version}`} status="governance_status" />
    <Section title="Master-data Sync Controls" icon={DatabaseZap} rows={data?.syncControls || []} primary="entity_name" secondary={(r: any) => `${r.connector_code} · ${r.sync_direction} · ${r.conflict_strategy}`} status={(r: any) => r.is_active ? 'active' : 'paused'} />
  </div>;
}

function Section({ title, icon: Icon, rows, primary, secondary, status }: any) {
  return <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader><CardContent className="space-y-2">{rows.map((r: any) => <div key={r.id} className="flex items-center gap-3 p-3 border rounded-md"><div className="flex-1"><p className="font-medium text-sm">{r[primary]}</p><p className="text-xs text-muted-foreground">{typeof secondary === 'function' ? secondary(r) : r[secondary]}</p></div><Badge variant="outline">{typeof status === 'function' ? status(r) : r[status]}</Badge></div>)}{!rows.length && <p className="text-sm text-muted-foreground text-center py-8">No records yet</p>}</CardContent></Card>;
}
