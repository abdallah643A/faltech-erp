import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIntegrationConnectorsDocs, useIntegrationMutations } from '@/hooks/useIntegrationLayer';
import { Landmark, ShoppingCart, Users, FileSignature, BarChart3, BookOpen, Plus } from 'lucide-react';

const connectorTemplates = [
  { connector_code: 'banking_mt940_sama', connector_name: 'Banking MT940 / SAMA', category: 'banking', provider: 'Bank / SAMA', event_topics: ['bank.statement.imported'], endpoint_templates: [{ name: 'statement_import', method: 'POST', path: '/bank/statements' }], setup_checklist: ['Configure bank account', 'Upload sample MT940', 'Approve GL mapping'] },
  { connector_code: 'ecommerce_shopify_woocommerce', connector_name: 'Shopify / WooCommerce', category: 'e-commerce', provider: 'Shopify/WooCommerce', event_topics: ['order.created', 'product.updated'], endpoint_templates: [{ name: 'orders', method: 'GET', path: '/orders' }] },
  { connector_code: 'payroll_gosi_mudad', connector_name: 'Payroll GOSI / Mudad', category: 'payroll', provider: 'GOSI/Mudad', event_topics: ['payroll.run.posted', 'employee.updated'] },
  { connector_code: 'esign_docusign_adobe', connector_name: 'DocuSign / Adobe Sign', category: 'document signing', provider: 'DocuSign/Adobe Sign', event_topics: ['document.sent', 'document.signed'] },
  { connector_code: 'bi_powerbi_tableau', connector_name: 'Power BI / Tableau', category: 'external BI', provider: 'Power BI/Tableau', event_topics: ['dataset.refreshed'], endpoint_templates: [{ name: 'odata_feed', method: 'GET', path: '/odata/{entity}' }] },
];
const openApiDoc = {
  doc_key: 'partner-api', title: 'Partner API v1', version: 'v1', interface_type: 'openapi', status: 'published', published_at: new Date().toISOString(),
  content: { openapi: '3.0.3', info: { title: 'ERP Partner API', version: 'v1' }, paths: { '/integration-partner-api/{entity}': { get: { summary: 'Read entity data' }, post: { summary: 'Create entity records' } }, '/integration-oauth-token': { post: { summary: 'OAuth2 client credentials token' } } } },
  changelog: 'Initial partner API with API key and OAuth2 support.',
};
const icons: any = { banking: Landmark, 'e-commerce': ShoppingCart, payroll: Users, 'document signing': FileSignature, 'external BI': BarChart3 };

export default function IntegrationConnectorsDocs() {
  const { data } = useIntegrationConnectorsDocs();
  const { upsertConnector, upsertDoc } = useIntegrationMutations();
  const seed = () => { connectorTemplates.forEach((x) => upsertConnector.mutate(x)); upsertDoc.mutate(openApiDoc); };

  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Connector Templates & Interface Docs</h1><p className="text-sm text-muted-foreground">Partner-ready connector blueprints and versioned OpenAPI documentation</p></div><Button onClick={seed}><Plus className="h-4 w-4 mr-2" /> Seed Defaults</Button></div>
    <Tabs defaultValue="connectors"><TabsList><TabsTrigger value="connectors">Connectors</TabsTrigger><TabsTrigger value="docs">Docs</TabsTrigger></TabsList>
      <TabsContent value="connectors" className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.connectors || []).map((c: any) => { const Icon = icons[c.category] || BookOpen; return <Card key={c.id}><CardContent className="p-4 space-y-3"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div><div><h3 className="font-semibold">{c.connector_name}</h3><p className="text-xs text-muted-foreground">{c.provider}</p></div></div><Badge variant="outline">{c.category}</Badge><div className="flex flex-wrap gap-1">{(c.event_topics || []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}</div></CardContent></Card>; })}
        {!data?.connectors?.length && <Card className="md:col-span-3"><CardContent className="p-10 text-center text-sm text-muted-foreground">No connector templates yet</CardContent></Card>}
      </TabsContent>
      <TabsContent value="docs" className="space-y-2">{(data?.docs || []).map((d: any) => <Card key={d.id}><CardContent className="p-4 flex items-center gap-3"><BookOpen className="h-5 w-5 text-primary" /><div className="flex-1"><p className="font-medium text-sm">{d.title}</p><p className="text-xs text-muted-foreground">{d.doc_key} · {d.interface_type} · {d.changelog}</p></div><Badge>{d.version}</Badge><Badge variant={d.status === 'published' ? 'default' : 'outline'}>{d.status}</Badge></CardContent></Card>)}{!data?.docs?.length && <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No documentation versions yet</CardContent></Card>}</TabsContent>
    </Tabs>
  </div>;
}
