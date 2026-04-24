import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, Shield, Lightbulb, Tags, AlertTriangle, TrendingUp, TrendingDown, CheckCircle, XCircle, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { useOutgoingPayments } from '@/hooks/useOutgoingPayments';
import { useIncomingPayments } from '@/hooks/useIncomingPayments';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AIBankingInsights() {
  const { t } = useLanguage();
  const { payments: outgoing } = useOutgoingPayments();
  const { payments: incoming } = useIncomingPayments();
  const [activeTab, setActiveTab] = useState('risk');

  // Risk scoring mock data
  const vendorRisks = [
    { vendor: 'Gulf Steel Trading', score: 85, level: 'High', latePayments: 12, avgDelay: 18, trend: 'worsening', accuracy: 92 },
    { vendor: 'Saudi Cement Co.', score: 45, level: 'Medium', latePayments: 4, avgDelay: 7, trend: 'stable', accuracy: 88 },
    { vendor: 'National Electric', score: 20, level: 'Low', latePayments: 1, avgDelay: 2, trend: 'improving', accuracy: 95 },
    { vendor: 'Al Faisaliah Group', score: 72, level: 'High', latePayments: 8, avgDelay: 14, trend: 'worsening', accuracy: 90 },
    { vendor: 'Riyadh Supplies', score: 35, level: 'Medium', latePayments: 3, avgDelay: 5, trend: 'improving', accuracy: 87 },
  ];

  // Fraud detection
  const anomalies = [
    { id: '1', type: 'Unusual Amount', description: 'Payment of 450,000 SAR to Vendor X - 340% above average', confidence: 94, severity: 'high', amount: 450000, falsePositive: false },
    { id: '2', type: 'Frequency Spike', description: '8 payments to same vendor in 3 days (avg: 2/week)', confidence: 87, severity: 'medium', amount: 12000, falsePositive: false },
    { id: '3', type: 'Vendor Change', description: 'Bank account changed for Vendor Y before large payment', confidence: 91, severity: 'critical', amount: 180000, falsePositive: false },
    { id: '4', type: 'Round Amount', description: 'Multiple exact round amounts (50,000) to new vendor', confidence: 78, severity: 'medium', amount: 50000, falsePositive: true },
    { id: '5', type: 'Timing Pattern', description: 'Payment initiated at 2:30 AM - outside normal hours', confidence: 82, severity: 'low', amount: 25000, falsePositive: false },
  ];

  const scatterData = anomalies.map(a => ({ x: a.confidence, y: a.amount / 1000, name: a.type, severity: a.severity }));

  // AI Recommendations
  const recommendations = [
    { category: 'Payment Timing', suggestion: 'Delay 3 payments by 5 days to maintain cash buffer above 500K SAR threshold', impact: '+45,000 SAR cash availability', priority: 'high' },
    { category: 'Early Discount', suggestion: 'Take 2% discount on Invoice INV-2045 (Gulf Steel) - saves 9,200 SAR', impact: '9,200 SAR savings', priority: 'high' },
    { category: 'Consolidation', suggestion: 'Consolidate 4 payments to Saudi Cement into single transfer - save 800 SAR fees', impact: '800 SAR fee savings', priority: 'medium' },
    { category: 'Vendor Insight', suggestion: 'Vendor National Electric consistently pays 3 days early - negotiate 1% discount', impact: '~15,000 SAR/year', priority: 'medium' },
    { category: 'FX Timing', suggestion: 'USD weakening trend - delay USD payments by 7 days for projected 0.8% savings', impact: '~3,200 SAR savings', priority: 'low' },
  ];

  // Auto-categorization
  const categorizations = [
    { description: 'Monthly office rent - Al Olaya Tower', suggestedGL: '5100 - Rent Expense', suggestedCC: 'HQ Operations', confidence: 98, learned: true },
    { description: 'Stainless steel sheets - 2mm grade', suggestedGL: '1400 - Raw Materials', suggestedCC: 'Production', confidence: 95, learned: true },
    { description: 'STC Mobile bill Feb 2026', suggestedGL: '5300 - Telecom', suggestedCC: 'Admin', confidence: 92, learned: false },
    { description: 'Employee training workshop', suggestedGL: '5500 - Training', suggestedCC: 'HR', confidence: 85, learned: false },
    { description: 'Custom machinery part - CNC lathe', suggestedGL: '1600 - Equipment', suggestedCC: 'Maintenance', confidence: 79, learned: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI-Powered Banking Insights</h1>
          <p className="text-sm text-muted-foreground">Predictive analytics, fraud detection, and smart recommendations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="risk"><Shield className="h-3 w-3 mr-1" /> Risk</TabsTrigger>
          <TabsTrigger value="fraud"><AlertTriangle className="h-3 w-3 mr-1" /> Fraud</TabsTrigger>
          <TabsTrigger value="assistant"><Lightbulb className="h-3 w-3 mr-1" /> Assistant</TabsTrigger>
          <TabsTrigger value="categorize"><Tags className="h-3 w-3 mr-1" /> Auto-Cat</TabsTrigger>
        </TabsList>

        {/* Risk Scoring */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{vendorRisks.filter(v => v.level === 'High').length}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{vendorRisks.filter(v => v.level === 'Medium').length}</p>
                <p className="text-xs text-muted-foreground">Medium Risk</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{vendorRisks.filter(v => v.level === 'Low').length}</p>
                <p className="text-xs text-muted-foreground">Low Risk</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor Risk Scores</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorRisks.map((v, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{v.vendor}</span>
                        <Badge variant={v.level === 'High' ? 'destructive' : v.level === 'Medium' ? 'outline' : 'secondary'} className="text-[10px]">
                          {v.level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {v.trend === 'worsening' && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {v.trend === 'improving' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        <span className="text-xs text-muted-foreground">{v.accuracy}% accuracy</span>
                      </div>
                    </div>
                    <Progress value={v.score} className="h-2" />
                    <p className="text-[10px] text-muted-foreground">
                      {v.latePayments} late payments · Avg delay: {v.avgDelay} days · Trend: {v.trend}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Detection */}
        <TabsContent value="fraud" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Anomaly Detection Map</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" dataKey="x" name="Confidence" unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Amount" unit="K" tick={{ fontSize: 11 }} />
                  <ZAxis range={[100, 400]} />
                  <Tooltip formatter={(v: number, name: string) => [name === 'Confidence' ? v + '%' : v + 'K SAR', name]} />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={entry.severity === 'critical' ? 'hsl(0, 84%, 60%)' : entry.severity === 'high' ? 'hsl(25, 95%, 53%)' : entry.severity === 'medium' ? 'hsl(45, 93%, 47%)' : 'hsl(210, 40%, 60%)'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {anomalies.map(a => (
              <Card key={a.id} className={`border-l-4 ${a.severity === 'critical' ? 'border-l-red-600' : a.severity === 'high' ? 'border-l-orange-500' : a.severity === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={a.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">{a.type}</Badge>
                        <span className="text-xs text-muted-foreground">Confidence: {a.confidence}%</span>
                      </div>
                      <p className="text-sm mt-1">{a.description}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-1">{a.amount.toLocaleString()} SAR</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" /> Investigate
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs">
                      <ThumbsDown className="h-3 w-3 mr-1" /> False Positive
                    </Button>
                    {a.falsePositive && <Badge variant="secondary" className="text-[10px]">Marked as FP</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI Assistant */}
        <TabsContent value="assistant" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">AI Banking Assistant</p>
                <p className="text-xs text-muted-foreground">Analyzing {(outgoing || []).length + (incoming || []).length} transactions for optimization opportunities</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'outline' : 'secondary'} className="text-[10px]">
                      {rec.category}
                    </Badge>
                    <span className="text-xs text-green-600 font-medium">{rec.impact}</span>
                  </div>
                  <p className="text-sm">{rec.suggestion}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="default" className="text-xs">
                      <ThumbsUp className="h-3 w-3 mr-1" /> Apply
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs">Dismiss</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto-Categorization */}
        <TabsContent value="categorize" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{categorizations.filter(c => c.confidence >= 90).length}</p>
                <p className="text-xs text-muted-foreground">Auto-Categorized</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{categorizations.filter(c => c.confidence < 90).length}</p>
                <p className="text-xs text-muted-foreground">Needs Review</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Transaction Categorization</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorizations.map((c, i) => (
                  <div key={i} className="border-b last:border-0 pb-3 last:pb-0">
                    <p className="text-sm font-medium">{c.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{c.suggestedGL}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{c.suggestedCC}</Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{c.confidence}% confidence</span>
                    </div>
                    <Progress value={c.confidence} className="h-1 mt-1" />
                    <div className="flex items-center gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-6 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]">{t('common.edit')}</Button>
                      {c.learned && <Badge variant="secondary" className="text-[9px]">ML Learned</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
