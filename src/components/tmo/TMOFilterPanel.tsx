import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, X, Save, RotateCcw, Bookmark } from 'lucide-react';

export interface TMOFilters {
  category: string;
  lifecycleStatus: string;
  vendor: string;
  complianceStatus: string;
  costMin: string;
  costMax: string;
  businessUnit: string;
}

const EMPTY_FILTERS: TMOFilters = {
  category: 'all', lifecycleStatus: 'all', vendor: 'all',
  complianceStatus: 'all', costMin: '', costMax: '', businessUnit: 'all',
};

interface FilterPreset {
  name: string;
  filters: TMOFilters;
}

const DEFAULT_PRESETS: FilterPreset[] = [
  { name: 'EOL Risk', filters: { ...EMPTY_FILTERS, lifecycleStatus: 'end_of_life' } },
  { name: 'High Cost', filters: { ...EMPTY_FILTERS, costMin: '100000' } },
  { name: 'Low Compliance', filters: { ...EMPTY_FILTERS, complianceStatus: 'low' } },
];

interface Props {
  filters: TMOFilters;
  onFiltersChange: (f: TMOFilters) => void;
  categories: string[];
  vendors: string[];
  departments: string[];
}

export function TMOFilterPanel({ filters, onFiltersChange, categories, vendors, departments }: Props) {
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('tmo-filter-presets') || '[]'); } catch { return []; }
  });
  const [showPanel, setShowPanel] = useState(false);

  const activeCount = Object.entries(filters).filter(([, v]) => v && v !== 'all' && v !== '').length;

  const savePreset = () => {
    const name = prompt('Preset name:');
    if (!name) return;
    const next = [...savedPresets, { name, filters }];
    setSavedPresets(next);
    localStorage.setItem('tmo-filter-presets', JSON.stringify(next));
  };

  const applyPreset = (p: FilterPreset) => onFiltersChange(p.filters);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={showPanel ? 'default' : 'outline'} size="sm" onClick={() => setShowPanel(!showPanel)}>
          <Filter className="h-4 w-4 mr-1" /> Filters
          {activeCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{activeCount}</Badge>}
        </Button>
        {DEFAULT_PRESETS.map(p => (
          <Button key={p.name} variant="ghost" size="sm" className="text-xs h-7" onClick={() => applyPreset(p)}>
            <Bookmark className="h-3 w-3 mr-1" />{p.name}
          </Button>
        ))}
        {savedPresets.map(p => (
          <Button key={p.name} variant="ghost" size="sm" className="text-xs h-7 text-primary" onClick={() => applyPreset(p)}>
            <Bookmark className="h-3 w-3 mr-1 fill-current" />{p.name}
          </Button>
        ))}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => onFiltersChange(EMPTY_FILTERS)}>
            <RotateCcw className="h-3 w-3 mr-1" />Clear All
          </Button>
        )}
      </div>

      {showPanel && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Category</label>
                <Select value={filters.category} onValueChange={v => onFiltersChange({ ...filters, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Lifecycle</label>
                <Select value={filters.lifecycleStatus} onValueChange={v => onFiltersChange({ ...filters, lifecycleStatus: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="supported">Supported</SelectItem>
                    <SelectItem value="end_of_life">End of Life</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    <SelectItem value="pilot">Pilot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Vendor</label>
                <Select value={filters.vendor} onValueChange={v => onFiltersChange({ ...filters, vendor: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Compliance</label>
                <Select value={filters.complianceStatus} onValueChange={v => onFiltersChange({ ...filters, complianceStatus: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High (≥80%)</SelectItem>
                    <SelectItem value="medium">Medium (50-79%)</SelectItem>
                    <SelectItem value="low">Low (&lt;50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Business Unit</label>
                <Select value={filters.businessUnit} onValueChange={v => onFiltersChange({ ...filters, businessUnit: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cost Range (K)</label>
                <div className="flex gap-1">
                  <Input className="h-8 text-xs" placeholder="Min" value={filters.costMin} onChange={e => onFiltersChange({ ...filters, costMin: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="Max" value={filters.costMax} onChange={e => onFiltersChange({ ...filters, costMax: e.target.value })} />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="h-8 text-xs w-full" onClick={savePreset}>
                  <Save className="h-3 w-3 mr-1" />Save Preset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { EMPTY_FILTERS };
