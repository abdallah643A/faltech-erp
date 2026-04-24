import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Copy } from 'lucide-react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ItemCombobox, type ItemOption } from '@/components/items/ItemCombobox';
import { LineFieldCombobox } from '@/components/shared/LineFieldCombobox';
import { useTaxCodeOptions, useWarehouseOptions, useProjectOptions, useDimensionOptions } from '@/hooks/useLineMasterData';

export interface DocumentLine {
  id: string;
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  taxCode: string;
  taxPercent: number;
  warehouse: string;
  project: string;
  dim_employee_id?: string;
  dim_branch_id?: string;
  dim_business_line_id?: string;
  dim_factory_id?: string;
  [key: string]: any;
}

interface ExtraColumn {
  key: string;
  label: string;
  width?: string;
  render?: (line: DocumentLine, idx: number) => ReactNode;
}

interface Props {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  isReadOnly?: boolean;
  extraColumns?: ExtraColumn[];
}

function newLine(lineNum: number): DocumentLine {
  return {
    id: crypto.randomUUID(),
    lineNum,
    itemCode: '',
    itemDescription: '',
    quantity: 1,
    unit: 'EA',
    unitPrice: 0,
    discountPercent: 0,
    taxCode: 'VAT15',
    taxPercent: 15,
    warehouse: '',
    project: '',
    dim_employee_id: '',
    dim_branch_id: '',
    dim_business_line_id: '',
    dim_factory_id: '',
  };
}

