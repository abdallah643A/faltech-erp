import { useState } from 'react';
import { useRestaurantRecipes } from '@/hooks/useRestaurantPhase2';
import { useRestaurantMenuItems } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, BookOpen, DollarSign, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';

export default function RestaurantRecipes() {
  const { data: recipes, create: createRecipe } = useRestaurantRecipes();
  const { data: menuItems } = useRestaurantMenuItems();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ recipe_name: '', menu_item_id: '', yield_quantity: '1', yield_unit: 'portion' });
  const [lines, setLines] = useState<any[]>([]);

  const filtered = (recipes || []).filter((r: any) => {
    const q = search.toLowerCase();
    return !q || r.recipe_name?.toLowerCase().includes(q) || r.rest_menu_items?.item_name?.toLowerCase().includes(q);
  });

  const totalRecipeCost = (recipe: any) => (recipe.rest_recipe_lines || []).reduce((s: number, l: any) => s + Number(l.line_cost || 0), 0);

  const addLine = () => setLines([...lines, { ingredient_name: '', quantity: '', uom: 'g', unit_cost: '', line_cost: '' }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, val: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: val };
    if (field === 'quantity' || field === 'unit_cost') {
      const q = parseFloat(updated[i].quantity) || 0;
      const c = parseFloat(updated[i].unit_cost) || 0;
      updated[i].line_cost = (q * c).toFixed(2);
    }
    setLines(updated);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Recipe & BOM</h1>
          <p className="text-sm text-muted-foreground">Recipe management, ingredient costing, and margin analysis</p>
        </div>
        <Button onClick={() => { setShowNew(true); setLines([]); }}><Plus className="h-4 w-4 mr-1" /> New Recipe</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Recipes', value: (recipes || []).length, icon: BookOpen },
          { label: 'Avg Food Cost', value: `SAR ${(recipes || []).length ? ((recipes || []).reduce((s: number, r: any) => s + totalRecipeCost(r), 0) / (recipes || []).length).toFixed(2) : '0.00'}`, icon: DollarSign },
          { label: 'High-Cost Items', value: (recipes || []).filter((r: any) => totalRecipeCost(r) > Number(r.rest_menu_items?.base_price || 999) * 0.35).length, icon: AlertTriangle },
          { label: 'Avg Margin', value: `${(recipes || []).length ? Math.round((recipes || []).reduce((s: number, r: any) => { const cost = totalRecipeCost(r); const price = Number(r.rest_menu_items?.base_price || 0); return s + (price > 0 ? ((price - cost) / price) * 100 : 0); }, 0) / (recipes || []).length) : 0}%`, icon: TrendingUp },
        ].map(k => (
          <Card key={k.label} className="border">
            <CardContent className="p-3">
              <k.icon className="h-4 w-4 text-primary mb-1" />
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Recipe cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r: any) => {
          const cost = totalRecipeCost(r);
          const price = Number(r.rest_menu_items?.base_price || 0);
          const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
          const isHighCost = margin < 65;
          return (
            <Card key={r.id} className={`border ${isHighCost ? 'border-orange-300' : ''}`}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{r.recipe_name}</CardTitle>
                  {isHighCost && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{r.rest_menu_items?.item_name || 'Unlinked'}</p>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div><p className="text-xs text-muted-foreground">Cost</p><p className="font-bold text-sm">SAR {cost.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Price</p><p className="font-bold text-sm">SAR {price.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Margin</p><p className={`font-bold text-sm ${margin < 60 ? 'text-red-600' : margin < 70 ? 'text-orange-600' : 'text-green-600'}`}>{margin.toFixed(0)}%</p></div>
                </div>
                <div className="space-y-1">
                  {(r.rest_recipe_lines || []).slice(0, 5).map((l: any, i: number) => (
                    <div key={l.id || i} className="flex justify-between text-xs">
                      <span>{l.ingredient_name}</span>
                      <span className="text-muted-foreground">{l.quantity} {l.uom} • SAR {Number(l.line_cost || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  {(r.rest_recipe_lines || []).length > 5 && <p className="text-xs text-muted-foreground">+{(r.rest_recipe_lines || []).length - 5} more</p>}
                </div>
                <Badge variant="outline" className="mt-2 text-[10px]">Yield: {r.yield_quantity} {r.yield_unit}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Recipe Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Recipe / BOM</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recipe Name</Label><Input value={form.recipe_name} onChange={e => setForm({ ...form, recipe_name: e.target.value })} /></div>
              <div><Label>Menu Item</Label>
                <Select value={form.menu_item_id} onValueChange={v => setForm({ ...form, menu_item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Link to menu item" /></SelectTrigger>
                  <SelectContent>{(menuItems || []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Yield Qty</Label><Input type="number" value={form.yield_quantity} onChange={e => setForm({ ...form, yield_quantity: e.target.value })} /></div>
              <div><Label>Yield Unit</Label><Input value={form.yield_unit} onChange={e => setForm({ ...form, yield_unit: e.target.value })} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              {lines.length === 0 && <p className="text-sm text-muted-foreground">No ingredients added yet</p>}
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-4"><Input placeholder="Ingredient" value={line.ingredient_name} onChange={e => updateLine(i, 'ingredient_name', e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} /></div>
                  <div className="col-span-2"><Input placeholder="UOM" value={line.uom} onChange={e => updateLine(i, 'uom', e.target.value)} /></div>
                  <div className="col-span-2"><Input type="number" placeholder="Cost" value={line.unit_cost} onChange={e => updateLine(i, 'unit_cost', e.target.value)} /></div>
                  <div className="col-span-1 text-xs font-bold text-right pt-2">{line.line_cost || '0'}</div>
                  <div className="col-span-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(i)}><Trash2 className="h-3 w-3" /></Button></div>
                </div>
              ))}
              {lines.length > 0 && (
                <p className="text-sm font-bold text-right">Total: SAR {lines.reduce((s, l) => s + (parseFloat(l.line_cost) || 0), 0).toFixed(2)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => {
              createRecipe.mutate({
                recipe_name: form.recipe_name, menu_item_id: form.menu_item_id || null,
                yield_quantity: parseFloat(form.yield_quantity) || 1, yield_unit: form.yield_unit,
                lines: lines.map(l => ({ ingredient_name: l.ingredient_name, quantity: parseFloat(l.quantity) || 0, uom: l.uom, unit_cost: parseFloat(l.unit_cost) || 0, line_cost: parseFloat(l.line_cost) || 0 })),
              });
              setShowNew(false);
            }}>Create Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
