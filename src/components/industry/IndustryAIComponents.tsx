import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import {
  Brain, Loader2, Sparkles, Factory, AlertTriangle, TrendingUp,
  Wrench, Package, ClipboardCheck, Lightbulb, BarChart3, Send,
  Calculator, Users, Search, Zap, Shield, FileText,
} from 'lucide-react';
import { useIndustryAI } from '@/hooks/useIndustryAI';
import { cn } from '@/lib/utils';

// ─── Inline AI Card ───────────────────────────────────────────────
interface AISmartCardProps {
  type: string;
  data: Record<string, unknown>;
  title: string;
  icon?: React.ElementType;
  description?: string;
  autoRun?: boolean;
}

export function AISmartCard({ type, data, title, icon: Icon = Brain, description, autoRun }: AISmartCardProps) {
  const { analyze, isLoading, result, error, reset } = useIndustryAI();
  const [hasRun, setHasRun] = useState(false);

  const handleAnalyze = () => {
    setHasRun(true);
    analyze(type, data);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span>{title}</span>
              <Badge variant="secondary" className="text-[9px] ml-2 px-1.5 py-0">AI</Badge>
            </div>
          </CardTitle>
          {!hasRun && (
            <Button size="sm" onClick={handleAnalyze} className="gap-1.5">
              <Sparkles className="h-3 w-3" />Analyze
            </Button>
          )}
        </div>
        {description && !hasRun && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        {isLoading && !result && (
          <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">AI is analyzing...</span>
          </div>
        )}
        {result && (
          <ScrollArea className="max-h-[400px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}
        {result && !isLoading && (
          <div className="flex justify-end pt-2 gap-2">
            <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>
            <Button size="sm" variant="outline" onClick={handleAnalyze}>
              <Sparkles className="h-3 w-3 mr-1" />Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Natural Language Query Box ───────────────────────────────────
export function AINaturalLanguageQuery({ contextData }: { contextData?: Record<string, unknown> }) {
  const { analyze, isLoading, result, error } = useIndustryAI();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    analyze('natural_language_query', { query, context: contextData });
  };

  const suggestions = [
    'Show all projects over budget by more than 15%',
    'Which production orders are behind schedule?',
    'What is the defect rate trend for the last 6 months?',
    'List materials with less than 2 weeks of stock',
  ];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Ask AI Anything
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">NL Query</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about your projects, costs, quality..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !query.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {!result && !isLoading && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuery(s); analyze('natural_language_query', { query: s, context: contextData }); }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
        
        {result && (
          <ScrollArea className="max-h-[300px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AI Analysis Grid (for the dashboard) ─────────────────────────
interface AnalysisModule {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'production' | 'costing' | 'procurement' | 'intelligence';
  color: string;
}

const analysisModules: AnalysisModule[] = [
  { id: 'sched', type: 'production_scheduling', title: 'Production Scheduling', description: 'AI-optimized production order sequencing', icon: Factory, category: 'production', color: 'from-blue-500/20 to-blue-600/5' },
  { id: 'maint', type: 'predictive_maintenance', title: 'Predictive Maintenance', description: 'Forecast equipment failures before they happen', icon: Wrench, category: 'production', color: 'from-amber-500/20 to-amber-600/5' },
  { id: 'quality', type: 'quality_prediction', title: 'Quality Prediction', description: 'Predict defect risks for upcoming production', icon: Shield, category: 'production', color: 'from-green-500/20 to-green-600/5' },
  { id: 'bom', type: 'smart_bom_generation', title: 'Smart BOM Generator', description: 'AI-generate Bill of Materials from descriptions', icon: FileText, category: 'costing', color: 'from-purple-500/20 to-purple-600/5' },
  { id: 'cost', type: 'cost_optimization', title: 'Cost Optimization', description: 'Value engineering and cost reduction analysis', icon: Calculator, category: 'costing', color: 'from-emerald-500/20 to-emerald-600/5' },
  { id: 'demand', type: 'demand_forecasting', title: 'Demand Forecasting', description: 'Predict material needs from pipeline & history', icon: TrendingUp, category: 'procurement', color: 'from-cyan-500/20 to-cyan-600/5' },
  { id: 'supplier', type: 'supplier_risk_scoring', title: 'Supplier Risk Scoring', description: 'Evaluate vendor reliability and risk levels', icon: Users, category: 'procurement', color: 'from-orange-500/20 to-orange-600/5' },
  { id: 'phase', type: 'phase_prediction', title: 'Phase Prediction', description: 'Estimate remaining phase durations with AI', icon: BarChart3, category: 'intelligence', color: 'from-indigo-500/20 to-indigo-600/5' },
  { id: 'bottleneck', type: 'bottleneck_detection', title: 'Bottleneck Detection', description: 'Real-time WIP constraint analysis', icon: AlertTriangle, category: 'intelligence', color: 'from-red-500/20 to-red-600/5' },
  { id: 'lessons', type: 'project_lessons', title: 'Lessons Learned', description: 'AI-extracted insights from completed projects', icon: Lightbulb, category: 'intelligence', color: 'from-yellow-500/20 to-yellow-600/5' },
  { id: 'anomaly', type: 'anomaly_detection', title: 'Anomaly Detection', description: 'Flag unusual patterns in operations data', icon: Zap, category: 'intelligence', color: 'from-rose-500/20 to-rose-600/5' },
  { id: 'brief', type: 'executive_briefing', title: 'Executive Briefing', description: 'One-click daily operations summary', icon: ClipboardCheck, category: 'intelligence', color: 'from-slate-500/20 to-slate-600/5' },
];

export function AIAnalysisGrid({ contextData }: { contextData?: Record<string, unknown> }) {
  const { analyze, isLoading, result, error, reset } = useIndustryAI();
  const [activeModule, setActiveModule] = useState<AnalysisModule | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', icon: Brain },
    { id: 'production', label: 'Production & Quality', icon: Factory },
    { id: 'costing', label: 'Design & Costing', icon: Calculator },
    { id: 'procurement', label: 'Procurement & MRP', icon: Package },
    { id: 'intelligence', label: 'Project Intelligence', icon: BarChart3 },
  ];

  const filtered = filter === 'all' ? analysisModules : analysisModules.filter(m => m.category === filter);

  const handleRun = (mod: AnalysisModule) => {
    setActiveModule(mod);
    reset();
    analyze(mod.type, contextData || { summary: 'Analyze all available data for this module' });
  };

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              filter === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(mod => (
          <Card
            key={mod.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] border',
              activeModule?.id === mod.id ? 'ring-2 ring-primary border-primary/30' : 'border-border/50',
            )}
            onClick={() => handleRun(mod)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0', mod.color)}>
                  <mod.icon className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    {mod.title}
                    {activeModule?.id === mod.id && isLoading && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results panel */}
      {activeModule && (result || isLoading || error) && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <activeModule.icon className="h-4 w-4 text-primary" />
                {activeModule.title}
                <Badge variant="secondary" className="text-[9px]">AI-Powered</Badge>
              </CardTitle>
              <div className="flex gap-2">
                {result && !isLoading && (
                  <Button size="sm" variant="outline" onClick={() => handleRun(activeModule)}>
                    <Sparkles className="h-3 w-3 mr-1" />Re-analyze
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setActiveModule(null); reset(); }}>
                  Close
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
            {isLoading && !result && (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>AI is analyzing your data...</span>
              </div>
            )}
            {result && (
              <ScrollArea className="max-h-[500px]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
