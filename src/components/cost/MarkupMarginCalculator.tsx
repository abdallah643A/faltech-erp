import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, DollarSign } from 'lucide-react';

export function MarkupMarginCalculator() {
  const [strategy, setStrategy] = useState('cost_plus');
  const [baseCost, setBaseCost] = useState('100000');
  const [markupPct, setMarkupPct] = useState('25');
  const [targetMargin, setTargetMargin] = useState('20');
  const [competitorPrice, setCompetitorPrice] = useState('130000');

  const cost = Number(baseCost) || 0;
  const markup = Number(markupPct) || 0;
  const margin = Number(targetMargin) || 0;

  // Cost-plus calculation
  const costPlusPrice = cost * (1 + markup / 100);
  const costPlusMargin = costPlusPrice > 0 ? ((costPlusPrice - cost) / costPlusPrice * 100) : 0;
  const costPlusProfit = costPlusPrice - cost;

  // Target-margin calculation
  const targetPrice = margin > 0 ? cost / (1 - margin / 100) : 0;
  const targetMarkup = cost > 0 ? ((targetPrice - cost) / cost * 100) : 0;
  const targetProfit = targetPrice - cost;

  // Competitive pricing
  const comp = Number(competitorPrice) || 0;
  const competitiveMargin = comp > 0 ? ((comp - cost) / comp * 100) : 0;
  const competitiveMarkup = cost > 0 ? ((comp - cost) / cost * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Markup & Margin Calculator</h3>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Base Cost (SAR)</Label>
              <Input type="number" value={baseCost} onChange={e => setBaseCost(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Markup %</Label>
              <Input type="number" value={markupPct} onChange={e => setMarkupPct(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Target Margin %</Label>
              <Input type="number" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Competitor Price</Label>
              <Input type="number" value={competitorPrice} onChange={e => setCompetitorPrice(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost_plus">Cost-Plus</SelectItem>
                  <SelectItem value="target_margin">Target Margin</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                  <SelectItem value="value_based">Value-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cost-Plus */}
        <Card className={strategy === 'cost_plus' ? 'border-primary ring-1 ring-primary/20' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Cost-Plus Pricing
              {strategy === 'cost_plus' && <Badge className="text-[10px]">Selected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base Cost</span><span>{cost.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Markup ({markup}%)</span><span>+{(cost * markup / 100).toLocaleString()}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-medium">Selling Price</span><span className="font-bold text-primary">{costPlusPrice.toLocaleString()} SAR</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Margin</span><span>{costPlusMargin.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Profit</span><span className="text-emerald-600 font-medium">{costPlusProfit.toLocaleString()}</span></div>
          </CardContent>
        </Card>

        {/* Target Margin */}
        <Card className={strategy === 'target_margin' ? 'border-primary ring-1 ring-primary/20' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Target Margin Pricing
              {strategy === 'target_margin' && <Badge className="text-[10px]">Selected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base Cost</span><span>{cost.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Required Markup</span><span>{targetMarkup.toFixed(1)}%</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-medium">Selling Price</span><span className="font-bold text-primary">{Math.round(targetPrice).toLocaleString()} SAR</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Margin</span><span>{margin}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Profit</span><span className="text-emerald-600 font-medium">{Math.round(targetProfit).toLocaleString()}</span></div>
          </CardContent>
        </Card>

        {/* Competitive */}
        <Card className={strategy === 'competitive' ? 'border-primary ring-1 ring-primary/20' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Competitive Pricing
              {strategy === 'competitive' && <Badge className="text-[10px]">Selected</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Base Cost</span><span>{cost.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Competitor Price</span><span>{comp.toLocaleString()}</span></div>
            <div className="border-t pt-2 flex justify-between"><span className="font-medium">Match Price</span><span className="font-bold text-primary">{comp.toLocaleString()} SAR</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Your Margin</span><span>{competitiveMargin.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Your Markup</span><span>{competitiveMarkup.toFixed(1)}%</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
