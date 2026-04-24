import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBidManagement } from '@/hooks/useBidManagement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

export default function BidAnalytics() {
  const { bids, bidStats } = useBidManagement();
  const allBids = bids.data || [];
  const stats = bidStats();

  // Status distribution
  const statusData = ['draft', 'qualifying', 'in_progress', 'under_review', 'submitted', 'won', 'lost'].map(status => ({
    name: status.replace('_', ' '),
    count: allBids.filter(b => b.status === status).length,
    value: allBids.filter(b => b.status === status).reduce((s, b) => s + (b.estimated_value || 0), 0),
  })).filter(d => d.count > 0);

  // Project type breakdown
  const typeData = [...new Set(allBids.map(b => b.project_type).filter(Boolean))].map(type => ({
    name: type,
    total: allBids.filter(b => b.project_type === type).length,
    won: allBids.filter(b => b.project_type === type && b.status === 'won').length,
    lost: allBids.filter(b => b.project_type === type && b.status === 'lost').length,
  }));

  // Win/Loss reasons
  const lossReasons: Record<string, number> = {};
  allBids.filter(b => b.status === 'lost' && b.win_loss_tags).forEach(b => {
    (b.win_loss_tags || []).forEach(tag => {
      lossReasons[tag] = (lossReasons[tag] || 0) + 1;
    });
  });
  const lossReasonData = Object.entries(lossReasons).map(([name, value]) => ({ name, value }));

  // Monthly trend
  const monthlyData: Record<string, { month: string; submitted: number; won: number; lost: number }> = {};
  allBids.forEach(b => {
    const month = b.created_at.slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { month, submitted: 0, won: 0, lost: 0 };
    if (b.status === 'submitted' || b.status === 'won' || b.status === 'lost') monthlyData[month].submitted++;
    if (b.status === 'won') monthlyData[month].won++;
    if (b.status === 'lost') monthlyData[month].lost++;
  });
  const trendData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Win/Loss Summary */}
      <Card>
        <CardHeader><CardTitle>Win/Loss Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-2xl font-bold text-green-600">{stats.wonBids}</p>
              <p className="text-xs text-green-700">Won</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
              <p className="text-2xl font-bold text-red-600">{stats.lostBids}</p>
              <p className="text-xs text-red-700">Lost</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-600">{stats.winRate.toFixed(1)}%</p>
              <p className="text-xs text-blue-700">Win Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader><CardTitle>Pipeline by Status</CardTitle></CardHeader>
        <CardContent>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">No data yet</div>
          )}
        </CardContent>
      </Card>

      {/* By Project Type */}
      <Card>
        <CardHeader><CardTitle>Performance by Project Type</CardTitle></CardHeader>
        <CardContent>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="won" fill="#22c55e" name="Won" />
                <Bar dataKey="lost" fill="#ef4444" name="Lost" />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">No data yet</div>
          )}
        </CardContent>
      </Card>

      {/* Loss Reasons */}
      <Card>
        <CardHeader><CardTitle>Loss Reasons</CardTitle></CardHeader>
        <CardContent>
          {lossReasonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lossReasonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">No loss data yet. Tag reasons when bids are lost.</div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Monthly Bid Trend</CardTitle></CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="submitted" stroke="hsl(var(--primary))" name="Submitted" />
                <Line type="monotone" dataKey="won" stroke="#22c55e" name="Won" />
                <Line type="monotone" dataKey="lost" stroke="#ef4444" name="Lost" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">No trend data yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
