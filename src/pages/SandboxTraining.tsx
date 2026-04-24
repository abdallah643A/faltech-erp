import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FlaskConical, Play, CheckCircle, BookOpen, GraduationCap, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BUILT_IN_SCENARIOS = [
  { module: 'sales', name: 'Create a Sales Order', difficulty: 'beginner', description: 'Walk through creating a complete sales order from quote to invoice' },
  { module: 'procurement', name: 'Purchase Order Workflow', difficulty: 'beginner', description: 'Learn the full PO lifecycle from request to receipt' },
  { module: 'hr', name: 'Employee Onboarding', difficulty: 'intermediate', description: 'Process a new employee from recruitment to first payroll' },
  { module: 'finance', name: 'Month-End Close', difficulty: 'advanced', description: 'Complete a full period-end closing process' },
  { module: 'crm', name: 'Lead to Opportunity', difficulty: 'beginner', description: 'Convert a lead through qualification to won opportunity' },
  { module: 'construction', name: 'Project Setup', difficulty: 'intermediate', description: 'Set up a construction project with BOQ, budget, and team' },
];

export default function SandboxTraining() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('scenarios');

  const { data: sessions = [] } = useQuery({
    queryKey: ['sandbox-sessions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase.from('sandbox_sessions' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ['sandbox-scenarios'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('sandbox_scenarios' as any).select('*').eq('is_active', true).order('sort_order') as any);
      if (error) throw error;
      return data || [];
    },
  });

  const startSession = useMutation({
    mutationFn: async (scenario: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await (supabase.from('sandbox_sessions' as any).insert({ user_id: user.id, session_name: scenario.name, module: scenario.module, status: 'active', progress: { step: 0, total: 5 } }) as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sandbox-sessions'] }); toast({ title: 'Training session started!' }); },
  });

  const difficultyColor = (d: string) => d === 'advanced' ? 'destructive' : d === 'intermediate' ? 'default' : 'secondary';
  const allScenarios = [...BUILT_IN_SCENARIOS, ...scenarios.map((s: any) => ({ module: s.module, name: s.name, difficulty: s.difficulty, description: s.description }))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="h-6 w-6" />Sandbox & Training Mode</h1>
          <p className="text-muted-foreground">Practice ERP workflows with sample data in a safe environment</p>
        </div>
        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">🧪 Sandbox Mode</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {[{ label: 'Available Scenarios', value: allScenarios.length, icon: BookOpen },
          { label: 'Active Sessions', value: sessions.filter((s: any) => s.status === 'active').length, icon: Play },
          { label: 'Completed', value: sessions.filter((s: any) => s.status === 'completed').length, icon: CheckCircle },
          { label: 'Modules Covered', value: new Set(allScenarios.map(s => s.module)).size, icon: GraduationCap },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="scenarios">Training Scenarios</TabsTrigger><TabsTrigger value="sessions">My Sessions</TabsTrigger></TabsList>
        <TabsContent value="scenarios">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allScenarios.map((s, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{s.module}</Badge>
                    <Badge variant={difficultyColor(s.difficulty)}>{s.difficulty}</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{s.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
                  <Button className="w-full" onClick={() => startSession.mutate(s)}><Play className="h-4 w-4 mr-2" />Start Training</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="sessions">
          <div className="space-y-3">
            {sessions.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.session_name}</div>
                    <div className="text-sm text-muted-foreground">{s.module} • Started {new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.status === 'completed' ? 'default' : s.status === 'active' ? 'secondary' : 'outline'}>{s.status}</Badge>
                    {s.status === 'active' && <Button size="sm"><Play className="h-3 w-3 mr-1" />Continue</Button>}
                    {s.status === 'completed' && <Button size="sm" variant="outline"><RotateCcw className="h-3 w-3 mr-1" />Restart</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {sessions.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No training sessions yet. Start one from the scenarios tab!</CardContent></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
