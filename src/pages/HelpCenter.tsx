import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { helpModules, ModuleHelp } from '@/data/helpContent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search, ChevronRight, ChevronLeft, CheckCircle2, Lightbulb, HelpCircle,
  LayoutDashboard, Users, DollarSign, ShoppingCart, Landmark, Warehouse,
  Building2, FolderKanban, BarChart3, Cpu, Factory, Headphones, ShieldCheck,
  HardDrive, FileText, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, DollarSign, ShoppingCart, Landmark, Warehouse,
  Building2, FolderKanban, BarChart3, Cpu, Factory, Headphones, ShieldCheck,
  HardDrive, FileText, BookOpen,
};

function ModuleCard({ module, onClick }: { module: ModuleHelp; onClick: () => void }) {
  const Icon = iconMap[module.icon] || HelpCircle;
  return (
    <Card
      className="cursor-pointer group hover:shadow-lg hover:border-primary/30 transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start gap-3">
          <div className={cn('h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', module.color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{module.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{module.description}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{module.steps.length} steps</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{module.keyFeatures.length} features</Badge>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function ModuleDetail({ module, onBack }: { module: ModuleHelp; onBack: () => void }) {
  const Icon = iconMap[module.icon] || HelpCircle;
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 mt-0.5">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center', module.color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{module.title}</h1>
              <p className="text-sm text-muted-foreground">{module.titleAr}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">{module.description}</p>
        </div>
      </div>

      {/* Module Screenshot */}
      {module.image && (
        <div className="rounded-xl overflow-hidden border shadow-sm">
          <img src={module.image} alt={`${module.title} overview`} className="w-full h-auto" loading="lazy" />
        </div>
      )}

      {/* Key Features */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Key Features
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {module.keyFeatures.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Guide */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" /> Step-by-Step Guide
        </h2>
        <div className="space-y-2">
          {module.steps.map((step, index) => (
            <Card
              key={index}
              className={cn(
                'transition-all duration-200 cursor-pointer',
                expandedStep === index && 'border-primary/30 shadow-md'
              )}
              onClick={() => setExpandedStep(expandedStep === index ? null : index)}
            >
              <CardContent className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors',
                    expandedStep === index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground">{step.title}</h3>
                    {expandedStep === index && (
                      <div className="mt-2 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        {step.tips && step.tips.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" /> Tips
                            </p>
                            <ul className="space-y-1">
                              {step.tips.map((tip, ti) => (
                                <li key={ti} className="text-xs text-amber-600 dark:text-amber-300 flex items-start gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className={cn(
                    'h-4 w-4 text-muted-foreground shrink-0 transition-transform',
                    expandedStep === index && 'rotate-90'
                  )} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQs */}
      {module.faqs && module.faqs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {module.faqs.map((faq, i) => (
              <Card key={i}>
                <CardContent className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{faq.q}</p>
                  <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpCenter() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('module');
  const [search, setSearch] = useState('');

  const selectedModule = selectedId ? helpModules.find(m => m.id === selectedId) : null;

  const filteredModules = useMemo(() => {
    if (!search.trim()) return helpModules;
    const q = search.toLowerCase();
    return helpModules.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.keyFeatures.some(f => f.toLowerCase().includes(q)) ||
      m.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  }, [search]);

  if (selectedModule) {
    return (
      <div className="max-w-4xl mx-auto">
        <ModuleDetail module={selectedModule} onBack={() => setSearchParams({})} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Learn how to use each module with step-by-step guides, tips, and best practices
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help topics, features, or modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{helpModules.length}</strong> modules</span>
        <span><strong className="text-foreground">{helpModules.reduce((s, m) => s + m.steps.length, 0)}</strong> guides</span>
        <span><strong className="text-foreground">{helpModules.reduce((s, m) => s + m.keyFeatures.length, 0)}</strong> features documented</span>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredModules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            onClick={() => setSearchParams({ module: module.id })}
          />
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No modules found matching "{search}"</p>
        </div>
      )}
    </div>
  );
}
