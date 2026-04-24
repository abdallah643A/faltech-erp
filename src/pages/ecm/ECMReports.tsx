import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, FileText, Users, Clock, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0066cc', '#1a7a4a', '#e8a000', '#cc0000', '#6b7280', '#8b5cf6'];

const ECMReports = () => {
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['ecm-reports-docs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_documents').select('document_type, department, status, created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: corrs = [], isLoading: corrLoading } = useQuery({
    queryKey: ['ecm-reports-corrs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_correspondences').select('correspondence_type, status, priority, created_at');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['ecm-reports-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_tasks').select('status, priority, department');
      if (error) throw error;
      return data || [];
    },
  });

  const docsByType = Object.entries(
    docs.reduce((acc: Record<string, number>, d: any) => {
      const t = d.document_type || 'general';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count: count as number }));

  const docsByDept = Object.entries(
    docs.reduce((acc: Record<string, number>, d: any) => {
      const dept = d.department || 'Other';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  const tasksByStatus = Object.entries(
    tasks.reduce((acc: Record<string, number>, t: any) => {
      acc[t.status || 'open'] = (acc[t.status || 'open'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value as number,
    color: name === 'completed' ? '#22c55e' : name === 'in_progress' ? '#f59e0b' : name === 'overdue' ? '#ef4444' : '#0066cc',
  }));

  const isLoading = docsLoading || corrLoading;

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-[#0066cc]" />
          <div>
            <h1 className="text-xl font-bold">ECM Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Document and correspondence analytics</p>
          </div>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: docs.length, icon: FileText, color: 'text-blue-600' },
          { label: 'Correspondence', value: corrs.length, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Active Tasks', value: tasks.filter((t: any) => t.status !== 'completed').length, icon: Clock, color: 'text-amber-600' },
          { label: 'Users Active', value: new Set(docs.map((d: any) => d.department).filter(Boolean)).size, icon: Users, color: 'text-purple-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading reports...</div>
      ) : (
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="correspondence">Correspondence</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Documents by Type</CardTitle></CardHeader>
                <CardContent>
                  {docsByType.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No document data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={docsByType}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0066cc" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Documents by Department</CardTitle></CardHeader>
                <CardContent>
                  {docsByDept.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No department data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={docsByDept} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                          {docsByDept.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="correspondence" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">{corrs.filter((c: any) => c.correspondence_type === 'incoming').length}</p>
                    <p className="text-sm text-muted-foreground">Incoming</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{corrs.filter((c: any) => c.correspondence_type === 'outgoing').length}</p>
                    <p className="text-sm text-muted-foreground">Outgoing</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-amber-600">{corrs.filter((c: any) => ['received', 'assigned', 'in_progress'].includes(c.status)).length}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Tasks by Status</CardTitle></CardHeader>
              <CardContent>
                {tasksByStatus.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No task data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={tasksByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                        {tasksByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ECMReports;