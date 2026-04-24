import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getReportGenerators } from '@/utils/reportGenerators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const aiInsights = [
  {
    id: 1,
    type: 'success',
    title: 'Sales Target Achievement',
    description: 'Current month sales are 12% above target. Top performers: Sales Team A with SAR 1.2M in closed deals.',
    metric: '+12%',
    trend: 'up',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Lead Conversion Rate Declining',
    description: 'Lead conversion rate dropped from 24% to 18% in the last 2 weeks. Consider reviewing follow-up processes.',
    metric: '-6%',
    trend: 'down',
  },
  {
    id: 3,
    type: 'info',
    title: 'Inventory Turnover Optimal',
    description: 'Current inventory turnover rate is 8.5x, which is within the optimal range of 8-12x for your industry.',
    metric: '8.5x',
    trend: 'stable',
  },
  {
    id: 4,
    type: 'warning',
    title: 'Overdue Activities Detected',
    description: '15 sales activities are overdue by more than 7 days. This may impact opportunity closure rates.',
    metric: '15',
    trend: 'attention',
  },
];

const performanceSummaries = [
  {
    id: 1,
    period: 'Weekly',
    title: 'Week 3, January 2024 Summary',
    date: 'Jan 15-21, 2024',
    highlights: [
      { label: 'New Leads', value: '47', change: '+15%' },
      { label: 'Opportunities Created', value: '12', change: '+8%' },
      { label: 'Deals Closed', value: '5', change: '+25%' },
      { label: 'Revenue', value: 'SAR 485,000', change: '+18%' },
    ],
  },
  {
    id: 2,
    period: 'Monthly',
    title: 'December 2023 Summary',
    date: 'Dec 1-31, 2023',
    highlights: [
      { label: 'New Leads', value: '189', change: '+22%' },
      { label: 'Opportunities Created', value: '45', change: '+12%' },
      { label: 'Deals Closed', value: '18', change: '+30%' },
      { label: 'Revenue', value: 'SAR 1,850,000', change: '+25%' },
    ],
  },
];

const reportTemplates = [
  // Sales Reports
  { id: 1, name: 'Sales Summary by Period', category: 'Sales', description: 'Total sales grouped by day/week/month/year' },
  { id: 2, name: 'Sales by Item', category: 'Sales', description: 'Items sold, quantities, revenue per item' },
  { id: 3, name: 'Sales by Customer', category: 'Sales', description: 'Revenue per customer, avg transaction' },
  { id: 4, name: 'Sales by Sales Employee', category: 'Sales', description: 'Performance per sales rep' },
  { id: 5, name: 'Open Sales Orders', category: 'Sales', description: 'All open SO with quantities and delivery dates' },
  { id: 6, name: 'Quotation to Order Conversion', category: 'Sales', description: 'Conversion rate of quotations to orders' },
  { id: 7, name: 'Sales by Payment Method', category: 'Sales', description: 'Cash vs Card vs Transfer breakdown' },
  { id: 8, name: 'Daily Cash Register', category: 'Sales', description: 'End-of-day cash reconciliation per POS terminal' },
  { id: 9, name: 'Target Achievement Report', category: 'Sales', description: 'Individual and team target progress' },
  // Procurement Reports
  { id: 10, name: 'Purchase Summary by Period', category: 'Procurement', description: 'Total purchases grouped by period' },
  { id: 11, name: 'Open Purchase Orders', category: 'Procurement', description: 'POs awaiting GRPO with due dates' },
  { id: 12, name: 'GRPO vs PO Variance', category: 'Procurement', description: 'Qty ordered vs qty received' },
  { id: 13, name: 'AP Invoice Aging', category: 'Procurement', description: 'Vendor outstanding balances by aging bucket' },
  { id: 14, name: 'Purchase by Vendor', category: 'Procurement', description: 'Spend analysis per vendor' },
  // Inventory Reports
  { id: 15, name: 'Stock Status', category: 'Inventory', description: 'Current stock per item per warehouse' },
  { id: 16, name: 'Inventory Valuation', category: 'Inventory', description: 'Stock value by valuation method' },
  { id: 17, name: 'Stock Movement History', category: 'Inventory', description: 'All in/out movements per item' },
  { id: 18, name: 'Stock Transfer Report', category: 'Inventory', description: 'Inter-warehouse transfer history' },
  { id: 19, name: 'Inventory Counting Variance', category: 'Inventory', description: 'Variance report from counting sessions' },
  { id: 20, name: 'Slow Moving Items', category: 'Inventory', description: 'Items with no movement in N days' },
  // CRM Reports
  { id: 21, name: 'Activity Report', category: 'CRM', description: 'All activities by type, status, user' },
  { id: 22, name: 'Opportunity Pipeline', category: 'CRM', description: 'Open opportunities by stage and value' },
  { id: 23, name: 'Lead Conversion Rate', category: 'CRM', description: 'Leads converted to customers' },
  { id: 24, name: 'Customer Interaction History', category: 'CRM', description: 'All CRM activities per customer' },
  // Finance Reports
  { id: 25, name: 'AR Aging Report', category: 'Finance', description: 'Customer outstanding balances by aging' },
  { id: 26, name: 'AP Aging Report', category: 'Finance', description: 'Vendor outstanding balances by aging' },
  { id: 27, name: 'Customer Account Statement', category: 'Finance', description: 'Full transaction history for a customer' },
  { id: 28, name: 'Revenue by COA', category: 'Finance', description: 'Revenue breakdown by G/L account' },
  { id: 29, name: 'Daily Sales vs Target', category: 'Finance', description: 'Branch performance vs target' },
  { id: 30, name: 'General Ledger', category: 'Finance', description: 'SAP B1 HANA style GL with drill-down by account' },
];

