import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Swords, Plus, Trash2, Shield, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Opportunity } from '@/hooks/useOpportunities';

interface CompetitorTrackerProps {
  opportunities: Opportunity[];
  formatCurrency: (v: number) => string;
}

interface Competitor {
  id: string;
  opportunity_id: string;
  competitor_name: string;
  strengths: string | null;
  weaknesses: string | null;
  threat_level: string;
  pricing_position: string | null;
  notes: string | null;
  created_at: string;
}

const threatColors: Record<string, string> = {
  low: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
};

const pricingLabels: Record<string, string> = {
  lower: '↓ Lower',
  similar: '≈ Similar',
  higher: '↑ Higher',
  unknown: '? Unknown',
};

export function CompetitorTracker({ opportunities, formatCurrency }: CompetitorTrackerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    opportunity_id: '',
    competitor_name: '',
    strengths: '',
    weaknesses: '',
    threat_level: 'medium',
    pricing_position: 'unknown',
    notes: '',
  });

  const { data: competitors = [] } = useQuery({
    queryKey: ['opportunity-competitors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_competitors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Competitor[];
    },
  });

  const addCompetitor = useMutation({
    mutationFn: async (comp: typeof form) => {
      const { error } = await supabase.from('opportunity_competitors').insert({
        ...comp,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-competitors'] });
      toast({ title: 'Competitor Added', description: 'Competitor tagged to opportunity.' });
      setIsAddOpen(false);
      setForm({ opportunity_id: '', competitor_name: '', strengths: '', weaknesses: '', threat_level: 'medium', pricing_position: 'unknown', notes: '' });
    },
  });

  const deleteCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('opportunity_competitors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-competitors'] });
      toast({ title: 'Removed', description: 'Competitor removed.' });
    },
  });

  // Analytics
  const competitorMap = new Map<string, { wins: number; losses: number; active: number; totalValue: number }>();
  competitors.forEach(c => {
    const opp = opportunities.find(o => o.id === c.opportunity_id);
    if (!opp) return;
    const existing = competitorMap.get(c.competitor_name) || { wins: 0, losses: 0, active: 0, totalValue: 0 };
    existing.totalValue += opp.value;
    if (opp.stage === 'Closed Won') existing.wins++;
    else if (opp.stage === 'Closed Lost') existing.losses++;
    else existing.active++;
    competitorMap.set(c.competitor_name, existing);
  });

  const competitorStats = Array.from(competitorMap.entries())
    .map(([name, stats]) => ({
      name,
      ...stats,
      winRate: stats.wins + stats.losses > 0 ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Competitor Intelligence</h3>
          <Badge variant="secondary">{competitors.length} tracked</Badge>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" /> Tag Competitor
        </Button>
      </div>

      {/* Win/Loss by Competitor */}
      {competitorStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {competitorStats.map(cs => (
            <Card key={cs.name} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm truncate">{cs.name}</p>
                  <Badge variant={cs.winRate >= 50 ? 'default' : 'destructive'} className="text-xs">
                    {cs.winRate.toFixed(0)}% WR
                  </Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="text-success">✓ {cs.wins} Won</span>
                  <span className="text-destructive">✗ {cs.losses} Lost</span>
                  <span>⏳ {cs.active} Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total pipeline: {formatCurrency(cs.totalValue)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Competitor Entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Competitor Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No competitors tracked yet. Tag competitors on your opportunities to start building intelligence.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {competitors.slice(0, 10).map(c => {
                const opp = opportunities.find(o => o.id === c.opportunity_id);
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.competitor_name}</span>
                        <Badge className={`text-xs ${threatColors[c.threat_level]}`}>
                          {c.threat_level}
                        </Badge>
                        {c.pricing_position && c.pricing_position !== 'unknown' && (
                          <span className="text-xs text-muted-foreground">{pricingLabels[c.pricing_position]}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {opp?.name || 'Unknown opportunity'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCompetitor.mutate(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Competitor Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tag Competitor</DialogTitle>
            <DialogDescription>Track a competitor on an opportunity</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Opportunity *</Label>
              <Select value={form.opportunity_id} onValueChange={v => setForm({ ...form, opportunity_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                <SelectContent>
                  {opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Competitor Name *</Label>
              <Input value={form.competitor_name} onChange={e => setForm({ ...form, competitor_name: e.target.value })} placeholder="e.g. CompetitorCo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Threat Level</Label>
                <Select value={form.threat_level} onValueChange={v => setForm({ ...form, threat_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing Position</Label>
                <Select value={form.pricing_position} onValueChange={v => setForm({ ...form, pricing_position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lower">Lower</SelectItem>
                    <SelectItem value="similar">Similar</SelectItem>
                    <SelectItem value="higher">Higher</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Their Strengths</Label>
              <Textarea value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} placeholder="What do they do well?" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Their Weaknesses</Label>
              <Textarea value={form.weaknesses} onChange={e => setForm({ ...form, weaknesses: e.target.value })} placeholder="Where do they fall short?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addCompetitor.mutate(form)}
              disabled={!form.opportunity_id || !form.competitor_name || addCompetitor.isPending}
            >
              {addCompetitor.isPending ? 'Adding...' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
