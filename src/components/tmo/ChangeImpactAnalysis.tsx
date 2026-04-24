import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ArrowRight, Cpu, Users, Link2 } from 'lucide-react';

interface Props {
  techAssets: any[];
  vendors: any[];
}

export function ChangeImpactAnalysis({ techAssets, vendors }: Props) {
  const [selectedAsset, setSelectedAsset] = useState('');

  const asset = techAssets.find(a => a.id === selectedAsset);

  // Simulate downstream dependencies
  const dependentAssets = selectedAsset
    ? techAssets.filter(a => a.id !== selectedAsset && a.category === asset?.category).slice(0, 4)
    : [];

  const relatedVendors = selectedAsset
    ? vendors.filter(v => v.category === asset?.category || v.name === asset?.vendor).slice(0, 3)
    : [];

  const impactAreas = selectedAsset ? [
    { area: 'Integration Points', count: (asset?.integration_points || []).length, severity: 'high' },
    { area: 'Dependent Systems', count: dependentAssets.length, severity: dependentAssets.length > 2 ? 'high' : 'medium' },
    { area: 'Vendor Contracts', count: relatedVendors.length, severity: relatedVendors.length > 0 ? 'medium' : 'low' },
    { area: 'Teams Affected', count: Math.max(1, Math.ceil(dependentAssets.length * 1.5)), severity: 'medium' },
    { area: 'Data Migration', count: asset?.deployment_type === 'on_premise' ? 1 : 0, severity: asset?.deployment_type === 'on_premise' ? 'high' : 'low' },
  ] : [];

  const overallRisk = impactAreas.filter(i => i.severity === 'high').length >= 2 ? 'High' :
    impactAreas.some(i => i.severity === 'high') ? 'Medium' : 'Low';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Change Impact Analysis</h3>
        <Select value={selectedAsset} onValueChange={setSelectedAsset}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select asset to analyze..." /></SelectTrigger>
          <SelectContent>
            {techAssets.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedAsset && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Select a technology asset above to see the impact of retiring or replacing it.
        </CardContent></Card>
      )}

      {selectedAsset && asset && (
        <>
          {/* Asset Summary */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg">{asset.name}</h4>
                  <p className="text-sm text-muted-foreground">{asset.category} · {asset.lifecycle_status} · {asset.deployment_type}</p>
                </div>
                <Badge variant={overallRisk === 'High' ? 'destructive' : overallRisk === 'Medium' ? 'secondary' : 'outline'} className="text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Overall Risk: {overallRisk}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Impact Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {impactAreas.map(ia => (
              <Card key={ia.area} className={ia.severity === 'high' ? 'border-destructive/30' : ''}>
                <CardContent className="pt-3 pb-2 px-3 text-center">
                  <p className="text-xs text-muted-foreground">{ia.area}</p>
                  <p className={`text-xl font-bold ${ia.severity === 'high' ? 'text-destructive' : ''}`}>{ia.count}</p>
                  <Badge variant={ia.severity === 'high' ? 'destructive' : ia.severity === 'medium' ? 'secondary' : 'outline'} className="text-[10px]">{ia.severity}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dependency Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><Cpu className="h-4 w-4" /> Dependent Systems</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {dependentAssets.length === 0 && <p className="text-xs text-muted-foreground">No dependencies detected</p>}
                {dependentAssets.map(da => (
                  <div key={da.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{da.name}</p>
                      <p className="text-xs text-muted-foreground">{da.lifecycle_status}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><Link2 className="h-4 w-4" /> Integration Points</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(asset.integration_points || []).length === 0 && <p className="text-xs text-muted-foreground">No integration points defined</p>}
                {(asset.integration_points || []).map((ip: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <Badge variant="outline" className="text-xs">{ip}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><Users className="h-4 w-4" /> Affected Vendors</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {relatedVendors.length === 0 && <p className="text-xs text-muted-foreground">No vendor impact</p>}
                {relatedVendors.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.tier} tier</p>
                    </div>
                    <Badge variant="outline">{v.contract_value?.toLocaleString()} SAR</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-3 text-sm">
              <strong>Recommendation:</strong>{' '}
              {overallRisk === 'High'
                ? 'This asset has significant dependencies. A phased migration plan with parallel running is recommended. Estimated transition period: 3-6 months.'
                : overallRisk === 'Medium'
                ? 'Moderate impact expected. Plan a structured cutover with rollback capability. Estimated transition: 1-3 months.'
                : 'Low impact change. Can be executed with standard change management process.'}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
