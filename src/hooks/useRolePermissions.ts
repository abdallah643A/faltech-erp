import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// Map route paths to module keys used in the Authorization page
const routeToModuleKey: Record<string, string> = {
  '/': 'dashboard',
  '/leads': 'leads',
  '/opportunities': 'opportunities',
  '/activities': 'activities',
  '/tasks': 'tasks',
  '/visits': 'visits',
  '/visit-analytics': 'visitAnalytics',
  '/business-partners': 'businessPartners',
  '/items': 'items',
  '/quotes': 'quotes',
  '/quotes/new': 'quotes',
  '/sales-orders': 'salesOrders',
  '/ar-invoices': 'arInvoices',
  '/ar-credit-memos': 'arInvoices',
  '/ar-returns': 'arInvoices',
  '/delivery-notes': 'salesOrders',
  '/incoming-payments': 'incomingPayments',
  '/material-requests': 'materialRequests',
  '/material-requests/workflow-settings': 'mrWorkflow',
  '/finance': 'financeOverview',
  '/finance-gates': 'financeGates',
  '/finance-dashboard': 'financeOverview',
  '/financial-control': 'financeOverview',
  '/executive-finance': 'financeOverview',
  '/general-ledger': 'financeOverview',
  '/journal-entries': 'financeOverview',
  '/financial-periods': 'financeOverview',
  '/financial-statements': 'financeOverview',
  '/financial-reports': 'financeOverview',
  '/chart-of-accounts': 'financeOverview',
  '/budget-setup': 'financeOverview',
  '/cost-accounting': 'financeOverview',
  '/fixed-assets': 'financeOverview',
  '/dunning': 'financeOverview',
  '/bank-reconciliation': 'financeOverview',
  '/landed-costs': 'financeOverview',
  '/zatca': 'financeOverview',
  '/banking/exchange-rates': 'financeOverview',
  '/banking/statements': 'financeOverview',
  '/banking/reconciliation': 'financeOverview',
  '/banking/outgoing-payments': 'financeOverview',
  '/banking/dashboard': 'financeOverview',
  '/hr': 'hrDashboard',
  '/hr/employees': 'employees',
  '/hr/departments': 'departments',
  '/hr/positions': 'positions',
  '/hr/leave': 'leaveManagement',
  '/hr/attendance': 'attendance',
  '/hr/payroll': 'payroll',
  '/hr/performance': 'performance',
  '/hr/training': 'hrDashboard',
  '/hr/recruitment': 'hrDashboard',
  '/hr/ksa-compliance': 'hrDashboard',
  '/technical-assessment': 'technicalAssessment',
  '/design-costing': 'designCosting',
  '/manufacturing': 'manufacturing',
  '/delivery-installation': 'deliveryInstallation',
  '/pm/projects': 'projects',
  '/targets': 'targets',
  '/assets': 'assets',
  '/it-service': 'itService',
  '/reports': 'reports',
  '/admin': 'adminPanel',
  '/admin/general-settings': 'adminSettings',
  '/admin/tax-groups': 'adminSettings',
  '/admin/payment-terms': 'adminSettings',
  '/admin/banks': 'adminSettings',
  '/admin/customer-groups': 'adminSettings',
  '/admin/vendor-groups': 'adminSettings',
  '/admin/print-preferences': 'adminSettings',
  '/admin/document-settings': 'adminSettings',
  '/admin/posting-periods': 'adminSettings',
  '/admin/document-numbering': 'adminSettings',
  '/admin/exchange-rates': 'adminSettings',
  '/admin/user-defaults': 'adminSettings',
  '/admin/authorizations': 'adminPanel',
  '/admin/alerts-management': 'adminPanel',
  '/admin/license-admin': 'adminPanel',
  '/admin/addon-manager': 'adminPanel',
  '/admin/work-list': 'adminPanel',
  '/admin/opening-balances': 'adminSettings',
  '/admin/implementation-center': 'adminPanel',
  '/admin/email-settings': 'adminSettings',
  '/admin/help-content': 'adminPanel',
  '/admin/menu-structure': 'adminPanel',
  '/admin/menu-alias': 'adminPanel',
  '/admin/configuration-management': 'adminPanel',
  '/admin/path-settings': 'adminSettings',
  '/admin-settings': 'adminSettings',
  '/users': 'users',
  '/workflow': 'workflow',
  '/authorization': 'authorization',
  '/document-authorizations': 'authorization',
  '/sap-integration': 'sapIntegration',
  '/whatsapp-settings': 'whatsappSettings',
  '/user-config': 'adminPanel',
  '/region-config': 'adminPanel',
  '/payment-certificates': 'projects',
  '/payment-certificate-types': 'projects',
  '/procurement': 'materialRequests',
  '/procurement-analytics': 'materialRequests',
  '/contract-progress': 'salesOrders',
  '/sales-pipeline': 'leads',
  '/customer-360': 'businessPartners',
  '/cadences': 'leads',
  '/follow-up-automation': 'leads',
  '/advanced-analytics': 'reports',
  '/sales-dashboard': 'salesOrders',
  '/pos': 'salesOrders',
  '/bank-pos': 'adminPanel',
  '/email-templates': 'adminPanel',
  '/document-management': 'adminPanel',
  '/elevenlabs-settings': 'adminSettings',
  '/sla-configuration': 'adminSettings',
  '/mail-configuration': 'adminSettings',
  '/numbering-series': 'adminSettings',
  '/sales-employees': 'adminSettings',
  '/dimensions': 'adminSettings',
  '/payment-means-settings': 'adminSettings',
  '/sync-error-logs': 'sapIntegration',
  '/sap-databases': 'sapIntegration',
  '/warehouses': 'adminSettings',
  '/price-lists': 'adminSettings',
  '/tax-codes': 'adminSettings',
  '/company-settings': 'adminSettings',
  '/user-defaults': 'adminSettings',
  '/approval-workflows': 'workflow',
  '/questionnaires': 'adminPanel',
  '/inventory/goods-receipt': 'assets',
  '/inventory/goods-issue': 'assets',
  '/inventory/stock-transfer': 'assets',
  '/inventory/counting': 'assets',
  '/inventory/bin-locations': 'assets',
  '/inventory/batch-serial': 'assets',
  '/inventory/item-warehouse': 'assets',
  '/inventory-dashboard': 'assets',
  '/cpms': 'projects',
  '/cpms/daily-reports': 'projects',
  '/cpms/costs': 'projects',
  '/cpms/billing': 'projects',
  '/cpms/documents': 'projects',
  '/cpms/hse': 'projects',
  '/cpms/tenders': 'projects',
  '/cpms/resources': 'projects',
  '/cpms/clients': 'projects',
  '/cpms/finance': 'projects',
  '/pmo/portfolio': 'projects',
  '/pmo/executive': 'projects',
  '/pmo/lessons': 'projects',
  '/tmo': 'projects',
  '/tmo/executive': 'projects',
  '/bids': 'projects',
  '/unified-executive': 'reports',
  '/qto': 'projects',
  '/boq': 'projects',
  '/evm': 'projects',
  '/industry-intelligence': 'reports',
  '/project-control': 'projects',
  '/what-if-analysis': 'projects',
  '/opportunity-reports': 'reports',
  '/service-module': 'itService',
  '/bill-of-materials': 'manufacturing',
  '/mrp-planning': 'manufacturing',
  '/pick-and-pack': 'deliveryInstallation',
  '/quality-management': 'manufacturing',
  '/audit-trail': 'adminPanel',
  '/form-settings': 'adminSettings',
  '/alerts-management': 'adminPanel',
  '/drag-and-relate': 'adminPanel',
  '/print-layout-designer': 'adminSettings',
  '/whatsapp-invoice': 'salesOrders',
  '/workspace-config': 'adminSettings',
  '/saas': 'adminPanel',
  '/saas/clients': 'adminPanel',
  '/saas/plans': 'adminPanel',
  '/saas/module-matrix': 'adminPanel',
  '/saas/seats': 'adminPanel',
  '/saas/security': 'adminPanel',
  '/saas/billing': 'adminPanel',
  '/saas/audit-log': 'adminPanel',
};

