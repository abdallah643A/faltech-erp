import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDepartments } from '@/hooks/useEmployees';
import { Plus, Search, Edit, Trash2, Loader2, Building2 } from 'lucide-react';
import { DepartmentFormDialog } from '@/components/hr/DepartmentFormDialog';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const deptColumns: ColumnDef[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'description', header: 'Description' },
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

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  manager_id: string | null;
  region_id: string | null;
  company_id: string | null;
  parent_department_id: string | null;
  manager?: { id: string; first_name: string; last_name: string } | null;
}

export default function Departments() {
  const { t } = useLanguage();
  const { departments, isLoading, deleteDepartment } = useDepartments();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(search.toLowerCase()) ||
    (dept.code && dept.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setFormOpen(true);
  };

  const handleDelete = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (departmentToDelete) {
      deleteDepartment.mutate(departmentToDelete.id);
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Departments
          </h1>
          <p className="text-muted-foreground">Manage department master data</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filteredDepartments} columns={deptColumns} filename="departments" title="Departments" />
          <Button onClick={() => { setSelectedDepartment(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search departments..."
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
                  <TableHead>Department Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No departments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>{department.code || '-'}</TableCell>
                      <TableCell>
                        {department.manager 
                          ? `${department.manager.first_name} ${department.manager.last_name}` 
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{department.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(department)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(department)}>
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

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        department={selectedDepartment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{departmentToDelete?.name}"? 
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
