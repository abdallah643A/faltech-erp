import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEmployees, useDepartments, usePositions } from '@/hooks/useEmployees';
import { Plus, Search, Edit, Trash2, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import { EmployeeFormDialog } from '@/components/hr/EmployeeFormDialog';
import { EmployeeDetailsDialog } from '@/components/hr/EmployeeDetailsDialog';
import { EmployeeExcelImport } from '@/components/hr/EmployeeExcelImport';
import { Employee } from '@/hooks/useEmployees';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Employees() {
  const { t } = useLanguage();
  const { employees, isLoading, deleteEmployee } = useEmployees(false);
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const empColumns: ColumnDef[] = [
    { key: 'employee_code', header: t('common.code') },
    { key: 'first_name', header: t('hr.firstName') },
    { key: 'last_name', header: t('hr.lastName') },
    { key: 'email', header: t('common.email') },
    { key: 'phone', header: t('common.phone') },
    { key: 'employment_status', header: t('common.status') },
    { key: 'hire_date', header: t('hr.hireDate') },
    { key: 'basic_salary', header: t('hr.basicSalary') },
  ];

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabels: Record<string, string> = {

    active: t('common.active'),
    on_leave: t('hr.onLeave'),
    terminated: t('hr.terminated'),
    resigned: t('hr.resigned'),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.employees')}</h1>
          <p className="text-muted-foreground">{t('hr.manageEmployeeRecords')}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={filteredEmployees} columns={empColumns} filename="employees" title={t('nav.employees')} />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> {t('hr.importExcel')}
          </Button>
          <Button onClick={() => { setSelectedEmployee(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> {t('hr.addEmployee')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('hr.searchEmployees')} value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
                  <TableHead>{t('hr.employee')}</TableHead>
                  <TableHead>{t('nav.departments')}</TableHead>
                  <TableHead>{t('hr.position')}</TableHead>
                  <TableHead>{t('common.branch')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('hr.hireDate')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {t('hr.noEmployeesFound')}
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-sm text-muted-foreground">{employee.employee_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department?.name || '-'}</TableCell>
                    <TableCell>{employee.position?.title || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{employee.branch?.name || '-'}</p>
                        {employee.company?.name && (
                          <p className="text-muted-foreground text-xs">{employee.company.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        employee.employment_status === 'active' ? 'default' :
                        employee.employment_status === 'on_leave' ? 'secondary' : 'destructive'
                      }>{statusLabels[employee.employment_status] || employee.employment_status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(employee.hire_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setDetailsOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedEmployee(employee); setFormOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEmployeeToDelete(employee); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={selectedEmployee}
        departments={departments} positions={positions} employees={employees} />
      <EmployeeDetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} employee={selectedEmployee} />
      <EmployeeExcelImport open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('hr.deleteEmployee')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('hr.deleteEmployeeConfirm').replace('{name}', `${employeeToDelete?.first_name || ''} ${employeeToDelete?.last_name || ''}`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (employeeToDelete) { deleteEmployee.mutate(employeeToDelete.id); setDeleteDialogOpen(false); setEmployeeToDelete(null); }
            }} className="bg-destructive text-destructive-foreground">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
