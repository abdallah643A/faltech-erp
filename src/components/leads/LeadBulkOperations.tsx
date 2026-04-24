import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Upload, Trash2, UserPlus, RefreshCw, CheckSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Lead } from '@/hooks/useLeads';

interface LeadBulkOperationsProps {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkAssign: (ids: string[], userId: string) => void;
  onBulkStatusChange: (ids: string[], status: string) => void;
  users: Array<{ user_id: string; full_name: string | null; email: string }>;
}

export function LeadBulkOperations({
  leads, selectedIds, onToggleSelect, onSelectAll, onClearSelection,
  onBulkDelete, onBulkAssign, onBulkStatusChange, users,
}: LeadBulkOperationsProps) {
  const { t } = useLanguage();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  const selectedCount = selectedIds.size;
  const allSelected = leads.length > 0 && selectedCount === leads.length;

  const handleExport = () => {
    const headers = ['Name', 'Code', 'Email', 'Phone', 'Source', 'Status', 'Score'];
    const rows = leads
      .filter(l => selectedCount === 0 || selectedIds.has(l.id))
      .map(l => [l.card_name, l.card_code, l.email || '', l.phone || '', l.source || '', l.status || '', l.score || '']);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export Complete', description: `Exported ${rows.length} leads` });
  };

  const handleBulkAssign = () => {
    if (!assignUserId) return;
    onBulkAssign(Array.from(selectedIds), assignUserId);
    setIsAssignDialogOpen(false);
    setAssignUserId('');
  };

  const handleBulkStatus = () => {
    if (!bulkStatus) return;
    onBulkStatusChange(Array.from(selectedIds), bulkStatus);
    setIsStatusDialogOpen(false);
    setBulkStatus('');
  };

  return (
    <>
      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="enterprise-card p-3 flex items-center gap-3 flex-wrap bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{selectedCount} selected</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />Assign
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsStatusDialogOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />Change Status
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1" />Export
            </Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => onBulkDelete(Array.from(selectedIds))}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={onClearSelection}>Clear</Button>
        </div>
      )}

      {/* Selection controls row */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={() => allSelected ? onClearSelection() : onSelectAll()}
        />
        <span className="text-xs text-muted-foreground">Select all</span>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />{t('common.export')}
          </Button>
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Leads</DialogTitle>
            <DialogDescription>Assign {selectedCount} leads to a user</DialogDescription>
          </DialogHeader>
          <Select value={assignUserId} onValueChange={setAssignUserId}>
            <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
            <SelectContent>
              {users.filter(u => u.user_id).map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={!assignUserId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>Update status for {selectedCount} leads</DialogDescription>
          </DialogHeader>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Hot">Hot</SelectItem>
              <SelectItem value="Warm">Warm</SelectItem>
              <SelectItem value="Cold">Cold</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkStatus} disabled={!bulkStatus}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
