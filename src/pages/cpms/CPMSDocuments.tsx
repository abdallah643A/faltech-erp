import { useState, useEffect } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import {
  FileText, Plus, RefreshCw, MessageSquare, ClipboardCheck, AlertOctagon, Send,
} from 'lucide-react';
import CPMSQuickSteps, { DOCUMENTS_STEPS } from '@/components/cpms/CPMSQuickSteps';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CPMSDocuments() {
  const { t } = useLanguage();
  const { projects, fetchTable } = useCPMS();
  const [documents, setDocuments] = useState<any[]>([]);
  const [rfis, setRFIs] = useState<any[]>([]);
  const [submittals, setSubmittals] = useState<any[]>([]);
  const [ncrs, setNCRs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    const filters = selectedProject !== 'all' ? { project_id: selectedProject } : {};
    const [docs, rfiData, subData, ncrData] = await Promise.all([
      fetchTable('cpms_documents', filters),
      fetchTable('cpms_rfis', filters),
      fetchTable('cpms_submittals', filters),
      fetchTable('cpms_ncrs', filters),
    ]);
    setDocuments(docs);
    setRFIs(rfiData);
    setSubmittals(subData);
    setNCRs(ncrData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProject]);

  const rfiStatusColors: Record<string, string> = { open: 'bg-yellow-100 text-yellow-800', submitted: 'bg-blue-100 text-blue-800', responded: 'bg-green-100 text-green-800', closed: 'bg-muted text-muted-foreground' };

  return (
    <div className="space-y-6 page-enter">
      <CPMSQuickSteps
        moduleName="Document Control"
        moduleNameAr="إدارة المستندات"
        steps={DOCUMENTS_STEPS}
        tips={[
          'Use proper document numbering conventions (e.g., DWG-001-REV-A).',
          'RFIs should have clear deadlines to avoid project delays.',
          'NCRs require root cause analysis before closure.',
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" /> Document Control
          </h1>
          <p className="text-muted-foreground">إدارة المستندات – Drawings, RFIs, Submittals, NCRs</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={[...rfis, ...submittals, ...ncrs, ...documents]}
            columns={[
              { key: 'rfi_number', header: 'RFI #' }, { key: 'submittal_number', header: 'Submittal #' },
              { key: 'ncr_number', header: 'NCR #' }, { key: 'subject', header: 'Subject' },
              { key: 'title', header: 'Title' }, { key: 'status', header: 'Status' },
              { key: 'priority', header: 'Priority' }, { key: 'discipline', header: 'Discipline' },
            ]}
            filename="cpms-documents"
            title="Document Control"
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{documents.length}</p><p className="text-xs text-muted-foreground">Documents</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><MessageSquare className="h-8 w-8 text-orange-600" /><div><p className="text-2xl font-bold">{rfis.filter((r: any) => r.status === 'open').length}/{rfis.length}</p><p className="text-xs text-muted-foreground">Open RFIs / Total</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><ClipboardCheck className="h-8 w-8 text-blue-600" /><div><p className="text-2xl font-bold">{submittals.filter((s: any) => s.review_status === 'pending').length}/{submittals.length}</p><p className="text-xs text-muted-foreground">Pending Submittals</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertOctagon className="h-8 w-8 text-red-600" /><div><p className="text-2xl font-bold">{ncrs.filter((n: any) => n.status !== 'closed').length}/{ncrs.length}</p><p className="text-xs text-muted-foreground">Open NCRs</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="rfis">
        <TabsList>
          <TabsTrigger value="rfis"><MessageSquare className="h-4 w-4 mr-1" /> RFIs ({rfis.length})</TabsTrigger>
          <TabsTrigger value="submittals"><ClipboardCheck className="h-4 w-4 mr-1" /> Submittals ({submittals.length})</TabsTrigger>
          <TabsTrigger value="ncrs"><AlertOctagon className="h-4 w-4 mr-1" /> NCRs ({ncrs.length})</TabsTrigger>
          <TabsTrigger value="drawings"><FileText className="h-4 w-4 mr-1" /> Drawings ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rfis">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>RFI #</TableHead><TableHead>Subject</TableHead><TableHead>Discipline</TableHead>
                    <TableHead>Priority</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>Raised</TableHead><TableHead>Due</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rfis.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No RFIs</TableCell></TableRow>
                      : rfis.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono font-medium">{r.rfi_number}</TableCell>
                          <TableCell className="font-medium">{r.subject}</TableCell>
                          <TableCell><Badge variant="outline">{r.discipline || '-'}</Badge></TableCell>
                          <TableCell><Badge variant={r.priority === 'urgent' ? 'destructive' : 'secondary'}>{r.priority}</Badge></TableCell>
                          <TableCell><Badge className={rfiStatusColors[r.status] || ''}>{r.status}</Badge></TableCell>
                          <TableCell className="text-sm">{r.raised_date ? format(new Date(r.raised_date), 'dd/MM/yy') : '-'}</TableCell>
                          <TableCell className="text-sm">{r.due_date ? format(new Date(r.due_date), 'dd/MM/yy') : '-'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submittals">
          <Card><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Submittal #</TableHead><TableHead>Title</TableHead><TableHead>{t('common.type')}</TableHead>
                  <TableHead>Review Status</TableHead><TableHead>Rev</TableHead><TableHead>Submitted</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {submittals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No submittals</TableCell></TableRow>
                    : submittals.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.submittal_number}</TableCell>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                        <TableCell><Badge variant={s.review_status === 'approved' ? 'default' : s.review_status === 'rejected' ? 'destructive' : 'secondary'}>{s.review_status}</Badge></TableCell>
                        <TableCell>{s.revision}</TableCell>
                        <TableCell className="text-sm">{s.submitted_date ? format(new Date(s.submitted_date), 'dd/MM/yy') : '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="ncrs">
          <Card><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>NCR #</TableHead><TableHead>Title</TableHead><TableHead>Severity</TableHead>
                  <TableHead>{t('common.status')}</TableHead><TableHead>Cost Impact</TableHead><TableHead>Raised</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ncrs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No NCRs</TableCell></TableRow>
                    : ncrs.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono">{n.ncr_number}</TableCell>
                        <TableCell className="font-medium">{n.title}</TableCell>
                        <TableCell><Badge variant={n.severity === 'critical' ? 'destructive' : n.severity === 'major' ? 'default' : 'secondary'}>{n.severity}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{n.status}</Badge></TableCell>
                        <TableCell>{(n.cost_impact || 0).toLocaleString()} SAR</TableCell>
                        <TableCell className="text-sm">{n.raised_date ? format(new Date(n.raised_date), 'dd/MM/yy') : '-'}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="drawings">
          <Card><CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Doc #</TableHead><TableHead>Title</TableHead><TableHead>{t('common.type')}</TableHead>
                  <TableHead>Discipline</TableHead><TableHead>Rev</TableHead><TableHead>{t('common.status')}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {documents.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents</TableCell></TableRow>
                    : documents.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono">{d.doc_no}</TableCell>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                        <TableCell>{d.discipline || '-'}</TableCell>
                        <TableCell>{d.current_revision}</TableCell>
                        <TableCell><Badge>{d.status}</Badge></TableCell>
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
