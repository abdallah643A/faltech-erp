import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit2, Trash2, Eye, Copy, Calendar } from 'lucide-react';
import { BudgetMaster } from '@/hooks/useBudgetMasters';
import { format } from 'date-fns';

const BUDGET_TYPES = [
  { value: 'annual', label: 'Annual Budget' },
  { value: 'project', label: 'Project Budget' },
  { value: 'department', label: 'Department Budget' },
  { value: 'cost_center', label: 'Cost Center Budget' },
  { value: 'branch', label: 'Branch Budget' },
  { value: 'capex', label: 'CAPEX Budget' },
  { value: 'opex', label: 'OPEX Budget' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-700',
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-green-500 text-white',
  rejected: 'bg-destructive/10 text-destructive',
  superseded: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
  frozen: 'bg-blue-100 text-blue-700',
};

interface Props {
  budgets: BudgetMaster[];
  isLoading: boolean;
  onSelect: (b: BudgetMaster) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function BudgetMasterList({ budgets, isLoading, onSelect, onNew, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = budgets.filter(b => {
    if (filterType !== 'all' && b.budget_type !== filterType) return false;
    if (filterStatus !== 'all' && b.approval_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.budget_code.toLowerCase().includes(q) || b.budget_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Budget Register</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search budgets..." className="pl-8 h-8 w-52" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {BUDGET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={onNew}><Plus className="h-4 w-4 mr-1" />New Budget</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Code</TableHead>
                <TableHead className="sticky top-0 bg-background">Name</TableHead>
                <TableHead className="sticky top-0 bg-background">Type</TableHead>
                <TableHead className="sticky top-0 bg-background">Year</TableHead>
                <TableHead className="sticky top-0 bg-background">Period</TableHead>
                <TableHead className="sticky top-0 bg-background">Basis</TableHead>
                <TableHead className="sticky top-0 bg-background">Version</TableHead>
                <TableHead className="sticky top-0 bg-background">Status</TableHead>
                <TableHead className="sticky top-0 bg-background">Owner</TableHead>
                <TableHead className="sticky top-0 bg-background w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-accent/50" onClick={() => onSelect(b)}>
                  <TableCell className="font-mono text-xs font-medium">{b.budget_code}</TableCell>
                  <TableCell className="font-medium">{b.budget_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{BUDGET_TYPES.find(t => t.value === b.budget_type)?.label || b.budget_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {b.is_multi_year ? (
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />{b.start_year}–{b.end_year}
                      </span>
                    ) : b.fiscal_year}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(b.start_date), 'dd/MM/yy')} – {format(new Date(b.end_date), 'dd/MM/yy')}
                  </TableCell>
                  <TableCell className="text-xs capitalize">{b.budget_basis?.replace('_', '-')}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">v{b.current_version}</Badge></TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${STATUS_COLORS[b.approval_status] || ''}`}>
                      {b.approval_status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{b.budget_owner_name || '—'}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSelect(b)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    {isLoading ? 'Loading budgets...' : 'No budgets found. Click "New Budget" to create one.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
