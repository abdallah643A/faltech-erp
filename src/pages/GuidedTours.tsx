import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, PlayCircle, BookOpen, Users, ShoppingCart, Building2, DollarSign, Factory, HardHat } from 'lucide-react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const MODULE_TOURS = [
  {
    id: 'crm', name: 'CRM & Sales', icon: Users, color: 'text-blue-500',
    description: 'Learn to manage leads, opportunities, quotes, and sales orders',
    steps: [
      { path: '/leads', element: '[data-tour="sidebar"]', title: 'Navigate to CRM', desc: 'The CRM module is your starting point for managing customer relationships.' },
      { path: '/leads', element: 'table', title: 'Leads List', desc: 'View and manage all your leads. Click any lead to see details.' },
      { path: '/opportunities', element: 'table', title: 'Opportunities', desc: 'Track deals through your sales pipeline.' },
      { path: '/quotes', element: 'table', title: 'Quotations', desc: 'Create and send quotations to customers.' },
    ],
  },
  {
    id: 'procurement', name: 'Procurement', icon: ShoppingCart, color: 'text-green-500',
    description: 'Master purchase requests, orders, and supplier management',
    steps: [
      { path: '/procurement', element: 'main', title: 'Procurement Dashboard', desc: 'Overview of all procurement activity.' },
      { path: '/material-requests', element: 'table', title: 'Material Requests', desc: 'Create and approve material requests.' },
      { path: '/supplier-management', element: 'main', title: 'Supplier Management', desc: 'Manage vendors and track performance.' },
    ],
  },
  {
    id: 'hr', name: 'HR & People', icon: Users, color: 'text-purple-500',
    description: 'Manage employees, leave, attendance, and payroll',
    steps: [
      { path: '/hr', element: 'main', title: 'HR Dashboard', desc: 'Overview of your workforce.' },
      { path: '/hr/employees', element: 'table', title: 'Employee Directory', desc: 'View and manage all employees.' },
      { path: '/hr/leave', element: 'main', title: 'Leave Management', desc: 'Handle leave requests and balances.' },
      { path: '/hr/attendance', element: 'main', title: 'Attendance', desc: 'Track employee attendance.' },
    ],
  },
  {
    id: 'finance', name: 'Finance', icon: DollarSign, color: 'text-yellow-500',
    description: 'Handle invoices, payments, and financial reporting',
    steps: [
      { path: '/finance', element: 'main', title: 'Finance Module', desc: 'Your financial management hub.' },
      { path: '/ar-invoices', element: 'table', title: 'AR Invoices', desc: 'Manage accounts receivable.' },
      { path: '/incoming-payments', element: 'table', title: 'Payments', desc: 'Record and track incoming payments.' },
    ],
  },
  {
    id: 'manufacturing', name: 'Manufacturing', icon: Factory, color: 'text-orange-500',
    description: 'Production orders, BOM management, and quality control',
    steps: [
      { path: '/manufacturing', element: 'main', title: 'Manufacturing', desc: 'Manage production workflows.' },
      { path: '/bill-of-materials', element: 'main', title: 'Bill of Materials', desc: 'Create and manage product BOMs.' },
    ],
  },
  {
    id: 'construction', name: 'Construction', icon: HardHat, color: 'text-red-500',
    description: 'Project management, daily reports, and cost tracking',
    steps: [
      { path: '/cpms', element: 'main', title: 'CPMS Dashboard', desc: 'Construction project management overview.' },
      { path: '/cpms/projects', element: 'table', title: 'Projects', desc: 'View all construction projects.' },
      { path: '/cpms/daily-reports', element: 'main', title: 'Daily Reports', desc: 'Log daily site activities.' },
    ],
  },
];

const GETTING_STARTED = [
  { id: 'profile', label: 'Complete your profile', path: '/hr/self-service', done: false },
  { id: 'company', label: 'Set up company settings', path: '/company-settings', done: false },
  { id: 'first-lead', label: 'Create your first lead', path: '/leads', done: false },
  { id: 'first-employee', label: 'Add an employee', path: '/hr/employees', done: false },
  { id: 'chart-of-accounts', label: 'Review chart of accounts', path: '/chart-of-accounts', done: false },
];

export default function GuidedTours() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [checklist, setChecklist] = useState(GETTING_STARTED);

  const startTour = (tour: typeof MODULE_TOURS[0]) => {
    if (tour.steps[0]?.path) navigate(tour.steps[0].path);
    setTimeout(() => {
      const d = driver({
        showProgress: true, animate: true,
        overlayColor: 'hsl(var(--background) / 0.75)',
        steps: tour.steps.map(s => ({
          element: s.element,
          popover: { title: s.title, description: s.desc, side: 'bottom' as const, align: 'center' as const },
        })),
        onDestroyStarted: () => {
          d.destroy();
          setCompletedTours(prev => [...prev, tour.id]);
        },
      });
      d.drive();
    }, 500);
  };

  const progress = (completedTours.length / MODULE_TOURS.length) * 100;
  const checklistProgress = (checklist.filter(c => c.done).length / checklist.length) * 100;

  return (
    <div className="p-3 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Guided Tours & Onboarding</h1>
        <p className="text-sm text-muted-foreground">Interactive walkthroughs for each ERP module</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Module Tours</CardTitle>
            <CardDescription className="text-xs">Click "Start Tour" to launch an interactive walkthrough</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{completedTours.length}/{MODULE_TOURS.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULE_TOURS.map(tour => {
                const completed = completedTours.includes(tour.id);
                return (
                  <Card key={tour.id} className={`${completed ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <tour.icon className={`h-5 w-5 ${tour.color}`} />
                          <h3 className="font-medium text-sm">{tour.name}</h3>
                        </div>
                        {completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{tour.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{tour.steps.length} steps</Badge>
                        <Button size="sm" variant={completed ? 'outline' : 'default'} className="gap-1" onClick={() => startTour(tour)}>
                          <PlayCircle className="h-3.5 w-3.5" /> {completed ? 'Replay' : 'Start Tour'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Getting Started Checklist</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={checklistProgress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{checklist.filter(c => c.done).length}/{checklist.length}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => {
                setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, done: !c.done } : c));
                navigate(item.path);
              }}>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${item.done ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {item.done && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
