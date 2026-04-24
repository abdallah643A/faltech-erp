import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DrillDownItem {
  [key: string]: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  data: DrillDownItem[];
  columns: { key: string; label: string; format?: (v: any) => string }[];
}

export function TMOChartDrillDown({ open, onClose, title, data, columns }: Props) {
  const exportCSV = () => {
    const header = columns.map(c => c.label).join(',');
    const rows = data.map(row => columns.map(c => {
      const val = row[c.key];
      const formatted = c.format ? c.format(val) : String(val ?? '');
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />CSV
              </Button>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">{data.length} records</Badge>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => <TableHead key={c.key} className="text-xs">{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map(c => (
                    <TableCell key={c.key} className="text-xs">
                      {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
