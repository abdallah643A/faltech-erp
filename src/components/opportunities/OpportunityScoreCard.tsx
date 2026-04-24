import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Shield, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

interface OpportunityScoreCardProps {
  opportunity: any;
  activitiesCount: number;
  competitorsCount: number;
  quotesCount: number;
  daysInPipeline: number;
}

interface ScoreFactor {
  label: string;
  score: number;
  maxScore: number;
  icon: any;
  detail: string;
}

export function OpportunityScoreCard({
  opportunity,
  activitiesCount,
  competitorsCount,
  quotesCount,
  daysInPipeline,
}: OpportunityScoreCardProps) {
  const { totalScore, factors, grade, gradeColor } = useMemo(() => {
    const factors: ScoreFactor[] = [];

    // Value score (0-20): Higher value = higher score
    const valueScore = Math.min(20, Math.round((opportunity.value / 500000) * 20));
    factors.push({
      label: 'Deal Value',
      score: valueScore,
      maxScore: 20,
      icon: TrendingUp,
      detail: `${opportunity.value.toLocaleString()} SAR`,
    });

    // Probability score (0-20): Direct mapping
    const probScore = Math.round(opportunity.probability / 5);
    factors.push({
      label: 'Probability',
      score: probScore,
      maxScore: 20,
      icon: Target,
      detail: `${opportunity.probability}%`,
    });

    // Activity engagement (0-20): More activities = better engagement
    const activityScore = Math.min(20, activitiesCount * 4);
    factors.push({
      label: 'Engagement',
      score: activityScore,
      maxScore: 20,
      icon: Activity,
      detail: `${activitiesCount} activities`,
    });

    // Pipeline age (0-20): Penalize stale opportunities
    const ageScore = daysInPipeline <= 30 ? 20 : daysInPipeline <= 60 ? 15 : daysInPipeline <= 90 ? 10 : daysInPipeline <= 180 ? 5 : 0;
    factors.push({
      label: 'Freshness',
      score: ageScore,
      maxScore: 20,
      icon: Clock,
      detail: `${daysInPipeline} days`,
    });

    // Completeness (0-20): Having quotes, competitors tracked, notes
    let completeness = 0;
    if (quotesCount > 0) completeness += 6;
    if (competitorsCount > 0) completeness += 4;
    if (opportunity.notes) completeness += 3;
    if (opportunity.contact_person) completeness += 3;
    if (opportunity.expected_close) completeness += 4;
    factors.push({
      label: 'Completeness',
      score: Math.min(20, completeness),
      maxScore: 20,
      icon: Shield,
      detail: `${Math.min(20, completeness)}/20`,
    });

    const totalScore = factors.reduce((s, f) => s + f.score, 0);
    const grade = totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : totalScore >= 20 ? 'D' : 'F';
    const gradeColor = totalScore >= 80 ? 'text-green-600 bg-green-500/10' : totalScore >= 60 ? 'text-blue-600 bg-blue-500/10' : totalScore >= 40 ? 'text-amber-600 bg-amber-500/10' : 'text-red-600 bg-red-500/10';

    return { totalScore, factors, grade, gradeColor };
  }, [opportunity, activitiesCount, competitorsCount, quotesCount, daysInPipeline]);

  const riskFactors = useMemo(() => {
    const risks: string[] = [];
    if (daysInPipeline > 90 && !['Closed Won', 'Closed Lost'].includes(opportunity.stage)) {
      risks.push('Stale opportunity - consider follow-up');
    }
    if (activitiesCount === 0) {
      risks.push('No activities - engagement needed');
    }
    if (!opportunity.expected_close) {
      risks.push('Missing expected close date');
    }
    if (quotesCount === 0 && ['Proposal', 'Negotiation'].includes(opportunity.stage)) {
      risks.push('No quotes at advanced stage');
    }
    return risks;
  }, [opportunity, daysInPipeline, activitiesCount, quotesCount]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Opportunity Score</CardTitle>
          <Badge className={`text-lg font-bold px-3 py-1 ${gradeColor}`}>{grade}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-4">
          <p className="text-3xl font-bold">{totalScore}</p>
          <p className="text-xs text-muted-foreground">out of 100</p>
          <Progress value={totalScore} className="h-2 mt-2" />
        </div>

        <div className="space-y-3">
          {factors.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <f.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs">
                  <span>{f.label}</span>
                  <span className="text-muted-foreground">{f.score}/{f.maxScore}</span>
                </div>
                <Progress value={(f.score / f.maxScore) * 100} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {riskFactors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1 mb-2">
              <AlertTriangle className="h-3 w-3" /> Risk Factors
            </p>
            <ul className="space-y-1">
              {riskFactors.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
