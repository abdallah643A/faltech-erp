import { forwardRef } from 'react';
import { format } from 'date-fns';
import { SalesOrderContract, ContractPaymentTerm } from '@/hooks/useSalesOrderContracts';

interface SalesOrderLine {
  line_num: number;
  item_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  tax_code: string | null;
  tax_percent: number | null;
  line_total: number;
  warehouse: string | null;
}

interface ContractPrintViewProps {
  order: SalesOrderContract;
  lines: SalesOrderLine[];
  branchName?: string;
  salesRepName?: string;
  fallbackTotal?: number;
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '0.00';
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: string | null) => {
  if (!date) return '';
  try {
    return format(new Date(date), 'dd/MM/yyyy');
  } catch {
    return date;
  }
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const calculateFinancials = (order: SalesOrderContract, lines: SalesOrderLine[], fallbackTotal = 0) => {
  const orderSubtotal = toNumber(order.subtotal);
  const orderVat = toNumber(order.tax_amount);
  const orderTotal = toNumber(order.total);

  let computedSubtotal = 0;
  let computedVat = 0;

  for (const line of lines) {
    const quantity = toNumber(line.quantity);
    const unitPrice = toNumber(line.unit_price);
    const discountPercent = toNumber(line.discount_percent);
    const taxPercent = line.tax_percent != null ? toNumber(line.tax_percent) : (line.tax_code ? 15 : 0);
    const lineSubtotal = quantity * unitPrice * (1 - discountPercent / 100);
    const lineVat = lineSubtotal * (taxPercent / 100);
    computedSubtotal += lineSubtotal;
    computedVat += lineVat;
  }

  if (computedSubtotal <= 0) {
    const fallbackLinesTotal = lines.reduce((sum, line) => sum + toNumber(line.line_total), 0);
    if (fallbackLinesTotal > 0) {
      const fallbackVatPercent = lines.some(line => line.tax_percent != null || line.tax_code) ? 15 : 0;
      if (fallbackVatPercent > 0) {
        computedSubtotal = fallbackLinesTotal / (1 + fallbackVatPercent / 100);
        computedVat = fallbackLinesTotal - computedSubtotal;
      } else {
        computedSubtotal = fallbackLinesTotal;
        computedVat = 0;
      }
    }
  }

  const safeFallbackTotal = toNumber(fallbackTotal);
  const fallbackSubtotal = safeFallbackTotal > 0 ? safeFallbackTotal / 1.15 : 0;
  const fallbackVatAmount = safeFallbackTotal > 0 ? safeFallbackTotal - fallbackSubtotal : 0;

  const subtotal = orderSubtotal > 0 ? orderSubtotal : computedSubtotal > 0 ? computedSubtotal : fallbackSubtotal;
  const vatAmount = orderVat > 0 ? orderVat : computedVat > 0 ? computedVat : fallbackVatAmount;
  const totalWithVat = orderTotal > 0 ? orderTotal : subtotal + vatAmount;

  return { subtotal, vatAmount, totalWithVat };
};

/* ─── Design tokens ─── */
const NAVY = '#1a365d';
const GOLD = '#b8860b';
const LIGHT_BG = '#f0f4f8';
const BORDER = '#c5d3e0';
const ARABIC_FONT_STACK = "'Noto Sans Arabic', 'Noto Naskh Arabic', 'Tahoma', 'Arial Unicode MS', 'Arial', sans-serif";
const COMPANY_NAME_AR = 'شركة الراجحي للبناء والتعمير';
const FONT = ARABIC_FONT_STACK;
const BASE_SIZE = '14px';

const companyNameArabicStyle: React.CSSProperties = {
  fontFamily: ARABIC_FONT_STACK,
  direction: 'rtl',
  unicodeBidi: 'isolate',
  letterSpacing: '0',
  wordSpacing: '0',
  whiteSpace: 'normal',
};

/** Keeps a section together — never split across pages */
const sectionStyle: React.CSSProperties = {
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
};

const containerStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: BASE_SIZE,
  lineHeight: '1.7',
  direction: 'rtl',
  textAlign: 'right',
  padding: '12mm 15mm',
  width: '210mm',
  boxSizing: 'border-box',
  color: NAVY,
  fontWeight: 'bold',
  backgroundColor: '#fff',
};

