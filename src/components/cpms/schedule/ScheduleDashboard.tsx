import { useState, useMemo } from 'react';
import { ScheduleActivity } from '@/hooks/useProjectSchedule';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck, Clock, AlertTriangle, CheckCircle, Diamond, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import type { ScheduleStats } from '@/hooks/useProjectSchedule';

interface Props {
  stats: ScheduleStats;
  totalActivities: number;
}

export default function ScheduleDashboard({ stats, totalActivities }: Props) {
  const cards = [
    { label: 'Total Duration', value: `${stats.totalDuration} days`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Planned Completion', value: stats.plannedEnd || '-', icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Overall Progress', value: `${stats.overallProgress}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', progress: stats.overallProgress },
    { label: 'Delayed Tasks', value: String(stats.delayedCount), icon: AlertTriangle, color: 'text-destructive', bg: 'bg-red-50' },
    { label: 'Completed', value: String(stats.completedCount), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Milestones Ahead', value: String(stats.upcomingMilestones.length), icon: Diamond, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Baseline Variance', value: `${stats.baselineVariance > 0 ? '+' : ''}${stats.baselineVariance} days`, icon: stats.baselineVariance > 0 ? TrendingDown : TrendingUp, color: stats.baselineVariance > 0 ? 'text-destructive' : 'text-green-600', bg: stats.baselineVariance > 0 ? 'bg-red-50' : 'bg-green-50' },
    { label: 'Total Activities', value: String(totalActivities), icon: Calendar, color: 'text-primary', bg: 'bg-primary/5' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(c => (
        <Card key={c.label} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded ${c.bg}`}>
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
            </div>
            <p className="text-lg font-bold">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            {c.progress !== undefined && <Progress value={c.progress} className="h-1.5 mt-1" />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
