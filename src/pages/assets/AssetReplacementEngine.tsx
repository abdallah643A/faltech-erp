import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Zap } from 'lucide-react';

const AssetReplacementEngine = () => {
  const { activeCompanyId } = useActiveCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [eq, sc] = await Promise.all([
      supabase.from('cpms_equipment' as any).select('*').order('name'),
      supabase.from('asset_replacement_scores' as any).select('*').order('calculated_at', { ascending: false }),
    ]);
    setEquipment((eq.data || []) as any[]);
    setScores((sc.data || []) as any[]);
  };

  useEffect(() => { fetchData(); }, [activeCompanyId]);

  const calculateScore = (eq: any) => {
    const now = new Date();
    const purchaseDate = eq.purchase_date ? new Date(eq.purchase_date) : now;
    const ageYears = (now.getTime() - purchaseDate.getTime()) / (365.25 * 86400000);
    const lifeYears = eq.useful_life_years || 10;
    const ageScore = Math.min(100, (ageYears / lifeYears) * 100);
    const utilizationScore = 50; // placeholder
    const maintenanceCostScore = 30; // placeholder
    const downtimeScore = 20; // placeholder
    const safetyScore = eq.condition === 'poor' ? 80 : eq.condition === 'fair' ? 40 : 10;
    const warrantyScore = 20;
    const residualScore = eq.purchase_cost ? Math.max(0, 100 - ((eq.current_value || 0) / eq.purchase_cost) * 100) : 50;
    const overall = (ageScore * 0.25 + utilizationScore * 0.1 + maintenanceCostScore * 0.2 + downtimeScore * 0.15 + safetyScore * 0.1 + warrantyScore * 0.05 + residualScore * 0.15);
    const recommendation = overall >= 75 ? 'replace' : overall >= 55 ? 'refurbish' : overall >= 35 ? 'repair' : 'retain';
    return { age_score: Math.round(ageScore), utilization_score: utilizationScore, maintenance_cost_score: maintenanceCostScore, downtime_score: downtimeScore, safety_risk_score: safetyScore, warranty_score: warrantyScore, residual_value_score: Math.round(residualScore), overall_score: Math.round(overall), recommendation };
  };

  const runEngine = async () => {
    setLoading(true);
    for (const eq of equipment) {
      const s = calculateScore(eq);
      await supabase.from('asset_replacement_scores' as any).insert({
        equipment_id: eq.id, company_id: activeCompanyId, calculated_by: user?.id, ...s,
        recommendation_reason: `Overall score: ${s.overall_score}/100`,
      } as any);
    }
    toast({ title: 'Scoring complete', description: `${equipment.length} assets scored` });
    setLoading(false);
    fetchData();
  };

  const latestScores = equipment.map(eq => {
    const s = scores.find(sc => sc.equipment_id === eq.id);
    return { ...eq, score: s };
  }).filter(e => e.score);

  const recColors: Record<string, string> = { replace: 'destructive', refurbish: 'default', repair: 'secondary', retain: 'outline' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: 'IBM Plex Sans' }}>Asset Replacement Recommendation</h1><p className="text-sm text-muted-foreground">Score assets and recommend repair, retain, refurbish, or replace</p></div>
        <Button onClick={runEngine} disabled={loading} style={{ backgroundColor: '#0066cc' }}><Zap className="h-4 w-4 mr-1" />{loading ? 'Calculating...' : 'Run Engine'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['replace', 'refurbish', 'repair', 'retain'].map(r => (
          <Card key={r}><CardContent className="pt-4"><div className="text-2xl font-bold">{latestScores.filter(s => s.score?.recommendation === r).length}</div><div className="text-xs text-muted-foreground capitalize">{r}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Asset</TableHead><TableHead>Age</TableHead><TableHead>Maint Cost</TableHead><TableHead>Safety</TableHead><TableHead>Overall</TableHead><TableHead>Recommendation</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {latestScores.sort((a, b) => (b.score?.overall_score || 0) - (a.score?.overall_score || 0)).map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell><Progress value={e.score?.age_score || 0} className="w-16 h-2" /></TableCell>
                <TableCell><Progress value={e.score?.maintenance_cost_score || 0} className="w-16 h-2" /></TableCell>
                <TableCell><Progress value={e.score?.safety_risk_score || 0} className="w-16 h-2" /></TableCell>
                <TableCell><span className="font-bold">{e.score?.overall_score}</span>/100</TableCell>
                <TableCell><Badge variant={recColors[e.score?.recommendation] as any}>{e.score?.recommendation}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AssetReplacementEngine;
