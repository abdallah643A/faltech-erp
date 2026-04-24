import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, Filter, List, Columns3, Calendar, CheckCircle, Clock, AlertTriangle, XCircle, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImplTask {
  id: string;
  code: string;
  title: string;
  module: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  assignee: string;
  startDate: string;
  dueDate: string;
  progress: number;
  dependency?: string;
  hasAttachment: boolean;
}

const MOCK_TASKS: ImplTask[] = [
  { id: '1', code: 'IMP-001', title: 'Configure Chart of Accounts', module: 'Finance', priority: 'critical', status: 'done', assignee: 'Ahmad K.', startDate: '2026-03-01', dueDate: '2026-03-15', progress: 100, hasAttachment: true },
  { id: '2', code: 'IMP-002', title: 'Set up posting periods FY2026', module: 'Finance', priority: 'high', status: 'done', assignee: 'Ahmad K.', startDate: '2026-03-05', dueDate: '2026-03-10', progress: 100, dependency: 'IMP-001', hasAttachment: false },
  { id: '3', code: 'IMP-003', title: 'Import business partners', module: 'Master Data', priority: 'high', status: 'in_progress', assignee: 'Sara M.', startDate: '2026-03-15', dueDate: '2026-04-01', progress: 60, hasAttachment: true },
  { id: '4', code: 'IMP-004', title: 'Configure user roles & permissions', module: 'Security', priority: 'critical', status: 'in_progress', assignee: 'Omar S.', startDate: '2026-03-20', dueDate: '2026-04-05', progress: 30, hasAttachment: false },
  { id: '5', code: 'IMP-005', title: 'Import item master data', module: 'Master Data', priority: 'high', status: 'not_started', assignee: 'Sara M.', startDate: '2026-04-01', dueDate: '2026-04-15', progress: 0, dependency: 'IMP-003', hasAttachment: false },
  { id: '6', code: 'IMP-006', title: 'Setup SMTP email configuration', module: 'System', priority: 'medium', status: 'blocked', assignee: 'IT Team', startDate: '2026-03-25', dueDate: '2026-04-10', progress: 20, hasAttachment: false },
  { id: '7', code: 'IMP-007', title: 'Opening balances GL entry', module: 'Finance', priority: 'critical', status: 'not_started', assignee: 'Ahmad K.', startDate: '2026-04-10', dueDate: '2026-04-20', progress: 0, dependency: 'IMP-002', hasAttachment: false },
  { id: '8', code: 'IMP-008', title: 'User acceptance testing', module: 'QA', priority: 'high', status: 'not_started', assignee: 'All', startDate: '2026-04-20', dueDate: '2026-04-30', progress: 0, hasAttachment: false },
];

const STATUS_BADGES: Record<string, { label: string; class: string; icon: any }> = {
  not_started: { label: 'Not Started', class: 'bg-muted text-muted-foreground', icon: Clock },
  in_progress: { label: 'In Progress', class: 'bg-blue-100 text-blue-700', icon: Clock },
  blocked: { label: 'Blocked', class: 'bg-red-100 text-red-700', icon: AlertTriangle },
  done: { label: 'Done', class: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground line-through', icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = { critical: 'text-red-600', high: 'text-orange-600', medium: 'text-blue-600', low: 'text-muted-foreground' };

export default function ImplementationTasks() {
  const { language } = useLanguage();
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = MOCK_TASKS.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModule !== 'all' && t.module !== filterModule) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const done = MOCK_TASKS.filter(t => t.status === 'done').length;
  const overdue = MOCK_TASKS.filter(t => t.status !== 'done' && t.status !== 'cancelled' && new Date(t.dueDate) < new Date()).length;

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'مهام التنفيذ' : 'Implementation Tasks'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'تتبع وإدارة مهام تنفيذ النظام' : 'Track and manage ERP implementation activities'}</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />New Task</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Total Tasks</div><div className="text-xl font-bold">{MOCK_TASKS.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Completed</div><div className="text-xl font-bold text-green-600">{done}/{MOCK_TASKS.length}</div><Progress value={(done / MOCK_TASKS.length) * 100} className="h-1 mt-1" /></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Blocked</div><div className="text-xl font-bold text-red-600">{MOCK_TASKS.filter(t => t.status === 'blocked').length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Overdue</div><div className="text-xl font-bold text-orange-600">{overdue}</div></Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search tasks..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={filterModule} onValueChange={setFilterModule}><SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Module" /></SelectTrigger><SelectContent><SelectItem value="all">All Modules</SelectItem>{['Finance', 'Master Data', 'Security', 'System', 'QA'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{Object.entries(STATUS_BADGES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select>
        <Tabs value={view} onValueChange={setView}><TabsList className="h-8"><TabsTrigger value="list" className="h-6 px-2"><List className="h-3.5 w-3.5" /></TabsTrigger><TabsTrigger value="kanban" className="h-6 px-2"><Columns3 className="h-3.5 w-3.5" /></TabsTrigger></TabsList></Tabs>
      </div>

      {view === 'list' ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead className="w-20">Code</TableHead><TableHead>Task</TableHead><TableHead>Module</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Assignee</TableHead><TableHead>Due Date</TableHead><TableHead className="w-20">Progress</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(task => {
                  const sb = STATUS_BADGES[task.status];
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono text-xs">{task.code}</TableCell>
                      <TableCell className="text-sm font-medium">{task.title}{task.hasAttachment && <Paperclip className="h-3 w-3 inline ml-1 text-muted-foreground" />}{task.dependency && <span className="text-xs text-muted-foreground ml-1">→ {task.dependency}</span>}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{task.module}</Badge></TableCell>
                      <TableCell><span className={cn('text-xs font-medium capitalize', PRIORITY_COLORS[task.priority])}>{task.priority}</span></TableCell>
                      <TableCell><Badge className={cn('text-xs', sb.class)}><sb.icon className="h-3 w-3 mr-1" />{sb.label}</Badge></TableCell>
                      <TableCell className="text-sm">{task.assignee}</TableCell>
                      <TableCell className={cn('text-sm', new Date(task.dueDate) < new Date() && task.status !== 'done' && 'text-red-600 font-medium')}>{task.dueDate}</TableCell>
                      <TableCell><div className="flex items-center gap-1.5"><Progress value={task.progress} className="h-1.5 flex-1" /><span className="text-xs text-muted-foreground">{task.progress}%</span></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(STATUS_BADGES).filter(([k]) => k !== 'cancelled').map(([status, cfg]) => (
            <Card key={status}>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><cfg.icon className="h-3.5 w-3.5" />{cfg.label} ({filtered.filter(t => t.status === status).length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {filtered.filter(t => t.status === status).map(task => (
                  <div key={task.id} className="p-2 border rounded text-sm space-y-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{task.assignee}</span><span className={cn(PRIORITY_COLORS[task.priority])}>{task.priority}</span></div>
                    <Progress value={task.progress} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