export const ContractPrintView = forwardRef<HTMLDivElement, ContractPrintViewProps>(
  ({ order, lines, branchName, salesRepName, fallbackTotal }, ref) => {
    const paymentTerms: ContractPaymentTerm[] = order.payment_terms_details || [];
    const contractNum = order.contract_number || `${order.doc_num}`;
    const { subtotal, vatAmount, totalWithVat } = calculateFinancials(order, lines, fallbackTotal);
    const warrantyDays = order.warranty_period || '120';
    const workDays = order.validity_period || 30;

    return (
      <div ref={ref} style={containerStyle}>
        {/* ─── HEADER ─── */}
        <div style={sectionStyle} data-pdf-section>
          <HeaderSection docDate={order.doc_date} />
          <TitleBanner contractNum={contractNum} />
        </div>

        {/* ─── PARTIES ─── */}
        <div style={sectionStyle} data-pdf-section>
          <PartiesSection order={order} branchName={branchName} salesRepName={salesRepName} />
        </div>

        {/* ─── INTRO ─── */}
        <div style={sectionStyle} data-pdf-section>
          <IntroClause />
        </div>

        {/* ─── TERMS: split into small groups so each stays on one page ─── */}
        <TermsSection
          order={order}
          paymentTerms={paymentTerms}
          subtotal={subtotal}
          vatAmount={vatAmount}
          totalWithVat={totalWithVat}
          warrantyDays={warrantyDays}
          workDays={workDays}
        />

        {/* ─── LINE ITEMS ─── */}
        {lines.length > 0 && (
          <div style={sectionStyle} data-pdf-section>
            <LineItemsDetail lines={lines} />
          </div>
        )}

        {/* ─── VAT SUMMARY ─── */}
        <div style={sectionStyle} data-pdf-section>
          <VATSummary vatAmount={vatAmount} totalWithVat={totalWithVat} subtotal={subtotal} />
        </div>

        {/* ─── ADDITIONAL CLAUSES ─── */}
        <div style={sectionStyle} data-pdf-section>
          <div style={{
            background: LIGHT_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            padding: '14px 18px',
            margin: '14px 0',
          }}>
            <ClauseItem num={23}>
              أقر الطرف الثاني ووافق على أنه في حالة إلغاء العقد من قبله لأي سبب من الأسباب وقد تم البدء بإنتاج جزء من الأعمال فإنه تحسب قيمة الأعمال المنفذة وتكلفة وتجهيز واعداد المخططات ورفع الطبعات وتستقطع من دفعة العميل
            </ClauseItem>
            <ClauseItem num={24}>
              كما وأقر الطرف الثاني ووافق على أنه في حالة إلغاء العقد من قبله لأي سبب من الأسباب يتم حسم 5% من إجمالي قيمة العقد غرامة فسخ التعاقد
            </ClauseItem>
          </div>
        </div>

        {/* ─── THANK YOU ─── */}
        <div style={{ ...sectionStyle, textAlign: 'center', margin: '30px 0 10px', fontSize: '15px', fontWeight: 'bold', color: GOLD, letterSpacing: '0.5px' }} data-pdf-section>
          شاكرين اختياركم لنا وأسعدنا خدمتكم وتلبية طلبكم
        </div>

        {/* ─── SIGNATURES ─── */}
        <div style={sectionStyle} data-pdf-section>
          <SignatureBlock />
        </div>

        {/* ─── FOOTER ─── */}
        <div style={sectionStyle} data-pdf-section>
          <CompanyFooter />
        </div>
      </div>
    );
  }
);

