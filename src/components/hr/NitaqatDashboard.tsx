import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Shield, TrendingUp, Users } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';

interface NitaqatDashboardProps {
  employees: Employee[];
}

// Nitaqat color bands based on Saudization percentage
function getNitaqatBand(ratio: number, totalEmployees: number) {
  // Simplified bands for small/medium enterprises
  if (totalEmployees < 10) {
    return { band: 'Exempt', color: 'bg-gray-500', textColor: 'text-gray-700', description: 'Micro enterprise - exempt from Nitaqat' };
  }
  if (ratio >= 0.40) return { band: 'Platinum', color: 'bg-emerald-600', textColor: 'text-emerald-700', description: 'Highest compliance level' };
  if (ratio >= 0.27) return { band: 'Green (High)', color: 'bg-green-500', textColor: 'text-green-700', description: 'Above minimum requirement' };
  if (ratio >= 0.20) return { band: 'Green (Low)', color: 'bg-lime-500', textColor: 'text-lime-700', description: 'Meeting minimum requirement' };
  if (ratio >= 0.10) return { band: 'Yellow', color: 'bg-yellow-500', textColor: 'text-yellow-700', description: 'Below target - action needed' };
  return { band: 'Red', color: 'bg-red-600', textColor: 'text-red-700', description: 'Critical - immediate action required' };
}

export function NitaqatDashboard({ employees }: NitaqatDashboardProps) {
  const activeEmployees = employees.filter(e => e.employment_status === 'active');
  const saudiEmployees = activeEmployees.filter(e => {
    const nat = (e.nationality || '').toLowerCase();
    return nat === 'saudi' || nat === 'سعودي' || nat === 'saudi arabian';
  });
  const nonSaudiEmployees = activeEmployees.filter(e => !saudiEmployees.includes(e));
  
  const totalCount = activeEmployees.length;
  const saudiCount = saudiEmployees.length;
  const nonSaudiCount = nonSaudiEmployees.length;
  const saudiRatio = totalCount > 0 ? saudiCount / totalCount : 0;
  const band = getNitaqatBand(saudiRatio, totalCount);

  // Department breakdown
  const deptMap = new Map<string, { total: number; saudi: number }>();
  activeEmployees.forEach(emp => {
    const dept = emp.department?.name || 'Unassigned';
    const entry = deptMap.get(dept) || { total: 0, saudi: 0 };
    entry.total++;
    if (saudiEmployees.includes(emp)) entry.saudi++;
    deptMap.set(dept, entry);
  });

  const deptBreakdown = Array.from(deptMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
      ratio: data.total > 0 ? (data.saudi / data.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // How many more Saudis needed for next band
  const targetRatios = [0.20, 0.27, 0.40];
  const nextTarget = targetRatios.find(t => t > saudiRatio);
  const saudisNeeded = nextTarget && totalCount > 0
    ? Math.ceil(nextTarget * totalCount) - saudiCount
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm">Nitaqat Saudization Dashboard / لوحة نطاقات</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Nitaqat Band Display */}
        <div className={`rounded-xl p-4 border-2 ${band.band === 'Red' ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : band.band.includes('Yellow') ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30' : 'border-green-400 bg-green-50 dark:bg-green-950/30'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Nitaqat Band</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-4 h-4 rounded-full ${band.color}`} />
                <span className="text-xl font-bold">{band.band}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{band.description}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{(saudiRatio * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Saudization Rate</p>
            </div>
          </div>
          <Progress value={saudiRatio * 100} className="h-3" />
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className="text-red-500">10%</span>
            <span className="text-yellow-500">20%</span>
            <span className="text-green-500">27%</span>
            <span className="text-emerald-500">40%+</span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{totalCount}</p>
            <p className="text-[10px] text-muted-foreground">Total Active</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-600">🇸🇦 {saudiCount}</p>
            <p className="text-[10px] text-muted-foreground">Saudi Employees</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-blue-600">🌍 {nonSaudiCount}</p>
            <p className="text-[10px] text-muted-foreground">Non-Saudi</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            {saudisNeeded > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 mx-auto text-orange-500 mb-1" />
                <p className="text-lg font-bold text-orange-600">+{saudisNeeded}</p>
                <p className="text-[10px] text-muted-foreground">Saudis for next band</p>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mx-auto text-green-500 mb-1" />
                <p className="text-lg font-bold text-green-600">✓</p>
                <p className="text-[10px] text-muted-foreground">Top band reached</p>
              </>
            )}
          </div>
        </div>

        {/* Department breakdown */}
        {deptBreakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">By Department</p>
            {deptBreakdown.map(dept => (
              <div key={dept.name} className="flex items-center gap-3">
                <span className="text-xs w-28 truncate">{dept.name}</span>
                <div className="flex-1">
                  <Progress value={dept.ratio} className="h-2" />
                </div>
                <span className="text-xs font-mono w-16 text-right">
                  {dept.saudi}/{dept.total} ({dept.ratio.toFixed(0)}%)
                </span>
                {dept.ratio < 20 && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {(band.band === 'Red' || band.band.includes('Yellow')) && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Nitaqat Warning</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Saudization ratio is below the recommended level. Consider hiring {saudisNeeded} more Saudi employees
              to move to the next band. Being in {band.band} band may restrict visa issuance and other HRDF services.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
