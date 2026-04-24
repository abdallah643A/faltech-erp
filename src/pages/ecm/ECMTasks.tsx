import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckSquare, Plus, User, Calendar,
  ArrowUp, ArrowDown, Minus, ListTodo, Loader2
} from "lucide-react";
import { toast } from "sonner";

const getPriorityIcon = (p: string) => {
  if (p === 'critical') return <ArrowUp className="h-3.5 w-3.5 text-red-600" />;
  if (p === 'high') return <ArrowUp className="h-3.5 w-3.5 text-orange-500" />;
  if (p === 'medium') return <Minus className="h-3.5 w-3.5 text-amber-500" />;
  return <ArrowDown className="h-3.5 w-3.5 text-blue-500" />;
};

const getStatusColor = (s: string) => {
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    pending_approval: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };
  return map[s] || 'bg-gray-100 text-gray-700';
};

const ECMTasks = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignee_name: '', department: '', due_date: '', priority: 'medium' });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['ecm-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ecm_tasks').insert({
        title: form.title,
        description: form.description,
        assignee_name: form.assignee_name,
        department: form.department,
        due_date: form.due_date || null,
        priority: form.priority,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecm-tasks'] });
      toast.success("Task created");
      setShowAdd(false);
      setForm({ title: '', description: '', assignee_name: '', department: '', due_date: '', priority: 'medium' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = tasks.filter(t => {
    if (filter === 'overdue') return t.status === 'overdue';
    if (filter === 'open') return t.status === 'open';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  }).filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    total: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-6 w-6 text-[#0066cc]" />
          <div>
            <h1 className="text-xl font-bold">Tasks & Procedures</h1>
            <p className="text-sm text-muted-foreground">Manage tasks linked to documents and correspondence</p>
          </div>
        </div>
        <Button className="bg-[#0066cc] hover:bg-[#0055aa]" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Task
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: counts.total, color: 'text-foreground' },
          { label: 'Open', value: counts.open, color: 'text-blue-600' },
          { label: 'In Progress', value: counts.inProgress, color: 'text-amber-600' },
          { label: 'Overdue', value: counts.overdue, color: 'text-red-600' },
          { label: 'Completed', value: counts.completed, color: 'text-green-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs h-9" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tasks found. Create your first task.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id} className={`hover:shadow-md transition-shadow ${task.status === 'overdue' ? 'border-red-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getPriorityIcon(task.priority)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.linked_reference && <Badge variant="outline" className="text-[10px] h-5">{task.linked_reference}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {task.assignee_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> {task.assignee_name}
                          </span>
                        )}
                        {task.department && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ListTodo className="h-3 w-3" /> {task.department}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={task.progress || 0} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground text-right mt-0.5">{task.progress || 0}%</p>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Assignee</Label><Input value={form.assignee_name} onChange={e => setForm(f => ({ ...f, assignee_name: e.target.value }))} className="h-9" /></div>
              <div><Label className="text-xs">Department</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-9" /></div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-[#0066cc]" onClick={() => addMutation.mutate()} disabled={!form.title || addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ECMTasks;