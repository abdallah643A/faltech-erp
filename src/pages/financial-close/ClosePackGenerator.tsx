import { useState } from 'react';
import { useFinancialClose } from '@/hooks/useFinancialClose';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ClosePackGenerator() {
  const { periods, useCloseTasks, useCloseExceptions, useCloseSignoffs } = useFinancialClose();
  const completedPeriods = periods.filter(p => p.status === 'completed' || p.status === 'review' || p.status === 'in_progress');
  const [selectedPeriod, setSelectedPeriod] = useState(completedPeriods[0]?.id || '');
  const period = periods.find(p => p.id === selectedPeriod);
  const { data: tasks = [] } = useCloseTasks(selectedPeriod || null);
  const { data: exceptions = [] } = useCloseExceptions(selectedPeriod || null);
  const { data: signoffs = [] } = useCloseSignoffs(selectedPeriod || null);

  const [sections, setSections] = useState({
    summary: true,
    tasks: true,
    exceptions: true,
    signoffs: true,
    readiness: true,
  });

  const generatePDF = () => {
    if (!period) return;
    const doc = new jsPDF();
    const title = `Close Pack - ${period.period_label || `${period.fiscal_year} P${period.period_number}`}`;
    let y = 20;

    doc.setFontSize(18);
    doc.text(title, 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, y);
    y += 10;
    doc.text(`Status: ${period.status} | Readiness: ${period.readiness_score}%`, 14, y);
    y += 15;

    if (sections.summary) {
      doc.setFontSize(14);
      doc.text('Executive Summary', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Total Tasks: ${period.total_tasks} | Completed: ${period.completed_tasks}`, 14, y);
      y += 6;
      doc.text(`Exceptions: ${period.exception_count} | Open: ${exceptions.filter(e => e.status === 'open').length}`, 14, y);
      y += 6;
      doc.text(`Sign-offs: ${signoffs.filter(s => s.status === 'approved').length}/${signoffs.length} approved`, 14, y);
      y += 15;
    }

    if (sections.tasks && tasks.length > 0) {
      doc.setFontSize(14);
      doc.text('Close Tasks', 14, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Task', 'Status', 'Priority', 'Owner', 'Function']],
        body: tasks.map(t => [t.task_name, t.status, t.priority, t.owner_name || '—', t.function_area]),
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (sections.exceptions && exceptions.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text('Exceptions', 14, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Type', 'Severity', 'Title', 'Status']],
        body: exceptions.map(e => [e.exception_type, e.severity, e.title, e.status]),
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (sections.signoffs && signoffs.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text('Sign-off Matrix', 14, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Level', 'Role', 'Status', 'Signer', 'Date']],
        body: signoffs.map(s => [s.signoff_level, s.signoff_role, s.status, s.signer_name || '—', s.signed_at ? new Date(s.signed_at).toLocaleDateString() : '—']),
        styles: { fontSize: 8 },
      });
    }

    doc.save(`close-pack-${period.fiscal_year}-P${period.period_number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Close Pack Generator</h1>
          <p className="text-muted-foreground">Generate board-ready close summary documentation</p>
        </div>
        <div className="flex items-center gap-3">
          {completedPeriods.length > 0 && (
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select period" /></SelectTrigger>
              <SelectContent>
                {completedPeriods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.period_label || `${p.fiscal_year} P${p.period_number}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={generatePDF} disabled={!period}><Download className="h-4 w-4 mr-2" />Generate PDF</Button>
        </div>
      </div>

      {period && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Config */}
          <Card>
            <CardHeader><CardTitle>Pack Sections</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(sections).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox checked={val} onCheckedChange={v => setSections(s => ({ ...s, [key]: !!v }))} />
                  <span className="capitalize">{key.replace('_', ' ')}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Pack Preview</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {sections.summary && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Readiness:</span> <span className="font-medium">{period.readiness_score}%</span></div>
                    <div><span className="text-muted-foreground">Tasks:</span> <span className="font-medium">{period.completed_tasks}/{period.total_tasks}</span></div>
                    <div><span className="text-muted-foreground">Exceptions:</span> <span className="font-medium">{exceptions.filter(e => e.status === 'open').length} open</span></div>
                  </div>
                </div>
              )}

              {sections.tasks && (
                <div>
                  <h3 className="font-semibold mb-2">Task Completion ({tasks.filter(t => t.status === 'completed').length}/{tasks.length})</h3>
                  <div className="space-y-1">
                    {tasks.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        {t.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        <span>{t.task_name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{t.status}</Badge>
                      </div>
                    ))}
                    {tasks.length > 5 && <p className="text-xs text-muted-foreground">...and {tasks.length - 5} more tasks</p>}
                  </div>
                </div>
              )}

              {sections.signoffs && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4" />Sign-offs</h3>
                  <div className="flex gap-4">
                    {signoffs.map(s => (
                      <div key={s.id} className={`px-4 py-2 rounded-lg border ${s.status === 'approved' ? 'bg-green-50 border-green-300' : 'bg-muted border-border'}`}>
                        <p className="text-sm font-medium">{s.signoff_role}</p>
                        <Badge variant={s.status === 'approved' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!period && <Card><CardContent className="py-12 text-center text-muted-foreground">Select a close period to generate a pack</CardContent></Card>}
    </div>
  );
}
