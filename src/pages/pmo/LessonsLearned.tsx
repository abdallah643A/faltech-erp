import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { usePMOPortfolio } from '@/hooks/usePMOPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, BookOpen, CheckCircle2, Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = ['process', 'technical', 'resource', 'risk', 'communication', 'vendor', 'scope', 'budget'];
const LESSON_TYPES = ['improvement', 'success', 'failure', 'best_practice'];

export default function LessonsLearned() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useActiveCompany();
  const { profile } = useAuth();
  const { projects = [] } = useProjects();
  const { programs } = usePMOPortfolio();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['pmo-lessons-all', activeCompanyId],
    queryFn: async () => {
      let query = supabase.from('pmo_lessons_learned').select('*').order('created_at', { ascending: false });
      if (activeCompanyId) query = query.eq('company_id', activeCompanyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createLesson = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const { error } = await supabase.from('pmo_lessons_learned').insert({
        ...data,
        company_id: activeCompanyId,
        submitted_by: profile?.full_name || 'Unknown',
        submitted_by_id: profile?.user_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pmo-lessons-all'] });
      queryClient.invalidateQueries({ queryKey: ['pmo-lessons'] });
      toast({ title: 'Lesson captured successfully' });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const filtered = lessons.filter(l => {
    const matchSearch = !search || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || l.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const [form, setForm] = useState({
    title: '', category: 'process', lesson_type: 'improvement',
    description: '', root_cause: '', recommendation: '', impact_area: '',
    project_id: '', program_id: '', tags: '',
  });

  const handleSubmit = () => {
  const { t } = useLanguage();

    if (!form.title) return;
    createLesson.mutate({
      title: form.title,
      category: form.category,
      lesson_type: form.lesson_type,
      description: form.description || null,
      root_cause: form.root_cause || null,
      recommendation: form.recommendation || null,
      impact_area: form.impact_area || null,
      project_id: form.project_id || null,
      program_id: form.program_id || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lessons Learned Repository</h1>
          <p className="text-muted-foreground text-sm">Capture and search project knowledge across the portfolio</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Capture Lesson</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Capture Lesson Learned</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.lesson_type} onValueChange={v => setForm(f => ({ ...f, lesson_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LESSON_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <Textarea placeholder="Root Cause" value={form.root_cause} onChange={e => setForm(f => ({ ...f, root_cause: e.target.value }))} rows={2} />
              <Textarea placeholder="Recommendation" value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))} rows={2} />
              <Input placeholder="Impact Area" value={form.impact_area} onChange={e => setForm(f => ({ ...f, impact_area: e.target.value }))} />
              <Select value={form.project_id} onValueChange={v => setForm(f => ({ ...f, project_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Link to Project (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              <Button onClick={handleSubmit} disabled={!form.title || createLesson.isPending} className="w-full">
                {createLesson.isPending ? 'Saving...' : 'Save Lesson'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Total Lessons</p>
          <p className="text-2xl font-bold">{lessons.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold">{lessons.filter(l => l.approved).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{new Set(lessons.map(l => l.category)).size}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold">{lessons.filter(l => new Date(l.created_at) > new Date(new Date().setDate(1))).length}</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search lessons..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No lessons found</TableCell></TableRow>
              )}
              {filtered.map(lesson => (
                <TableRow key={lesson.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{lesson.title}</p>
                      {lesson.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{lesson.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{lesson.category}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{lesson.lesson_type?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-sm">{lesson.submitted_by || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(lesson.tags || []).slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lesson.approved
                      ? <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>
                      : <Badge variant="secondary">{t('common.pending')}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
