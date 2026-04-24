/**
 * Balance Sheet Report Mapping
 * Based on the exact Excel specification from the audit report.
 * Each line maps to GL account ranges with specific balance rules.
 */

export type BalanceRule = 'all' | 'debit_only' | 'credit_only';

export interface BSAccountRange {
  from: string;
  to?: string;
  label_ar: string;
  rule: BalanceRule;
  /** If true, this sub-line is subtracted (provision/allowance) */
  is_deduction?: boolean;
  /** cost center employee filter */
  cost_center_employee?: boolean;
}

export interface BSLineItem {
  order: number;
  label_ar: string;
  label_en: string;
  accounts: BSAccountRange[];
}

export interface BSSectionTotal {
  label_ar: string;
  label_en: string;
  /** References to line item orders to sum */
  sum_orders: number[];
  /** Or references to other section total keys */
  sum_totals?: string[];
}

export interface BSSection {
  key: string;
  header_ar: string;
  header_en: string;
  type: 'header' | 'section';
  lines: BSLineItem[];
  total?: BSSectionTotal;
}

export interface BSReportDefinition {
  sections: BSSection[];
  grandTotals: {
    key: string;
    label_ar: string;
    label_en: string;
    sum_totals: string[];
  }[];
}

export const balanceSheetDefinition: BSReportDefinition = {
  sections: [
    // ===== الموجودات (ASSETS) =====
    {
      key: 'non_current_assets',
      header_ar: 'الموجودات الغير متداولة',
      header_en: 'Non-Current Assets',
      type: 'section',
      lines: [
        {
          order: 1,
          label_ar: 'ممتلكات والات ومعدات',
          label_en: 'Property, Plant & Equipment',
          accounts: [
            { from: '1101', to: '1102', label_ar: 'الأصول الثابته', rule: 'all' },
          ],
        },
        {
          order: 2,
          label_ar: 'موجودات حق الاستخدام',
          label_en: 'Right-of-Use Assets',
          accounts: [
            { from: '1104', label_ar: 'أصول حق الاستخدام', rule: 'all' },
          ],
        },
        {
          order: 3,
          label_ar: 'اعمال رأس مالية قيد الانشاء',
          label_en: 'Capital Work in Progress',
          accounts: [
            { from: '1111', label_ar: 'مشروعات تحت التنفيذ', rule: 'all' },
          ],
        },
        {
          order: 4,
          label_ar: 'موجودات غير ملموسة',
          label_en: 'Intangible Assets',
          accounts: [
            { from: '1103', label_ar: 'أصول غير ملموسه وشهرة', rule: 'all' },
          ],
        },
      ],
      total: {
        label_ar: 'اجمالى الموجودات الغير متداولة',
        label_en: 'Total Non-Current Assets',
        sum_orders: [1, 2, 3, 4],
      },
    },
    {
      key: 'current_assets',
      header_ar: 'الموجودات المتداولة',
      header_en: 'Current Assets',
      type: 'section',
      lines: [
        {
          order: 5,
          label_ar: 'مخزون',
          label_en: 'Inventory',
          accounts: [
            { from: '120201', to: '120204', label_ar: 'المخزون وبضاعة بالطريق', rule: 'all' },
            { from: '220702', label_ar: 'مخصص هبوط في أسعار المخزون', rule: 'all', is_deduction: true },
          ],
        },
        {
          order: 6,
          label_ar: 'مستحق من اطراف ذات علاقه',
          label_en: 'Due from Related Parties',
          accounts: [
            { from: '120901', label_ar: 'اطراف ذوى علاقه', rule: 'debit_only' },
            { from: '220901', label_ar: 'اطراف ذات علاقه دائنه', rule: 'debit_only' },
          ],
        },
        {
          order: 7,
          label_ar: 'ذمم مدينة تجارية',
          label_en: 'Trade Receivables',
          accounts: [
            { from: '120101', to: '120103', label_ar: 'العملاء', rule: 'debit_only' },
            { from: '220701001', label_ar: 'خسائر ائتمانية', rule: 'all', is_deduction: true },
          ],
        },
        {
          order: 8,
          label_ar: 'مصاريف مدفوعة مقدما وموجودات أخرى',
          label_en: 'Prepaid Expenses & Other Assets',
          accounts: [
            { from: '1204', label_ar: 'ضمانات بنكية', rule: 'all' },
            { from: '1210', label_ar: 'دفعات مقدمه', rule: 'all' },
            { from: '2203', label_ar: 'الموردون', rule: 'debit_only' },
            { from: '2204', label_ar: 'مقاولو الباطن', rule: 'debit_only' },
            { from: '1205', label_ar: 'تامينات اعتمادات مستنديه', rule: 'debit_only' },
            { from: '120701', label_ar: 'ذمم موظفين', rule: 'debit_only', cost_center_employee: true },
            { from: '120801', label_ar: 'عهد تشغيل', rule: 'debit_only', cost_center_employee: true },
            { from: '120802', label_ar: 'عهد عينيه', rule: 'debit_only', cost_center_employee: true },
            { from: '120803', label_ar: 'عهد المعارض', rule: 'debit_only' },
            { from: '1206', label_ar: 'مصروفات مدفوعة مقدما', rule: 'debit_only' },
            { from: '121101', label_ar: 'مدينون متنوعون', rule: 'debit_only' },
            { from: '121102', label_ar: 'ارصدة مدينة أخرى', rule: 'debit_only' },
            { from: '221101', label_ar: 'دائنون متنوعون', rule: 'debit_only' },
            { from: '221201', label_ar: 'ارصدة دائنة اخري', rule: 'debit_only' },
            { from: '220701002', label_ar: 'مخصص انخفاض دفعات مقدمة وارصدة مدينة اخرى', rule: 'all', is_deduction: true },
          ],
        },
        {
          order: 9,
          label_ar: 'موجودات العقود',
          label_en: 'Contract Assets',
          accounts: [
            { from: '121201001', label_ar: 'موجودات العقود', rule: 'all' },
            { from: '121201003', label_ar: 'مخصص انخفاض موجودات العقود', rule: 'all', is_deduction: true },
          ],
        },
        {
          order: 10,
          label_ar: 'نقدا وما في حكمه',
          label_en: 'Cash & Cash Equivalents',
          accounts: [
            { from: '1214', label_ar: 'نقديه بالبنوك والصندوق', rule: 'all' },
          ],
        },
      ],
      total: {
        label_ar: 'اجمالى الموجودات المتداولة',
        label_en: 'Total Current Assets',
        sum_orders: [5, 6, 7, 8, 9, 10],
      },
    },

    // ===== حقوق الملكية (EQUITY) =====
    {
      key: 'equity',
      header_ar: 'حقوق الملكية',
      header_en: 'Equity',
      type: 'section',
      lines: [
        {
          order: 11,
          label_ar: 'رأس المال',
          label_en: 'Share Capital',
          accounts: [
            { from: '310101', label_ar: 'راس المال المصدر', rule: 'all' },
          ],
        },
        {
          order: 12,
          label_ar: 'احتياطي نظامى',
          label_en: 'Statutory Reserve',
          accounts: [
            { from: '310201', label_ar: 'احتياطي نظامى', rule: 'all' },
          ],
        },
        {
          order: 13,
          label_ar: 'احتياطي عام',
          label_en: 'General Reserve',
          accounts: [
            { from: '310301', label_ar: 'احتياطي عام', rule: 'all' },
          ],
        },
        {
          order: 14,
          label_ar: 'أرباح مبقاة',
          label_en: 'Retained Earnings',
          accounts: [
            { from: '310501', label_ar: 'أرباح مبقاه', rule: 'all' },
          ],
        },
      ],
      total: {
        label_ar: 'اجمالى حقوق الملكية العائد للشركاء',
        label_en: 'Total Equity Attributable to Shareholders',
        sum_orders: [11, 12, 13, 14],
      },
    },

    // ===== المطلوبات الغير متداولة (NON-CURRENT LIABILITIES) =====
    {
      key: 'non_current_liabilities',
      header_ar: 'المطلوبات الغير متداولة',
      header_en: 'Non-Current Liabilities',
      type: 'section',
      lines: [
        {
          order: 15,
          label_ar: 'تسهيلات بنكية الجزء الغير متداول',
          label_en: 'Non-Current Bank Facilities',
          accounts: [
            { from: '2101', label_ar: 'قروض وتسهيلات طويلة الاجل', rule: 'all' },
          ],
        },
        {
          order: 16,
          label_ar: 'التزامات التاجير الجزء الغير متداول',
          label_en: 'Non-Current Lease Liabilities',
          accounts: [
            { from: '210302', label_ar: 'التزامات عن عقود ايجار تشغيلى طويل الاجل', rule: 'all' },
          ],
        },
        {
          order: 17,
          label_ar: 'مطلوبات تاجير تمويلى الجزء الغير متداول',
          label_en: 'Non-Current Finance Lease Liabilities',
          accounts: [
            { from: '210301', label_ar: 'التزامات عن عقود تمويل تاجيرى طويل الاجل', rule: 'all' },
          ],
        },
        {
          order: 18,
          label_ar: 'التزامات منافع الموظفين',
          label_en: 'Employee Benefits Obligations',
          accounts: [
            { from: '210201', label_ar: 'مزايا نهاية الخدمه للعاملين', rule: 'all' },
          ],
        },
      ],
      total: {
        label_ar: 'اجمالى المطلوبات الغير متداولة',
        label_en: 'Total Non-Current Liabilities',
        sum_orders: [15, 16, 17, 18],
      },
    },

    // ===== المطلوبات المتداولة (CURRENT LIABILITIES) =====
    {
      key: 'current_liabilities',
      header_ar: 'المطلوبات المتداولة',
      header_en: 'Current Liabilities',
      type: 'section',
      lines: [
        {
          order: 19,
          label_ar: 'مستحق الى اطراف ذات علاقة',
          label_en: 'Due to Related Parties',
          accounts: [
            { from: '120901', label_ar: 'اطراف ذوى علاقه', rule: 'credit_only' },
            { from: '220901', label_ar: 'اطراف ذات علاقه دائنه', rule: 'credit_only' },
          ],
        },
        {
          order: 20,
          label_ar: 'تسهيلات بنكية الجزء المتداول',
          label_en: 'Current Bank Facilities',
          accounts: [
            { from: '2201', to: '2202', label_ar: 'تسهيلات بنكية قصيرة الاجل', rule: 'all' },
          ],
        },
        {
          order: 21,
          label_ar: 'التزامات التاجير الجزء المتداول',
          label_en: 'Current Lease Liabilities',
          accounts: [
            { from: '220602', label_ar: 'التزامات عن عقود ايجار تشغيلي قصير الاجل', rule: 'all' },
          ],
        },
        {
          order: 22,
          label_ar: 'مطلوبات التاجير التمويلى الجزء المتداول',
          label_en: 'Current Finance Lease Liabilities',
          accounts: [
            { from: '220601', label_ar: 'التزامات عن عقود تاجير تمويلى قصير الاجل', rule: 'all' },
          ],
        },
        {
          order: 23,
          label_ar: 'ذمم دائنة تجارية ومصاريف مستحقة ومطلوبات أخرى',
          label_en: 'Trade Payables, Accrued Expenses & Other Liabilities',
          accounts: [
            { from: '2203', label_ar: 'الموردون', rule: 'credit_only' },
            { from: '2204', label_ar: 'مقاولو الباطن', rule: 'credit_only' },
            { from: '220703', label_ar: 'مخصصات اخرى', rule: 'credit_only' },
            { from: '220704', label_ar: 'مخصص اجازات للعاملين', rule: 'credit_only' },
            { from: '2210', label_ar: 'ضريبة القيمة المضافة', rule: 'credit_only' },
            { from: '221101', label_ar: 'دائنون متنوعون', rule: 'credit_only' },
            { from: '120101', to: '120103', label_ar: 'العملاء', rule: 'credit_only' },
            { from: '1211', label_ar: 'مدينون متنوعون وارصدة مدينة اخرى', rule: 'credit_only' },
            { from: '221201', label_ar: 'ارصدة دائنة اخري', rule: 'credit_only' },
            { from: '2221', label_ar: 'ضمان حسن تنفيذ', rule: 'credit_only' },
            { from: '120701', label_ar: 'ذمم موظفين', rule: 'credit_only', cost_center_employee: true },
            { from: '120801', label_ar: 'عهد تشغيل', rule: 'credit_only', cost_center_employee: true },
            { from: '120802', label_ar: 'عهد عينيه', rule: 'credit_only', cost_center_employee: true },
            { from: '2213', label_ar: 'مصروفات مستحقه', rule: 'credit_only' },
          ],
        },
        {
          order: 24,
          label_ar: 'مطلوبات العقود',
          label_en: 'Contract Liabilities',
          accounts: [
            { from: '2205', label_ar: 'عملاء دفعات مقدمه', rule: 'all' },
          ],
        },
        {
          order: 25,
          label_ar: 'مخصص الزكاة',
          label_en: 'Zakat Provision',
          accounts: [
            { from: '2208', label_ar: 'مخصص الزكاه', rule: 'all' },
          ],
        },
      ],
      total: {
        label_ar: 'اجمالى المطلوبات المتداولة',
        label_en: 'Total Current Liabilities',
        sum_orders: [19, 20, 21, 22, 23, 24, 25],
      },
    },
  ],

  grandTotals: [
    {
      key: 'total_assets',
      label_ar: 'اجمالى الموجودات',
      label_en: 'Total Assets',
      sum_totals: ['non_current_assets', 'current_assets'],
    },
    {
      key: 'total_equity',
      label_ar: 'اجمالى حقوق الملكية',
      label_en: 'Total Equity',
      sum_totals: ['equity'],
    },
    {
      key: 'total_liabilities',
      label_ar: 'اجمالى المطلوبات',
      label_en: 'Total Liabilities',
      sum_totals: ['non_current_liabilities', 'current_liabilities'],
    },
    {
      key: 'total_equity_and_liabilities',
      label_ar: 'اجمالى حقوق الملكية والمطلوبات',
      label_en: 'Total Equity & Liabilities',
      sum_totals: ['equity', 'non_current_liabilities', 'current_liabilities'],
    },
  ],
};
