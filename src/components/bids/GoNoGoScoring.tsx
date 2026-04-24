import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useBidManagement, Bid } from '@/hooks/useBidManagement';
import AICopilotPanel from '@/components/ai/AICopilotPanel';
import { Target, CheckCircle, XCircle, AlertTriangle, Brain } from 'lucide-react';

const DEFAULT_CRITERIA = [
  { name: 'Strategic Fit', weight: 20, description: 'Alignment with company strategy and capabilities' },
  { name: 'Win Probability', weight: 20, description: 'Realistic assessment of winning chances' },
  { name: 'Resource Availability', weight: 15, description: 'Team capacity and skills availability' },
  { name: 'Profitability', weight: 15, description: 'Expected margin and financial return' },
  { name: 'Client Relationship', weight: 10, description: 'Existing relationship strength with client' },
  { name: 'Competition Level', weight: 10, description: 'Number and strength of competitors' },
  { name: 'Risk Level', weight: 10, description: 'Technical, financial, and delivery risks' },
];

interface Props {
  bid: Bid;
}

export default function GoNoGoScoring({ bid }: Props) {
  const { updateBid } = useBidManagement();
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const existing = (bid.go_no_go_criteria as any)?.scores || {};
    return DEFAULT_CRITERIA.reduce((acc, c) => ({
      ...acc,
      [c.name]: existing[c.name] || 50,
    }), {});
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const weightedScore = DEFAULT_CRITERIA.reduce((total, c) => {
    return total + ((scores[c.name] || 0) * c.weight / 100);
  }, 0);

  const decision = weightedScore >= 70 ? 'go' : weightedScore >= 50 ? 'conditional' : 'no_go';
  const decisionColor = decision === 'go' ? 'text-green-600' : decision === 'no_go' ? 'text-red-600' : 'text-yellow-600';
  const DecisionIcon = decision === 'go' ? CheckCircle : decision === 'no_go' ? XCircle : AlertTriangle;

  const handleSave = async () => {
    await updateBid.mutateAsync({
      id: bid.id,
      go_no_go_score: weightedScore,
      go_no_go_decision: decision,
      go_no_go_criteria: { scores, notes } as any,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${decisionColor}`}>
            <DecisionIcon className="h-8 w-8" />
            <div>
              <p className="text-2xl font-bold">{weightedScore.toFixed(1)}/100</p>
              <p className="text-sm font-semibold uppercase">{decision.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AICopilotPanel
            analysisType="go_no_go"
            data={{ bid, criteria: DEFAULT_CRITERIA, scores, weightedScore }}
            title="AI Go/No-Go Recommendation"
            triggerLabel="AI Recommend"
          />
          <Button onClick={handleSave}>Save Decision</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {DEFAULT_CRITERIA.map(criterion => (
          <Card key={criterion.name}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{criterion.name}</p>
                    <Badge variant="outline" className="text-xs">Weight: {criterion.weight}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{criterion.description}</p>
                </div>
                <div className="w-48">
                  <Slider
                    value={[scores[criterion.name] || 50]}
                    onValueChange={([v]) => setScores(prev => ({ ...prev, [criterion.name]: v }))}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className={`font-bold text-sm ${
                    (scores[criterion.name] || 0) >= 70 ? 'text-green-600' :
                    (scores[criterion.name] || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {scores[criterion.name] || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
