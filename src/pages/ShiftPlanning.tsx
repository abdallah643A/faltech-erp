import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Moon, Plus } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ShiftPlanning() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const [tab, setTab] = useState('templates');

  const { data: templates = [] } = useQuery({
    queryKey: ['shift-templates', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('shift_templates' as any).select('*').order('name') as any);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['shift-assignments', activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('shift_assignments' as any).select('*').order('shift_date', { ascending: false }).limit(100) as any);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" />Shift Planning & Rostering</h1>
          <p className="text-muted-foreground">Shift templates, employee scheduling, overtime, and attendance integration</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Create Shift</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: 'Shift Templates', value: templates.length, icon: Clock },
          { label: 'Assignments', value: assignments.length, icon: Users },
          { label: 'Night Shifts', value: templates.filter((t: any) => t.is_night_shift).length, icon: Moon },
          { label: 'Overtime Hrs', value: assignments.reduce((s: number, a: any) => s + (a.overtime_hours || 0), 0), icon: Calendar },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><s.icon className="h-5 w-5 text-primary" /><div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></CardContent></Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="assignments">Assignments</TabsTrigger></TabsList>
        <TabsContent value="templates">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('common.name')}</TableHead><TableHead>Code</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead>
                <TableHead>Break</TableHead><TableHead>Hours</TableHead><TableHead>Night</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.code || '—'}</TableCell>
                    <TableCell>{t.start_time}</TableCell>
                    <TableCell>{t.end_time}</TableCell>
                    <TableCell>{t.break_minutes} min</TableCell>
                    <TableCell>{t.working_hours || '—'}</TableCell>
                    <TableCell>{t.is_night_shift ? <Moon className="h-4 w-4 text-primary" /> : '—'}</TableCell>
                    <TableCell><Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No shift templates</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="assignments">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('hr.employee')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead>Actual Start</TableHead>
                <TableHead>Actual End</TableHead><TableHead>Overtime</TableHead><TableHead>{t('common.status')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employee_name || '—'}</TableCell>
                    <TableCell>{a.shift_date}</TableCell>
                    <TableCell>{a.actual_start || '—'}</TableCell>
                    <TableCell>{a.actual_end || '—'}</TableCell>
                    <TableCell className={a.overtime_hours > 0 ? 'text-orange-600 font-medium' : ''}>{a.overtime_hours || 0} hrs</TableCell>
                    <TableCell><Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
