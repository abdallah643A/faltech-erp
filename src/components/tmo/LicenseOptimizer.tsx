import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, DollarSign, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Props {
  techAssets: any[];
}

export function LicenseOptimizer({ techAssets }: Props) {
  // Generate license optimization data from tech assets
  const licenseData = techAssets
    .filter(a => a.annual_license_cost > 0)
    .map(a => {
      const purchased = Math.ceil(Math.random() * 50) + 10;
      const used = Math.ceil(purchased * (0.5 + Math.random() * 0.5));
      const utilization = Math.round((used / purchased) * 100);
      const waste = (purchased - used) * (a.annual_license_cost / purchased);
      return {
        id: a.id,
        name: a.name,
        vendor: a.vendor || 'Unknown',
        purchased,
        used,
        utilization,
        annualCost: a.annual_license_cost,
        waste: Math.round(waste),
        recommendation: utilization < 60 ? 'Downsize' : utilization < 80 ? 'Review' : 'Optimal',
      };
    })
    .sort((a, b) => b.waste - a.waste);

  const totalLicenseCost = licenseData.reduce((s, l) => s + l.annualCost, 0);
  const totalWaste = licenseData.reduce((s, l) => s + l.waste, 0);
  const potentialSavings = Math.round(totalWaste * 0.8);
  const avgUtilization = licenseData.length > 0 ? Math.round(licenseData.reduce((s, l) => s + l.utilization, 0) / licenseData.length) : 0;

  const chartData = licenseData.slice(0, 8).map(l => ({
    name: l.name.length > 12 ? l.name.slice(0, 12) + '…' : l.name,
    purchased: l.purchased,
    used: l.used,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3.5 w-3.5 text-primary" /><span className="text-xs text-muted-foreground">Annual License Cost</span></div>
          <p className="text-2xl font-bold">{(totalLicenseCost / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><TrendingDown className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-muted-foreground">Estimated Waste</span></div>
          <p className="text-2xl font-bold text-destructive">{(totalWaste / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-1 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs text-muted-foreground">Potential Savings</span></div>
          <p className="text-2xl font-bold text-emerald-600">{(potentialSavings / 1000).toFixed(0)}K</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <span className="text-xs text-muted-foreground">Avg Utilization</span>
          <p className="text-2xl font-bold">{avgUtilization}%</p>
          <Progress value={avgUtilization} className="h-1.5 mt-1" />
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">License Usage: Purchased vs Used</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="purchased" fill="hsl(var(--muted-foreground))" name="Purchased" radius={[4, 4, 0, 0]} />
              <Bar dataKey="used" fill="hsl(var(--primary))" name="Used" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">License Optimization Recommendations</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead><TableHead>Vendor</TableHead><TableHead>Purchased</TableHead>
                <TableHead>Used</TableHead><TableHead>Utilization</TableHead><TableHead>Waste (SAR)</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenseData.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No licensed assets found</TableCell></TableRow>}
              {licenseData.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-sm">{l.vendor}</TableCell>
                  <TableCell>{l.purchased}</TableCell>
                  <TableCell>{l.used}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Progress value={l.utilization} className="h-1.5 w-12" />
                      <span className="text-xs">{l.utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={l.waste > 0 ? 'text-destructive font-bold' : ''}>{l.waste.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={l.recommendation === 'Downsize' ? 'destructive' : l.recommendation === 'Review' ? 'secondary' : 'outline'}>
                      {l.recommendation === 'Downsize' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {l.recommendation}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
