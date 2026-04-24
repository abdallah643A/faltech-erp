import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Star, Search, Trophy, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const TRADES = ['All', 'Concrete', 'Framing', 'Electrical', 'Plumbing', 'HVAC', 'Drywall', 'Painting', 'Flooring', 'Roofing', 'Landscaping', 'Other'];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  );
}

export default function CPMSSubcontractorRankings() {
  const { t } = useLanguage();

  const [tradeFilter, setTradeFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['sub-rankings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cpms_subcontractors')
        .select('id, name, code, trade, rating, overall_performance_rating, total_reviews, last_review_date, recommendation, is_active, schedule_score, quality_score, safety_score, financial_score, communication_score')
        .eq('is_active', true)
        .order('overall_performance_rating', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return subs.filter((s: any) => {
      if (tradeFilter !== 'All' && s.trade !== tradeFilter) return false;
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subs, tradeFilter, search]);

  const topPerformers = filtered.filter((s: any) => Number(s.overall_performance_rating) >= 4);
  const lowPerformers = filtered.filter((s: any) => Number(s.overall_performance_rating) > 0 && Number(s.overall_performance_rating) < 3);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subcontractor Rankings</h1>
        <p className="text-sm text-muted-foreground">Performance-based ranking of all active subcontractors</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Trophy className="h-4 w-4 text-yellow-500" /><span className="text-xs text-muted-foreground">Total Ranked</span></div>
          <p className="text-xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Top Performers (4+)</span></div>
          <p className="text-xl font-bold text-emerald-600">{topPerformers.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Low Performers (&lt;3)</span></div>
          <p className="text-xl font-bold text-destructive">{lowPerformers.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Star className="h-4 w-4 text-yellow-400" /><span className="text-xs text-muted-foreground">Avg Rating</span></div>
          <p className="text-xl font-bold">
            {filtered.length ? (filtered.reduce((s: number, sub: any) => s + Number(sub.overall_performance_rating || 0), 0) / filtered.filter((s: any) => Number(s.overall_performance_rating) > 0).length || 0).toFixed(1) : '—'}
          </p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search subcontractor..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Rankings Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Rank</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Trade</TableHead>
              <TableHead className="text-center">Overall</TableHead>
              <TableHead className="text-center">Schedule</TableHead>
              <TableHead className="text-center">Quality</TableHead>
              <TableHead className="text-center">Safety</TableHead>
              <TableHead className="text-center">Financial</TableHead>
              <TableHead className="text-center">Reviews</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sub: any, idx: number) => {
              const rating = Number(sub.overall_performance_rating || 0);
              return (
                <TableRow key={sub.id} className={rating < 3 && rating > 0 ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                      idx === 1 ? 'bg-gray-300/20 text-gray-600' :
                      idx === 2 ? 'bg-orange-400/20 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sub.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sub.code}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{sub.trade || '—'}</Badge></TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-bold text-lg">{rating > 0 ? rating.toFixed(1) : '—'}</span>
                      {rating > 0 && <Stars value={rating} />}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{Number(sub.schedule_score || 0) > 0 ? `${Number(sub.schedule_score).toFixed(0)}` : '—'}</TableCell>
                  <TableCell className="text-center text-sm">{Number(sub.quality_score || 0) > 0 ? `${Number(sub.quality_score).toFixed(0)}` : '—'}</TableCell>
                  <TableCell className="text-center text-sm">{Number(sub.safety_score || 0) > 0 ? `${Number(sub.safety_score).toFixed(0)}` : '—'}</TableCell>
                  <TableCell className="text-center text-sm">{Number(sub.financial_score || 0) > 0 ? `${Number(sub.financial_score).toFixed(0)}` : '—'}</TableCell>
                  <TableCell className="text-center text-sm">{sub.total_reviews || 0}</TableCell>
                  <TableCell>
                    {sub.recommendation ? (
                      <Badge variant="outline" className={
                        sub.recommendation === 'Excellent - Use Again' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        sub.recommendation === 'Do Not Use' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        sub.recommendation === 'Acceptable' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''
                      }>
                        {sub.recommendation}
                      </Badge>
                    ) : <span className="text-muted-foreground text-xs">No reviews</span>}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No subcontractors found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
