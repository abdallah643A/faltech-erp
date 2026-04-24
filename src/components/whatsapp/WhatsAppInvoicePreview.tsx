import { forwardRef } from 'react';

const NAVY = '#1a365d';
const GOLD = '#b8860b';
const LIGHT_BG = '#f8f9fa';
const BORDER = '#dee2e6';

interface InvoiceLine {
  line_num: number;
  item_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit?: string;
  discount_percent?: number;
  line_total: number;
}

interface InvoiceData {
  doc_num?: number;
  doc_date: string;
  customer_name: string;
  customer_code: string;
  customer_phone?: string;
  customer_vat?: string;
  customer_crn?: string;
  branch_name?: string;
  branch_mobile?: string;
  branch_address?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total: number;
  lines: InvoiceLine[];
}

interface WhatsAppInvoicePreviewProps {
  invoice: InvoiceData;
  welcomeMessage?: string;
}

export const WhatsAppInvoicePreview = forwardRef<HTMLDivElement, WhatsAppInvoicePreviewProps>(
  ({ invoice, welcomeMessage }, ref) => {
    const now = new Date();
    const dateStr = invoice.doc_date || now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    return (
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#333', maxWidth: '800px', margin: '0 auto', background: '#fff' }}>
        {/* Welcome Message */}
        {welcomeMessage && (
          <div style={{ background: '#25D366', color: '#fff', padding: '12px 20px', borderRadius: '8px 8px 0 0', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
            {welcomeMessage}
          </div>
        )}

        <div style={{ border: `2px solid ${NAVY}`, borderRadius: welcomeMessage ? '0 0 8px 8px' : '8px' }}>
          {/* Header with Logo & Company Info */}
          <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2d4a7c 100%)`, color: '#fff', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/images/alrajhi-logo.png" alt="Al-Rajhi Logo" style={{ height: '50px', borderRadius: '4px', background: '#fff', padding: '4px' }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>Al-Rajhi Building & Constructions Co.</div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>Trading - Manufacturing - Contracting</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Tahoma, Arial' }}>شركة الراجحي للبناء والتعمير</div>
                <div style={{ fontSize: '11px', opacity: 0.9, fontFamily: 'Tahoma, Arial' }}>تجارة - صناعة - مقاولات</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', opacity: 0.85 }}>
              <span>C.R 1010089808</span>
              <span>VAT No.: 300050645300003</span>
              <span style={{ fontFamily: 'Tahoma, Arial' }}>رقم السجل التجاري: 1010089808</span>
            </div>
          </div>

          {/* Date & Invoice Number Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: LIGHT_BG, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', gap: '24px', fontSize: '12px' }}>
              <span><strong>Date / التاريخ:</strong> {dateStr} {timeStr}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span><strong>Branch / الفرع:</strong> {invoice.branch_name || 'Main'}</span>
            </div>
          </div>

          {/* Tax Invoice Number */}
          <div style={{ textAlign: 'center', padding: '10px 20px', background: GOLD, color: '#fff', fontSize: '14px', fontWeight: 700 }}>
            TAX Invoice Number ( {invoice.doc_num || 'N/A'} ) &nbsp;&nbsp; رقم فاتورة ضريبية
          </div>

          {/* Branch Details */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: NAVY, fontSize: '13px' }}>Branch Details</strong>
              <strong style={{ color: NAVY, fontSize: '13px', fontFamily: 'Tahoma, Arial' }}>بيانات الفرع</strong>
            </div>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', width: '35%' }}>Branch Name: <strong>{invoice.branch_name || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>اسم الفرع: <strong>{invoice.branch_name || '-'}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>Branch Mobile No: <strong>{invoice.branch_mobile || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>رقم جوال الفرع: <strong>{invoice.branch_mobile || '-'}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>Branch Address: <strong>{invoice.branch_address || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>عنوان الفرع: <strong>{invoice.branch_address || '-'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer Details */}
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: LIGHT_BG }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong style={{ color: NAVY, fontSize: '13px' }}>Customer Details</strong>
              <strong style={{ color: NAVY, fontSize: '13px', fontFamily: 'Tahoma, Arial' }}>بيانات العميل</strong>
            </div>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0', width: '50%' }}>Customer Name: <strong>{invoice.customer_name}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>اسم العميل: <strong>{invoice.customer_name}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>Mobile No.: <strong>{invoice.customer_phone || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>رقم الجوال: <strong>{invoice.customer_phone || '-'}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>VAT Reg. No: <strong>{invoice.customer_vat || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>الرقم الضريبي: <strong>{invoice.customer_vat || '-'}</strong></td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>CRN No.: <strong>{invoice.customer_crn || '-'}</strong></td>
                  <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>رقم السجل التجاري: <strong>{invoice.customer_crn || '-'}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Line Items Table */}
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: NAVY, color: '#fff' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Sr.#</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.2)', fontFamily: 'Tahoma, Arial' }}>وصف الصنف</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.2)' }}>Item Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>رقم الصنف<br/>Item Code</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>الوحدة<br/>Unit</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>الكمية<br/>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>السعر<br/>Price</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>إجمالي القيمة<br/>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : LIGHT_BG, borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{line.line_num}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', borderRight: `1px solid ${BORDER}`, fontFamily: 'Tahoma, Arial' }}>{line.description}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'left', borderRight: `1px solid ${BORDER}` }}>{line.description}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{line.item_code}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{line.unit || 'PCS'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{line.quantity.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderRight: `1px solid ${BORDER}` }}>{line.unit_price.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{line.line_total.toFixed(2)}</td>
                  </tr>
                ))}
                {invoice.lines.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No line items</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div style={{ padding: '12px 20px', borderTop: `2px solid ${NAVY}` }}>
            <table style={{ width: '50%', marginLeft: 'auto', fontSize: '13px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>Total Before Discount</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{invoice.subtotal.toFixed(2)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>الإجمالي قبل الخصم</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>Discount</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{(invoice.discount_amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>الخصم</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>Total (Excl. VAT)</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{(invoice.subtotal - (invoice.discount_amount || 0)).toFixed(2)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>صافي القيمة غير شاملة الضريبة</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '6px 12px', fontWeight: 600 }}>VAT Amount 15%</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>{(invoice.tax_amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>ضريبة القيمة المضافة 15%</td>
                </tr>
                <tr style={{ background: NAVY, color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                  <td style={{ padding: '8px 12px' }}>Document Total</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{invoice.total.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'Tahoma, Arial' }}>الإجمالي شامل الضريبة</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ background: LIGHT_BG, borderTop: `3px solid ${GOLD}`, padding: '10px 20px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
            <div>P.O. Box: 35009, Riyadh 11488, Tel: 12985860, Fax: 0112985860/105</div>
          </div>
        </div>
      </div>
    );
  }
);

WhatsAppInvoicePreview.displayName = 'WhatsAppInvoicePreview';
