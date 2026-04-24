import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDimensions, type DimensionType } from '@/hooks/useDimensions';

export interface LineDimensions {
  dim_employee_id: string | null;
  dim_branch_id: string | null;
  dim_business_line_id: string | null;
  dim_factory_id: string | null;
}

export const EMPTY_DIMENSIONS: LineDimensions = {
  dim_employee_id: null,
  dim_branch_id: null,
  dim_business_line_id: null,
  dim_factory_id: null,
};

interface DimensionDropdownProps {
  type: DimensionType;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

function DimensionDropdown({ type, value, onChange, className = 'w-[84px]' }: DimensionDropdownProps) {
  const { activeDimensions } = useDimensions(type);

  return (
    <Select
      value={value || 'none'}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
    >
      <SelectTrigger className={`h-7 text-xs ${className}`}>
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">-</SelectItem>
        {activeDimensions.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.cost_center} - {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface LineDimensionSelectorsProps {
  dimensions: LineDimensions;
  onChange: (dimensions: LineDimensions) => void;
}

export function LineDimensionSelectors({ dimensions, onChange }: LineDimensionSelectorsProps) {
  const update = (field: keyof LineDimensions, value: string | null) => {
    onChange({ ...dimensions, [field]: value });
  };

  return (
    <>
      <td className="p-1">
        <DimensionDropdown
          type="employees"
          value={dimensions.dim_employee_id}
          onChange={(v) => update('dim_employee_id', v)}
        />
      </td>
      <td className="p-1">
        <DimensionDropdown
          type="branches"
          value={dimensions.dim_branch_id}
          onChange={(v) => update('dim_branch_id', v)}
        />
      </td>
      <td className="p-1">
        <DimensionDropdown
          type="business_line"
          value={dimensions.dim_business_line_id}
          onChange={(v) => update('dim_business_line_id', v)}
        />
      </td>
      <td className="p-1">
        <DimensionDropdown
          type="factory"
          value={dimensions.dim_factory_id}
          onChange={(v) => update('dim_factory_id', v)}
        />
      </td>
    </>
  );
}

/** Table header cells for dimension columns */
export function DimensionTableHeaders() {
  return (
    <>
      <th className="p-1.5 text-center w-[110px] text-xs">Employee</th>
      <th className="p-1.5 text-center w-[110px] text-xs">Branch</th>
      <th className="p-1.5 text-center w-[110px] text-xs">Business Line</th>
      <th className="p-1.5 text-center w-[110px] text-xs">Factory</th>
    </>
  );
}

/** TableHead variant for shadcn Table */
export function DimensionTableHeadCells() {
  return (
    <>
      <th className="p-1.5 text-center text-xs">Employee</th>
      <th className="p-1.5 text-center text-xs">Branch</th>
      <th className="p-1.5 text-center text-xs">Business Line</th>
      <th className="p-1.5 text-center text-xs">Factory</th>
    </>
  );
}

/** For shadcn TableCell rendering */
interface TableCellDimensionsProps {
  dimensions: LineDimensions;
  onChange: (dimensions: LineDimensions) => void;
}

export function TableCellDimensions({ dimensions, onChange }: TableCellDimensionsProps) {
  const update = (field: keyof LineDimensions, value: string | null) => {
    onChange({ ...dimensions, [field]: value });
  };

  return (
    <>
      <DimensionCellDropdown type="employees" value={dimensions.dim_employee_id} onChange={(v) => update('dim_employee_id', v)} />
      <DimensionCellDropdown type="branches" value={dimensions.dim_branch_id} onChange={(v) => update('dim_branch_id', v)} />
      <DimensionCellDropdown type="business_line" value={dimensions.dim_business_line_id} onChange={(v) => update('dim_business_line_id', v)} />
      <DimensionCellDropdown type="factory" value={dimensions.dim_factory_id} onChange={(v) => update('dim_factory_id', v)} />
    </>
  );
}

function DimensionCellDropdown({ type, value, onChange }: { type: DimensionType; value: string | null; onChange: (v: string | null) => void }) {
  const { activeDimensions } = useDimensions(type);
  return (
    <td className="p-1">
      <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? null : v)}>
        <SelectTrigger className="h-7 text-xs w-[100px]">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-</SelectItem>
          {activeDimensions.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.cost_center}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </td>
  );
}
