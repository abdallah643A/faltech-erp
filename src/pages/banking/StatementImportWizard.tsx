import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useParseStatement, useBankImports, useRunAutoRecon } from '@/hooks/useBankRecon';
import { useNavigate } from 'react-router-dom';

export default function StatementImportWizard() {
  const [format, setFormat] = useState('csv');
  const [statementDate, setStatementDate] = useState('');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const navigate = useNavigate();

  const parse = useParseStatement();
  const recon = useRunAutoRecon();
  const { data: imports = [] } = useBankImports();

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    setContent(text);
    const lower = f.name.toLowerCase();
    if (lower.endsWith('.xml')) setFormat('camt053');
    else if (lower.endsWith('.sta') || lower.endsWith('.mt940')) setFormat('mt940');
    else setFormat('csv');
  };

  const submit = async () => {
    if (!content) return;
    const result = await parse.mutateAsync({ file_name: fileName, file_format: format, content, statement_date: statementDate || undefined });
    if (result?.import_id) {
      // Auto-trigger recon
      await recon.mutateAsync({ import_id: result.import_id });
      navigate(`/banking/reconciliation-workbench/${result.import_id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bank Statement Import</h1>
        <p className="text-muted-foreground">Upload MT940, CAMT.053, or CSV files. Auto-recon runs after parsing.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload Statement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>File</Label>
              <Input type="file" accept=".csv,.xml,.sta,.mt940,.txt" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="mt940">SWIFT MT940</SelectItem>
                  <SelectItem value="camt053">ISO 20022 CAMT.053</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statement Date</Label>
              <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={submit} disabled={!content || parse.isPending || recon.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {parse.isPending ? 'Parsing…' : recon.isPending ? 'Reconciling…' : 'Parse & Auto-Reconcile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Imports</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="flex items-center gap-2"><FileText className="h-4 w-4" />{i.file_name}</TableCell>
                  <TableCell><Badge variant="outline">{i.file_format}</Badge></TableCell>
                  <TableCell>{i.statement_date ?? '—'}</TableCell>
                  <TableCell>{i.total_lines}</TableCell>
                  <TableCell>{i.duplicate_lines > 0 ? <Badge variant="secondary">{i.duplicate_lines}</Badge> : '—'}</TableCell>
                  <TableCell>
                    {i.status === 'parsed' && <Badge><CheckCircle2 className="h-3 w-3 mr-1" />{i.status}</Badge>}
                    {i.status === 'failed' && <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{i.status}</Badge>}
                    {!['parsed', 'failed'].includes(i.status) && <Badge variant="outline">{i.status}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/banking/reconciliation-workbench/${i.id}`)}>
                      <Sparkles className="h-3 w-3 mr-1" />Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {imports.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No imports yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
