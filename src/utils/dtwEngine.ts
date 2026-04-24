/**
 * Data Transfer Workbench - Import/Export Engine
 * Handles template generation, file parsing, validation, and data export
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { DTWColumn, DTWEntity } from '@/config/dtwEntities';

// ── Template Generation ──────────────────────────────────────────

export function generateTemplate(entity: DTWEntity, fileFormat: 'xlsx' | 'csv'): void {
  const headers = entity.columns.map(c => c.header);
  const descriptions = entity.columns.map(c => {
    const parts: string[] = [];
    if (c.required) parts.push('Required');
    if (c.type === 'enum' && c.enumValues) parts.push(`Values: ${c.enumValues.join(', ')}`);
    if (c.type === 'date') parts.push('Format: YYYY-MM-DD');
    if (c.type === 'number') parts.push('Numeric');
    if (c.type === 'boolean') parts.push('TRUE / FALSE');
    return parts.join(' | ') || 'Optional';
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, descriptions]);

  // Set column widths
  ws['!cols'] = entity.columns.map(c => ({ wch: Math.max(c.header.length + 4, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entity.label.substring(0, 31));

  const ext = fileFormat === 'csv' ? 'csv' : 'xlsx';
  const bookType = fileFormat === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(wb, `${entity.id}_template.${ext}`, { bookType });
}

// ── File Parsing ─────────────────────────────────────────────────

export interface ParsedFile {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'txt') {
    return parseTxt(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        resolve({ headers, rows: jsonData, fileName: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function parseTxt(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) throw new Error('File must have at least a header row and one data row');

        const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes('|') ? '|' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const vals = line.split(delimiter);
          const row: Record<string, any> = {};
          headers.forEach((h, i) => { row[h] = vals[i]?.trim() ?? ''; });
          return row;
        });
        resolve({ headers, rows, fileName: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ── Column Mapping ───────────────────────────────────────────────

export interface ColumnMapping {
  fileHeader: string;
  entityColumn: DTWColumn | null;
}

export function autoMapColumns(fileHeaders: string[], entityColumns: DTWColumn[]): ColumnMapping[] {
  return fileHeaders.map(fh => {
    const lower = fh.toLowerCase().replace(/[_\s-]/g, '');
    const match = entityColumns.find(ec => {
      const keyLower = ec.key.toLowerCase().replace(/[_\s-]/g, '');
      const headerLower = ec.header.toLowerCase().replace(/[_\s-]/g, '');
      return keyLower === lower || headerLower === lower;
    });
    return { fileHeader: fh, entityColumn: match ?? null };
  });
}

// ── Validation ───────────────────────────────────────────────────

export interface ValidationError {
  row: number;
  column: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRows: Record<string, any>[];
  invalidRowIndices: Set<number>;
}

export function validateRows(
  rows: Record<string, any>[],
  mappings: ColumnMapping[],
  entity: DTWEntity,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const invalidRowIndices = new Set<number>();
  const seenKeys = new Map<string, number>();

  rows.forEach((row, rowIdx) => {
    const mappedRow: Record<string, any> = {};

    mappings.forEach(m => {
      if (!m.entityColumn) return;
      let val = row[m.fileHeader];
      const col = m.entityColumn;

      // Type coercion and validation
      if (col.required && (val === undefined || val === null || val === '')) {
        errors.push({ row: rowIdx + 2, column: col.header, value: val, message: `Required field is empty`, severity: 'error' });
        invalidRowIndices.add(rowIdx);
        return;
      }

      if (val === undefined || val === null || val === '') {
        mappedRow[col.key] = null;
        return;
      }

      // Type checks
      if (col.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push({ row: rowIdx + 2, column: col.header, value: val, message: `Expected a number`, severity: 'error' });
          invalidRowIndices.add(rowIdx);
          return;
        }
        mappedRow[col.key] = num;
      } else if (col.type === 'boolean') {
        const boolStr = String(val).toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolStr)) {
          warnings.push({ row: rowIdx + 2, column: col.header, value: val, message: `Expected TRUE/FALSE`, severity: 'warning' });
        }
        mappedRow[col.key] = ['true', '1', 'yes'].includes(boolStr);
      } else if (col.type === 'date') {
        if (val instanceof Date) {
          mappedRow[col.key] = format(val, 'yyyy-MM-dd');
        } else {
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            errors.push({ row: rowIdx + 2, column: col.header, value: val, message: `Invalid date format`, severity: 'error' });
            invalidRowIndices.add(rowIdx);
            return;
          }
          mappedRow[col.key] = format(d, 'yyyy-MM-dd');
        }
      } else if (col.type === 'enum' && col.enumValues) {
        if (!col.enumValues.includes(String(val).toLowerCase()) && !col.enumValues.includes(String(val))) {
          warnings.push({ row: rowIdx + 2, column: col.header, value: val, message: `Value not in allowed list: ${col.enumValues.join(', ')}`, severity: 'warning' });
        }
        mappedRow[col.key] = String(val);
      } else {
        mappedRow[col.key] = String(val);
      }
    });

    // Duplicate key check
    const keyCol = mappings.find(m => m.entityColumn?.key === entity.keyField);
    if (keyCol) {
      const keyVal = String(row[keyCol.fileHeader] ?? '');
      if (keyVal && seenKeys.has(keyVal)) {
        warnings.push({ row: rowIdx + 2, column: entity.keyField, value: keyVal, message: `Duplicate key (first seen at row ${seenKeys.get(keyVal)})`, severity: 'warning' });
      } else if (keyVal) {
        seenKeys.set(keyVal, rowIdx + 2);
      }
    }

    if (!invalidRowIndices.has(rowIdx)) {
      // Store mapped row on the original row for later use
      (row as any).__mapped = mappedRow;
    }
  });

  const validRows = rows
    .filter((_, i) => !invalidRowIndices.has(i))
    .map(r => (r as any).__mapped as Record<string, any>);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validRows,
    invalidRowIndices,
  };
}

// ── Export ────────────────────────────────────────────────────────

export function exportData(
  data: any[],
  entity: DTWEntity,
  fileFormat: 'xlsx' | 'csv' | 'txt',
): void {
  const rows = data.map(row => {
    const obj: Record<string, any> = {};
    entity.columns.forEach(col => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });

  if (fileFormat === 'txt') {
    const headers = entity.columns.map(c => c.header);
    const lines = [headers.join('\t')];
    rows.forEach(r => lines.push(headers.map(h => String(r[h] ?? '')).join('\t')));
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity.id}_export_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entity.label.substring(0, 31));
  const ext = fileFormat === 'csv' ? 'csv' : 'xlsx';
  XLSX.writeFile(wb, `${entity.id}_export_${format(new Date(), 'yyyy-MM-dd')}.${ext}`, { bookType: fileFormat === 'csv' ? 'csv' : 'xlsx' });
}
