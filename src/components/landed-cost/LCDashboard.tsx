import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, CheckCircle, AlertTriangle, TrendingUp, Package, RotateCcw, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0066cc', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface Props {
  documents: any[];
}

export function LCDashboard({ documents }: Props) {
  const docs = documents || [];
  const posted = docs.filter(d => d.is_posted);
  const reversed = docs.filter(d => d.is_reversed);
  const pending = docs.filter(d => d.approval_status === 'pending' || d.approval_status === 'submitted');
  const drafts = docs.filter(d => d.status === 'draft');

  const totalCharges = docs.reduce((s, d) => s + (Number(d.total_charges) || 0), 0);
  const totalCapitalized = docs.reduce((s, d) => s + (Number(d.total_capitalized) || 0), 0);
  const totalBase = docs.reduce((s, d) => s + (Number(d.total_base_cost) || 0), 0);
  const avgPct = totalBase > 0 ? (totalCharges / totalBase * 100) : 0;
  const totalRecovTax = docs.reduce((s, d) => s + (Number(d.total_recoverable_tax) || 0), 0);
  const totalNonRecovTax = docs.reduce((s, d) => s + (Number(d.total_non_recoverable_tax) || 0), 0);

  const kpis = [
    { label: 'Total Charges', value: totalCharges.toLocaleString('en', { minimumFractionDigits: 2 }), icon: DollarSign, color: 'text-blue-600' },
    { label: 'Capitalized', value: totalCapitalized.toLocaleString('en', { minimumFractionDigits: 2 }), icon: TrendingUp, color: 'text-green-600' },
    { label: 'Avg LC %', value: avgPct.toFixed(1) + '%', icon: Package, color: 'text-amber-600' },
    { label: 'Pending Approval', value: pending.length.toString(), icon: Clock, color: 'text-orange-600' },
    { label: 'Posted', value: posted.length.toString(), icon: CheckCircle, color: 'text-green-600' },
    { label: 'Reversed', value: reversed.length.toString(), icon: RotateCcw, color: 'text-red-600' },
    { label: 'Draft', value: drafts.length.toString(), icon: FileText, color: 'text-muted-foreground' },
    { label: 'Total Documents', value: docs.length.toString(), icon: FileText, color: 'text-primary' },
  ];

  // Charts data
  const typeData = ['import_shipment', 'local_procurement', 'inter_branch', 'project_material'].map(t => ({
    name: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: docs.filter(d => d.lc_type === t).length,
  })).filter(d => d.value > 0);

  const statusData = ['draft', 'submitted', 'approved', 'posted', 'reversed', 'cancelled'].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    count: docs.filter(d => d.status === s).length,
  })).filter(d => d.count > 0);

  const taxData = [
    { name: 'Recoverable', value: totalRecovTax },
    { name: 'Non-Recoverable', value: totalNonRecovTax },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <p className="text-lg font-bold text-foreground">{k.value}</p>
                </div>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs">By Status</CardTitle></CardHeader>
          <CardContent className="p-2 h-48">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0066cc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center pt-16">No data</p>}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs">By Type</CardTitle></CardHeader>
          <CardContent className="p-2 h-48">
            {typeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center pt-16">No data</p>}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs">Tax Split</CardTitle></CardHeader>
          <CardContent className="p-2 h-48">
            {taxData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taxData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(0)}`}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground text-center pt-16">No data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
