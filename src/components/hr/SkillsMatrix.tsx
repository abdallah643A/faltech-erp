import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';

interface SkillsMatrixProps {
  employees: Employee[];
}

export function SkillsMatrix({ employees }: SkillsMatrixProps) {
  const departmentSkills = useMemo(() => {
    const deptMap: Record<string, { name: string; total: number; withPosition: number; avgTenure: number }> = {};

    employees.forEach(e => {
      const dept = e.department?.name || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, withPosition: 0, avgTenure: 0 };
      deptMap[dept].total++;
      if (e.position_id) deptMap[dept].withPosition++;
      
      if (e.hire_date) {
        const years = (Date.now() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        deptMap[dept].avgTenure += years;
      }
    });

    return Object.values(deptMap).map(d => ({
      ...d,
      avgTenure: d.total > 0 ? d.avgTenure / d.total : 0,
      positionCoverage: d.total > 0 ? Math.round((d.withPosition / d.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [employees]);

  // Experience distribution
  const experienceDistribution = useMemo(() => {
    const buckets = { '<1 yr': 0, '1-3 yrs': 0, '3-5 yrs': 0, '5-10 yrs': 0, '10+ yrs': 0 };
    employees.forEach(e => {
      if (!e.hire_date) return;
      const years = (Date.now() - new Date(e.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 1) buckets['<1 yr']++;
      else if (years < 3) buckets['1-3 yrs']++;
      else if (years < 5) buckets['3-5 yrs']++;
      else if (years < 10) buckets['5-10 yrs']++;
      else buckets['10+ yrs']++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count, pct: employees.length > 0 ? Math.round((count / employees.length) * 100) : 0 }));
  }, [employees]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Department Skills Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {departmentSkills.map(dept => (
            <div key={dept.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{dept.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{dept.total} staff</span>
                  {dept.positionCoverage < 50 && <AlertCircle className="h-3 w-3 text-warning" />}
                </div>
              </div>
              <Progress value={dept.positionCoverage} className="h-1.5" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Position coverage: {dept.positionCoverage}%</span>
                <span>Avg tenure: {dept.avgTenure.toFixed(1)} yrs</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Experience Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {experienceDistribution.map(({ range, count, pct }) => (
            <div key={range} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{range}</span>
                <span className="text-xs">{count} ({pct}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
