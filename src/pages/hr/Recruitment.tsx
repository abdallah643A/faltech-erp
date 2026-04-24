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
import { useJobPostings, useJobApplicants } from '@/hooks/useRecruitment';
import { useDepartments, usePositions } from '@/hooks/useEmployees';
import { Plus, Briefcase, UserPlus, Eye, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ExportImportButtons } from '@/components/shared/ExportImportButtons';
import type { ColumnDef } from '@/utils/exportImportUtils';
import { useLanguage } from '@/contexts/LanguageContext';

const jobColumns: ColumnDef[] = [
  { key: 'title', header: 'Title' },
  { key: 'employment_type', header: 'Type' },
  { key: 'location', header: 'Location' },
  { key: 'status', header: 'Status' },
  { key: 'posted_date', header: 'Posted Date' },
  { key: 'closing_date', header: 'Closing Date' },
];

export default function Recruitment() {
  const { t } = useLanguage();
  const { postings, isLoading, createPosting, deletePosting } = useJobPostings();
  const { departments } = useDepartments();
  const { positions } = usePositions();
  const [formOpen, setFormOpen] = useState(false);
  const [applicantFormOpen, setApplicantFormOpen] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState<string | null>(null);
  const { applicants, createApplicant, updateApplicant } = useJobApplicants(selectedPosting || undefined);

  const [form, setForm] = useState({
    title: '', department_id: '', position_id: '', description: '', requirements: '',
    employment_type: 'full_time', location: '', salary_range_min: 0, salary_range_max: 0,
    closing_date: '',
  });

  const [appForm, setAppForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', cover_letter: '',
  });

  const handleCreatePosting = (e: React.FormEvent) => {
  const { t } = useLanguage();

    e.preventDefault();
    createPosting.mutate({
      ...form,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      description: form.description || null,
      requirements: form.requirements || null,
      location: form.location || null,
      salary_range_min: form.salary_range_min || null,
      salary_range_max: form.salary_range_max || null,
      closing_date: form.closing_date || null,
      status: 'open',
      posted_date: new Date().toISOString().split('T')[0],
    });
    setFormOpen(false);
  };

  const handleCreateApplicant = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosting) {
      createApplicant.mutate({
        job_posting_id: selectedPosting,
        ...appForm,
        phone: appForm.phone || null,
        cover_letter: appForm.cover_letter || null,
      });
      setApplicantFormOpen(false);
      setAppForm({ first_name: '', last_name: '', email: '', phone: '', cover_letter: '' });
    }
  };

  const statusBadge = (s: string | null) => {
    switch (s) {
      case 'open': return <Badge className="bg-green-100 text-green-800">Open</Badge>;
      case 'closed': return <Badge variant="secondary">Closed</Badge>;
      case 'on_hold': return <Badge className="bg-yellow-100 text-yellow-800">On Hold</Badge>;
      default: return <Badge variant="outline">Draft</Badge>;
    }
  };

  const appStatusBadge = (s: string | null) => {
    switch (s) {
      case 'shortlisted': return <Badge className="bg-blue-100 text-blue-800">Shortlisted</Badge>;
      case 'interview': return <Badge className="bg-purple-100 text-purple-800">Interview</Badge>;
      case 'offered': return <Badge className="bg-green-100 text-green-800">Offered</Badge>;
      case 'hired': return <Badge>Hired</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Applied</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruitment</h1>
          <p className="text-muted-foreground">Manage job postings and applicants</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportImportButtons data={postings} columns={jobColumns} filename="job-postings" title="Job Postings" />
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Job Posting</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{postings.length}</p><p className="text-sm text-muted-foreground">Total Postings</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><Briefcase className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{postings.filter(p => p.status === 'open').length}</p><p className="text-sm text-muted-foreground">Open Positions</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><UserPlus className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold">{applicants.length}</p><p className="text-sm text-muted-foreground">Applicants (Selected)</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Job Postings</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>{t('hr.department')}</TableHead>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postings.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No postings yet</TableCell></TableRow>
                  ) : postings.map(p => (
                    <TableRow key={p.id} className={selectedPosting === p.id ? 'bg-accent' : ''}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.department?.name || '-'}</TableCell>
                      <TableCell className="capitalize">{(p.employment_type || '').replace('_', ' ')}</TableCell>
                      <TableCell>{p.closing_date ? format(new Date(p.closing_date), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedPosting(p.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePosting.mutate(p.id)}>
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

        {/* Applicants Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Applicants</CardTitle>
              {selectedPosting && (
                <Button size="sm" onClick={() => setApplicantFormOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPosting ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Select a posting</p>
            ) : applicants.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">No applicants</p>
            ) : applicants.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 border rounded mb-2">
                <div>
                  <p className="font-medium text-sm">{a.first_name} {a.last_name}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Select value={a.status || 'applied'} onValueChange={v => updateApplicant.mutate({ id: a.id, status: v })}>
                  <SelectTrigger className="w-[110px] h-7 text-xs">{appStatusBadge(a.status)}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create Posting Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Job Posting</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePosting} className="space-y-4">
            <div className="space-y-2"><Label>Job Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('hr.department')}</Label>
                <Select value={form.department_id || '__none__'} onValueChange={v => setForm({ ...form, department_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t('hr.position')}</Label>
                <Select value={form.position_id || '__none__'} onValueChange={v => setForm({ ...form, position_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Requirements</Label><Textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Closing Date</Label><Input type="date" value={form.closing_date} onChange={e => setForm({ ...form, closing_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Min Salary</Label><Input type="number" value={form.salary_range_min || ''} onChange={e => setForm({ ...form, salary_range_min: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Max Salary</Label><Input type="number" value={form.salary_range_max || ''} onChange={e => setForm({ ...form, salary_range_max: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createPosting.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Applicant Dialog */}
      <Dialog open={applicantFormOpen} onOpenChange={setApplicantFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Applicant</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateApplicant} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={appForm.first_name} onChange={e => setAppForm({ ...appForm, first_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={appForm.last_name} onChange={e => setAppForm({ ...appForm, last_name: e.target.value })} required /></div>
            </div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={appForm.email} onChange={e => setAppForm({ ...appForm, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>{t('common.phone')}</Label><Input value={appForm.phone} onChange={e => setAppForm({ ...appForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cover Letter</Label><Textarea value={appForm.cover_letter} onChange={e => setAppForm({ ...appForm, cover_letter: e.target.value })} rows={3} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setApplicantFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createApplicant.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
