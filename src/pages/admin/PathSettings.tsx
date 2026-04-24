import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PathConfig {
  id: string; category: string; label: string; path: string; description: string;
  isValid: boolean; maxSizeMB: number; allowedTypes: string; retentionDays: number; isRequired: boolean;
}

const INITIAL_PATHS: PathConfig[] = [
  { id: '1', category: 'Documents', label: 'Attachments', path: '/storage/attachments', description: 'Transaction attachments', isValid: true, maxSizeMB: 25, allowedTypes: 'pdf,docx,xlsx,jpg,png', retentionDays: 365, isRequired: true },
  { id: '2', category: 'Documents', label: 'Scanned Docs', path: '/storage/scans', description: 'Scanned paper documents', isValid: true, maxSizeMB: 50, allowedTypes: 'pdf,tiff,jpg', retentionDays: 730, isRequired: false },
  { id: '3', category: 'Reports', label: 'Report Output', path: '/storage/reports', description: 'Generated reports', isValid: true, maxSizeMB: 100, allowedTypes: 'pdf,xlsx,csv', retentionDays: 180, isRequired: true },
  { id: '4', category: 'Backup', label: 'Database Backup', path: '/backup/db', description: 'DB backup files', isValid: true, maxSizeMB: 5000, allowedTypes: 'bak,sql', retentionDays: 90, isRequired: true },
  { id: '5', category: 'Integration', label: 'Import Files', path: '/integration/import', description: 'Incoming data files', isValid: true, maxSizeMB: 200, allowedTypes: 'xlsx,csv,xml,json', retentionDays: 30, isRequired: true },
  { id: '6', category: 'Integration', label: 'Export Files', path: '/integration/export', description: 'Outgoing exports', isValid: true, maxSizeMB: 200, allowedTypes: 'xlsx,csv,xml', retentionDays: 30, isRequired: true },
  { id: '7', category: 'System', label: 'Audit Logs', path: '/storage/audit', description: 'Audit trail archives', isValid: true, maxSizeMB: 1000, allowedTypes: 'log,json', retentionDays: 2555, isRequired: true },
  { id: '8', category: 'System', label: 'Temp Files', path: '/tmp/erp', description: 'Temp processing', isValid: true, maxSizeMB: 500, allowedTypes: '*', retentionDays: 7, isRequired: false },
];

export default function PathSettings() {
  const [paths, setPaths] = useState(INITIAL_PATHS);
  const [filter, setFilter] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const categories = [...new Set(paths.map(p => p.category))];
  const filtered = filter ? paths.filter(p => p.category === filter) : paths;

  const updatePath = (id: string, field: keyof PathConfig, value: any) => {
    setPaths(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setHasChanges(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Path Settings</h1><p className="text-sm text-muted-foreground">Configure storage paths, file policies, and retention</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('All paths validated')}><RefreshCw className="h-4 w-4 mr-1" />Validate</Button>
          <Button size="sm" onClick={() => { setHasChanges(false); toast.success('Saved'); }} disabled={!hasChanges}><Save className="h-4 w-4 mr-1" />Save</Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{paths.length}</div><div className="text-xs text-muted-foreground">Paths</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-emerald-600">{paths.filter(p => p.isValid).length}</div><div className="text-xs text-muted-foreground">Valid</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{paths.filter(p => !p.isValid).length}</div><div className="text-xs text-muted-foreground">Invalid</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{categories.length}</div><div className="text-xs text-muted-foreground">Categories</div></CardContent></Card>
      </div>
      <div className="flex gap-2 items-center">
        <Label className="text-xs">Category:</Label>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent><SelectItem value="">All</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Category</TableHead><TableHead>Label</TableHead><TableHead>Path</TableHead><TableHead>Max Size</TableHead><TableHead>Types</TableHead><TableHead>Retention</TableHead><TableHead>Required</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell><Badge variant="outline" className="text-xs">{p.category}</Badge></TableCell>
                <TableCell><div className="font-medium text-sm">{p.label}</div><div className="text-[10px] text-muted-foreground">{p.description}</div></TableCell>
                <TableCell><Input value={p.path} onChange={e => updatePath(p.id, 'path', e.target.value)} className="h-7 text-xs font-mono w-44" /></TableCell>
                <TableCell><div className="flex items-center gap-1"><Input type="number" value={p.maxSizeMB} onChange={e => updatePath(p.id, 'maxSizeMB', +e.target.value)} className="h-7 text-xs w-16" /><span className="text-[10px] text-muted-foreground">MB</span></div></TableCell>
                <TableCell><Input value={p.allowedTypes} onChange={e => updatePath(p.id, 'allowedTypes', e.target.value)} className="h-7 text-xs w-28" /></TableCell>
                <TableCell><div className="flex items-center gap-1"><Input type="number" value={p.retentionDays} onChange={e => updatePath(p.id, 'retentionDays', +e.target.value)} className="h-7 text-xs w-14" /><span className="text-[10px] text-muted-foreground">d</span></div></TableCell>
                <TableCell><Switch checked={p.isRequired} onCheckedChange={v => updatePath(p.id, 'isRequired', v)} /></TableCell>
                <TableCell>{p.isValid ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
