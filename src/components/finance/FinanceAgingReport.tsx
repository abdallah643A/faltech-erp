import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { Clock, AlertTriangle, AlertOctagon, Skull } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFinancialClearances } from '@/hooks/useFinance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface AgingBucket {
  label: string;
  min: number;
  max: number;
  color: string;
  icon: React.ReactNode;
  count: number;
  total: number;
}

export function FinanceAgingReport() {
  const { clearances } = useFinancialClearances();

  const agingData = useMemo(() => {
    const buckets: AgingBucket[] = [
      { label: '0-30 days', min: 0, max: 30, color: '#22c55e', icon: <Clock className="h-4 w-4" />, count: 0, total: 0 },
      { label: '31-60 days', min: 31, max: 60, color: '#f59e0b', icon: <AlertTriangle className="h-4 w-4" />, count: 0, total: 0 },
      { label: '61-90 days', min: 61, max: 90, color: '#f97316', icon: <AlertOctagon className="h-4 w-4" />, count: 0, total: 0 },
      { label: '90+ days', min: 91, max: Infinity, color: '#ef4444', icon: <Skull className="h-4 w-4" />, count: 0, total: 0 },
    ];

    const outstanding = clearances?.filter(c => (c.outstanding_amount || 0) > 0) || [];
    
    outstanding.forEach(c => {
      const days = differenceInDays(new Date(), new Date(c.created_at));
      const bucket = buckets.find(b => days >= b.min && days <= b.max);
      if (bucket) {
        bucket.count++;
        bucket.total += c.outstanding_amount || 0;
      }
    });

    return buckets;
  }, [clearances]);

  const totalOutstanding = agingData.reduce((sum, b) => sum + b.total, 0);
  const chartData = agingData.map(b => ({ name: b.label, amount: b.total, color: b.color }));

  const overdueItems = useMemo(() => {
    return (clearances?.filter(c => {
      const days = differenceInDays(new Date(), new Date(c.created_at));
      return (c.outstanding_amount || 0) > 0 && days > 60;
    }) || []).sort((a, b) => 
      differenceInDays(new Date(), new Date(a.created_at)) - differenceInDays(new Date(), new Date(b.created_at))
    ).reverse();
  }, [clearances]);

  return (
    <div className="space-y-6">
      {/* Aging Buckets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {agingData.map((bucket) => (
          <Card key={bucket.label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{bucket.label}</span>
                <div style={{ color: bucket.color }}>{bucket.icon}</div>
              </div>
              <p className="text-xl font-bold">SAR {bucket.total.toLocaleString()}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{bucket.count} contracts</span>
                {totalOutstanding > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {((bucket.total / totalOutstanding) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <Progress 
                value={totalOutstanding > 0 ? (bucket.total / totalOutstanding) * 100 : 0} 
                className="h-1.5 mt-2"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Aging Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `SAR ${value.toLocaleString()}`} />
                <Bar dataKey="amount" name="Outstanding" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Critical Overdue Items (60+ days) */}
      {overdueItems.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertOctagon className="h-5 w-5" />
              Critical Overdue ({'>'}60 days) — {overdueItems.length} contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Contract</th>
                    <th className="text-left py-2 px-3 font-medium">Customer</th>
                    <th className="text-right py-2 px-3 font-medium">Outstanding</th>
                    <th className="text-center py-2 px-3 font-medium">Days</th>
                    <th className="text-center py-2 px-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueItems.map((item) => {
                    const days = differenceInDays(new Date(), new Date(item.created_at));
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 font-medium">
                          {item.sales_order?.contract_number || `SO-${item.sales_order?.doc_num}`}
                        </td>
                        <td className="py-2 px-3">{item.sales_order?.customer_name}</td>
                        <td className="py-2 px-3 text-right text-red-600 font-medium">
                          SAR {item.outstanding_amount?.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">{days}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={days > 90 ? 'destructive' : 'outline'} className="text-xs">
                            {days > 90 ? 'Critical' : 'High'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
