import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyMultiSelect } from '@/components/finance/CompanyMultiSelect';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Filter, Save, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PLFilters {
  companyIds: string[];
  dateFrom: string;
  dateTo: string;
  compareDateFrom: string;
  compareDateTo: string;
  comparisonMode: string;
  branchId: string;
  costCenter: string;
  projectCode: string;
  departmentId: string;
  fiscalYear: string;
  includeUnposted: boolean;
  viewMode: string;
}

const currentYear = new Date().getFullYear();

export function PLFilterBar({ filters, onChange, onGenerate }: {
  filters: PLFilters;
  onChange: (f: PLFilters) => void;
  onGenerate: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ['pl-branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ['pl-cost-centers'],
    queryFn: async () => {
      const { data } = await supabase.from('cost_centers').select('id, name, code').order('code');
      return data || [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['pl-projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name').limit(200);
      return data || [];
    },
  });

  const handleComparisonChange = (mode: string) => {
    let cFrom = '', cTo = '';
    const dFrom = filters.dateFrom;
    const dTo = filters.dateTo;
    if (mode === 'previous_period' && dFrom && dTo) {
      const from = new Date(dFrom);
      const to = new Date(dTo);
      const diff = to.getTime() - from.getTime();
      const newTo = new Date(from.getTime() - 86400000);
      const newFrom = new Date(newTo.getTime() - diff);
      cFrom = newFrom.toISOString().split('T')[0];
      cTo = newTo.toISOString().split('T')[0];
    } else if (mode === 'same_period_last_year' && dFrom && dTo) {
      cFrom = `${parseInt(dFrom.substring(0, 4)) - 1}${dFrom.substring(4)}`;
      cTo = `${parseInt(dTo.substring(0, 4)) - 1}${dTo.substring(4)}`;
    } else if (mode === 'ytd') {
      cFrom = `${currentYear}-01-01`;
      cTo = new Date().toISOString().split('T')[0];
    } else if (mode === 'qtd') {
      const m = new Date().getMonth();
      const qStart = m < 3 ? 0 : m < 6 ? 3 : m < 9 ? 6 : 9;
      cFrom = `${currentYear}-${String(qStart + 1).padStart(2, '0')}-01`;
      cTo = new Date().toISOString().split('T')[0];
    } else if (mode === 'mtd') {
      cFrom = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
      cTo = new Date().toISOString().split('T')[0];
    }
    onChange({ ...filters, comparisonMode: mode, compareDateFrom: cFrom, compareDateTo: cTo });
  };

  const reset = () => {
    onChange({
      companyIds: [], dateFrom: `${currentYear}-01-01`, dateTo: new Date().toISOString().split('T')[0],
      compareDateFrom: '', compareDateTo: '', comparisonMode: 'none', branchId: '',
      costCenter: '', projectCode: '', departmentId: '', fiscalYear: String(currentYear),
      includeUnposted: false, viewMode: 'summary',
    });
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-4 space-y-3">
      {/* Row 1: Company + Period + Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs font-medium">Company</Label>
          <CompanyMultiSelect selectedIds={filters.companyIds} onChange={ids => onChange({ ...filters, companyIds: ids })} />
        </div>
        <div>
          <Label className="text-xs font-medium">Date From</Label>
          <Input type="date" value={filters.dateFrom} onChange={e => onChange({ ...filters, dateFrom: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-xs font-medium">Date To</Label>
          <Input type="date" value={filters.dateTo} onChange={e => onChange({ ...filters, dateTo: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label className="text-xs font-medium">Comparison</Label>
          <Select value={filters.comparisonMode} onValueChange={handleComparisonChange}>
            <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="previous_period">Previous Period</SelectItem>
              <SelectItem value="same_period_last_year">Same Period Last Year</SelectItem>
              <SelectItem value="ytd">Year-to-Date</SelectItem>
              <SelectItem value="qtd">Quarter-to-Date</SelectItem>
              <SelectItem value="mtd">Month-to-Date</SelectItem>
              <SelectItem value="budget">Budget vs Actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: View mode + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.viewMode} onValueChange={v => onChange({ ...filters, viewMode: v })}>
          <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Standard Summary</SelectItem>
            <SelectItem value="monthly">Monthly Columnar</SelectItem>
            <SelectItem value="quarterly">Quarterly Comparison</SelectItem>
            <SelectItem value="branch">Branch-wise</SelectItem>
            <SelectItem value="department">Department-wise</SelectItem>
            <SelectItem value="project">Project Profitability</SelectItem>
            <SelectItem value="cost_center">Cost Center</SelectItem>
            <SelectItem value="detailed">Detailed Account Breakdown</SelectItem>
          </SelectContent>
        </Select>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />More Filters
              {showAdvanced ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        <div className="flex-1" />
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={reset}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
        <Button size="sm" className="h-8" onClick={onGenerate}>Generate Report</Button>
      </div>

      {/* Advanced filters */}
      <Collapsible open={showAdvanced}>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            <div>
              <Label className="text-xs">Branch</Label>
              <Select value={filters.branchId || 'all'} onValueChange={v => onChange({ ...filters, branchId: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cost Center</Label>
              <Select value={filters.costCenter || 'all'} onValueChange={v => onChange({ ...filters, costCenter: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cost Centers</SelectItem>
                  {costCenters.map((c: any) => <SelectItem key={c.id} value={c.code || c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Project</Label>
              <Select value={filters.projectCode || 'all'} onValueChange={v => onChange({ ...filters, projectCode: v === 'all' ? '' : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fiscal Year</Label>
              <Select value={filters.fiscalYear} onValueChange={v => onChange({ ...filters, fiscalYear: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