export default function Reports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ai-insights');
  const [nlQuery, setNlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [reportCategory, setReportCategory] = useState('All');
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const reportGenerators = getReportGenerators();

  const handleGenerate = async (templateId: number) => {
    // General Ledger → navigate to dedicated page
    if (templateId === 30) {
      navigate('/general-ledger');
      return;
    }
    const generator = reportGenerators[templateId];
    if (!generator) {
      toast({ title: language === 'ar' ? 'قريباً' : 'Coming Soon', description: language === 'ar' ? 'هذا التقرير قيد التطوير' : 'This report is being developed' });
      return;
    }
    setGeneratingId(templateId);
    try {
      await generator();
      toast({ title: language === 'ar' ? 'تم' : 'Done', description: language === 'ar' ? 'تم تحميل التقرير' : 'Report downloaded successfully' });
    } catch (err: any) {
      toast({ title: language === 'ar' ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingId(null);
    }
  };

  const categories = ['All', 'Sales', 'Procurement', 'Inventory', 'CRM', 'Finance'];
  const filteredReports = reportCategory === 'All' ? reportTemplates : reportTemplates.filter(r => r.category === reportCategory);

  const handleNaturalLanguageQuery = () => {
    if (!nlQuery.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى إدخال سؤال' : 'Please enter a question',
        variant: 'destructive',
      });
      return;
    }

    setIsQuerying(true);
    
    // Simulate AI response
    setTimeout(() => {
      const sampleResponses: Record<string, string> = {
        'sales': 'Based on current data, total sales for January 2024 are SAR 1,245,000 with a 15% increase compared to last month. Top performing region is Riyadh with SAR 520,000 in revenue.',
        'leads': 'You currently have 124 active leads. 45 are in the qualification stage, 38 in proposal stage, and 41 are new. The average lead age is 12 days.',
        'opportunities': 'There are 28 open opportunities worth a total of SAR 3.2M. The weighted pipeline value is SAR 1.8M based on probability scores.',
        'inventory': 'Current inventory value is SAR 2.5M across 1,250 SKUs. 15 items are below reorder point and need attention.',
        'default': 'Based on your query, here are the key insights:\n\n• Current month revenue: SAR 1.2M\n• Active customers: 156\n• Pending orders: 23\n• Average order value: SAR 15,400\n\nWould you like more specific details on any of these metrics?',
      };

      const queryLower = nlQuery.toLowerCase();
      let response = sampleResponses['default'];
      
      if (queryLower.includes('sale') || queryLower.includes('revenue')) {
        response = sampleResponses['sales'];
      } else if (queryLower.includes('lead')) {
        response = sampleResponses['leads'];
      } else if (queryLower.includes('opportunit') || queryLower.includes('pipeline')) {
        response = sampleResponses['opportunities'];
      } else if (queryLower.includes('inventory') || queryLower.includes('stock')) {
        response = sampleResponses['inventory'];
      }

      setQueryResult(response);
      setIsQuerying(false);
    }, 1500);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <TrendingUp className="h-5 w-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'info':
        return <TrendingUp className="h-5 w-5 text-info" />;
      default:
        return <BarChart3 className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-success/30 bg-success/5';
      case 'warning':
        return 'border-warning/30 bg-warning/5';
      case 'info':
        return 'border-info/30 bg-info/5';
      default:
        return 'border-border bg-muted/5';
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'ar' ? 'التقارير والتحليلات الذكية' : 'AI-Powered Reports'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'تحليلات ذكية ورؤى مدعومة بالذكاء الاصطناعي' : 'Smart analytics and AI-driven insights'}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {language === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
        </Button>
      </div>

      {/* Natural Language Query */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'استعلام بالذكاء الاصطناعي' : 'AI Query'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' 
              ? 'اسأل أي سؤال عن بياناتك باللغة الطبيعية' 
              : 'Ask any question about your data in natural language'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ar' 
                  ? 'مثال: ما هي إجمالي المبيعات هذا الشهر؟' 
                  : 'e.g., What are the total sales this month?'}
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageQuery()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleNaturalLanguageQuery} disabled={isQuerying}>
              {isQuerying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {queryResult && (
            <div className="mt-4 p-4 bg-background rounded-lg border">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary mb-2">
                    {language === 'ar' ? 'نتيجة الاستعلام:' : 'Query Result:'}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-line">{queryResult}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ai-insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {language === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
          </TabsTrigger>
          <TabsTrigger value="summaries" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {language === 'ar' ? 'ملخصات الأداء' : 'Performance Summaries'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            {language === 'ar' ? 'قوالب التقارير' : 'Report Templates'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-insights" className="space-y-4">
          <div className="grid gap-4">
            {aiInsights.map((insight) => (
              <Card key={insight.id} className={`${getInsightColor(insight.type)} border`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getInsightIcon(insight.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{insight.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={insight.trend === 'up' ? 'text-success border-success' : insight.trend === 'down' ? 'text-destructive border-destructive' : ''}
                        >
                          {insight.trend === 'up' && <TrendingUp className="h-3 w-3 mr-1" />}
                          {insight.trend === 'down' && <TrendingDown className="h-3 w-3 mr-1" />}
                          {insight.metric}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {performanceSummaries.map((summary) => (
              <Card key={summary.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{summary.period}</Badge>
                    <span className="text-sm text-muted-foreground">{summary.date}</span>
                  </div>
                  <CardTitle className="text-lg">{summary.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {summary.highlights.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold">{item.value}</p>
                          <Badge className="bg-success/10 text-success">{item.change}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex gap-2 flex-wrap mb-4">
            {categories.map(cat => (
              <Button key={cat} variant={reportCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setReportCategory(cat)}>{cat}</Button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{template.category}</Badge>
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={generatingId === template.id} onClick={() => handleGenerate(template.id)}>
                      {generatingId === template.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      {language === 'ar' ? 'إنشاء' : 'Generate'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleGenerate(template.id)} disabled={generatingId === template.id}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
