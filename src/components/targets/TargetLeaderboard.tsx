import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, Flame, Star, Zap, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SalesTarget } from '@/hooks/useTargets';

interface TargetLeaderboardProps {
  targets: SalesTarget[];
}

const rankTitles = ['🥇 Champion', '🥈 Runner-up', '🥉 Rising Star'];
const streakEmojis = ['🔥', '⚡', '💪', '🚀', '⭐'];

export function TargetLeaderboard({ targets }: TargetLeaderboardProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Aggregate by sales employee / user
  const userMap = new Map<string, { salesActual: number; salesTarget: number; collActual: number; collTarget: number; periods: number }>();
  targets.forEach(t => {
    const key = t.sales_employee_name || t.user_name;
    const existing = userMap.get(key) || { salesActual: 0, salesTarget: 0, collActual: 0, collTarget: 0, periods: 0 };
    existing.salesActual += Number(t.sales_actual);
    existing.salesTarget += Number(t.sales_target);
    existing.collActual += Number(t.collection_actual);
    existing.collTarget += Number(t.collection_target);
    existing.periods += 1;
    userMap.set(key, existing);
  });

  const leaderboard = Array.from(userMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
      salesPct: data.salesTarget > 0 ? (data.salesActual / data.salesTarget) * 100 : 0,
      collPct: data.collTarget > 0 ? (data.collActual / data.collTarget) * 100 : 0,
      overallPct: (data.salesTarget + data.collTarget) > 0
        ? ((data.salesActual + data.collActual) / (data.salesTarget + data.collTarget)) * 100
        : 0,
    }))
    .sort((a, b) => b.salesPct - a.salesPct);

  const icons = [Trophy, Medal, Award];
  const iconColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  if (leaderboard.length === 0) return null;

  // Gamification badges
  const getBadges = (user: typeof leaderboard[0], rank: number) => {
    const badges: { icon: React.ElementType; label: string; color: string }[] = [];
    if (user.salesPct >= 120) badges.push({ icon: Flame, label: 'On Fire', color: 'text-orange-500' });
    if (user.salesPct >= 100) badges.push({ icon: Star, label: 'Target Hit', color: 'text-yellow-500' });
    if (user.collPct >= 100) badges.push({ icon: Zap, label: 'Collector', color: 'text-blue-500' });
    if (rank === 0) badges.push({ icon: TrendingUp, label: 'Top Performer', color: 'text-success' });
    return badges;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {isAr ? 'قائمة المتصدرين' : 'Leaderboard'}
          {leaderboard.length > 0 && leaderboard[0].salesPct >= 100 && (
            <Badge className="bg-yellow-500/10 text-yellow-600 text-xs ml-2">
              🎉 {isAr ? 'هدف محقق!' : 'Target Achieved!'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((user, i) => {
            const Icon = icons[i] || Award;
            const badges = getBadges(user, i);
            const progressColor = user.salesPct >= 100 ? 'bg-success' : user.salesPct >= 75 ? 'bg-warning' : 'bg-destructive';
            return (
              <div key={user.name} className={`p-3 rounded-lg ${i === 0 ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full ${i === 0 ? 'bg-yellow-500/10' : 'bg-background'}`}>
                    <Icon className={`h-5 w-5 ${iconColors[i] || 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      {i < 3 && (
                        <span className="text-xs text-muted-foreground">{rankTitles[i]}</span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{isAr ? 'مبيعات' : 'Sales'}: {user.salesActual.toLocaleString()} / {user.salesTarget.toLocaleString()}</span>
                      <span>{isAr ? 'تحصيل' : 'Coll'}: {user.collActual.toLocaleString()} / {user.collTarget.toLocaleString()}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${progressColor} rounded-full transition-all`} style={{ width: `${Math.min(user.salesPct, 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold min-w-[40px] text-right">{user.salesPct.toFixed(0)}%</span>
                    </div>
                    {/* Gamification Badges */}
                    {badges.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {badges.map((b, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                            <b.icon className={`h-3 w-3 ${b.color}`} />
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={user.salesPct >= 100 ? 'default' : user.salesPct >= 75 ? 'secondary' : 'destructive'} className="text-xs">
                      {user.salesPct.toFixed(0)}%
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{isAr ? 'تحصيل' : 'Coll'} {user.collPct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
