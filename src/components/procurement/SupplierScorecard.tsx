import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, TrendingUp, TrendingDown, Minus, Shield, Clock, DollarSign, MessageSquare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface SupplierData {
  id: string;
  card_name: string;
  card_code: string;
  overall_rating: number;
  on_time_delivery_rate: number;
  quality_score: number;
  price_competitiveness: number;
  communication_score: number;
  total_purchase_value: number;
  total_purchase_count: number;
  average_lead_time_days: number;
  last_performance_review_date: string | null;
}

interface Props {
  supplier: SupplierData;
  reviews: any[];
}

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
  const s = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${s} ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
      ))}
      <span className={`ml-1 font-semibold ${size === 'lg' ? 'text-lg' : 'text-xs'}`}>{(rating || 0).toFixed(1)}</span>
    </div>
  );
};

const getScoreColor = (score: number, max: number) => {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getTrend = (reviews: any[], field: string) => {
  if (reviews.length < 2) return 'neutral';
  const sorted = [...reviews].sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime());
  const recent = sorted[sorted.length - 1]?.[field] || 0;
  const prev = sorted[sorted.length - 2]?.[field] || 0;
  return recent > prev ? 'up' : recent < prev ? 'down' : 'neutral';
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-600" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function SupplierScorecard({ supplier, reviews }: Props) {
  const compositeScore = useMemo(() => {
    const otd = (supplier.on_time_delivery_rate || 0) / 20; // /100 * 5
    const quality = (supplier.quality_score || 0) / 20; // /100 * 5
    const price = supplier.price_competitiveness || 0; // already 1-5
    const comm = supplier.communication_score || 0; // already 1-5
    return ((otd * 0.35) + (quality * 0.30) + (price * 0.20) + (comm * 0.15));
  }, [supplier]);

  const radarData = [
    { metric: 'On-Time', value: (supplier.on_time_delivery_rate || 0) / 20, max: 5 },
    { metric: 'Quality', value: (supplier.quality_score || 0) / 20, max: 5 },
    { metric: 'Price', value: supplier.price_competitiveness || 0, max: 5 },
    { metric: 'Communication', value: supplier.communication_score || 0, max: 5 },
  ];

  const trendData = useMemo(() => {
    return [...reviews]
      .sort((a, b) => new Date(a.review_date).getTime() - new Date(b.review_date).getTime())
      .slice(-12)
      .map(r => ({
        date: r.review_date?.substring(5, 10),
        overall: r.overall_rating || 0,
        quality: r.quality_rating || 0,
        communication: r.communication_rating || 0,
      }));
  }, [reviews]);

  const formatSAR = (n: number) =>
    new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">{supplier.card_name}</h3>
              <p className="text-xs text-muted-foreground">{supplier.card_code}</p>
            </div>
            <div className="text-right">
              <StarRating rating={compositeScore} size="lg" />
              <p className="text-xs text-muted-foreground mt-1">Composite Score (weighted)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <TrendIcon trend={getTrend(reviews, 'on_time')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">On-Time Delivery</p>
          <p className={`text-lg font-bold ${getScoreColor(supplier.on_time_delivery_rate || 0, 100)}`}>
            {(supplier.on_time_delivery_rate || 0).toFixed(0)}%
          </p>
          <Progress value={supplier.on_time_delivery_rate || 0} className="h-1 mt-1" />
        </CardContent></Card>

        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <TrendIcon trend={getTrend(reviews, 'quality_rating')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Quality Score</p>
          <p className={`text-lg font-bold ${getScoreColor(supplier.quality_score || 0, 100)}`}>
            {(supplier.quality_score || 0).toFixed(0)}/100
          </p>
          <Progress value={supplier.quality_score || 0} className="h-1 mt-1" />
        </CardContent></Card>

        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <TrendIcon trend={getTrend(reviews, 'price_rating')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Price Competitiveness</p>
          <StarRating rating={supplier.price_competitiveness || 0} />
        </CardContent></Card>

        <Card><CardContent className="p-3">
          <div className="flex items-center justify-between">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <TrendIcon trend={getTrend(reviews, 'communication_rating')} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Communication</p>
          <StarRating rating={supplier.communication_score || 0} />
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Radar</CardTitle></CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 8 }} />
                <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rating Trend</CardTitle></CardHeader>
          <CardContent className="p-2">
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="overall" name="Overall" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="quality" name="Quality" stroke="#22c55e" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                Need 2+ reviews for trend data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Purchase Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Purchases</p>
          <p className="text-sm font-bold">{formatSAR(supplier.total_purchase_value || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Orders</p>
          <p className="text-sm font-bold">{supplier.total_purchase_count || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Avg Lead Time</p>
          <p className="text-sm font-bold">{(supplier.average_lead_time_days || 0).toFixed(0)} days</p>
        </CardContent></Card>
      </div>
    </div>
  );
}
