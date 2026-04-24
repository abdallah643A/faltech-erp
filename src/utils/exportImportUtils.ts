import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
}

export function exportToExcel(data: any[], columns: ColumnDef[], filename: string) {
  const rows = data.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col.header] = row[col.key] ?? '';
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export function exportToPDF(data: any[], columns: ColumnDef[], filename: string, title: string) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth / 2, 22, { align: 'center' });

  // Table
  const colWidth = (pageWidth - 20) / columns.length;
  let y = 30;
  const rowHeight = 7;
  const headerHeight = 8;

  // Header
  doc.setFillColor(41, 65, 122);
  doc.rect(10, y, pageWidth - 20, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  columns.forEach((col, i) => {
    doc.text(col.header, 12 + i * colWidth, y + 5.5, { maxWidth: colWidth - 4 });
  });
  y += headerHeight;

  // Rows
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);

  data.forEach((row, ri) => {
    if (y > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
      // Repeat header
      doc.setFillColor(41, 65, 122);
      doc.rect(10, y, pageWidth - 20, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      columns.forEach((col, i) => {
        doc.text(col.header, 12 + i * colWidth, y + 5.5, { maxWidth: colWidth - 4 });
      });
      y += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6.5);
    }

    if (ri % 2 === 0) {
      doc.setFillColor(245, 245, 250);
      doc.rect(10, y, pageWidth - 20, rowHeight, 'F');
    }

    columns.forEach((col, i) => {
      const val = String(row[col.key] ?? '');
      doc.text(val.substring(0, 40), 12 + i * colWidth, y + 5, { maxWidth: colWidth - 4 });
    });
    y += rowHeight;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(`Total Records: ${data.length}`, 10, doc.internal.pageSize.getHeight() - 8);

  doc.save(`${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function importFromExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
