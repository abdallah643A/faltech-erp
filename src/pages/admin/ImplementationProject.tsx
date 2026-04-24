import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, Flag, CheckCircle, Clock, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASES = [
  { name: 'Project Preparation', status: 'completed', progress: 100, start: '2026-02-01', end: '2026-02-28' },
  { name: 'Business Blueprint', status: 'completed', progress: 100, start: '2026-03-01', end: '2026-03-20' },
  { name: 'Realization', status: 'in_progress', progress: 65, start: '2026-03-21', end: '2026-04-30' },
  { name: 'Final Preparation', status: 'pending', progress: 0, start: '2026-05-01', end: '2026-05-15' },
  { name: 'Go-Live & Support', status: 'pending', progress: 0, start: '2026-05-16', end: '2026-06-15' },
];

const MILESTONES = [
  { name: 'Kickoff Meeting', date: '2026-02-01', status: 'done' },
  { name: 'Blueprint Sign-off', date: '2026-03-20', status: 'done' },
  { name: 'Data Migration Start', date: '2026-03-25', status: 'done' },
  { name: 'UAT Start', date: '2026-04-20', status: 'upcoming' },
  { name: 'Go-Live Decision', date: '2026-05-10', status: 'upcoming' },
  { name: 'Go-Live', date: '2026-05-16', status: 'upcoming' },
];

const TEAM = [
  { name: 'Ahmad Khalid', role: 'Project Manager', module: 'Overall' },
  { name: 'Sara Mohammed', role: 'Functional Consultant', module: 'Finance, MM' },
  { name: 'Omar Sultan', role: 'Technical Lead', module: 'Security, Integration' },
  { name: 'Fatima Ali', role: 'Business Analyst', module: 'Sales, CRM' },
  { name: 'Khalid Hassan', role: 'Data Migration', module: 'Master Data' },
];

const SCOPE_MODULES = ['Finance & Accounting', 'Sales & Distribution', 'Procurement', 'Inventory & WMS', 'HR & Payroll', 'Manufacturing', 'Projects', 'Fixed Assets', 'Banking', 'Reporting'];

export default function ImplementationProject() {
  const { language } = useLanguage();
  const overallProgress = Math.round(PHASES.reduce((s, p) => s + p.progress, 0) / PHASES.length);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'مشروع التنفيذ' : 'Implementation Project'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة مشروع تنفيذ نظام تخطيط الموارد' : 'Manage ERP implementation project, phases, and go-live readiness'}</p>
        </div>
        <Button size="sm"><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Overall Progress</div><div className="text-xl font-bold">{overallProgress}%</div><Progress value={overallProgress} className="h-1.5 mt-1" /></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Current Phase</div><div className="text-sm font-bold">Realization</div><Badge className="text-xs mt-1 bg-blue-100 text-blue-700">In Progress</Badge></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Target Go-Live</div><div className="text-sm font-bold">May 16, 2026</div><span className="text-xs text-muted-foreground">32 days remaining</span></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Team Size</div><div className="text-xl font-bold">{TEAM.length}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Scope Modules</div><div className="text-xl font-bold">{SCOPE_MODULES.length}</div></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="phases"><Flag className="h-3.5 w-3.5 mr-1.5" />Phases</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1.5" />Team</TabsTrigger>
          <TabsTrigger value="scope"><Target className="h-3.5 w-3.5 mr-1.5" />Scope</TabsTrigger>
          <TabsTrigger value="risks"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Risks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Project Name</span><span className="font-medium">ERP Implementation 2026</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Customer</span><span>Al Rajhi Manufacturing Co.</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Project Manager</span><span>Ahmad Khalid</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Sponsor</span><span>Mohammed Al Rajhi (CEO)</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Methodology</span><span>SAP Activate / Agile</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Start Date</span><span>Feb 1, 2026</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Target Go-Live</span><span>May 16, 2026</span></div>
                <div className="grid grid-cols-[140px_1fr] gap-1"><span className="text-muted-foreground">Status</span><Badge className="text-xs bg-blue-100 text-blue-700 w-fit">In Progress</Badge></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Milestones</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {MILESTONES.map(m => (
                  <div key={m.name} className="flex items-center gap-2 text-sm">
                    {m.status === 'done' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className={cn('flex-1', m.status === 'done' && 'text-muted-foreground')}>{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="phases" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {PHASES.map((phase, i) => (
                <div key={phase.name} className="flex items-center gap-3 p-3 border rounded">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{phase.name}</span>
                      <Badge className={cn('text-xs', phase.status === 'completed' ? 'bg-green-100 text-green-700' : phase.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground')}>{phase.status === 'completed' ? 'Completed' : phase.status === 'in_progress' ? 'In Progress' : 'Pending'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground"><span>{phase.start} → {phase.end}</span><Progress value={phase.progress} className="h-1 flex-1" /><span>{phase.progress}%</span></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Module Responsibility</TableHead></TableRow></TableHeader>
              <TableBody>{TEAM.map(m => <TableRow key={m.name}><TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.role}</TableCell><TableCell className="text-muted-foreground">{m.module}</TableCell></TableRow>)}</TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="scope" className="mt-4">
          <Card><CardContent className="pt-4"><div className="grid grid-cols-2 gap-2">{SCOPE_MODULES.map(m => <div key={m} className="flex items-center gap-2 p-2 border rounded text-sm"><CheckCircle className="h-4 w-4 text-green-600" />{m}</div>)}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <Card><CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Risk</TableHead><TableHead>Impact</TableHead><TableHead>Likelihood</TableHead><TableHead>Mitigation</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell className="text-sm">Data migration delays</TableCell><TableCell><Badge className="text-xs bg-orange-100 text-orange-700">High</Badge></TableCell><TableCell><Badge variant="outline" className="text-xs">Medium</Badge></TableCell><TableCell className="text-sm text-muted-foreground">Parallel migration + validation</TableCell><TableCell><Badge className="text-xs bg-blue-100 text-blue-700">Monitoring</Badge></TableCell></TableRow>
                <TableRow><TableCell className="text-sm">User adoption resistance</TableCell><TableCell><Badge className="text-xs bg-orange-100 text-orange-700">High</Badge></TableCell><TableCell><Badge variant="outline" className="text-xs">Low</Badge></TableCell><TableCell className="text-sm text-muted-foreground">Training program + champions</TableCell><TableCell><Badge className="text-xs bg-green-100 text-green-700">Mitigated</Badge></TableCell></TableRow>
                <TableRow><TableCell className="text-sm">Integration issues</TableCell><TableCell><Badge className="text-xs bg-red-100 text-red-700">Critical</Badge></TableCell><TableCell><Badge variant="outline" className="text-xs">Low</Badge></TableCell><TableCell className="text-sm text-muted-foreground">Early testing + fallback plan</TableCell><TableCell><Badge className="text-xs bg-blue-100 text-blue-700">Monitoring</Badge></TableCell></TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