ContractPrintView.displayName = 'ContractPrintView';

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function HeaderSection({ docDate }: { docDate: string }) {
  return (
    <>
      <div style={{ height: '4px', background: `linear-gradient(90deg, ${GOLD}, ${NAVY}, ${GOLD})`, borderRadius: '2px', marginBottom: '10px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <h1 lang="ar" style={{ fontSize: '17px', fontWeight: 'bold', color: NAVY, margin: 0, ...companyNameArabicStyle }}>
            {COMPANY_NAME_AR}
          </h1>
          <p style={{ fontSize: '12px', margin: '2px 0', color: NAVY, fontWeight: 'bold' }}>الرقم الضريبي: 300050645300003</p>
          <p style={{ fontSize: '12px', margin: '2px 0', color: NAVY, fontWeight: 'bold' }}>التاريخ: {formatDate(docDate)}</p>
        </div>
        <div style={{ textAlign: 'center', flex: '0 0 100px' }}>
          <img
            src="/images/alrajhi-logo.png"
            alt="Al-Rajhi Logo"
            loading="eager"
            crossOrigin="anonymous"
            style={{ height: '65px', display: 'block' }}
          />
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: NAVY, margin: 0 }}>
            Al-Rajhi Building &amp; Construction Co.
          </h1>
          <p style={{ fontSize: '12px', margin: '2px 0', color: NAVY, fontWeight: 'bold' }}>VAT No.: 300050645300003</p>
          <p style={{ fontSize: '12px', margin: '2px 0', color: NAVY, fontWeight: 'bold' }}>Date: {formatDate(docDate)}</p>
        </div>
      </div>
      <div style={{ height: '2px', background: NAVY, marginBottom: '8px' }} />
    </>
  );
}

function TitleBanner({ contractNum, small }: { contractNum: string; small?: boolean }) {
  const fs = small ? '16px' : '18px';
  return (
    <div style={{
      textAlign: 'center',
      margin: '8px 0 12px',
      padding: '10px 0',
      background: `linear-gradient(135deg, ${NAVY} 0%, #2a4a7f 100%)`,
      borderRadius: '6px',
      color: '#fff',
    }}>
      <h2 style={{ fontSize: fs, fontWeight: 'bold', margin: 0, color: '#fff' }}>معرض التخصصى</h2>
      <h2 style={{ fontSize: fs, fontWeight: 'bold', margin: '2px 0', color: GOLD }}>( طلب تنفيذ أعمال )</h2>
      <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0', color: '#e2e8f0' }}>{contractNum}</p>
    </div>
  );
}

