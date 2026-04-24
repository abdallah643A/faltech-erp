import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Factory, Calculator, Package, BarChart3,
  Sparkles, Cpu, Zap,
} from 'lucide-react';
import { AIAnalysisGrid, AINaturalLanguageQuery, AISmartCard } from '@/components/industry/IndustryAIComponents';
import { useLanguage } from '@/contexts/LanguageContext';

export default function IndustryIntelligence() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  // Sample context data — in production this would come from hooks
  const sampleContext = {
    active_projects: 12,
    total_production_orders: 34,
    overdue_orders: 3,
    avg_quality_score: 94.2,
    equipment_count: 28,
    pending_material_requests: 8,
    budget_utilization: 78,
    avg_project_duration_days: 45,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            Industry Intelligence
            <Badge className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground text-xs">
              AI-Powered
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Smart analytics across Production, Costing, Procurement & Project Intelligence
          </p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Projects', value: sampleContext.active_projects, icon: BarChart3, color: 'text-blue-500' },
          { label: 'Production Orders', value: sampleContext.total_production_orders, icon: Factory, color: 'text-amber-500' },
          { label: 'Avg Quality Score', value: `${sampleContext.avg_quality_score}%`, icon: Sparkles, color: 'text-green-500' },
          { label: 'Budget Utilization', value: `${sampleContext.budget_utilization}%`, icon: Calculator, color: 'text-purple-500' },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Natural Language Query */}
      <AINaturalLanguageQuery contextData={sampleContext} />

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Brain className="h-3.5 w-3.5" />All Modules
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-1.5 text-xs">
            <Factory className="h-3.5 w-3.5" />Production
          </TabsTrigger>
          <TabsTrigger value="costing" className="gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />Costing
          </TabsTrigger>
          <TabsTrigger value="procurement" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />Procurement
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AIAnalysisGrid contextData={sampleContext} />
        </TabsContent>

        <TabsContent value="production" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AISmartCard
              type="production_scheduling"
              data={sampleContext}
              title="Production Schedule Optimizer"
              icon={Factory}
              description="AI optimizes your production order sequence based on resources, materials, and deadlines."
            />
            <AISmartCard
              type="predictive_maintenance"
              data={sampleContext}
              title="Predictive Maintenance"
              icon={Cpu}
              description="Forecast equipment failures and plan maintenance before breakdowns occur."
            />
          </div>
          <AISmartCard
            type="quality_prediction"
            data={sampleContext}
            title="Quality Defect Prediction"
            icon={Zap}
            description="Analyze QC patterns to predict and prevent quality issues in upcoming runs."
          />
        </TabsContent>

        <TabsContent value="costing" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AISmartCard
              type="smart_bom_generation"
              data={sampleContext}
              title="Smart BOM Generator"
              icon={Sparkles}
              description="Describe a product and AI generates a preliminary Bill of Materials."
            />
            <AISmartCard
              type="cost_optimization"
              data={sampleContext}
              title="Design-to-Cost Optimizer"
              icon={Calculator}
              description="AI analyzes your BOM to find cost reduction opportunities."
            />
          </div>
        </TabsContent>

        <TabsContent value="procurement" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AISmartCard
              type="demand_forecasting"
              data={sampleContext}
              title="Material Demand Forecast"
              icon={Package}
              description="Predict material needs from pipeline, history, and seasonal patterns."

            />
            <AISmartCard
              type="supplier_risk_scoring"
              data={sampleContext}
              title="Supplier Risk Assessment"
              icon={BarChart3}
              description="Score and rank vendors on quality, delivery, cost, and reliability."
            />
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AISmartCard
              type="phase_prediction"
              data={sampleContext}
              title="Phase Duration Predictor"
              icon={BarChart3}
              description="AI estimates remaining phase durations using historical project data."
            />
            <AISmartCard
              type="bottleneck_detection"
              data={sampleContext}
              title="Bottleneck Detection"
              icon={Zap}
              description="Real-time analysis of WIP to identify emerging constraints."
            />
            <AISmartCard
              type="anomaly_detection"
              data={sampleContext}
              title="Anomaly Detection"
              icon={Zap}
              description="Flag unusual patterns in costs, timelines, or quality metrics."
            />
            <AISmartCard
              type="executive_briefing"
              data={sampleContext}
              title="Executive Briefing"
              icon={Brain}
              description="One-click daily/weekly summary of all active industrial operations."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
