// IFRS Default Chart of Accounts Template
export interface IFRSAccount {
  code: string;
  name: string;
  nameAr: string;
  parentCode: string | null;
  type: 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Cost of Sales' | 'Operating Expenses' | 'Other Income' | 'Other Expenses';
  group: string;
  level: number;
  isTitle: boolean;
  currencyControl: string;
  active: boolean;
  cashFlowCategory: string;
}

export const IFRS_DEFAULT_COA: IFRSAccount[] = [
  // ASSETS
  { code: '1000', name: 'Assets', nameAr: 'الأصول', parentCode: null, type: 'Assets', group: 'Assets', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '1100', name: 'Current Assets', nameAr: 'الأصول المتداولة', parentCode: '1000', type: 'Assets', group: 'Current Assets', level: 2, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '1110', name: 'Cash and Cash Equivalents', nameAr: 'النقد وما يعادله', parentCode: '1100', type: 'Assets', group: 'Current Assets', level: 3, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1111', name: 'Cash on Hand', nameAr: 'النقد في الصندوق', parentCode: '1110', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1112', name: 'Cash at Bank - Current Account', nameAr: 'النقد في البنك - حساب جاري', parentCode: '1110', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1113', name: 'Short-Term Deposits', nameAr: 'ودائع قصيرة الأجل', parentCode: '1110', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1114', name: 'Petty Cash', nameAr: 'المصروفات النثرية', parentCode: '1110', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1120', name: 'Trade and Other Receivables', nameAr: 'الذمم المدينة التجارية والأخرى', parentCode: '1100', type: 'Assets', group: 'Current Assets', level: 3, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1121', name: 'Trade Receivables - Domestic', nameAr: 'ذمم مدينة تجارية - محلية', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1122', name: 'Trade Receivables - Foreign', nameAr: 'ذمم مدينة تجارية - أجنبية', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Foreign', active: true, cashFlowCategory: 'Operating' },
  { code: '1123', name: 'Allowance for Doubtful Debts', nameAr: 'مخصص الديون المشكوك فيها', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1124', name: 'Notes Receivable', nameAr: 'أوراق قبض', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1125', name: 'Employee Receivables', nameAr: 'ذمم الموظفين', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1126', name: 'Advances to Suppliers', nameAr: 'سلف للموردين', parentCode: '1120', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1130', name: 'Inventories', nameAr: 'المخزون', parentCode: '1100', type: 'Assets', group: 'Current Assets', level: 3, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1131', name: 'Raw Materials', nameAr: 'مواد خام', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1132', name: 'Work in Progress', nameAr: 'إنتاج تحت التشغيل', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1133', name: 'Finished Goods', nameAr: 'بضاعة تامة الصنع', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1134', name: 'Merchandise', nameAr: 'بضاعة للمتاجرة', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1135', name: 'Goods in Transit', nameAr: 'بضاعة بالطريق', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1136', name: 'Inventory Provision', nameAr: 'مخصص تدني المخزون', parentCode: '1130', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1140', name: 'Prepayments and Accrued Income', nameAr: 'مصروفات مدفوعة مقدماً وإيرادات مستحقة', parentCode: '1100', type: 'Assets', group: 'Current Assets', level: 3, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '1141', name: 'Prepaid Insurance', nameAr: 'تأمين مدفوع مقدماً', parentCode: '1140', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1142', name: 'Prepaid Rent', nameAr: 'إيجار مدفوع مقدماً', parentCode: '1140', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1143', name: 'Other Prepayments', nameAr: 'مصروفات مدفوعة مقدماً أخرى', parentCode: '1140', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1144', name: 'Accrued Income', nameAr: 'إيرادات مستحقة', parentCode: '1140', type: 'Assets', group: 'Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '1150', name: 'VAT Input', nameAr: 'ضريبة القيمة المضافة - مدخلات', parentCode: '1100', type: 'Assets', group: 'Current Assets', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // Non-Current Assets
  { code: '1200', name: 'Non-Current Assets', nameAr: 'الأصول غير المتداولة', parentCode: '1000', type: 'Assets', group: 'Non-Current Assets', level: 2, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '1210', name: 'Property, Plant and Equipment', nameAr: 'الممتلكات والمصانع والمعدات', parentCode: '1200', type: 'Assets', group: 'Non-Current Assets', level: 3, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1211', name: 'Land', nameAr: 'أراضي', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1212', name: 'Buildings', nameAr: 'مباني', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1213', name: 'Machinery and Equipment', nameAr: 'آلات ومعدات', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1214', name: 'Motor Vehicles', nameAr: 'مركبات', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1215', name: 'Office Equipment', nameAr: 'أثاث ومعدات مكتبية', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1216', name: 'Computer Equipment', nameAr: 'أجهزة حاسوب', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1217', name: 'Leasehold Improvements', nameAr: 'تحسينات مستأجرة', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1218', name: 'Accumulated Depreciation - Buildings', nameAr: 'مجمع الاستهلاك - مباني', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1219', name: 'Accumulated Depreciation - Equipment', nameAr: 'مجمع الاستهلاك - معدات', parentCode: '1210', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1220', name: 'Intangible Assets', nameAr: 'الأصول غير الملموسة', parentCode: '1200', type: 'Assets', group: 'Non-Current Assets', level: 3, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1221', name: 'Goodwill', nameAr: 'شهرة المحل', parentCode: '1220', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1222', name: 'Software', nameAr: 'برامج حاسوب', parentCode: '1220', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1223', name: 'Patents and Licenses', nameAr: 'براءات اختراع وتراخيص', parentCode: '1220', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1224', name: 'Amortization - Intangibles', nameAr: 'مجمع الإطفاء - أصول غير ملموسة', parentCode: '1220', type: 'Assets', group: 'Non-Current Assets', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '1230', name: 'Right-of-Use Assets', nameAr: 'أصول حق الاستخدام', parentCode: '1200', type: 'Assets', group: 'Non-Current Assets', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },
  { code: '1240', name: 'Long-Term Investments', nameAr: 'استثمارات طويلة الأجل', parentCode: '1200', type: 'Assets', group: 'Non-Current Assets', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Investing' },
  { code: '1250', name: 'Deferred Tax Assets', nameAr: 'أصول ضريبية مؤجلة', parentCode: '1200', type: 'Assets', group: 'Non-Current Assets', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // LIABILITIES
  { code: '2000', name: 'Liabilities', nameAr: 'الالتزامات', parentCode: null, type: 'Liabilities', group: 'Liabilities', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '2100', name: 'Current Liabilities', nameAr: 'الالتزامات المتداولة', parentCode: '2000', type: 'Liabilities', group: 'Current Liabilities', level: 2, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '2110', name: 'Trade and Other Payables', nameAr: 'الذمم الدائنة التجارية والأخرى', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '2111', name: 'Trade Payables - Domestic', nameAr: 'ذمم دائنة تجارية - محلية', parentCode: '2110', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2112', name: 'Trade Payables - Foreign', nameAr: 'ذمم دائنة تجارية - أجنبية', parentCode: '2110', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Foreign', active: true, cashFlowCategory: 'Operating' },
  { code: '2113', name: 'Notes Payable', nameAr: 'أوراق دفع', parentCode: '2110', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '2114', name: 'Accrued Expenses', nameAr: 'مصروفات مستحقة', parentCode: '2110', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2115', name: 'Customer Advances', nameAr: 'دفعات مقدمة من العملاء', parentCode: '2110', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '2120', name: 'Employee Benefits Payable', nameAr: 'مستحقات الموظفين', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2121', name: 'Salaries and Wages Payable', nameAr: 'رواتب وأجور مستحقة', parentCode: '2120', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2122', name: 'Social Insurance Payable', nameAr: 'تأمينات اجتماعية مستحقة', parentCode: '2120', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2123', name: 'End of Service Benefits - Current', nameAr: 'مكافأة نهاية الخدمة - جاري', parentCode: '2120', type: 'Liabilities', group: 'Current Liabilities', level: 4, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2130', name: 'VAT Output', nameAr: 'ضريبة القيمة المضافة - مخرجات', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2131', name: 'Withholding Tax Payable', nameAr: 'ضريبة استقطاع مستحقة', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2140', name: 'Short-Term Borrowings', nameAr: 'قروض قصيرة الأجل', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Financing' },
  { code: '2150', name: 'Current Portion of Long-Term Debt', nameAr: 'الجزء المتداول من القروض طويلة الأجل', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Financing' },
  { code: '2160', name: 'Dividends Payable', nameAr: 'أرباح مستحقة التوزيع', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },
  { code: '2170', name: 'Retention Payable', nameAr: 'مبالغ محتجزة مستحقة', parentCode: '2100', type: 'Liabilities', group: 'Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  
  // Non-Current Liabilities
  { code: '2200', name: 'Non-Current Liabilities', nameAr: 'الالتزامات غير المتداولة', parentCode: '2000', type: 'Liabilities', group: 'Non-Current Liabilities', level: 2, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '2210', name: 'Long-Term Borrowings', nameAr: 'قروض طويلة الأجل', parentCode: '2200', type: 'Liabilities', group: 'Non-Current Liabilities', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Financing' },
  { code: '2220', name: 'Lease Liabilities', nameAr: 'التزامات الإيجار', parentCode: '2200', type: 'Liabilities', group: 'Non-Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },
  { code: '2230', name: 'End of Service Benefits - Non-Current', nameAr: 'مكافأة نهاية الخدمة - غير متداول', parentCode: '2200', type: 'Liabilities', group: 'Non-Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2240', name: 'Deferred Tax Liabilities', nameAr: 'التزامات ضريبية مؤجلة', parentCode: '2200', type: 'Liabilities', group: 'Non-Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '2250', name: 'Provision for Warranties', nameAr: 'مخصص الكفالات', parentCode: '2200', type: 'Liabilities', group: 'Non-Current Liabilities', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // EQUITY
  { code: '3000', name: 'Equity', nameAr: 'حقوق الملكية', parentCode: null, type: 'Equity', group: 'Equity', level: 1, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3100', name: 'Share Capital', nameAr: 'رأس المال', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },
  { code: '3200', name: 'Share Premium', nameAr: 'علاوة إصدار', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },
  { code: '3300', name: 'Statutory Reserve', nameAr: 'احتياطي نظامي', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3400', name: 'General Reserve', nameAr: 'احتياطي عام', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3500', name: 'Retained Earnings', nameAr: 'أرباح مبقاة', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3600', name: 'Current Year Profit/Loss', nameAr: 'ربح/خسارة العام الحالي', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3700', name: 'Foreign Currency Translation Reserve', nameAr: 'فروقات ترجمة العملات', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: '' },
  { code: '3800', name: 'Treasury Shares', nameAr: 'أسهم الخزينة', parentCode: '3000', type: 'Equity', group: 'Equity', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Financing' },

  // REVENUE
  { code: '4000', name: 'Revenue', nameAr: 'الإيرادات', parentCode: null, type: 'Revenue', group: 'Revenue', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '4100', name: 'Sales Revenue', nameAr: 'إيرادات المبيعات', parentCode: '4000', type: 'Revenue', group: 'Revenue', level: 2, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '4110', name: 'Product Sales - Domestic', nameAr: 'مبيعات المنتجات - محلية', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '4120', name: 'Product Sales - Export', nameAr: 'مبيعات المنتجات - تصدير', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'Foreign', active: true, cashFlowCategory: 'Operating' },
  { code: '4130', name: 'Service Revenue', nameAr: 'إيرادات الخدمات', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '4140', name: 'Contract Revenue', nameAr: 'إيرادات العقود', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '4150', name: 'Sales Returns and Allowances', nameAr: 'مردودات ومسموحات المبيعات', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '4160', name: 'Sales Discounts', nameAr: 'خصم المبيعات', parentCode: '4100', type: 'Revenue', group: 'Revenue', level: 3, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },

  // COST OF SALES
  { code: '5000', name: 'Cost of Sales', nameAr: 'تكلفة المبيعات', parentCode: null, type: 'Cost of Sales', group: 'Cost of Sales', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '5100', name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '5200', name: 'Cost of Services', nameAr: 'تكلفة الخدمات', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '5300', name: 'Direct Labor', nameAr: 'عمالة مباشرة', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '5400', name: 'Manufacturing Overhead', nameAr: 'تكاليف صناعية غير مباشرة', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '5500', name: 'Contract Costs', nameAr: 'تكاليف العقود', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '5600', name: 'Inventory Write-Downs', nameAr: 'تخفيض قيمة المخزون', parentCode: '5000', type: 'Cost of Sales', group: 'Cost of Sales', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // OPERATING EXPENSES
  { code: '6000', name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', parentCode: null, type: 'Operating Expenses', group: 'Operating Expenses', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '6100', name: 'Selling and Distribution Expenses', nameAr: 'مصروفات البيع والتوزيع', parentCode: '6000', type: 'Operating Expenses', group: 'Operating Expenses', level: 2, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6110', name: 'Sales Salaries', nameAr: 'رواتب المبيعات', parentCode: '6100', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6120', name: 'Sales Commission', nameAr: 'عمولات المبيعات', parentCode: '6100', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6130', name: 'Advertising and Marketing', nameAr: 'إعلان وتسويق', parentCode: '6100', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6140', name: 'Shipping and Delivery', nameAr: 'شحن وتسليم', parentCode: '6100', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6150', name: 'Travel and Entertainment', nameAr: 'سفر وضيافة', parentCode: '6100', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6200', name: 'General and Administrative Expenses', nameAr: 'مصروفات عمومية وإدارية', parentCode: '6000', type: 'Operating Expenses', group: 'Operating Expenses', level: 2, isTitle: true, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6210', name: 'Management Salaries', nameAr: 'رواتب الإدارة', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6220', name: 'Staff Benefits', nameAr: 'مزايا الموظفين', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6230', name: 'Office Rent', nameAr: 'إيجار المكتب', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6240', name: 'Utilities', nameAr: 'مرافق عامة', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6250', name: 'Depreciation Expense', nameAr: 'مصروف الاستهلاك', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6260', name: 'Amortization Expense', nameAr: 'مصروف الإطفاء', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6270', name: 'Insurance Expense', nameAr: 'مصروف التأمين', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6280', name: 'Professional Fees', nameAr: 'أتعاب مهنية', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6290', name: 'IT and Communication', nameAr: 'تقنية المعلومات والاتصالات', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6295', name: 'Bank Charges', nameAr: 'مصاريف بنكية', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6296', name: 'Government Fees', nameAr: 'رسوم حكومية', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6297', name: 'Maintenance and Repairs', nameAr: 'صيانة وإصلاحات', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6298', name: 'Stationery and Office Supplies', nameAr: 'قرطاسية ولوازم مكتبية', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '6299', name: 'Miscellaneous Expenses', nameAr: 'مصروفات متنوعة', parentCode: '6200', type: 'Operating Expenses', group: 'Operating Expenses', level: 3, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // OTHER INCOME
  { code: '7000', name: 'Other Income', nameAr: 'إيرادات أخرى', parentCode: null, type: 'Other Income', group: 'Other Income', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '7100', name: 'Interest Income', nameAr: 'إيرادات فوائد', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Investing' },
  { code: '7200', name: 'Dividend Income', nameAr: 'إيرادات أرباح موزعة', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Investing' },
  { code: '7300', name: 'Gain on Disposal of Assets', nameAr: 'أرباح التخلص من الأصول', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '7400', name: 'Foreign Exchange Gain', nameAr: 'أرباح فروقات عملة', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '7500', name: 'Rental Income', nameAr: 'إيرادات إيجار', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '7900', name: 'Sundry Income', nameAr: 'إيرادات متنوعة', parentCode: '7000', type: 'Other Income', group: 'Other Income', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },

  // OTHER EXPENSES
  { code: '8000', name: 'Other Expenses', nameAr: 'مصروفات أخرى', parentCode: null, type: 'Other Expenses', group: 'Other Expenses', level: 1, isTitle: true, currencyControl: 'All', active: true, cashFlowCategory: '' },
  { code: '8100', name: 'Finance Costs', nameAr: 'تكاليف التمويل', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Financing' },
  { code: '8200', name: 'Loss on Disposal of Assets', nameAr: 'خسائر التخلص من الأصول', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Investing' },
  { code: '8300', name: 'Foreign Exchange Loss', nameAr: 'خسائر فروقات عملة', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'All', active: true, cashFlowCategory: 'Operating' },
  { code: '8400', name: 'Impairment Losses', nameAr: 'خسائر انخفاض القيمة', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '8500', name: 'Zakat / Income Tax', nameAr: 'الزكاة / ضريبة الدخل', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
  { code: '8900', name: 'Sundry Expenses', nameAr: 'مصروفات متنوعة أخرى', parentCode: '8000', type: 'Other Expenses', group: 'Other Expenses', level: 2, isTitle: false, currencyControl: 'Local', active: true, cashFlowCategory: 'Operating' },
];
