import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  posted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  reversed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const LC_TYPES: Record<string, string> = {
  import_shipment: 'Import',
  local_procurement: 'Local',
  inter_branch: 'Inter-Branch',
  project_material: 'Project',
};

interface Props {
  documents: any[];
  onSelect: (doc: any) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function LCDocumentList({ documents, onSelect, onCreate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = (documents || []).filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter !== 'all' && d.lc_type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.doc_number || '').toLowerCase().includes(s) ||
        (d.vendor_name || '').toLowerCase().includes(s) ||
        (d.shipment_no || '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 text-xs pl-7 border-border" placeholder="Search by doc#, vendor, shipment..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="import_shipment">Import</SelectItem>
            <SelectItem value="local_procurement">Local</SelectItem>
            <SelectItem value="inter_branch">Inter-Branch</SelectItem>
            <SelectItem value="project_material">Project</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs gap-1" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" /> New LC Document
        </Button>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="h-8 text-xs">Doc #</TableHead>
              <TableHead className="h-8 text-xs">Type</TableHead>
              <TableHead className="h-8 text-xs">Vendor</TableHead>
              <TableHead className="h-8 text-xs">Shipment</TableHead>
              <TableHead className="h-8 text-xs">Date</TableHead>
              <TableHead className="h-8 text-xs text-right">Base Cost</TableHead>
              <TableHead className="h-8 text-xs text-right">Charges</TableHead>
              <TableHead className="h-8 text-xs text-right">Total LC</TableHead>
              <TableHead className="h-8 text-xs">Status</TableHead>
              <TableHead className="h-8 text-xs w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(d => (
              <TableRow key={d.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onSelect(d)}>
                <TableCell className="py-1.5 text-xs font-medium text-primary">{d.doc_number}</TableCell>
                <TableCell className="py-1.5 text-xs">{LC_TYPES[d.lc_type] || d.lc_type}</TableCell>
                <TableCell className="py-1.5 text-xs">{d.vendor_name || '-'}</TableCell>
                <TableCell className="py-1.5 text-xs">{d.shipment_no || '-'}</TableCell>
                <TableCell className="py-1.5 text-xs">{d.posting_date ? format(new Date(d.posting_date), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell className="py-1.5 text-xs text-right font-mono">{(Number(d.total_base_cost) || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-1.5 text-xs text-right font-mono">{(Number(d.total_charges) || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-1.5 text-xs text-right font-mono font-semibold">{(Number(d.total_landed_cost) || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="py-1.5">
                  <Badge className={`text-[10px] ${STATUS_COLORS[d.status] || ''}`}>{d.status}</Badge>
                </TableCell>
                <TableCell className="py-1.5" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onSelect(d)}><Eye className="h-3 w-3" /></Button>
                    {d.status === 'draft' && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(d.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">No landed cost documents found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
