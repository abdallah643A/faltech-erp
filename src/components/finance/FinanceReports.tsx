import { format } from 'date-fns';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText,
  Download,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFinancialClearances, usePaymentVerifications, useFinanceStats } from '@/hooks/useFinance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function FinanceReports() {
  const { clearances } = useFinancialClearances();
  const { verifications } = usePaymentVerifications();
  const stats = useFinanceStats();

  // Calculate payment status distribution
  const paymentStatusData = [
    { name: 'Verified', value: verifications?.filter(v => v.verification_status === 'verified').length || 0, color: '#22c55e' },
    { name: 'Pending', value: verifications?.filter(v => v.verification_status === 'pending').length || 0, color: '#f59e0b' },
    { name: 'Rejected', value: verifications?.filter(v => v.verification_status === 'rejected').length || 0, color: '#ef4444' },
  ];

  // Calculate clearance status distribution
  const clearanceStatusData = [
    { name: 'Approved', value: clearances?.filter(c => c.status === 'approved').length || 0, color: '#22c55e' },
    { name: 'Pending', value: clearances?.filter(c => c.status === 'pending').length || 0, color: '#f59e0b' },
    { name: 'Rejected', value: clearances?.filter(c => c.status === 'rejected').length || 0, color: '#ef4444' },
  ];

  // Calculate monthly collection data
  const getMonthlyData = () => {
    const months: Record<string, { received: number; outstanding: number }> = {};
    
    clearances?.forEach(c => {
      const month = format(new Date(c.created_at), 'MMM yyyy');
      if (!months[month]) {
        months[month] = { received: 0, outstanding: 0 };
      }
      months[month].received += c.total_received || 0;
      months[month].outstanding += c.outstanding_amount || 0;
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      received: data.received,
      outstanding: data.outstanding,
    })).slice(-6);
  };

  const monthlyData = getMonthlyData();

  const collectionRate = stats.totalContractValue > 0 
    ? ((stats.totalReceived / stats.totalContractValue) * 100).toFixed(1)
    : 0;

  const handleExportReport = () => {
    // Generate CSV report
    const headers = ['Contract', 'Customer', 'Contract Value', 'Received', 'Outstanding', 'Status'];
    const rows = clearances?.map(c => [
      c.sales_order?.contract_number || `SO-${c.sales_order?.doc_num}`,
      c.sales_order?.customer_name || '',
      c.total_contract_value || 0,
      c.total_received || 0,
      c.outstanding_amount || 0,
      c.status || 'pending'
    ]) || [];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contract Value</p>
                <p className="text-2xl font-bold">SAR {stats.totalContractValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-green-600">SAR {stats.totalReceived.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">SAR {stats.totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <PieChart className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">{collectionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Collections Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monthly Collections</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `SAR ${value.toLocaleString()}`}
                  />
                  <Legend />
                  <Bar dataKey="received" name="Received" fill="#22c55e" />
                  <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Outstanding Payments Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Contract</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-right py-3 px-4 font-medium">Contract Value</th>
                  <th className="text-right py-3 px-4 font-medium">Received</th>
                  <th className="text-right py-3 px-4 font-medium">Outstanding</th>
                  <th className="text-center py-3 px-4 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {clearances?.filter(c => (c.outstanding_amount || 0) > 0).map((clearance) => {
                  const progress = clearance.total_contract_value 
                    ? ((clearance.total_received || 0) / clearance.total_contract_value) * 100 
                    : 0;
                  return (
                    <tr key={clearance.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {clearance.sales_order?.contract_number || `SO-${clearance.sales_order?.doc_num}`}
                      </td>
                      <td className="py-3 px-4">{clearance.sales_order?.customer_name}</td>
                      <td className="py-3 px-4 text-right">
                        SAR {clearance.total_contract_value?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600">
                        SAR {clearance.total_received?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        SAR {clearance.outstanding_amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs w-12">{progress.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