// Map sidebar nav label keys to module keys
export const navLabelToModuleKey: Record<string, string> = {
  'nav.dashboard': 'dashboard',
  'nav.leads': 'leads',
  'nav.opportunities': 'opportunities',
  'nav.activities': 'activities',
  'nav.tasks': 'tasks',
  'nav.visits': 'visits',
  'nav.visitAnalytics': 'visitAnalytics',
  'nav.businessPartners': 'businessPartners',
  'nav.items': 'items',
  'nav.quotes': 'quotes',
  'nav.salesOrders': 'salesOrders',
  'nav.arInvoices': 'arInvoices',
  'nav.incomingPayments': 'incomingPayments',
  'nav.materialRequests': 'materialRequests',
  'nav.financeOverview': 'financeOverview',
  'nav.financeGates': 'financeGates',
  'nav.hrDashboard': 'hrDashboard',
  'nav.employees': 'employees',
  'nav.departments': 'departments',
  'nav.positions': 'positions',
  'nav.leaveManagement': 'leaveManagement',
  'nav.attendance': 'attendance',
  'nav.payroll': 'payroll',
  'nav.performance': 'performance',
  'nav.technicalAssessment': 'technicalAssessment',
  'nav.designCosting': 'designCosting',
  'nav.manufacturing': 'manufacturing',
  'nav.deliveryInstallation': 'deliveryInstallation',
  'nav.projects': 'projects',
  'nav.targets': 'targets',
  'nav.assets': 'assets',
  'nav.itService': 'itService',
  'nav.reports': 'reports',
  'nav.admin': 'adminPanel',
  'nav.adminSettings': 'adminSettings',
  'nav.users': 'users',
  'nav.workflows': 'workflow',
  'nav.mrWorkflow': 'mrWorkflow',
  'nav.authorization': 'authorization',
  'nav.sapIntegration': 'sapIntegration',
  'nav.whatsappSettings': 'whatsappSettings',
  'nav.regionConfig': 'adminPanel',
  'nav.userConfig': 'adminPanel',
  'nav.financeGate1': 'financeGates',
  'nav.financeGate2': 'financeGates',
  'nav.procurement': 'materialRequests',
  'nav.finalPayment': 'financeGates',
  'nav.paymentCertificates': 'projects',
};

