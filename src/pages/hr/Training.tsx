import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTrainingPrograms, useTrainingEnrollments } from '@/hooks/useTraining';
import { useEmployees } from '@/hooks/useEmployees';
import { Plus, GraduationCap, Users, Eye, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const trainingColumns: ColumnDef[] = [
  { key: 'title', header: 'Program' },
  { key: 'category', header: 'Category' },
  { key: 'trainer', header: 'Trainer' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'end_date', header: 'End Date' },
  { key: 'status', header: 'Status' },
  { key: 'cost', header: 'Cost' },
];

export default function Training() {
  const { t } = useLanguage();
  const { programs, isLoading, createProgram, deleteProgram } = useTrainingPrograms();
  const { employees } = useEmployees();
  const [formOpen, setFormOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [enrollEmpId, setEnrollEmpId] = useState('');

  const { enrollments, enrollEmployee } = useTrainingEnrollments(selectedProgram || undefined);

  const [form, setForm] = useState({
    title: '', description: '', category: 'general', trainer: '',
    start_date: '', end_date: '', location: '', max_participants: 0, cost: 0,
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProgram.mutate({
      ...form,
      max_participants: form.max_participants || null,
      cost: form.cost || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      trainer: form.trainer || null,
      location: form.location || null,
      description: form.description || null,
    });
    setFormOpen(false);
    setForm({ title: '', description: '', category: 'general', trainer: '', start_date: '', end_date: '', location: '', max_participants: 0, cost: 0 });
  };

  const handleEnroll = () => {
    if (selectedProgram && enrollEmpId) {
      enrollEmployee.mutate({ trainingId: selectedProgram, employeeId: enrollEmpId });
      setEnrollEmpId('');
    }
  };

  const statusBadge = (s: string | null) => {
  const { t } = useLanguage();

    switch (s) {
      case 'active': return <Badge className="bg-green-100 text-green-800">{t('common.active')}</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">Planned</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training & Development</h1>
          <p className="text-muted-foreground">Manage training programs and employee enrollments</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={programs} columns={trainingColumns} filename="training-programs" title="Training Programs" />
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Program</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><GraduationCap className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{programs.length}</p><p className="text-sm text-muted-foreground">Total Programs</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><GraduationCap className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{programs.filter(p => p.status === 'active').length}</p><p className="text-sm text-muted-foreground">Active Programs</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><Users className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold">{programs.filter(p => p.status === 'completed').length}</p><p className="text-sm text-muted-foreground">Completed</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Training Programs</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No programs yet</TableCell></TableRow>
                  ) : programs.map(p => (
                    <TableRow key={p.id} className={selectedProgram === p.id ? 'bg-accent' : ''}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="capitalize">{p.category}</TableCell>
                      <TableCell>{p.trainer || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {p.start_date ? format(new Date(p.start_date), 'MMM d') : '-'}
                        {p.end_date ? ` - ${format(new Date(p.end_date), 'MMM d, yyyy')}` : ''}
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedProgram(p.id); setEnrollOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProgram.mutate(p.id)}>
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

        {/* Enrollments Panel */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Enrollments</CardTitle></CardHeader>
          <CardContent>
            {!selectedProgram ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Select a program to view enrollments</p>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select value={enrollEmpId || '__none__'} onValueChange={v => setEnrollEmpId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select Employee</SelectItem>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleEnroll} disabled={!enrollEmpId}>Enroll</Button>
                </div>
                {enrollments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">No enrollments</p>
                ) : enrollments.map(en => (
                  <div key={en.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{en.employee?.first_name} {en.employee?.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{en.status}</p>
                    </div>
                    <Badge variant={en.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {en.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Training Program</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="leadership">Leadership</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Trainer</Label><Input value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cost (SAR)</Label><Input type="number" value={form.cost || ''} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createProgram.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
