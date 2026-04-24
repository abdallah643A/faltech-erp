import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStatementTemplates, useStatementLines } from '@/hooks/useFinanceEnhanced';
import { BookOpen } from 'lucide-react';

export default function IFRSReportingViews() {
  const { data: templates } = useStatementTemplates();
  const ifrsTemplates = templates.filter((t: any) => t.framework === 'IFRS' || t.framework === 'SOCPA');
  const [selected, setSelected] = useState<string>('');
  const { data: lines } = useStatementLines(selected || undefined);

  const renderLine = (l: any) => {
    const indent = l.line_type === 'detail' ? 'pl-6' : l.line_type === 'subtotal' ? 'pl-3 border-t' : 'pl-0';
    const cls = `${indent} ${l.is_bold ? 'font-bold' : ''} ${l.line_type === 'total' ? 'border-t-2 border-foreground font-bold uppercase' : ''}`;
    return (
      <TableRow key={l.id}>
        <TableCell className={cls}>
          {l.line_label}
          {l.line_label_ar && <span className="ml-2 text-xs text-muted-foreground" dir="rtl">{l.line_label_ar}</span>}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">—</TableCell>
        <TableCell className="text-right text-muted-foreground">—</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> IFRS Reporting Views</h1>
          <p className="text-muted-foreground">IAS 1, IAS 7, SOCPA-aligned statement views</p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Select statement template" /></SelectTrigger>
          <SelectContent>
            {ifrsTemplates.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.framework} · {t.template_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selected ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ifrsTemplates.map((t: any) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(t.id)}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">{t.framework}</Badge>
                <CardTitle className="text-base mt-2">{t.template_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground" dir="rtl">{t.template_name_ar}</p>
                <p className="text-xs mt-2">{t.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{ifrsTemplates.find((t: any) => t.id === selected)?.template_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Line</TableHead>
                <TableHead className="text-right">Current Period</TableHead>
                <TableHead className="text-right">Prior Period</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(lines || []).map(renderLine)}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-4">Note: Amount values will populate once GL data binding is configured for this template.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
