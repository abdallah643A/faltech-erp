import { forwardRef } from 'react';

interface CompanyBranding {
  logo?: string;
  nameEn: string;
  nameAr: string;
  address?: string;
  phone?: string;
  email?: string;
  crNumber?: string;
  vatNumber?: string;
}

interface PrintField {
  labelEn: string;
  labelAr: string;
  value: string | number | null;
}

interface PrintLineItem {
  lineNum: number;
  itemCode: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

interface Props {
  documentType: 'quotation' | 'sales_order' | 'delivery_note' | 'invoice' | 'purchase_order' | 'leave_form' | 'project_report';
  documentNumber: string;
  company: CompanyBranding;
  headerFields: PrintField[];
  lineItems?: PrintLineItem[];
  footerFields?: PrintField[];
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  currency?: string;
  notes?: string;
  signatureFields?: { labelEn: string; labelAr: string }[];
}

const TITLES: Record<string, { en: string; ar: string }> = {
  quotation: { en: 'Quotation', ar: 'عرض سعر' },
  sales_order: { en: 'Sales Order', ar: 'أمر بيع' },
  delivery_note: { en: 'Delivery Note', ar: 'إذن تسليم' },
  invoice: { en: 'Invoice', ar: 'فاتورة' },
  purchase_order: { en: 'Purchase Order', ar: 'أمر شراء' },
  leave_form: { en: 'Leave Request', ar: 'طلب إجازة' },
  project_report: { en: 'Project Report', ar: 'تقرير مشروع' },
};

export const ArabicPrintLayout = forwardRef<HTMLDivElement, Props>(({
  documentType, documentNumber, company, headerFields, lineItems,
  footerFields, subtotal, taxAmount, total, currency = 'SAR', notes, signatureFields,
}, ref) => {
  const title = TITLES[documentType] || { en: documentType, ar: documentType };
  const fmt = (n: number | null) => n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';

  return (
    <div ref={ref} className="bg-white text-black" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm', fontFamily: "'Segoe UI', 'Noto Sans Arabic', sans-serif", fontSize: '10pt', direction: 'rtl' }}>
      {/* Header with company branding */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #1a365d', paddingBottom: '12px', marginBottom: '16px' }}>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <h1 style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1a365d', margin: 0 }}>{company.nameAr}</h1>
          <p style={{ fontSize: '10pt', color: '#4a5568', margin: '2px 0' }}>{company.nameEn}</p>
          {company.address && <p style={{ fontSize: '8pt', color: '#718096', margin: '2px 0' }}>{company.address}</p>}
          <div style={{ fontSize: '8pt', color: '#718096', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
            {company.phone && <span>هاتف: {company.phone}</span>}
            {company.email && <span>{company.email}</span>}
          </div>
          {company.crNumber && <p style={{ fontSize: '7pt', color: '#a0aec0', margin: '2px 0' }}>س.ت: {company.crNumber} | الرقم الضريبي: {company.vatNumber}</p>}
        </div>
        {company.logo && (
          <div style={{ marginLeft: '16px' }}>
            <img src={company.logo} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px' }} />
          </div>
        )}
      </div>

      {/* Document Title */}
      <div style={{ textAlign: 'center', margin: '12px 0', padding: '8px', backgroundColor: '#edf2f7', borderRadius: '4px' }}>
        <h2 style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1a365d', margin: 0 }}>
          {title.ar} / {title.en}
        </h2>
        <p style={{ fontSize: '10pt', color: '#4a5568', margin: '4px 0' }}>رقم المستند: {documentNumber}</p>
      </div>

      {/* Header Fields - bilingual grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', margin: '12px 0', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
        {headerFields.map((field, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #e2e8f0' }}>
            <span style={{ fontWeight: '600', fontSize: '9pt', color: '#2d3748' }}>{field.labelAr}</span>
            <span style={{ fontSize: '9pt', direction: 'ltr' }}>{field.value ?? '-'}</span>
          </div>
        ))}
      </div>

      {/* Line Items Table */}
      {lineItems && lineItems.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0', fontSize: '9pt' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a365d', color: 'white' }}>
              <th style={{ padding: '6px 8px', textAlign: 'center', width: '30px' }}>#</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>رمز الصنف<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Item Code</span></th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>الوصف<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Description</span></th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>الكمية<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Qty</span></th>
              <th style={{ padding: '6px 8px', textAlign: 'center' }}>الوحدة<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Unit</span></th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>السعر<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Price</span></th>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>الإجمالي<br /><span style={{ fontSize: '7pt', fontWeight: 'normal' }}>Total</span></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f7fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.lineNum}</td>
                <td style={{ padding: '5px 8px' }}>{item.itemCode}</td>
                <td style={{ padding: '5px 8px' }}>{item.description}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '5px 8px', textAlign: 'center' }}>{item.unit || '-'}</td>
                <td style={{ padding: '5px 8px', textAlign: 'left', direction: 'ltr' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'left', direction: 'ltr', fontWeight: '600' }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Totals */}
      {total != null && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '8px 0' }}>
          <div style={{ minWidth: '250px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            {subtotal != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '9pt' }}>المجموع الفرعي / Subtotal</span>
                <span style={{ fontSize: '9pt', direction: 'ltr' }}>{fmt(subtotal)} {currency}</span>
              </div>
            )}
            {taxAmount != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '9pt' }}>ضريبة القيمة المضافة / VAT</span>
                <span style={{ fontSize: '9pt', direction: 'ltr' }}>{fmt(taxAmount)} {currency}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', backgroundColor: '#1a365d', color: 'white' }}>
              <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>الإجمالي / Total</span>
              <span style={{ fontSize: '10pt', fontWeight: 'bold', direction: 'ltr' }}>{fmt(total)} {currency}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div style={{ margin: '12px 0', padding: '8px', backgroundColor: '#fffff0', border: '1px solid #fefcbf', borderRadius: '4px', fontSize: '8pt' }}>
          <strong>ملاحظات / Notes:</strong> {notes}
        </div>
      )}

      {/* Footer fields */}
      {footerFields && footerFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', margin: '8px 0', fontSize: '8pt' }}>
          {footerFields.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>{f.labelAr}</span>
              <span>{f.value ?? '-'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Signature fields */}
      {signatureFields && signatureFields.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px', paddingTop: '16px' }}>
          {signatureFields.map((sig, idx) => (
            <div key={idx} style={{ textAlign: 'center', minWidth: '150px' }}>
              <div style={{ borderBottom: '1px solid #4a5568', height: '40px', marginBottom: '4px' }} />
              <p style={{ fontSize: '8pt', fontWeight: '600' }}>{sig.labelAr}</p>
              <p style={{ fontSize: '7pt', color: '#718096' }}>{sig.labelEn}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', textAlign: 'center', fontSize: '7pt', color: '#a0aec0', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
        <p>هذا المستند تم إنشاؤه إلكترونياً - This document was generated electronically</p>
        <p>{company.nameEn} | {company.nameAr}</p>
      </div>
    </div>
  );
});

ArabicPrintLayout.displayName = 'ArabicPrintLayout';
