export const DOCUMENT_TYPES = [
  { value: 'purchase_order', label: 'Purchase Order', labelAr: 'أمر شراء' },
  { value: 'purchase_request', label: 'Purchase Request', labelAr: 'طلب شراء' },
  { value: 'sales_order', label: 'Sales Order', labelAr: 'أمر بيع' },
  { value: 'sales_quotation', label: 'Sales Quotation', labelAr: 'عرض سعر' },
  { value: 'material_request', label: 'Material Request', labelAr: 'طلب مواد' },
  { value: 'ap_invoice', label: 'A/P Invoice', labelAr: 'فاتورة مشتريات' },
  { value: 'ar_invoice', label: 'A/R Invoice', labelAr: 'فاتورة مبيعات' },
  { value: 'delivery_note', label: 'Delivery Note', labelAr: 'إشعار تسليم' },
  { value: 'goods_receipt', label: 'Goods Receipt', labelAr: 'استلام بضائع' },
  { value: 'expense', label: 'Expense Report', labelAr: 'تقرير مصاريف' },
  { value: 'payment', label: 'Payment', labelAr: 'دفعة' },
  { value: 'journal_entry', label: 'Journal Entry', labelAr: 'قيد يومية' },
  { value: 'credit_memo', label: 'Credit Memo', labelAr: 'إشعار دائن' },
  { value: 'return', label: 'Return', labelAr: 'مرتجع' },
  { value: 'inventory_transfer', label: 'Inventory Transfer', labelAr: 'تحويل مخزون' },
  { value: 'production_order', label: 'Production Order', labelAr: 'أمر إنتاج' },
  { value: 'leave_request', label: 'Leave Request', labelAr: 'طلب إجازة' },
  { value: 'asset_disposal', label: 'Asset Disposal', labelAr: 'التخلص من أصل' },
];

export const APPROVAL_LOGIC_OPTIONS = [
  { value: 'all', label: 'All Must Approve', labelAr: 'الكل يجب أن يوافق', description: 'Every assigned approver must approve' },
  { value: 'any', label: 'Any One Approver', labelAr: 'أي موافق واحد', description: 'Only one approval needed to proceed' },
  { value: 'majority', label: 'Majority (>50%)', labelAr: 'الأغلبية (>50%)', description: 'More than half must approve' },
  { value: 'custom_percentage', label: 'Custom Percentage', labelAr: 'نسبة مخصصة', description: 'Define a custom approval threshold' },
];

export const REJECTION_ACTIONS = [
  { value: 'return_creator', label: 'Return to Creator', labelAr: 'إرجاع للمنشئ' },
  { value: 'return_previous', label: 'Return to Previous Stage', labelAr: 'إرجاع للمرحلة السابقة' },
  { value: 'return_specific', label: 'Return to Specific Stage', labelAr: 'إرجاع لمرحلة محددة' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', labelAr: 'منخفض', color: 'text-blue-600' },
  { value: 'medium', label: 'Medium', labelAr: 'متوسط', color: 'text-amber-600' },
  { value: 'high', label: 'High', labelAr: 'مرتفع', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', labelAr: 'حرج', color: 'text-red-600' },
];

export const APPROVER_TYPES = [
  { value: 'user', label: 'Specific User', labelAr: 'مستخدم محدد' },
  { value: 'role', label: 'Role/Department', labelAr: 'دور/قسم' },
  { value: 'manager', label: 'Manager Hierarchy', labelAr: 'التسلسل الإداري' },
  { value: 'group', label: 'User Group', labelAr: 'مجموعة مستخدمين' },
];

export const CONDITION_FIELDS = [
  { value: 'amount', label: 'Document Amount', labelAr: 'مبلغ المستند', type: 'number' },
  { value: 'department', label: 'Department', labelAr: 'القسم', type: 'text' },
  { value: 'branch', label: 'Branch', labelAr: 'الفرع', type: 'text' },
  { value: 'vendor_type', label: 'Vendor Type', labelAr: 'نوع المورد', type: 'text' },
  { value: 'customer_type', label: 'Customer Type', labelAr: 'نوع العميل', type: 'text' },
  { value: 'currency', label: 'Currency', labelAr: 'العملة', type: 'text' },
  { value: 'priority', label: 'Priority', labelAr: 'الأولوية', type: 'select' },
];

export const CONDITION_OPERATORS = [
  { value: 'equals', label: '=', description: 'Equals' },
  { value: 'not_equals', label: '≠', description: 'Not Equals' },
  { value: 'greater_than', label: '>', description: 'Greater Than' },
  { value: 'less_than', label: '<', description: 'Less Than' },
  { value: 'greater_equal', label: '≥', description: 'Greater or Equal' },
  { value: 'less_equal', label: '≤', description: 'Less or Equal' },
  { value: 'between', label: '↔', description: 'Between' },
  { value: 'contains', label: '∈', description: 'Contains' },
  { value: 'in', label: 'IN', description: 'In List' },
];
