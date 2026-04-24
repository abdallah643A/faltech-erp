import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';

const MODULE_CONFIGS: Record<string, { required: string[]; unique?: string[] }> = {
  employees: { required: ['first_name', 'last_name', 'email', 'employee_code'], unique: ['employee_code', 'email'] },
  items: { required: ['item_code', 'item_name'], unique: ['item_code'] },
  customers: { required: ['card_code', 'card_name'], unique: ['card_code'] },
  vendors: { required: ['card_code', 'card_name'], unique: ['card_code'] },
  chart_of_accounts: { required: ['account_code', 'account_name'], unique: ['account_code'] },
  boq: { required: ['item_code', 'description', 'quantity', 'unit_price'] },
};

type ValidationError = { row: number; column: string; message: string; severity: 'error' | 'warning' };

export default function ImportValidation() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [module, setModule] = useState('employees');
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<{ rows: any[]; errors: ValidationError[]; valid: number; total: number; duplicates: number } | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['import-sessions', activeCompanyId],
    queryFn: async () => {
      let q = supabase.from('import_validation_sessions' as any).select('*').order('created_at', { ascending: false }).limit(20) as any;
      if (activeCompanyId) q = q.eq('company_id', activeCompanyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const validateFile = useCallback(async () => {
    if (!file) return;
    setValidating(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const config = MODULE_CONFIGS[module];
      const errors: ValidationError[] = [];
      const seen = new Map<string, number[]>();

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        // Required fields
        config.required.forEach(field => {
          if (!row[field] && row[field] !== 0) {
            errors.push({ row: rowNum, column: field, message: `Missing required field: ${field}`, severity: 'error' });
          }
        });
        // Email validation
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push({ row: rowNum, column: 'email', message: 'Invalid email format', severity: 'error' });
        }
        // Phone validation
        if (row.phone && !/^[\d\s\-+()]{7,20}$/.test(row.phone)) {
          errors.push({ row: rowNum, column: 'phone', message: 'Invalid phone format', severity: 'warning' });
        }
        // Duplicate detection
        config.unique?.forEach(field => {
          const val = String(row[field] || '').toLowerCase().trim();
          if (val) {
            if (!seen.has(`${field}:${val}`)) seen.set(`${field}:${val}`, []);
            seen.get(`${field}:${val}`)!.push(rowNum);
          }
        });
      });

      let duplicates = 0;
      seen.forEach((rowNums, key) => {
        if (rowNums.length > 1) {
          duplicates += rowNums.length - 1;
          const [field] = key.split(':');
          rowNums.slice(1).forEach(r => {
            errors.push({ row: r, column: field, message: `Duplicate value (first seen in row ${rowNums[0]})`, severity: 'warning' });
          });
        }
      });

      const errorRows = new Set(errors.filter(e => e.severity === 'error').map(e => e.row)).size;
      const validRows = rows.length - errorRows;

      setResults({ rows, errors, valid: validRows, total: rows.length, duplicates });

      // Save session
      await (supabase.from('import_validation_sessions' as any).insert({
        file_name: file.name, module, total_rows: rows.length, valid_rows: validRows,
        error_rows: errorRows, warning_rows: errors.filter(e => e.severity === 'warning').length,
        duplicate_rows: duplicates, errors_json: errors.slice(0, 100),
        status: errorRows > 0 ? 'has_errors' : 'valid', created_by: user?.id,
        ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
      }) as any);
      queryClient.invalidateQueries({ queryKey: ['import-sessions'] });

      toast({ title: errorRows > 0 ? `${errorRows} rows with errors found` : 'File validated successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  }, [file, module]);

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><FileSpreadsheet className="h-6 w-6" /> Import Validation Center</h1>
        <p className="text-sm text-muted-foreground">Validate Excel/CSV uploads before committing data</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Upload & Validate</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[150px]">
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(MODULE_CONFIGS).map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <input type="file" accept=".xlsx,.xls,.csv" onChange={e => { setFile(e.target.files?.[0] || null); setResults(null); }} className="text-sm" />
            </div>
            <Button onClick={validateFile} disabled={!file || validating} className="gap-2">
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Validate
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Required fields for <span className="font-medium capitalize">{module.replace('_', ' ')}</span>: {MODULE_CONFIGS[module].required.join(', ')}
          </div>
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Rows</p><p className="text-2xl font-bold">{results.total}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Valid</p><p className="text-2xl font-bold text-primary">{results.valid}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> Errors</p><p className="text-2xl font-bold text-destructive">{results.errors.filter(e => e.severity === 'error').length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Duplicates</p><p className="text-2xl font-bold">{results.duplicates}</p></CardContent></Card>
          </div>
          <Progress value={(results.valid / results.total) * 100} className="h-2" />

          {results.errors.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-destructive">Validation Errors ({results.errors.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-16">Row</TableHead><TableHead>Column</TableHead><TableHead>Issue</TableHead><TableHead className="w-20">Severity</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {results.errors.slice(0, 50).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{e.row}</TableCell>
                          <TableCell className="text-sm font-medium">{e.column}</TableCell>
                          <TableCell className="text-sm">{e.message}</TableCell>
                          <TableCell><Badge variant={e.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs">{e.severity}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {sessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Validation Sessions</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto">
              <Table><TableHeader><TableRow>
                <TableHead>File</TableHead><TableHead>Module</TableHead><TableHead>{t('common.total')}</TableHead><TableHead>Valid</TableHead><TableHead>Errors</TableHead><TableHead>{t('common.status')}</TableHead><TableHead>{t('common.date')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{s.file_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{s.module?.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-sm">{s.total_rows}</TableCell>
                    <TableCell className="text-sm text-primary">{s.valid_rows}</TableCell>
                    <TableCell className="text-sm text-destructive">{s.error_rows}</TableCell>
                    <TableCell><Badge variant={s.status === 'valid' ? 'default' : 'destructive'} className="text-xs">{s.status}</Badge></TableCell>
                    <TableCell className="text-xs">{s.created_at ? format(new Date(s.created_at), 'PP') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody></Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
