import { useState } from 'react';
import { Brain, Loader2, AlertTriangle, TrendingUp, Target, Zap, RefreshCw, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Lead } from '@/hooks/useLeads';
import { useQueryClient } from '@tanstack/react-query';

interface LeadScoringPanelProps {
  leads: Lead[];
}

interface LeadInsight {
  lead_id: string;
  score: number;
  risk_level: string;
  next_best_action: string;
  deal_risk_alerts: string[];
  strengths?: string[];
  summary?: string;
}

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-200',
  high: 'bg-red-500/10 text-red-700 border-red-200',
};

const riskIcons: Record<string, typeof Shield> = {
  low: Shield,
  medium: AlertTriangle,
  high: AlertTriangle,
};

export function LeadScoringPanel({ leads }: LeadScoringPanelProps) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isScoring, setIsScoring] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [insights, setInsights] = useState<LeadInsight[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [detailedInsight, setDetailedInsight] = useState<any>(null);

  const scoreAllLeads = async () => {
    if (leads.length === 0) return;
    setIsScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('score-leads', {
        body: { lead_ids: leads.slice(0, 50).map(l => l.id), mode: 'score' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setInsights(data.results?.map((r: any) => ({ lead_id: r.id, ...r })) || []);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: language === 'ar' ? 'تم التقييم' : 'Leads Scored',
        description: `${data.scored} leads scored by AI`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Scoring failed', variant: 'destructive' });
    } finally {
      setIsScoring(false);
    }
  };

  const analyzeLeadDeep = async (leadId: string) => {
    setIsAnalyzing(leadId);
    setExpandedLead(leadId);
    try {
      const { data, error } = await supabase.functions.invoke('score-leads', {
        body: { lead_ids: [leadId], mode: 'insights' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDetailedInsight(data);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Analysis failed', variant: 'destructive' });
    } finally {
      setIsAnalyzing(null);
    }
  };

  // Group leads by risk
  const highRisk = leads.filter(l => (l as any).risk_level === 'high');
  const atRiskCount = highRisk.length;
  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + ((l as any).score || l.score || 0), 0) / leads.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* AI Scoring Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'تقييم الذكاء الاصطناعي' : 'AI Lead Scoring & Insights'}
            </CardTitle>
            <Button onClick={scoreAllLeads} disabled={isScoring} size="sm" className="gap-2">
              {isScoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isScoring ? 'Scoring...' : 'Score All Leads'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{avgScore}</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{leads.filter(l => ((l as any).score || l.score || 0) >= 80).length}</p>
              <p className="text-xs text-muted-foreground">Hot Leads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{atRiskCount}</p>
              <p className="text-xs text-muted-foreground">At Risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      {highRisk.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Deal Risk Alerts ({highRisk.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {highRisk.slice(0, 5).map(lead => {
              const aiInsights = (lead as any).ai_insights;
              return (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded bg-background border">
                  <div>
                    <p className="text-sm font-medium">{lead.card_name}</p>
                    {aiInsights?.deal_risk_alerts?.[0] && (
                      <p className="text-xs text-muted-foreground">{aiInsights.deal_risk_alerts[0]}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => analyzeLeadDeep(lead.id)}>
                    {isAnalyzing === lead.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Next Best Actions */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Next Best Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.slice(0, 5).map(insight => {
              const lead = leads.find(l => l.id === insight.lead_id);
              if (!lead) return null;
              return (
                <div key={insight.lead_id} className="flex items-start gap-3 p-2 rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{lead.card_name}</span>
                      <Badge className={`text-[10px] ${riskColors[insight.risk_level] || ''}`}>
                        {insight.risk_level}
                      </Badge>
                      <span className="text-xs font-bold text-primary">{insight.score}/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.next_best_action}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => analyzeLeadDeep(insight.lead_id)}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Detailed Insight Panel */}
      {detailedInsight && expandedLead && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Deep Analysis: {leads.find(l => l.id === expandedLead)?.card_name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setExpandedLead(null); setDetailedInsight(null); }}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold text-primary">{detailedInsight.score}</p>
                <p className="text-xs text-muted-foreground">AI Score</p>
              </div>
              <Progress value={detailedInsight.score} className="flex-1" />
              <Badge className={riskColors[detailedInsight.risk_level] || ''}>
                {detailedInsight.risk_level} risk
              </Badge>
            </div>

            {detailedInsight.summary && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">{detailedInsight.summary}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {detailedInsight.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Strengths
                  </p>
                  {detailedInsight.strengths.map((s: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                  ))}
                </div>
              )}
              {detailedInsight.deal_risk_alerts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Risk Factors
                  </p>
                  {detailedInsight.deal_risk_alerts.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                <Zap className="h-3 w-3" /> Recommended Action
              </p>
              <p className="text-sm">{detailedInsight.next_best_action}</p>
            </div>

            {detailedInsight.recommended_tags?.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1">Suggested Tags</p>
                <div className="flex flex-wrap gap-1">
                  {detailedInsight.recommended_tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
