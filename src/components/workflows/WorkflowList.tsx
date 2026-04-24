import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Copy, Trash2, Edit, Eye, Power, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { DOCUMENT_TYPES } from './workflowConstants';

interface WorkflowListProps {
  templates: any[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (template: any) => void;
  onClone: (template: any) => void;
  onToggleStatus: (template: any) => void;
  onArchive: (template: any) => void;
  isAr: boolean;
}

export default function WorkflowList({ templates, isLoading, onCreateNew, onEdit, onClone, onToggleStatus, onArchive, isAr }: WorkflowListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');

  const filtered = (templates || []).filter((t: any) => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter || (statusFilter === 'active' && t.is_active);
    const matchDoc = docTypeFilter === 'all' || t.document_type === docTypeFilter;
    return matchSearch && matchStatus && matchDoc;
  });

  const statusBadge = (t: any) => {
    const s = t.status || (t.is_active ? 'active' : 'draft');
    const map: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
    return <Badge className={map[s] || map.draft}>{s}</Badge>;
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return <Badge className={map[p] || map.medium}>{p}</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search workflows...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Status'}</SelectItem>
              <SelectItem value="draft">{isAr ? 'مسودة' : 'Draft'}</SelectItem>
              <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="archived">{isAr ? 'مؤرشف' : 'Archived'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل الأنواع' : 'All Doc Types'}</SelectItem>
              {DOCUMENT_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{isAr ? d.labelAr : d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onCreateNew} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> {isAr ? 'إنشاء سير عمل' : 'New Workflow'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>{isAr ? 'الاسم' : 'Workflow Name'}</TableHead>
                <TableHead>{isAr ? 'نوع المستند' : 'Document Type'}</TableHead>
                <TableHead>{isAr ? 'المراحل' : 'Stages'}</TableHead>
                <TableHead>{isAr ? 'الأولوية' : 'Priority'}</TableHead>
                <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{isAr ? 'الإصدار' : 'Version'}</TableHead>
                <TableHead>{isAr ? 'SLA' : 'SLA'}</TableHead>
                <TableHead>{isAr ? 'تاريخ الإنشاء' : 'Created'}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t: any) => (
                <TableRow key={t.id} className="text-xs cursor-pointer hover:bg-muted/50" onClick={() => onEdit(t)}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    {t.description && <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{t.description}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {DOCUMENT_TYPES.find(d => d.value === t.document_type)?.[isAr ? 'labelAr' : 'label'] || t.document_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.stage_count || '—'}</TableCell>
                  <TableCell>{priorityBadge(t.priority || 'medium')}</TableCell>
                  <TableCell>{statusBadge(t)}</TableCell>
                  <TableCell>v{t.version || 1}</TableCell>
                  <TableCell>{t.sla_hours ? `${t.sla_hours}h` : '—'}</TableCell>
                  <TableCell>{t.created_at ? format(new Date(t.created_at), 'dd/MM/yy') : '—'}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(t)}><Edit className="h-3 w-3 mr-2" />{isAr ? 'تعديل' : 'Edit'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClone(t)}><Copy className="h-3 w-3 mr-2" />{isAr ? 'نسخ' : 'Clone'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleStatus(t)}><Power className="h-3 w-3 mr-2" />{t.is_active ? (isAr ? 'تعطيل' : 'Deactivate') : (isAr ? 'تفعيل' : 'Activate')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(t)} className="text-destructive"><Archive className="h-3 w-3 mr-2" />{isAr ? 'أرشفة' : 'Archive'}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                    {isAr ? 'لا توجد سير عمل' : 'No workflows found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
