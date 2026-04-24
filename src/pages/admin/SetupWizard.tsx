import { useMemo, useState } from 'react';
import { Wand2, Check, ChevronRight, Building2, Globe, DollarSign, MapPin, Calendar, Hash, BookOpen, Users, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCompanies } from '@/hooks/useGroupStructure';
import { useWizardState, useSaveWizardStep } from '@/hooks/useAdminSetup';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'company_info', label: 'Company Info', icon: Building2, hint: 'Verify legal name, registration, contact details.' },
  { key: 'country_locale', label: 'Country & Locale', icon: Globe, hint: 'Set primary country, languages, and timezone.' },
  { key: 'currencies', label: 'Currencies', icon: DollarSign, hint: 'Define base currency and enabled foreign currencies.' },
  { key: 'branches', label: 'Branches', icon: MapPin, hint: 'Add branches and their locales.' },
  { key: 'fiscal_calendar', label: 'Fiscal Calendar', icon: Calendar, hint: 'Pick or create a fiscal calendar; generate periods.' },
  { key: 'numbering', label: 'Document Numbering', icon: Hash, hint: 'Define numbering series per doc type & fiscal year.' },
  { key: 'coa_template', label: 'Chart of Accounts', icon: BookOpen, hint: 'Import or build the chart of accounts.' },
  { key: 'users_roles', label: 'Users & Roles', icon: Users, hint: 'Invite users and assign role-based access.' },
  { key: 'go_live', label: 'Go-Live', icon: Rocket, hint: 'Final review and switch to production.' },
];

export default function SetupWizard() {
  const { data: companies = [] } = useCompanies();
  const [companyId, setCompanyId] = useState<string>('');
  const effective = companyId || companies[0]?.id || '';
  const { data: state = [] } = useWizardState(effective);
  const save = useSaveWizardStep();
  const [activeKey, setActiveKey] = useState<string>(STEPS[0].key);

  const stateMap = useMemo(() => {
    const m: Record<string, string> = {};
    state.forEach(s => { m[s.step_key] = s.status; });
    return m;
  }, [state]);

  const completedCount = STEPS.filter(s => stateMap[s.key] === 'completed' || stateMap[s.key] === 'skipped').length;
  const progress = Math.round((completedCount / STEPS.length) * 100);
  const active = STEPS.find(s => s.key === activeKey)!;

  const setStatus = (status: 'in_progress' | 'completed' | 'skipped') => {
    if (!effective) return;
    save.mutate({ company_id: effective, step_key: activeKey, status, payload: {} });
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Setup Wizard
          </h1>
          <p className="text-sm text-muted-foreground">Guided onboarding for a new company. Resumable per step.</p>
        </div>
        <Select value={effective} onValueChange={setCompanyId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select company" /></SelectTrigger>
          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
        </Select>
      </header>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{completedCount} of {STEPS.length} steps</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* Step list */}
        <nav className="enterprise-card p-2" aria-label="Wizard steps">
          {STEPS.map(s => {
            const Icon = s.icon;
            const status = stateMap[s.key];
            const done = status === 'completed';
            const skipped = status === 'skipped';
            const inprog = status === 'in_progress';
            return (
              <button
                key={s.key}
                onClick={() => setActiveKey(s.key)}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-2 py-2 rounded text-sm transition-colors',
                  activeKey === s.key ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                )}
              >
                <span className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center shrink-0',
                  done ? 'bg-success/15 text-success' : skipped ? 'bg-muted text-muted-foreground' : inprog ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground'
                )}>
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1 truncate">{s.label}</span>
                {activeKey === s.key && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </nav>

        {/* Step detail */}
        <section className="enterprise-card">
          <div className="enterprise-card-header flex items-center gap-2">
            <active.icon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">{active.label}</h2>
            {stateMap[activeKey] && (
              <Badge variant="outline" className="ml-2 capitalize">{stateMap[activeKey].replace('_', ' ')}</Badge>
            )}
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">{active.hint}</p>
            <p className="text-xs text-muted-foreground">
              Configure this area in the relevant admin module, then mark complete here to track progress.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" disabled={!effective} onClick={() => setStatus('in_progress')}>Mark in progress</Button>
              <Button variant="ghost" disabled={!effective} onClick={() => setStatus('skipped')}>Skip</Button>
              <Button disabled={!effective} onClick={() => setStatus('completed')}>Mark complete</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