export function useRolePermissions() {
  const { roles, loading: authLoading } = useAuth();
  const userRole = roles[0] || '';
  const isAdmin = roles.includes('admin' as any);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions', userRole],
    queryFn: async () => {
      if (!userRole || isAdmin) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_key', userRole);
      if (error) throw error;
      return data;
    },
    enabled: !!userRole && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const permissionsMap = new Map(
    permissions.map(p => [p.module_key, {
      view: p.can_view,
      create: p.can_create,
      edit: p.can_edit,
      delete: p.can_delete,
    }])
  );

  const canViewModule = (moduleKey: string): boolean => {
    // Admin always has access
    if (isAdmin) return true;
    // If no permissions configured yet, allow access (backwards compat)
    if (permissions.length === 0) return true;
    return permissionsMap.get(moduleKey)?.view ?? false;
  };

  const canViewRoute = (path: string): boolean => {
    const moduleKey = routeToModuleKey[path];
    if (!moduleKey) return true; // Unknown routes are allowed
    return canViewModule(moduleKey);
  };

  const canViewByLabel = (labelKey: string): boolean => {
    const moduleKey = navLabelToModuleKey[labelKey];
    if (!moduleKey) return true;
    return canViewModule(moduleKey);
  };

  const getModulePermission = (moduleKey: string): ModulePermission => {
    if (isAdmin) return { view: true, create: true, edit: true, delete: true };
    return permissionsMap.get(moduleKey) || { view: false, create: false, edit: false, delete: false };
  };

  return {
    canViewModule,
    canViewRoute,
    canViewByLabel,
    getModulePermission,
    loading: authLoading || isLoading,
    isAdmin,
  };
}
