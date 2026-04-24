import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { CONDITION_FIELDS, CONDITION_OPERATORS } from './workflowConstants';

interface Condition {
  field: string;
  operator: string;
  value: string;
  value2?: string;
  logic?: 'AND' | 'OR';
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  isAr: boolean;
}

export default function ConditionBuilder({ conditions, onChange, isAr }: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([...conditions, { field: 'amount', operator: 'greater_than', value: '', logic: 'AND' }]);
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const updated = conditions.map((c, i) => i === index ? { ...c, ...updates } : c);
    onChange(updated);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {isAr ? 'شروط التطبيق' : 'Activation Conditions'}
        </p>
        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={addCondition}>
          <Plus className="h-2.5 w-2.5 mr-1" />{isAr ? 'إضافة' : 'Add'}
        </Button>
      </div>

      {conditions.length === 0 && (
        <p className="text-[10px] text-muted-foreground py-2">
          {isAr ? 'لا توجد شروط - سيتم تطبيق سير العمل على جميع المستندات' : 'No conditions — workflow applies to all documents of this type'}
        </p>
      )}

      {conditions.map((condition, index) => (
        <div key={index} className="space-y-1">
          {index > 0 && (
            <Select value={condition.logic || 'AND'} onValueChange={v => updateCondition(index, { logic: v as 'AND' | 'OR' })}>
              <SelectTrigger className="h-5 w-16 text-[10px] mx-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1 items-center">
            <Select value={condition.field} onValueChange={v => updateCondition(index, { field: v })}>
              <SelectTrigger className="h-7 text-[10px] flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{isAr ? f.labelAr : f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={condition.operator} onValueChange={v => updateCondition(index, { operator: v })}>
              <SelectTrigger className="h-7 text-[10px] w-14"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={condition.value} onChange={e => updateCondition(index, { value: e.target.value })} className="h-7 text-[10px] flex-1" placeholder="Value" />
            {condition.operator === 'between' && (
              <Input value={condition.value2 || ''} onChange={e => updateCondition(index, { value2: e.target.value })} className="h-7 text-[10px] w-20" placeholder="To" />
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeCondition(index)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
