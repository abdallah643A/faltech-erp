import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDepartments, usePositions } from '@/hooks/useEmployees';
import { Plus, Search, Edit, Trash2, Loader2, Briefcase } from 'lucide-react';
import { PositionFormDialog } from '@/components/hr/PositionFormDialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const posColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'title', header: 'Title' },
  { key: 'description', header: 'Description' },
  { key: 'min_salary', header: 'Min Salary' },
  { key: 'max_salary', header: 'Max Salary' },
  { key: 'is_active', header: 'Active' },
];
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface Position {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  department_id: string | null;
  min_salary: number | null;
  max_salary: number | null;
  is_active: boolean | null;
  department?: { id: string; name: string } | null;
}

export default function Positions() {
  const { t } = useLanguage();
  const { positions, isLoading, deletePosition } = usePositions(false);
  const { departments } = useDepartments();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);

  const filteredPositions = positions.filter(pos => 
    pos.title.toLowerCase().includes(search.toLowerCase()) ||
    (pos.code && pos.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setFormOpen(true);
  };

  const handleDelete = (position: Position) => {
    setPositionToDelete(position);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (positionToDelete) {
      deletePosition.mutate(positionToDelete.id);
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
    }
  };

  const formatCurrency = (amount: number | null) => {
  const { t } = useLanguage();

    if (!amount) return '-';
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            Positions
          </h1>
          <p className="text-muted-foreground">Manage position master data</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filteredPositions} columns={posColumns} filename="positions" title="Positions" />
          <Button onClick={() => { setSelectedPosition(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position Title</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>{t('hr.department')}</TableHead>
                  <TableHead>Salary Range</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No positions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPositions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.title}</TableCell>
                      <TableCell>{position.code || '-'}</TableCell>
                      <TableCell>{position.department?.name || '-'}</TableCell>
                      <TableCell>
                        {position.min_salary || position.max_salary ? (
                          <span>{formatCurrency(position.min_salary)} - {formatCurrency(position.max_salary)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={position.is_active ? 'default' : 'secondary'}>
                          {position.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(position)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(position)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        position={selectedPosition}
        departments={departments}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{positionToDelete?.title}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