function PartiesSection({ order, branchName, salesRepName }: {
  order: SalesOrderContract;
  branchName?: string;
  salesRepName?: string;
}) {
  const cellLabel: React.CSSProperties = {
    padding: '5px 10px',
    fontWeight: 'bold',
    color: '#fff',
    background: NAVY,
    fontSize: '13px',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #fff',
  };
  const cellValue: React.CSSProperties = {
    padding: '5px 10px',
    fontWeight: 'bold',
    color: NAVY,
    background: LIGHT_BG,
    fontSize: '13px',
    borderBottom: `1px solid ${BORDER}`,
  };

  return (
    <div style={{ margin: '10px 0', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${NAVY}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={cellLabel}>الطرف الأول السادة/</td>
            <td style={cellValue} lang="ar"><span style={companyNameArabicStyle}>{COMPANY_NAME_AR}</span></td>
            <td style={cellLabel}>مدير المعرض</td>
            <td style={cellValue}>{order.branch_manager_name || salesRepName || ''}</td>
          </tr>
          <tr>
            <td style={cellLabel}>الطرف الثاني العميل/</td>
            <td style={cellValue}>{order.customer_name}</td>
            <td style={cellLabel}>المعرض</td>
            <td style={cellValue}>{branchName || ''}</td>
          </tr>
          <tr>
            <td style={cellLabel}>رقم الجوال</td>
            <td style={cellValue}>{order.customer_mobile || order.contact_person || ''}</td>
            <td style={cellLabel}>جوال الفرع</td>
            <td style={cellValue}>{order.branch_mobile || ''}</td>
          </tr>
          <tr>
            <td style={cellLabel}>المدينة</td>
            <td style={cellValue}>{order.customer_city || order.shipping_address || ''}</td>
            <td style={cellLabel}>وكيل أو مفوض</td>
            <td style={cellValue}></td>
          </tr>
          <tr>
            <td style={cellLabel}>هوية رقم</td>
            <td style={cellValue}>{order.customer_national_id || ''}</td>
            <td style={cellLabel}>سجل تجاري</td>
            <td style={cellValue}>{order.customer_cr || ''}</td>
          </tr>
          <tr>
            <td style={{ ...cellLabel, borderBottom: 'none' }}>الرقم الضريبي</td>
            <td colSpan={3} style={{ ...cellValue, borderBottom: 'none' }}>{order.customer_vat_number || order.billing_address || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function IntroClause() {
  return (
    <div style={{
      margin: '8px 0',
      padding: '10px 14px',
      background: LIGHT_BG,
      borderRight: `4px solid ${GOLD}`,
      borderRadius: '0 6px 6px 0',
      fontSize: BASE_SIZE,
      lineHeight: '1.8',
      color: NAVY,
      fontWeight: 'bold',
    }}>
      بناء على رغبة وطلب الطرف الثاني (العميل) قيام الطرف الأول بتنفيذ أعمال مصممة أو زخرفة الديكور والحديد ومشغولاته في الموقع العائد إليه ودراستها حسب المخططات المعتمدة وطبقاً للمواصفات والمقاسات الفنية المطلوبة خلال مدة أقصاها 7 أيام لاعتماد الرسومات وذلك وفقاً لما يلي
    </div>
  );
}

function ClauseItem({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-start',
      margin: '4px 0',
      fontSize: BASE_SIZE,
      color: NAVY,
      fontWeight: 'bold',
      lineHeight: '1.8',
      breakInside: 'avoid',
      pageBreakInside: 'avoid',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '26px',
        height: '26px',
        borderRadius: '50%',
        background: NAVY,
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold',
        flexShrink: 0,
        marginTop: '3px',
      }}>{num}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

function TermsSection({ order, paymentTerms, subtotal, vatAmount, totalWithVat, warrantyDays, workDays }: {
  order: SalesOrderContract;
  paymentTerms: ContractPaymentTerm[];
  subtotal: number;
  vatAmount: number;
  totalWithVat: number;
  warrantyDays: string;
  workDays: number;
}) {
  const paymentText = paymentTerms.length > 0
    ? paymentTerms.map(t => `${t.description} (${t.percentage}%)`).join(' - ')
    : 'أ-(%50) عند التوقيع    ب-(%25) قبل التوريد    ج-(%25) بعد التوريد وقبل التركيب';

  const totalContractValue = order.contract_value || totalWithVat || 0;

  const wrapStyle: React.CSSProperties = {
    margin: '6px 0',
    padding: '10px 14px',
    border: `1px solid ${BORDER}`,
    borderRadius: '6px',
    background: '#fff',
  };

  /* Group clauses in small batches so each group stays together */
  return (
    <div style={wrapStyle}>
      {/* Group 1: clauses 1-4 with payment box */}
      <div style={sectionStyle} data-pdf-section>
        <ClauseItem num={1}>
          يرغب الطرف الثاني بتنفيذ أعمال من نوع (<span style={{ color: GOLD }}>{order.scope_of_work || 'فايبر جلاس'}</span>)
        </ClauseItem>
        <ClauseItem num={2}>
          تحسب شبابيك الحديد أو الألمنيوم ما هو أقل من المتر بمثل سعر المتر
        </ClauseItem>
        <ClauseItem num={3}>
          القيمة التقريبية للعقد بمبلغ <span style={{ color: GOLD, textDecoration: 'underline' }}>{formatCurrency(subtotal)}</span> ريال والعبرة بالتمتير النهائي على الطبيعة بالزيادة أو النقصان
        </ClauseItem>
        <ClauseItem num={4}>
          تكون الدفعات والسداد على النحو التالي:
        </ClauseItem>
        <div style={{ margin: '2px 40px', fontSize: BASE_SIZE, color: NAVY, fontWeight: 'bold', background: LIGHT_BG, padding: '6px 12px', borderRadius: '4px' }}>
          {paymentText}
          <br />
          د- الأعمال التي تقل قيمتها عن مبلغ ({formatCurrency(totalContractValue)}) عشرة آلاف تدفع مقدماً عند توقيع العقد
        </div>
      </div>

      {/* Group 2: clauses 5-8 */}
      <div style={sectionStyle} data-pdf-section>
        <ClauseItem num={5}>تكون الأعمال بموجب المستخلصات وحسب سير العمل على ألا تتعدى قيمة التوريد المبالغ المسددة</ClauseItem>
        <ClauseItem num={6}>
          مدة العمل (<span style={{ color: GOLD }}>{workDays}</span>) يوماً عمل ابتداء من جاهزية الموقع وبعد اعتماد الرسومات مع توقيع العميل على استيلام المتانيع بمواصفات الأعمال بالموقع
        </ClauseItem>
        <ClauseItem num={7}>أي أعمال إضافية أو تعديل أو تغيير تكون بموجب ملحق مرفق وتوضح فيها جميع الأسعار وكذلك المدة المعتمدة بعد موافقة الطرف الأول عليها</ClauseItem>
        <ClauseItem num={8}>في حال التأخير بالسداد والدفعات تضاف مدة التأخير إلى مدة العمل، وفي حالة مضي مدة أسبوعين وعدم التزام الطرف الثاني يحق للطرف الأول إيقاف العمل كلياً وسحب التوريدات من الموقع</ClauseItem>
      </div>

      {/* Group 3: clauses 9-12 */}
      <div style={sectionStyle} data-pdf-section>
        <ClauseItem num={9}>يكون التمتير بالمتر المربع للأبواب من أعلى نقطة في الباب، إذا كان هناك تيجان وبالنسبة للأعمدة فيكون التمتير لجميع الأوجه الأربعة بالمتر المربع ويعتبر للديكور للأبواب لوجهة واحد فقط، حال وجود براويز للأبواب يتم إحتسابها ضمن التمتير، ويكون التمتير للدرابزينات بالمتر الطولي</ClauseItem>
        <ClauseItem num={10}>جميع المساكات والكوالين على حساب الطرف الثاني ويقوم بتوفيرها عنده بدء التركيب بالموقع</ClauseItem>
        <ClauseItem num={11}>للكسان لون (&nbsp;&nbsp;&nbsp;&nbsp;) سماكة (&nbsp;&nbsp;&nbsp;&nbsp;) أما الدهان نوعية ماس لون (&nbsp;&nbsp;&nbsp;&nbsp;) ما عدا الألوان الخشبية على مسئولية الطرف الثاني ولا يشملها أي ضمان أو مسئولية من الطرف الأول ولا تثبيت جميع أعمال التيجان والزجاج بأحدى الطرق (البراغي-سيليكون-شتوب وسيط)</ClauseItem>
        <ClauseItem num={12}>
          يمنح الطرف الثاني مدة ضمان خلال (<span style={{ color: GOLD }}>{warrantyDays}</span>) يوماً فقط في حال وجود أي ملاحظات يتم إصلاحها بالشكل المناسب وتبدأ من بعد سداد الدفعة النهائية
        </ClauseItem>
      </div>

      {/* Group 4: clauses 13-16 */}
      <div style={sectionStyle} data-pdf-section>
        <ClauseItem num={13}>أي إصلاح أو تعديل أو تغيير أو سوء استخدام يكون على مسئولية الطرف الثاني ولا يشمل ذلك أي ضمان في التصنيع أو المؤتمرات أو الصيانة أو خلافة</ClauseItem>
        <ClauseItem num={14}>في حال انتهاء مدة العمل المحددة في البند (6) وتأجيل الطرف الثاني تنفيذ بعض أو جميع الأعمال فيحق للطرف الأول رفض أو قبول أو قبول مواصلة تنفيذ الطلب والنظر بأي فارق سعر القيمة العمل مالم يكون هناك إشعاراً خطياً سابقاً بهذا الخصوص</ClauseItem>
        <ClauseItem num={15}>يلتزم الطرف الثاني بدفع كامل قيمة العقد بأي حال من الأحوال إذا ثبت قيامه باستكمال الأعمال بدون علم موافقة الطرف الأول</ClauseItem>
        <ClauseItem num={16}>أي إصلاح أو ملاحظات أو غيرها بعد مضي مدة الضمان وفقاً للبند (13) تكون بسعر متفق عليه باعتبارها أعمال صيانة مدفوعة الأجر</ClauseItem>
      </div>

      {/* Group 5: clauses 17-22 */}
      <div style={sectionStyle} data-pdf-section>
        <ClauseItem num={17}>على طرف الثاني السداد بشيك أو بحوالة بنكية على حساب الراجحي</ClauseItem>
        <ClauseItem num={18}>للاستفسار والملاحظات الاتصال على خدمة العملاء (920001943) وإيميل (info@rajhisteel.com.sa)</ClauseItem>
        <ClauseItem num={19}>أقر الطرف الثاني إنه بناءً على طلبه ورغبته تمت الموافقة بعد اطلاعه جيداً على جميع بنود مذكور في هذا الطلب وعلى ذلك جرى التوقيع</ClauseItem>
        <ClauseItem num={20}>في حالة عدم إلتزام الطرف الثاني بالدفعة المقررة خلال أسبوعين من تاريخ إشعاره يحق للطرف الأول وقف الأعمال وسحب التوريدات ومطالبة الطرف الثاني بأي خسائر يتكبدها</ClauseItem>
        <ClauseItem num={21}>
          ضريبة القيمة المضافة 15%&nbsp;&nbsp;&nbsp;(<span style={{ color: GOLD }}>{formatCurrency(vatAmount)}</span>)&nbsp;&nbsp;&nbsp;ريال سعودي
        </ClauseItem>
        <ClauseItem num={22}>جميع الأبواب الحديد تكون وجه واحد فقط من الأمام وفي حال طلب الطرف الثاني الأبواب وجهين أمامي وخلفي يتم ذكرها في شرح البند وإضافة السعر المتفق عليه بين الطرفين</ClauseItem>
      </div>
    </div>
  );
}

function LineItemsDetail({ lines }: { lines: SalesOrderLine[] }) {
  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontWeight: 'bold',
    color: '#fff',
    background: NAVY,
    fontSize: '13px',
    textAlign: 'center',
    borderBottom: `2px solid ${GOLD}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontWeight: 'bold',
    color: NAVY,
    fontSize: '13px',
    textAlign: 'center',
    borderBottom: `1px solid ${BORDER}`,
  };

  return (
    <div style={{ margin: '12px 0' }}>
      <div style={{
        background: NAVY,
        color: '#fff',
        padding: '6px 14px',
        borderRadius: '6px 6px 0 0',
        fontSize: '14px',
        fontWeight: 'bold',
      }}>
        تفاصيل الأعمال
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${NAVY}`, borderTop: 'none' }}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>الوصف</th>
            <th style={thStyle}>الكود</th>
            <th style={thStyle}>الكمية</th>
            <th style={thStyle}>سعر الوحدة</th>
            <th style={thStyle}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : LIGHT_BG, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <td style={tdStyle}>{idx + 1}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>توريد وتركيب {line.description}</td>
              <td style={tdStyle}>{line.item_code || '-'}</td>
              <td style={tdStyle}>{line.quantity}</td>
              <td style={tdStyle}>{formatCurrency(line.unit_price)}</td>
              <td style={{ ...tdStyle, color: GOLD }}>{formatCurrency(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VATSummary({ vatAmount, totalWithVat, subtotal }: { vatAmount: number; totalWithVat: number; subtotal: number }) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 14px',
    fontSize: BASE_SIZE,
    fontWeight: 'bold',
    color: NAVY,
  };
  return (
    <div style={{
      margin: '10px 0',
      border: `2px solid ${NAVY}`,
      borderRadius: '6px',
      overflow: 'hidden',
      width: '280px',
      marginRight: 'auto',
      marginLeft: '0',
    }}>
      <div style={{ ...rowStyle, background: LIGHT_BG }}>
        <span>المجموع قبل الضريبة</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div style={{ ...rowStyle, borderTop: `1px solid ${BORDER}` }}>
        <span>ضريبة القيمة المضافة 15%</span>
        <span>{formatCurrency(vatAmount)}</span>
      </div>
      <div style={{
        ...rowStyle,
        background: NAVY,
        color: GOLD,
        fontSize: '15px',
      }}>
        <span>الإجمالي شامل الضريبة</span>
        <span>{formatCurrency(totalWithVat)}</span>
      </div>
    </div>
  );
}

function SignatureBlock() {
  const boxStyle: React.CSSProperties = {
    flex: 1,
    border: `2px solid ${NAVY}`,
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
  };
  return (
    <div style={{ display: 'flex', gap: '30px', margin: '30px 0' }}>
      <div style={boxStyle}>
        <div style={{
          background: NAVY,
          color: '#fff',
          padding: '6px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          <span lang="ar" style={companyNameArabicStyle}>{COMPANY_NAME_AR}</span>
        </div>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>الاسم: ................................................</p>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>التوقيع: .............................................</p>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold' }}>التاريخ: .............................................</p>
      </div>
      <div style={boxStyle}>
        <div style={{
          background: GOLD,
          color: '#fff',
          padding: '6px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}>
          صاحب الطلب - العميل
        </div>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>الاسم: ................................................</p>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>التوقيع: .............................................</p>
        <p style={{ color: NAVY, fontSize: '13px', fontWeight: 'bold' }}>التاريخ: .............................................</p>
      </div>
    </div>
  );
}

function CompanyFooter() {
  return (
    <div style={{
      borderTop: `2px solid ${NAVY}`,
      marginTop: '12px',
      paddingTop: '8px',
      textAlign: 'center',
      fontSize: '11px',
      lineHeight: '1.6',
      color: NAVY,
      fontWeight: 'bold',
    }}>
      <div style={{ height: '2px', background: `linear-gradient(90deg, ${GOLD}, ${NAVY}, ${GOLD})`, marginBottom: '8px', borderRadius: '1px' }} />
      <p style={{ margin: 0 }}>المملكة العربية السعودية - الرياض - ص.ب :35009 - الرمز :11488 - تليفون 966112982272 - فاكس :966114222521</p>
      <p style={{ margin: '1px 0' }}>سجل تجاري رقم : 1010089808 - عضوية الغرفة التجارية 40821</p>
      <p style={{ margin: '1px 0', direction: 'ltr', textAlign: 'center' }}>Kingdom of Saudi Arabia - P.O.Box: 35009 - Riyadh: 11488 - Tel: 966112982272 - Fax: 966114222521 - C.R.: 1010089808</p>
      <p style={{ margin: '1px 0', direction: 'ltr', textAlign: 'center', color: GOLD }}>www.alrajhi-co.sa | info@alrajhi-co.sa</p>
    </div>
  );
}