export function DocumentLinesTable({ lines, onChange, isReadOnly, extraColumns = [] }: Props) {
  const taxOptions = useTaxCodeOptions();
  const warehouseOptions = useWarehouseOptions();
  const projectOptions = useProjectOptions();
  const employeeOptions = useDimensionOptions('employees');
  const branchOptions = useDimensionOptions('branches');
  const businessLineOptions = useDimensionOptions('business_line');
  const factoryOptions = useDimensionOptions('factory');

  const addLine = () => onChange([...lines, newLine(lines.length + 1)]);
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, lineNum: i + 1 })));
  const duplicateLine = (idx: number) => {
    const dup = { ...lines[idx], id: crypto.randomUUID(), lineNum: lines.length + 1 };
    onChange([...lines, dup]);
  };
  const updateLine = (idx: number, key: string, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [key]: val };
    onChange(updated);
  };
  const handleItemSelect = (idx: number, item: ItemOption | null) => {
    const updated = [...lines];
    if (item) {
      updated[idx] = {
        ...updated[idx],
        itemCode: item.item_code,
        itemDescription: item.description,
        unitPrice: item.default_price || 0,
        warehouse: item.warehouse || updated[idx].warehouse,
        unit: item.uom || updated[idx].unit,
      };
    } else {
      updated[idx] = { ...updated[idx], itemCode: '', itemDescription: '' };
    }
    onChange(updated);
  };

  const handleTaxSelect = (idx: number, taxCode: string) => {
    const opt = taxOptions.find(t => t.value === taxCode);
    const rateMatch = opt?.label.match(/\((\d+(?:\.\d+)?)%\)/);
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 15;
    const updated = [...lines];
    updated[idx] = { ...updated[idx], taxCode, taxPercent: taxCode ? rate : 15 };
    onChange(updated);
  };

  const baseColumns = [
    { key: '#', label: '#', width: 'w-10' },
    { key: 'itemCode', label: 'Item No.', width: 'w-[140px]' },
    { key: 'itemDescription', label: 'Item Description', width: 'w-48' },
    { key: 'quantity', label: 'Qty', width: 'w-16' },
    { key: 'unit', label: 'Unit', width: 'w-14' },
    { key: 'unitPrice', label: 'Unit Price', width: 'w-24' },
    { key: 'discountPercent', label: 'Disc %', width: 'w-16' },
    { key: 'beforeTax', label: 'Total (Pre-Tax)', width: 'w-28' },
    { key: 'taxCode', label: 'Tax Code', width: 'w-[100px]' },
    { key: 'taxAmount', label: 'Tax Amt', width: 'w-24' },
    { key: 'afterTax', label: 'Total (Post-Tax)', width: 'w-28' },
    { key: 'warehouse', label: 'Warehouse', width: 'w-[110px]' },
    { key: 'project', label: 'Project', width: 'w-[110px]' },
    { key: 'dim_employee', label: 'Employee', width: 'w-[100px]' },
    { key: 'dim_branch', label: 'Branch', width: 'w-[100px]' },
    { key: 'dim_bline', label: 'Biz Line', width: 'w-[100px]' },
    { key: 'dim_factory', label: 'Factory', width: 'w-[100px]' },
  ];

  const allColumns = [...baseColumns, ...extraColumns.map(c => ({ ...c, width: c.width || 'w-24' }))];

  return (
    <div className="bg-white rounded border border-[#d0d5dd]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
          <thead>
            <tr className="bg-[#f0f2f4] border-b border-[#d0d5dd]">
              {!isReadOnly && <th className="w-6 px-1" />}
              {allColumns.map(col => (
                <th key={col.key} className={`px-2 py-2 text-left text-xs font-semibold text-gray-600 ${col.width}`}>
                  {col.label}
                </th>
              ))}
              {!isReadOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const preTax = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);
              const tax = preTax * ((line.taxPercent || 15) / 100);
              const postTax = preTax + tax;

              return (
                <ContextMenu key={line.id}>
                  <ContextMenuTrigger asChild>
                    <tr className="border-b border-[#d0d5dd] hover:bg-blue-50/30">
                      {!isReadOnly && (
                        <td className="px-1 text-center cursor-grab"><GripVertical className="h-3.5 w-3.5 text-gray-300" /></td>
                      )}
                      <td className="px-2 py-1.5 text-gray-500">{line.lineNum}</td>
                      <td className="px-2 py-1.5">
                        <ItemCombobox value={line.itemCode} onSelect={(item) => handleItemSelect(idx, item)} className="w-[130px]" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={line.itemDescription} onChange={e => updateLine(idx, 'itemDescription', e.target.value)} className="h-7 text-xs border-[#d0d5dd]" readOnly={isReadOnly} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)} className="h-7 text-xs border-[#d0d5dd] w-16" readOnly={isReadOnly} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} className="h-7 text-xs border-[#d0d5dd] w-14" readOnly={isReadOnly} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-7 text-xs border-[#d0d5dd] w-24" readOnly={isReadOnly} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input type="number" value={line.discountPercent} onChange={e => updateLine(idx, 'discountPercent', parseFloat(e.target.value) || 0)} className="h-7 text-xs border-[#d0d5dd] w-16" readOnly={isReadOnly} />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{preTax.toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.taxCode}
                          options={taxOptions}
                          onSelect={(v) => handleTaxSelect(idx, v)}
                          placeholder="Tax..."
                          className="w-[90px]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs">{tax.toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold">{postTax.toLocaleString('en', { minimumFractionDigits: 2 })}</td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.warehouse}
                          options={warehouseOptions}
                          onSelect={(v) => updateLine(idx, 'warehouse', v)}
                          placeholder="WH..."
                          className="w-[100px]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.project}
                          options={projectOptions}
                          onSelect={(v) => updateLine(idx, 'project', v)}
                          placeholder="Project..."
                          className="w-[100px]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.dim_employee_id || ''}
                          options={employeeOptions}
                          onSelect={(v) => updateLine(idx, 'dim_employee_id', v)}
                          placeholder="-"
                          className="w-[90px]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.dim_branch_id || ''}
                          options={branchOptions}
                          onSelect={(v) => updateLine(idx, 'dim_branch_id', v)}
                          placeholder="-"
                          className="w-[90px]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.dim_business_line_id || ''}
                          options={businessLineOptions}
                          onSelect={(v) => updateLine(idx, 'dim_business_line_id', v)}
                          placeholder="-"
                          className="w-[90px]"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <LineFieldCombobox
                          value={line.dim_factory_id || ''}
                          options={factoryOptions}
                          onSelect={(v) => updateLine(idx, 'dim_factory_id', v)}
                          placeholder="-"
                          className="w-[90px]"
                        />
                      </td>
                      {extraColumns.map(col => (
                        <td key={col.key} className="px-2 py-1.5">
                          {col.render ? col.render(line, idx) : (
                            <Input value={line[col.key] || ''} onChange={e => updateLine(idx, col.key, e.target.value)} className="h-7 text-xs border-[#d0d5dd]" readOnly={isReadOnly} />
                          )}
                        </td>
                      ))}
                      {!isReadOnly && (
                        <td className="px-1">
                          <Button size="icon" variant="ghost" onClick={() => removeLine(idx)} className="h-6 w-6 text-red-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => removeLine(idx)}>Delete Row</ContextMenuItem>
                    <ContextMenuItem onClick={() => duplicateLine(idx)}>Duplicate Row</ContextMenuItem>
                    <ContextMenuItem onClick={addLine}>Insert Row Below</ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isReadOnly && (
        <div className="p-2 border-t border-[#d0d5dd]">
          <Button size="sm" variant="outline" onClick={addLine} className="gap-1 text-[#0066cc] border-[#0066cc]">
            <Plus className="h-3.5 w-3.5" /> Add Line
          </Button>
        </div>
      )}
    </div>
  );
}
