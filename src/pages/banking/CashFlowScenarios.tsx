import { useState, useMemo } from 'react';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, GitBranch, Play, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { addDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScenarioTx {
  id: string;
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  dayOffset: number;
}

interface Scenario {
  id: string;
  name: string;
  color: string;
  transactions: ScenarioTx[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(210, 70%, 55%)', 'hsl(30, 90%, 55%)', 'hsl(150, 60%, 45%)'];

export default function CashFlowScenarios() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompany();
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'base', name: 'Base Case', color: COLORS[0], transactions: [] },
  ]);
  const [activeId, setActiveId] = useState('base');
  const [savedScenarios, setSavedScenarios] = useState<Scenario[][]>([]);
  const baseBalance = 250000;

  const activeScenario = scenarios.find(s => s.id === activeId)!;

  const addScenario = () => {
    const id = `s-${Date.now()}`;
    setScenarios([...scenarios, {
      id, name: `Scenario ${scenarios.length + 1}`, color: COLORS[scenarios.length % COLORS.length], transactions: [],
    }]);
    setActiveId(id);
  };

  const removeScenario = (id: string) => {
    if (id === 'base') return;
    setScenarios(scenarios.filter(s => s.id !== id));
    if (activeId === id) setActiveId('base');
  };

  const addTransaction = () => {
    const tx: ScenarioTx = { id: `tx-${Date.now()}`, description: '', amount: 0, type: 'inflow', dayOffset: 1 };
    setScenarios(scenarios.map(s => s.id === activeId ? { ...s, transactions: [...s.transactions, tx] } : s));
  };

  const updateTx = (txId: string, field: string, value: any) => {
    setScenarios(scenarios.map(s => s.id === activeId ? {
      ...s, transactions: s.transactions.map(tx => tx.id === txId ? { ...tx, [field]: value } : tx),
    } : s));
  };

  const removeTx = (txId: string) => {
    setScenarios(scenarios.map(s => s.id === activeId ? {
      ...s, transactions: s.transactions.filter(tx => tx.id !== txId),
    } : s));
  };

  const fmt = (v: number) => new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(v);

  // Generate chart data for all scenarios
  const chartData = useMemo(() => {
    const today = new Date();
    const days = 30;
    const data: any[] = [];

    for (let i = 0; i <= days; i++) {
      const point: any = { day: format(addDays(today, i), 'MMM dd') };
      scenarios.forEach(sc => {
        let balance = baseBalance;
        for (let j = 0; j <= i; j++) {
          sc.transactions.forEach(tx => {
            if (tx.dayOffset === j) {
              balance += tx.type === 'inflow' ? tx.amount : -tx.amount;
            }
          });
        }
        point[sc.name] = balance;
      });
      data.push(point);
    }
    return data;
  }, [scenarios, baseBalance]);

  const saveComparison = () => {
    setSavedScenarios([...savedScenarios, [...scenarios]]);
    toast({ title: 'Scenario saved', description: `${scenarios.length} scenarios saved for comparison` });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scenario Planning</h1>
          <p className="text-sm text-muted-foreground">Run what-if analysis on cash flow projections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addScenario}>
            <Plus className="h-3 w-3 mr-1" /> Add Scenario
          </Button>
          <Button size="sm" onClick={saveComparison}>
            <Save className="h-3 w-3 mr-1" /> Save & Compare
          </Button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2 flex-wrap">
        {scenarios.map(sc => (
          <div key={sc.id} className="flex items-center gap-1">
            <Button
              variant={activeId === sc.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveId(sc.id)}
              className="text-xs"
            >
              <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: sc.color }} />
              {sc.name}
            </Button>
            {sc.id !== 'base' && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeScenario(sc.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Editor */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                <GitBranch className="h-4 w-4 inline mr-1" />
                {activeScenario.name} — Hypothetical Transactions
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addTransaction}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Scenario Name:</Label>
              <Input
                value={activeScenario.name}
                onChange={e => setScenarios(scenarios.map(s => s.id === activeId ? { ...s, name: e.target.value } : s))}
                className="h-7 text-xs"
              />
            </div>

            {activeScenario.transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No hypothetical transactions. Add one to see the impact.</p>
            )}

            {activeScenario.transactions.map(tx => (
              <div key={tx.id} className="border rounded-lg p-3 space-y-2">
                <Input placeholder="Description" value={tx.description} onChange={e => updateTx(tx.id, 'description', e.target.value)} className="h-7 text-xs" />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={tx.type} onValueChange={v => updateTx(tx.id, 'type', v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflow">Inflow</SelectItem>
                      <SelectItem value="outflow">Outflow</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Amount" value={tx.amount || ''} onChange={e => updateTx(tx.id, 'amount', Number(e.target.value))} className="h-7 text-xs" />
                  <div className="flex items-center gap-1">
                    <Input type="number" min={0} max={30} value={tx.dayOffset} onChange={e => updateTx(tx.id, 'dayOffset', Number(e.target.value))} className="h-7 text-xs" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">day</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => removeTx(tx.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Comparison Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">30-Day Scenario Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `SAR ${fmt(v)}`} />
                <Legend />
                {scenarios.map(sc => (
                  <Line key={sc.id} type="monotone" dataKey={sc.name} stroke={sc.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map(sc => {
          const finalBalance = chartData[chartData.length - 1]?.[sc.name] || baseBalance;
          const minBal = Math.min(...chartData.map(d => d[sc.name] || baseBalance));
          const variance = finalBalance - baseBalance;
          return (
            <Card key={sc.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sc.color }} />
                  <span className="text-sm font-semibold">{sc.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">End Balance</p>
                    <p className="font-bold">SAR {fmt(finalBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min Balance</p>
                    <p className="font-bold">{fmt(minBal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance</p>
                    <p className={`font-bold ${variance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {variance >= 0 ? '+' : ''}{fmt(variance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Saved Comparisons */}
      {savedScenarios.length > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saved Comparisons ({savedScenarios.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedScenarios.map((saved, i) => (
                <div key={i} className="flex items-center justify-between border rounded p-3">
                  <span className="text-sm">Comparison #{i + 1} — {saved.length} scenarios</span>
                  <div className="flex gap-1">
                    {saved.map(s => (
                      <Badge key={s.id} variant="outline" className="text-[10px]">{s.name}</Badge>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setScenarios(saved); setActiveId(saved[0].id); }}>
                    <Eye className="h-3 w-3 mr-1" /> Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
