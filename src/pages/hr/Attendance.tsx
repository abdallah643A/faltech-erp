import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { Calendar, Clock, Search, Loader2, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';

const attColumns: ColumnDef[] = [
  { key: 'date', header: 'Date' },
  { key: 'status', header: 'Status' },
  { key: 'check_in', header: 'Check In' },
  { key: 'check_out', header: 'Check Out' },
  { key: 'work_hours', header: 'Work Hours' },
];
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Attendance() {
  const { t } = useLanguage();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const startDate = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
  
  const { attendance, isLoading } = useAttendance(
    selectedEmployee === 'all' ? undefined : selectedEmployee,
    startDate,
    endDate
  );
  const { employees } = useEmployees();

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'half_day':
        return <Badge variant="secondary">Half Day</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return format(new Date(time), 'h:mm a');
  };

  const totalPresent = attendance.filter(a => a.status === 'present').length;
  const totalLate = attendance.filter(a => a.status === 'late').length;
  const totalAbsent = attendance.filter(a => a.status === 'absent').length;
  const avgWorkHours = attendance.length > 0
    ? (attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0) / attendance.length).toFixed(1)
    : '0';

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Attendance</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Track employee attendance records</p>
        </div>
        <ExportImportButtons data={attendance} columns={attColumns} filename="attendance" title="Attendance" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPresent}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLate}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAbsent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgWorkHours}h</p>
                <p className="text-sm text-muted-foreground">Avg. Work Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : attendance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records found</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('hr.employee')}</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead className="hidden md:table-cell">Work Hours</TableHead>
                  <TableHead className="hidden lg:table-cell">Overtime</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {format(new Date(record.attendance_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {record.employee?.first_name} {record.employee?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.employee?.employee_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(record.check_in_time)}</TableCell>
                    <TableCell>{formatTime(record.check_out_time)}</TableCell>
                    <TableCell className="hidden md:table-cell">{record.work_hours?.toFixed(1) || '-'}h</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {record.overtime_hours && record.overtime_hours > 0
                        ? `${record.overtime_hours.toFixed(1)}h`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {record.check_in_location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[100px]">{record.check_in_location}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
