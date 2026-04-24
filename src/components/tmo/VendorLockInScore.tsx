import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';

interface Props {
  techAssets: any[];
  vendors: any[];
}

export function VendorLockInScore({ techAssets, vendors }: Props) {
  const vendorAnalysis = vendors.map(v => {
    const assetCount = techAssets.filter(a => a.vendor === v.name).length;
    const integrationDepth = Math.min(assetCount * 20, 100);
    const contractLock = v.contract_value > 100000 ? 80 : v.contract_value > 50000 ? 50 : 20;
    const alternatives = v.tier === 'strategic' ? 30 : v.tier === 'preferred' ? 50 : 80;
    const switchingCost = Math.round((integrationDepth * 0.4 + contractLock * 0.3 + (100 - alternatives) * 0.3));
    
    return {
      ...v,
      assetCount,
      integrationDepth,
      switchingCost,
      lockInScore: switchingCost,
      risk: switchingCost > 70 ? 'critical' : switchingCost > 45 ? 'high' : switchingCost > 25 ? 'moderate' : 'low',
    };
  }).sort((a, b) => b.lockInScore - a.lockInScore);

  const highRisk = vendorAnalysis.filter(v => v.risk === 'critical' || v.risk === 'high').length;
  const avgScore = vendorAnalysis.length > 0 ? Math.round(vendorAnalysis.reduce((s, v) => s + v.lockInScore, 0) / vendorAnalysis.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Vendors Analyzed</p>
          <p className="text-2xl font-bold">{vendorAnalysis.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><Lock className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">High Lock-in Risk</span></div>
          <p className="text-2xl font-bold text-destructive">{highRisk}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Avg Lock-in Score</p>
          <p className="text-2xl font-bold">{avgScore}/100</p>
          <Progress value={avgScore} className="h-1.5 mt-1" />
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vendor Lock-in Risk Assessment</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead><TableHead>Tier</TableHead><TableHead>Assets</TableHead>
                <TableHead>Integration Depth</TableHead><TableHead>Lock-in Score</TableHead><TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorAnalysis.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No vendors</TableCell></TableRow>}
              {vendorAnalysis.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell><Badge variant="outline">{v.tier}</Badge></TableCell>
                  <TableCell>{v.assetCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Progress value={v.integrationDepth} className="h-1.5 w-16" />
                      <span className="text-xs">{v.integrationDepth}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${v.lockInScore > 60 ? 'text-destructive' : ''}`}>{v.lockInScore}</span>/100
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.risk === 'critical' ? 'destructive' : v.risk === 'high' ? 'destructive' : v.risk === 'moderate' ? 'secondary' : 'outline'}>
                      {v.risk === 'critical' || v.risk === 'high' ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
                      {v.risk}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <strong>Scoring:</strong> Integration Depth (40%) + Contract Value Lock (30%) + Availability of Alternatives (30%). Score 0-100.
        </CardContent>
      </Card>
    </div>
  );
}
