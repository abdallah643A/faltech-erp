import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Payslip } from '@/hooks/usePayroll';

export function generatePayslipPDF(payslip: Payslip) {
  const doc = new jsPDF();
  const empName = `${payslip.employee?.first_name || ''} ${payslip.employee?.last_name || ''}`;
  const empCode = payslip.employee?.employee_code || '';
  const periodName = payslip.payroll_period?.name || '';

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${periodName}`, 105, 28, { align: 'center' });

  // Employee info box
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, 35, 182, 22, 2, 2, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(empName, 20, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Employee Code: ${empCode}`, 20, 51);

  if (payslip.payroll_period) {
    doc.text(`Pay Date: ${payslip.payroll_period.pay_date || 'N/A'}`, 140, 44);
  }
  doc.text(`Status: ${payslip.status || 'draft'}`, 140, 51);

  // Earnings table
  const earningsData = [
    ['Basic Salary', `SAR ${(payslip.basic_salary || 0).toLocaleString()}`],
    ['Housing Allowance', `SAR ${(payslip.housing_allowance || 0).toLocaleString()}`],
    ['Transport Allowance', `SAR ${(payslip.transport_allowance || 0).toLocaleString()}`],
    ['Other Allowances', `SAR ${(payslip.other_allowances || 0).toLocaleString()}`],
  ];
  if (payslip.overtime_pay && payslip.overtime_pay > 0) {
    earningsData.push(['Overtime Pay', `SAR ${payslip.overtime_pay.toLocaleString()}`]);
  }
  if (payslip.bonus && payslip.bonus > 0) {
    earningsData.push(['Bonus', `SAR ${payslip.bonus.toLocaleString()}`]);
  }
  earningsData.push(['Gross Salary', `SAR ${(payslip.gross_salary || 0).toLocaleString()}`]);

  autoTable(doc, {
    startY: 65,
    head: [['Earnings', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === earningsData.length - 1 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [219, 234, 254];
      }
    },
  });

  // Deductions table
  const deductionsData = [
    ['GOSI (Employee)', `SAR ${(payslip.gosi_deduction || 0).toLocaleString()}`],
  ];
  if (payslip.tax_deduction && payslip.tax_deduction > 0) {
    deductionsData.push(['Tax', `SAR ${payslip.tax_deduction.toLocaleString()}`]);
  }
  if (payslip.loan_deduction && payslip.loan_deduction > 0) {
    deductionsData.push(['Loan Deduction', `SAR ${payslip.loan_deduction.toLocaleString()}`]);
  }
  if (payslip.other_deductions && payslip.other_deductions > 0) {
    deductionsData.push(['Other Deductions', `SAR ${payslip.other_deductions.toLocaleString()}`]);
  }
  deductionsData.push(['Total Deductions', `SAR ${(payslip.total_deductions || 0).toLocaleString()}`]);

  const prevTableEnd = (doc as any).lastAutoTable?.finalY || 120;

  autoTable(doc, {
    startY: prevTableEnd + 8,
    head: [['Deductions', 'Amount']],
    body: deductionsData,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === deductionsData.length - 1 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  // Net salary box
  const deductEnd = (doc as any).lastAutoTable?.finalY || 180;
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(14, deductEnd + 10, 182, 18, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY', 20, deductEnd + 22);
  doc.text(`SAR ${(payslip.net_salary || 0).toLocaleString()}`, 190, deductEnd + 22, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Attendance details
  if (payslip.work_days || payslip.absent_days || payslip.overtime_hours) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const y = deductEnd + 38;
    doc.text(`Work Days: ${payslip.work_days || 0}  |  Absent Days: ${payslip.absent_days || 0}  |  Overtime Hours: ${payslip.overtime_hours || 0}`, 105, y, { align: 'center' });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('This is a computer-generated payslip. No signature required.', 105, 285, { align: 'center' });
  doc.setTextColor(0);

  doc.save(`Payslip_${empCode}_${periodName.replace(/\s+/g, '_')}.pdf`);
}
