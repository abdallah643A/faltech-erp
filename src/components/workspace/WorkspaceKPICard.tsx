import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { buildFilteredHref } from '@/hooks/useUrlFilters';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  href?: string;
  /**
   * Optional filter map appended as query string to `href`, enabling
   * "drill from KPI to filtered list view in ≤2 clicks".
   * Example: { status: 'overdue', aging: '60+' }
   */
  filter?: Record<string, string | number | null | undefined>;
  trend?: { value: number; label: string };
}

export function WorkspaceKPICard({ title, value, icon: Icon, color, href, filter, trend }: Props) {
  const navigate = useNavigate();
  const target = href ? buildFilteredHref(href, filter) : undefined;
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => target && navigate(target)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
            {trend && (
              <p className={`text-[10px] ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
