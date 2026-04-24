import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCorrTypes, useCorrCategories, useCorrWorkflowDefs } from '@/hooks/useCorrespondence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function CorrespondenceSettingsPage() {
  const { data: types = [] } = useCorrTypes();
  const { data: cats = [] } = useCorrCategories();
  const { data: wfs = [] } = useCorrWorkflowDefs();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Correspondence Settings</h1>
        <p className="text-muted-foreground" dir="rtl">إعدادات المراسلات</p>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
        </TabsList>

        <TabsContent value="types">
          <Card><CardHeader><CardTitle>Correspondence Types</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Code</TableHead><TableHead>Name (EN)</TableHead><TableHead>Name (AR)</TableHead><TableHead>Direction</TableHead><TableHead>SLA (h)</TableHead><TableHead>Approval</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {types.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono">{t.code}</TableCell>
                      <TableCell>{t.name_en}</TableCell>
                      <TableCell dir="rtl">{t.name_ar}</TableCell>
                      <TableCell><Badge variant="outline">{t.direction}</Badge></TableCell>
                      <TableCell>{t.default_sla_hours}</TableCell>
                      <TableCell>{t.requires_approval ? 'Required' : 'Optional'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card><CardHeader><CardTitle>Categories</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>EN</TableHead><TableHead>AR</TableHead><TableHead>Retention (years)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cats.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell>{c.name_en}</TableCell>
                      <TableCell dir="rtl">{c.name_ar}</TableCell>
                      <TableCell>{c.retention_years}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows">
          <div className="space-y-4">
            {wfs.map((w: any) => (
              <Card key={w.id}>
                <CardHeader><CardTitle>{w.name_en} <span className="text-muted-foreground text-sm" dir="rtl">{w.name_ar}</span></CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">Direction: {w.direction} • Category: {w.category} • v{w.version}</div>
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Step</TableHead><TableHead>Type</TableHead><TableHead>Role</TableHead><TableHead>SLA (h)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(w.corr_workflow_steps ?? []).sort((a: any, b: any) => a.step_no - b.step_no).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.step_no}</TableCell>
                          <TableCell>{s.name_en} <span className="text-muted-foreground" dir="rtl">{s.name_ar}</span></TableCell>
                          <TableCell><Badge variant="outline">{s.step_type}</Badge></TableCell>
                          <TableCell>{s.required_role ?? '—'}</TableCell>
                          <TableCell>{s.sla_hours}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="numbering">
          <Card><CardHeader><CardTitle>Numbering Pattern</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>References are auto-generated as <span className="font-mono">{'{COMPANY}-{BRANCH}-{TYPE}-{YYYY}-{SEQ5}'}</span></p>
              <p className="text-muted-foreground">Example: <span className="font-mono">CO-HQ-IN-2026-00045</span></p>
              <p className="text-xs text-muted-foreground pt-2">Sequences reset annually per company × branch × type.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
