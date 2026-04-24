import { useState, useEffect } from 'react';
import { useCPMS } from '@/hooks/useCPMS';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import { AlertTriangle, Shield, Activity } from 'lucide-react';
import CPMSQuickSteps, { HSE_STEPS } from '@/components/cpms/CPMSQuickSteps';
import { format } from 'date-fns';
import HSEReferencePanel from '@/components/cpms/HSEReferencePanel';
import { useLanguage } from '@/contexts/LanguageContext';

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800', medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800',
};

export default function CPMSHSE() {
  const { t } = useLanguage();
  const { projects, fetchTable } = useCPMS();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const loadData = async () => {
    const filters = selectedProject !== 'all' ? { project_id: selectedProject } : {};
    const data = await fetchTable('cpms_hse_incidents', filters);
    setIncidents(data);
  };

  useEffect(() => { loadData(); }, [selectedProject]);

  const openCount = incidents.filter(i => i.status !== 'closed').length;
  const nearMisses = incidents.filter(i => i.type === 'near_miss').length;
  const lostTime = incidents.filter(i => i.type === 'lost_time').length;

  return (
    <div className="space-y-6 page-enter">
      <CPMSQuickSteps
        moduleName="HSE Incidents"
        moduleNameAr="حوادث السلامة والصحة والبيئة"
        steps={HSE_STEPS}
        tips={[
          'Report all near misses – they are leading indicators of potential accidents.',
          'Critical incidents require immediate notification to management.',
          'Track Lost Time Injury Frequency Rate (LTIFR) monthly.',
        ]}
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-7 w-7 text-primary" /> HSE Incidents</h1>
          <p className="text-muted-foreground">السلامة والصحة والبيئة</p>
        </div>
        <div className="flex gap-2">
          <ExportImportButtons
            data={incidents}
            columns={[
              { key: 'incident_date', header: 'Date' }, { key: 'type', header: 'Type' },
              { key: 'severity', header: 'Severity' }, { key: 'description', header: 'Description' },
              { key: 'location', header: 'Location' }, { key: 'status', header: 'Status' },
            ]}
            filename="cpms-hse-incidents"
            title="HSE Incidents"
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
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-red-600" /><div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-muted-foreground">Open Incidents</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Activity className="h-8 w-8 text-yellow-600" /><div><p className="text-2xl font-bold">{nearMisses}</p><p className="text-xs text-muted-foreground">Near Misses</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Shield className="h-8 w-8 text-orange-600" /><div><p className="text-2xl font-bold">{lostTime}</p><p className="text-xs text-muted-foreground">Lost Time</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{incidents.length}</p><p className="text-xs text-muted-foreground">Total Incidents</p></div></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t('common.date')}</TableHead><TableHead>{t('common.type')}</TableHead><TableHead>Severity</TableHead>
              <TableHead>{t('common.description')}</TableHead><TableHead>Location</TableHead><TableHead>{t('common.status')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {incidents.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No incidents reported</TableCell></TableRow>
                : incidents.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>{format(new Date(i.incident_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell><Badge variant="outline">{i.type?.replace('_', ' ')}</Badge></TableCell>
                    <TableCell><Badge className={severityColors[i.severity] || ''}>{i.severity}</Badge></TableCell>
                    <TableCell className="max-w-[300px] truncate">{i.description}</TableCell>
                    <TableCell>{i.location || '-'}</TableCell>
                    <TableCell><Badge variant={i.status === 'closed' ? 'default' : 'secondary'}>{i.status}</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent></Card>

      <HSEReferencePanel />
    </div>
  );
}
