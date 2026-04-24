import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProgressProvider } from "@/contexts/SyncProgressContext";
import { WorkspaceTabsProvider } from "@/contexts/WorkspaceTabsContext";
import { IndustryThemeProvider } from "@/contexts/IndustryThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { QAModeProvider } from "@/contexts/QAModeContext";
import { DashboardPeriodProvider } from "@/contexts/DashboardPeriodContext";
const ExecutiveBriefPage = lazy(() => import("./pages/ExecutiveBriefPage"));
const ExecutiveReportingHub = lazy(() => import("./pages/executive/ExecutiveReportingHub"));
import { KeyboardShortcutsDialog } from "@/components/accessibility/KeyboardShortcutsDialog";
import "@/styles/industry-themes.css";
import TranslationOverlay from "@/components/translation/TranslationOverlay";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MobileRedirect } from "@/components/mobile/MobileRedirect";
import { Loader2 } from "lucide-react";
const MobileHome = lazy(() => import("./pages/mobile/MobileHome"));
const MobileWMS = lazy(() => import("./pages/mobile/MobileWMS"));
const MobileCPMS = lazy(() => import("./pages/mobile/MobileCPMS"));
const MobileField = lazy(() => import("./pages/mobile/MobileField"));
const MMobilePOS = lazy(() => import("./pages/mobile/MobilePOS"));
const MMobileBanking = lazy(() => import("./pages/mobile/MobileBanking"));
import { MobileComingSoon } from "./pages/mobile/MobileComingSoon";

// Eagerly loaded (critical path)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Index from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
const CreateCompanyWizard = lazy(() => import("./pages/CreateCompanyWizard"));
const CopyCompanyWizard = lazy(() => import("./pages/CopyCompanyWizard"));
const CostCenterDimensions = lazy(() => import("./pages/CostCenterDimensions"));
const MetadataStudio = lazy(() => import("./pages/MetadataStudio"));
const QueryStudio = lazy(() => import("./pages/QueryStudio"));
const ReportStudio = lazy(() => import("./pages/ReportStudio"));

// Lazy-loaded pages
const Leads = lazy(() => import("./pages/Leads"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const Quotes = lazy(() => import("./pages/Quotes"));
const BusinessPartners = lazy(() => import("./pages/BusinessPartners"));
const Targets = lazy(() => import("./pages/Targets"));
const Activities = lazy(() => import("./pages/Activities"));
const Tasks = lazy(() => import("./pages/Tasks"));
const CalendarModule = lazy(() => import("./pages/CalendarModule"));
const Assets = lazy(() => import("./pages/Assets"));
const ITService = lazy(() => import("./pages/ITService"));
const Reports = lazy(() => import("./pages/Reports"));
const Users = lazy(() => import("./pages/Users"));
const Workflow = lazy(() => import("./pages/Workflow"));
const SalesOrders = lazy(() => import("./pages/SalesOrders"));
const ARInvoices = lazy(() => import("./pages/ARInvoices"));
const IncomingPayments = lazy(() => import("./pages/IncomingPayments"));
const Items = lazy(() => import("./pages/Items"));
const Visits = lazy(() => import("./pages/Visits"));
const VisitAnalytics = lazy(() => import("./pages/VisitAnalytics"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const SAPIntegration = lazy(() => import("./pages/SAPIntegration"));
const SAPSyncControlCenter = lazy(() => import("./pages/SAPSyncControlCenter"));
const IntegrationDashboard = lazy(() => import("./pages/integration/IntegrationDashboard"));
const IntegrationApiManagement = lazy(() => import("./pages/integration/IntegrationApiManagement"));
const IntegrationWebhooks = lazy(() => import("./pages/integration/IntegrationWebhooks"));
const IntegrationTemplates = lazy(() => import("./pages/integration/IntegrationTemplates"));
const IntegrationConnectorsDocs = lazy(() => import("./pages/integration/IntegrationConnectorsDocs"));
const IntegrationMonitoring = lazy(() => import("./pages/integration/IntegrationMonitoring"));
const GlobalComplianceDashboard = lazy(() => import("./pages/global-compliance/GlobalComplianceDashboard"));
const CountryPacks = lazy(() => import("./pages/global-compliance/CountryPacks"));
const RuleEngine = lazy(() => import("./pages/global-compliance/RuleEngine"));
const LegalEntityCompliance = lazy(() => import("./pages/global-compliance/LegalEntityCompliance"));
const LocalizationAssets = lazy(() => import("./pages/global-compliance/LocalizationAssets"));
const StatutoryReports = lazy(() => import("./pages/global-compliance/StatutoryReports"));
const PersonalDashboardBuilder = lazy(() => import("./pages/PersonalDashboardBuilder"));
const RolloutCockpit = lazy(() => import("./pages/RolloutCockpit"));
const ScreenBuilder = lazy(() => import("./pages/ScreenBuilder"));
const RoleWorkspaces = lazy(() => import("./pages/RoleWorkspaces"));
const SaasOverview = lazy(() => import("./pages/saas/SaasOverview"));
const SaasClients = lazy(() => import("./pages/saas/SaasClients"));
const SaasClientDetail = lazy(() => import("./pages/saas/SaasClientDetail"));
const SaasPlans = lazy(() => import("./pages/saas/SaasPlans"));
const SaasModuleMatrixPage = lazy(() => import("./pages/saas/SaasModuleMatrixPage"));
const SaasSeats = lazy(() => import("./pages/saas/SaasSeats"));
const SaasSecurity = lazy(() => import("./pages/saas/SaasSecurity"));
const SaasBilling = lazy(() => import("./pages/saas/SaasBilling"));
const SaasAuditLog = lazy(() => import("./pages/saas/SaasAuditLog"));
const PortalAdminHub = lazy(() => import("./pages/portal-admin/PortalAdminHub"));
const UnifiedPortalAdmin = lazy(() => import("./pages/portal-admin/UnifiedPortalAdmin"));
const PortalDocumentExchange = lazy(() => import("./pages/portal-admin/PortalDocumentExchange"));
const PortalRFQResponses = lazy(() => import("./pages/portal-admin/PortalRFQResponses"));
const PortalApprovalTasks = lazy(() => import("./pages/portal-admin/PortalApprovalTasks"));
const SaasSeatGovernance = lazy(() => import("./pages/portal-admin/SaasSeatGovernance"));
const WhiteLabelBuilder = lazy(() => import("./pages/portal-admin/WhiteLabelBuilder"));
const PortalSecurityPolicies = lazy(() => import("./pages/portal-admin/PortalSecurityPolicies"));
const PortalLocales = lazy(() => import("./pages/portal-admin/PortalLocales"));
const PortalServiceRequests = lazy(() => import("./pages/portal-admin/PortalServiceRequests"));
const PortalSubscriptionRequests = lazy(() => import("./pages/portal-admin/PortalSubscriptionRequests"));
const TenantSSOConfig = lazy(() => import("./pages/portal-admin/TenantSSOConfig"));
const PortalLoginHeatmap = lazy(() => import("./pages/portal-admin/PortalLoginHeatmap"));
const PortalActivityFeed = lazy(() => import("./pages/portal-admin/PortalActivityFeed"));
const RFQAINormalizer = lazy(() => import("./pages/portal-admin/RFQAINormalizer"));
const TenantAnalyticsDashboard = lazy(() => import("./pages/portal-admin/TenantAnalyticsDashboard"));
const PortalSubmitServiceRequest = lazy(() => import("./pages/portal/PortalSubmitServiceRequest"));
const SupplierPortalAdminHub = lazy(() => import("./pages/supplier-portal-admin/SupplierPortalAdminHub"));
const SupplierPrequalification = lazy(() => import("./pages/supplier-portal-admin/SupplierPrequalification"));
const SupplierDisputes = lazy(() => import("./pages/supplier-portal-admin/SupplierDisputes"));
const SupplierProfileApprovals = lazy(() => import("./pages/supplier-portal-admin/SupplierProfileApprovals"));
const SupplierComplianceTracker = lazy(() => import("./pages/supplier-portal-admin/SupplierComplianceTracker"));
const SupplierScorecardPublishing = lazy(() => import("./pages/supplier-portal-admin/SupplierScorecardPublishing"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HRDashboard = lazy(() => import("./pages/hr/HRDashboard"));
const HospitalDashboard = lazy(() => import("./pages/hospital/HospitalDashboard"));
const HospitalReception = lazy(() => import("./pages/hospital/HospitalReception"));
const HospitalPatientFile = lazy(() => import("./pages/hospital/PatientFile"));
const HospitalOPD = lazy(() => import("./pages/hospital/HospitalOPD"));
const HospitalER = lazy(() => import("./pages/hospital/HospitalER"));
const HospitalInpatient = lazy(() => import("./pages/hospital/HospitalInpatient"));
const HospitalBedManagement = lazy(() => import("./pages/hospital/BedManagement"));
const HospitalPharmacy = lazy(() => import("./pages/hospital/HospitalPharmacy"));
const HospitalBilling = lazy(() => import("./pages/hospital/HospitalBilling"));
const HospitalDischarge = lazy(() => import("./pages/hospital/HospitalDischarge"));
const HospitalOR = lazy(() => import("./pages/hospital/HospitalOR"));
const HospitalICU = lazy(() => import("./pages/hospital/HospitalICU"));
const HospitalNICU = lazy(() => import("./pages/hospital/HospitalNICU"));
const HospitalLab = lazy(() => import("./pages/hospital/HospitalLab"));
const HospitalRadiology = lazy(() => import("./pages/hospital/HospitalRadiology"));
const HospitalInsurance = lazy(() => import("./pages/hospital/HospitalInsurance"));
const HospitalReports = lazy(() => import("./pages/hospital/HospitalReports"));
const HospitalEquipment = lazy(() => import("./pages/hospital/HospitalEquipment"));
const HospitalAppointments = lazy(() => import("./pages/hospital/HospitalAppointments"));
const HospPatientMaster = lazy(() => import("./pages/hospital/PatientMasterPage"));
const HospTriage = lazy(() => import("./pages/hospital/TriageAssessmentPage"));
const HospCPOE = lazy(() => import("./pages/hospital/PhysicianOrdersPage"));
const HospPreauth = lazy(() => import("./pages/hospital/InsurancePreauthPage"));
const HospDischargePlan = lazy(() => import("./pages/hospital/DischargePlanningPage"));
const HospMedicalBilling = lazy(() => import("./pages/hospital/MedicalBillingPage"));
const HospPatientComms = lazy(() => import("./pages/hospital/PatientCommunicationsPage"));
const HospInterop = lazy(() => import("./pages/hospital/InteropEndpointsPage"));
const HospClinicalKPI = lazy(() => import("./pages/hospital/ClinicalKPIDashboardPage"));
const Employees = lazy(() => import("./pages/hr/Employees"));
const Departments = lazy(() => import("./pages/hr/Departments"));
const Positions = lazy(() => import("./pages/hr/Positions"));
const LeaveManagement = lazy(() => import("./pages/hr/LeaveManagement"));
const Attendance = lazy(() => import("./pages/hr/Attendance"));
const Payroll = lazy(() => import("./pages/hr/Payroll"));
const Performance = lazy(() => import("./pages/hr/Performance"));
const Training = lazy(() => import("./pages/hr/Training"));
const Recruitment = lazy(() => import("./pages/hr/RecruitmentOnboarding"));
const EmployeeSelfService = lazy(() => import("./pages/hr/EmployeeSelfService"));
const Projects = lazy(() => import("./pages/pm/Projects"));
const ProjectDetails = lazy(() => import("./pages/pm/ProjectDetails"));
const KanbanBoard = lazy(() => import("./pages/pm/KanbanBoard"));
const GanttChart = lazy(() => import("./pages/pm/GanttChart"));
const MaterialRequests = lazy(() => import("./pages/MaterialRequests"));
const MRWorkflowSettings = lazy(() => import("./pages/MRWorkflowSettings"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const TranslationManager = lazy(() => import("./pages/admin/TranslationManager"));
const NotificationsInbox = lazy(() => import("./pages/NotificationsInbox"));
const GroupStructure = lazy(() => import("./pages/admin/GroupStructure"));
const PostingCalendar = lazy(() => import("./pages/admin/PostingCalendar"));
const SetupWizard = lazy(() => import("./pages/admin/SetupWizard"));
const ImplementationChecklist = lazy(() => import("./pages/admin/ImplementationChecklist"));
const Finance = lazy(() => import("./pages/Finance"));
const FinCoaByEntity = lazy(() => import("./pages/finance/CoaByEntity"));
const FinDimensionAccounting = lazy(() => import("./pages/finance/DimensionAccounting"));
const FinRecurringJERunner = lazy(() => import("./pages/finance/RecurringJERunner"));
const FinEliminationsWorkflow = lazy(() => import("./pages/finance/EliminationsWorkflow"));
const FinSensitiveApprovals = lazy(() => import("./pages/finance/SensitiveApprovals"));
const FinStatementDesigner = lazy(() => import("./pages/finance/FinancialStatementDesigner"));
const FinAuditPacks = lazy(() => import("./pages/finance/AuditPacks"));
const FinIFRSReportingViews = lazy(() => import("./pages/finance/IFRSReportingViews"));
const FinTaxLocalization = lazy(() => import("./pages/finance/TaxLocalization"));
const FinControllerDashboard = lazy(() => import("./pages/finance/ControllerDashboard"));
const TechnicalAssessment = lazy(() => import("./pages/TechnicalAssessment"));
const DesignCosting = lazy(() => import("./pages/DesignCosting"));
const Manufacturing = lazy(() => import("./pages/Manufacturing"));
const DeliveryInstallation = lazy(() => import("./pages/DeliveryInstallation"));
const FinanceGates = lazy(() => import("./pages/FinanceGates"));
const PaymentCertificates = lazy(() => import("./pages/PaymentCertificates"));
const PaymentCertificateTypes = lazy(() => import("./pages/PaymentCertificateTypes"));
const UserConfig = lazy(() => import("./pages/UserConfig"));
const RegionConfig = lazy(() => import("./pages/RegionConfig"));
const ProcurementDashboard = lazy(() => import("./pages/procurement/ProcurementDashboard"));
const ProjectProcurementDashboard = lazy(() => import("./pages/procurement/ProjectProcurementDashboard"));
const ProcurementHub = lazy(() => import("./pages/procurement/ProcurementHub"));
const SupplierManagement = lazy(() => import("./pages/procurement/SupplierManagement"));
const CustomerQuestionnaire = lazy(() => import("./pages/CustomerQuestionnaire"));
const ContractProgress = lazy(() => import("./pages/ContractProgress"));
const SLAConfiguration = lazy(() => import("./pages/SLAConfiguration"));
const MailConfiguration = lazy(() => import("./pages/MailConfiguration"));
const WhatsAppInvoice = lazy(() => import("./pages/WhatsAppInvoice"));
const NumberingSeries = lazy(() => import("./pages/NumberingSeries"));
const SalesEmployees = lazy(() => import("./pages/SalesEmployees"));
const Dimensions = lazy(() => import("./pages/Dimensions"));
const PaymentMeansSettings = lazy(() => import("./pages/PaymentMeansSettings"));
const SyncErrorLogs = lazy(() => import("./pages/SyncErrorLogs"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const PriceLists = lazy(() => import("./pages/PriceLists"));
const TaxCodes = lazy(() => import("./pages/TaxCodes"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const GoodsReceipt = lazy(() => import("./pages/inventory/GoodsReceipt"));
const GoodsIssue = lazy(() => import("./pages/inventory/GoodsIssue"));
const StockTransfer = lazy(() => import("./pages/inventory/StockTransfer"));
const InventoryCounting = lazy(() => import("./pages/inventory/InventoryCounting"));
const BinLocations = lazy(() => import("./pages/inventory/BinLocations"));
const BatchSerialTracking = lazy(() => import("./pages/inventory/BatchSerialTracking"));
const ItemWarehouseInfo = lazy(() => import("./pages/inventory/ItemWarehouseInfo"));
const MobileReceiving = lazy(() => import("./pages/wms/MobileReceiving"));
const MobilePutaway = lazy(() => import("./pages/wms/MobilePutaway"));
const PickingQueue = lazy(() => import("./pages/wms/PickingQueue"));
const BatchWaveBuilder = lazy(() => import("./pages/wms/BatchWaveBuilder"));
const PackingStation = lazy(() => import("./pages/wms/PackingStation"));
const LoadingDispatch = lazy(() => import("./pages/wms/LoadingDispatch"));
const CycleCountMobile = lazy(() => import("./pages/wms/CycleCountMobile"));
const LotSerialInquiry = lazy(() => import("./pages/wms/LotSerialInquiry"));
const WarehouseHeatmap = lazy(() => import("./pages/wms/WarehouseHeatmap"));
const ExceptionConsole = lazy(() => import("./pages/wms/ExceptionConsole"));
const TransferExecution = lazy(() => import("./pages/wms/TransferExecution"));
const ReturnHandling = lazy(() => import("./pages/wms/ReturnHandling"));
const BarcodeRFIDTools = lazy(() => import("./pages/wms/BarcodeRFIDTools"));
const ARCreditMemos = lazy(() => import("./pages/ARCreditMemos"));
const ARReturns = lazy(() => import("./pages/ARReturns"));
const Customer360 = lazy(() => import("./pages/Customer360"));
const SalesPipeline = lazy(() => import("./pages/SalesPipeline"));
const POSQuickSale = lazy(() => import("./pages/POSQuickSale"));
const POSDashboardPage = lazy(() => import("./pages/pos/POSDashboard"));
const POSTerminalPage = lazy(() => import("./pages/pos/POSTerminal"));
const POSSessionsPage = lazy(() => import("./pages/pos/POSSessions"));
const POSTransactionsPage = lazy(() => import("./pages/pos/POSTransactions"));
const POSTransactionDetailPage = lazy(() => import("./pages/pos/POSTransactionDetail"));
const POSReturnsPage = lazy(() => import("./pages/pos/POSReturns"));
const POSSettingsPage = lazy(() => import("./pages/pos/POSSettings"));
const POSChecklistsPage = lazy(() => import("./pages/pos/POSChecklists"));
const CashierProductivityPage = lazy(() => import("./pages/pos/CashierProductivity"));
const BankPOSSettings = lazy(() => import("./pages/BankPOSSettings"));
const POSCardReconciliation = lazy(() => import("./pages/POSCardReconciliation"));
const FollowUpAutomation = lazy(() => import("./pages/FollowUpAutomation"));
const Cadences = lazy(() => import("./pages/Cadences"));
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"));
const EmailTemplates = lazy(() => import("./pages/EmailTemplates"));
const EmailAutomation = lazy(() => import("./pages/EmailAutomation"));
const EmailSignatures = lazy(() => import("./pages/EmailSignatures"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const DocumentManagement = lazy(() => import("./pages/DocumentManagement"));
const ElevenLabsSettings = lazy(() => import("./pages/ElevenLabsSettings"));
const DeliveryNotes = lazy(() => import("./pages/DeliveryNotes"));
const ExchangeRates = lazy(() => import("./pages/banking/ExchangeRates"));
const BankStatements = lazy(() => import("./pages/banking/BankStatements"));
const PaymentReconciliation = lazy(() => import("./pages/banking/PaymentReconciliation"));
const OutgoingPayments = lazy(() => import("./pages/banking/OutgoingPayments"));
const BankingDashboard = lazy(() => import("./pages/banking/BankingDashboard"));
const CashFlowForecasting = lazy(() => import("./pages/banking/CashFlowForecasting"));
const CashFlowScenarios = lazy(() => import("./pages/banking/CashFlowScenarios"));
const CashPositionDashboard = lazy(() => import("./pages/banking/CashPositionDashboard"));
const SmartReconciliation = lazy(() => import("./pages/banking/SmartReconciliation"));
const MultiBankRecon = lazy(() => import("./pages/banking/MultiBankRecon"));
const ReconExceptions = lazy(() => import("./pages/banking/ReconExceptions"));
const PaymentOptimization = lazy(() => import("./pages/banking/PaymentOptimization"));
const BankingKPIDashboard = lazy(() => import("./pages/banking/BankingKPIDashboard"));
const BankingDrillDown = lazy(() => import("./pages/banking/BankingDrillDown"));
const BankingVarianceAnalysis = lazy(() => import("./pages/banking/BankingVarianceAnalysis"));
const BankingAgingAnalysis = lazy(() => import("./pages/banking/BankingAgingAnalysis"));
const MobileBankingDashboard = lazy(() => import("./pages/banking/MobileBankingDashboard"));
const AIBankingInsights = lazy(() => import("./pages/banking/AIBankingInsights"));
const BankingWorkflowAutomation = lazy(() => import("./pages/banking/BankingWorkflowAutomation"));
const EnhancedExchangeRates = lazy(() => import("./pages/banking/EnhancedExchangeRates"));
const BankStatementAutomation = lazy(() => import("./pages/banking/BankStatementAutomation"));
const BankingComplianceAudit = lazy(() => import("./pages/banking/BankingComplianceAudit"));
const ApprovalWorkflows = lazy(() => import("./pages/ApprovalWorkflows"));
const ApprovalInbox = lazy(() => import("./pages/ApprovalInbox"));
const ApprovalStagesPage = lazy(() => import("./pages/approval/ApprovalStages"));
const ApprovalTemplatesPage = lazy(() => import("./pages/approval/ApprovalTemplates"));
const ApprovalStatusReportPage = lazy(() => import("./pages/approval/ApprovalStatusReport"));
const ApprovalDecisionReportPage = lazy(() => import("./pages/approval/ApprovalDecisionReport"));
const SubstituteAuthorizerPage = lazy(() => import("./pages/approval/SubstituteAuthorizer"));
const ApprovalDelegations = lazy(() => import("./pages/approvals/ApprovalDelegations"));
const ApprovalSLADashboard = lazy(() => import("./pages/approvals/ApprovalSLADashboard"));
const SignatureAuditViewer = lazy(() => import("./pages/signatures/SignatureAuditViewer"));
const WorkflowSimulator = lazy(() => import("./pages/workflow/WorkflowSimulator"));
const LowcodePublishGovernance = lazy(() => import("./pages/lowcode/LowcodePublishGovernance"));
const UnifiedAuditSearch = lazy(() => import("./pages/audit/UnifiedAuditSearch"));
const CRMDedupeQueue = lazy(() => import("./pages/crm/CRMDedupeQueue"));
const CRMScoringRules = lazy(() => import("./pages/crm/CRMScoringRules"));
const CRMSLAPolicies = lazy(() => import("./pages/crm/CRMSLAPolicies"));
const CRMCaptureSources = lazy(() => import("./pages/crm/CRMCaptureSources"));
const Customer360Page = lazy(() => import("./pages/crm/Customer360Page"));
const GeoVisitCapture = lazy(() => import("./pages/crm/GeoVisitCapture"));
const CRMTerritories = lazy(() => import("./pages/crm/CRMTerritories"));
const CRMAccountHierarchy = lazy(() => import("./pages/crm/CRMAccountHierarchy"));
const CRMConsentLog = lazy(() => import("./pages/crm/CRMConsentLog"));
const CRMRegionalPipelines = lazy(() => import("./pages/crm/CRMRegionalPipelines"));
const CRMLeadsInbox = lazy(() => import("./pages/crm/CRMLeadsInbox"));
const CRMSLARules = lazy(() => import("./pages/crm/CRMSLARules"));
const CRMPartnerReferrals = lazy(() => import("./pages/crm/CRMPartnerReferrals"));
const CRMNextBestActions = lazy(() => import("./pages/crm/CRMNextBestActions"));
const CRMSegments = lazy(() => import("./pages/crm/CRMSegments"));
const CRMCustomer360 = lazy(() => import("./pages/crm/CRMCustomer360"));
const CRMMessageTemplates = lazy(() => import("./pages/crm/CRMMessageTemplates"));
const CRMDealRisk = lazy(() => import("./pages/crm/CRMDealRisk"));
const HRRecruitmentPage = lazy(() => import("./pages/hr/HRRecruitmentPage"));
const HROnboardingPage = lazy(() => import("./pages/hr/HROnboardingPage"));
const HRAttendanceExceptionsPage = lazy(() => import("./pages/hr/HRAttendanceExceptionsPage"));
const HRPayrollAuditPage = lazy(() => import("./pages/hr/HRPayrollAuditPage"));
const HRAppraisalCalibrationPage = lazy(() => import("./pages/hr/HRAppraisalCalibrationPage"));
const HRWorkforcePlanningPage = lazy(() => import("./pages/hr/HRWorkforcePlanningPage"));
const HRSelfServicePage = lazy(() => import("./pages/hr/HRSelfServicePage"));
const HRStatutoryReportingPage = lazy(() => import("./pages/hr/HRStatutoryReportingPage"));
const ATSPipelinePage = lazy(() => import("./pages/hr/ATSPipelinePage"));
const ATSScreeningRulesPage = lazy(() => import("./pages/hr/ATSScreeningRulesPage"));
const ContractLifecyclePage = lazy(() => import("./pages/hr/ContractLifecyclePage"));
const RegionalLeavePoliciesPage = lazy(() => import("./pages/hr/RegionalLeavePoliciesPage"));
const PayrollControlsPage = lazy(() => import("./pages/hr/PayrollControlsPage"));
const ESSPortalPage = lazy(() => import("./pages/hr/ESSPortalPage"));
const HRGrievancesEnhancedPage = lazy(() => import("./pages/hr/GrievancesPage"));
const HROffboardingEnhancedPage = lazy(() => import("./pages/hr/OffboardingPage"));
const DocumentExpiryPage = lazy(() => import("./pages/hr/DocumentExpiryPage"));
const AttendanceExceptionsEnhancedPage = lazy(() => import("./pages/hr/AttendanceExceptionsPage"));
const QADashboard = lazy(() => import("./pages/QADashboard"));
const DataQualityCenter = lazy(() => import("./pages/DataQualityCenter"));
const ProcessHealthDashboard = lazy(() => import("./pages/ProcessHealthDashboard"));
const WorkspaceConfig = lazy(() => import("./pages/WorkspaceConfig"));
const LandedCosts = lazy(() => import("./pages/LandedCosts"));
const LandedCostSetup = lazy(() => import("./pages/LandedCostSetup"));
const Questionnaires = lazy(() => import("./pages/Questionnaires"));
const PublicSurvey = lazy(() => import("./pages/PublicSurvey"));
const GeneralLedger = lazy(() => import("./pages/GeneralLedger"));
const ZATCAIntegration = lazy(() => import("./pages/ZATCAIntegration"));
const CPMSDashboard = lazy(() => import("./pages/cpms/CPMSDashboard"));
const CPMSProjects = lazy(() => import("./pages/cpms/CPMSProjects"));
const CPMSProjectDetail = lazy(() => import("./pages/cpms/CPMSProjectDetail"));
const CPMSExpenses = lazy(() => import("./pages/cpms/CPMSExpenses"));
const CPMSDailyReports = lazy(() => import("./pages/cpms/CPMSDailyReports"));
const CPMSCosts = lazy(() => import("./pages/cpms/CPMSCosts"));
const CPMSBilling = lazy(() => import("./pages/cpms/CPMSBilling"));
const CPMSDocuments = lazy(() => import("./pages/cpms/CPMSDocuments"));
const CPMSHSE = lazy(() => import("./pages/cpms/CPMSHSE"));
const CPMSTenders = lazy(() => import("./pages/cpms/CPMSTenders"));
const CPMSResources = lazy(() => import("./pages/cpms/CPMSResources"));
const CPMSClients = lazy(() => import("./pages/cpms/CPMSClients"));
const CPMSFinance = lazy(() => import("./pages/cpms/CPMSFinance"));
const CPMSCostControl = lazy(() => import("./pages/cpms/CPMSCostControl"));
const CPMSCostCodes = lazy(() => import("./pages/cpms/CPMSCostCodes"));
const CPMSCostCodeReport = lazy(() => import("./pages/cpms/CPMSCostCodeReport"));
const CPMSJobCosting = lazy(() => import("./pages/cpms/CPMSJobCosting"));
const CPMSCashFlowForecast = lazy(() => import("./pages/cpms/CPMSCashFlowForecast"));
const CPMSCommercialControlTower = lazy(() => import("./pages/cpms/CPMSCommercialControlTower"));
const CPMSRFIs = lazy(() => import("./pages/cpms/CPMSRFIs"));
const CPMSSiteMaterials = lazy(() => import("./pages/cpms/CPMSSiteMaterials"));
const CPMSLaborProductivity = lazy(() => import("./pages/cpms/CPMSLaborProductivity"));
const CPMSSubcontractors = lazy(() => import("./pages/cpms/CPMSSubcontractors"));
const CPMSSubcontractorRankings = lazy(() => import("./pages/cpms/CPMSSubcontractorRankings"));
const CPMSProgressBilling = lazy(() => import("./pages/cpms/CPMSProgressBilling"));
const CPMSEquipmentUtilization = lazy(() => import("./pages/cpms/CPMSEquipmentUtilization"));
const CPMSQualityCompliance = lazy(() => import("./pages/cpms/CPMSQualityCompliance"));
const QAQCCommandCenter = lazy(() => import("./pages/cpms/QAQCCommandCenter"));
const CPMSChangeOrders = lazy(() => import("./pages/cpms/CPMSChangeOrders"));
const CPMSGanttChart = lazy(() => import("./pages/cpms/CPMSGanttChart"));
const CPMSSchedulePlanning = lazy(() => import("./pages/cpms/CPMSSchedulePlanning"));
const CPMSSiteProgress = lazy(() => import("./pages/cpms/CPMSSiteProgress"));
const CPMSPredictiveAnalytics = lazy(() => import("./pages/cpms/CPMSPredictiveAnalytics"));
const CPMSDelayAnalysis = lazy(() => import("./pages/cpms/CPMSDelayAnalysis"));
const CPMSProjectCashPosition = lazy(() => import("./pages/cpms/CPMSProjectCashPosition"));
const CPMSEquipmentMgmt = lazy(() => import("./pages/cpms/CPMSEquipmentMgmt"));
const CPMSProjectComparison = lazy(() => import("./pages/cpms/CPMSProjectComparison"));
const CPMSReportTemplates = lazy(() => import("./pages/cpms/CPMSReportTemplates"));
const CPMSNotifications = lazy(() => import("./pages/cpms/CPMSNotifications"));
const CPMSSustainability = lazy(() => import("./pages/cpms/CPMSSustainability"));
const CPMSWeatherIoT = lazy(() => import("./pages/cpms/CPMSWeatherIoT"));
const CPMSDrawingMeasurement = lazy(() => import("./pages/cpms/CPMSDrawingMeasurement"));
const CPMSMeasurementReporting = lazy(() => import("./pages/cpms/CPMSMeasurementReporting"));
const CPMSAnalyticsDashboard = lazy(() => import("./pages/cpms/CPMSAnalyticsDashboard"));
const CPMSMobileHome = lazy(() => import("./pages/cpms/CPMSMobileHome"));
const CPMSMobileTimeClock = lazy(() => import("./pages/cpms/CPMSMobileTimeClock"));
const CPMSMobilePhotos = lazy(() => import("./pages/cpms/CPMSMobilePhotos"));
const CPMSReportsPage = lazy(() => import("./pages/cpms/CPMSReportsPage"));
// Contractor Suite (gap-fill)
const SubcontractsPage = lazy(() => import("./pages/cpms-contractor/SubcontractsPage"));
const VariationOrdersPage = lazy(() => import("./pages/cpms-contractor/VariationOrdersPage"));
const ClientIPCPage = lazy(() => import("./pages/cpms-contractor/ClientIPCPage"));
const RetentionPage = lazy(() => import("./pages/cpms-contractor/RetentionPage"));
const CTCForecastPage = lazy(() => import("./pages/cpms-contractor/CTCForecastPage"));
const DelayRegisterPage = lazy(() => import("./pages/cpms-contractor/DelayRegisterPage"));
const ProductivityPage = lazy(() => import("./pages/cpms-contractor/ProductivityPage"));
const TransmittalsPage = lazy(() => import("./pages/cpms-contractor/TransmittalsPage"));
const ControlTowerPage = lazy(() => import("./pages/cpms-contractor/ControlTowerPage"));
const MobileFieldPage = lazy(() => import("./pages/cpms-contractor/MobileFieldPage"));
// Governance Suite (Workflow + ECM + Approvals)
const GovTaskInbox = lazy(() => import("./pages/governance/TaskInboxPage"));
const GovApprovalTemplates = lazy(() => import("./pages/governance/ApprovalTemplatesPage"));
const GovDelegations = lazy(() => import("./pages/governance/DelegationsPage"));
const GovRetentionRules = lazy(() => import("./pages/governance/RetentionRulesPage"));
const GovOcrIngestion = lazy(() => import("./pages/governance/OcrIngestionPage"));
const GovExternalShares = lazy(() => import("./pages/governance/ExternalSharesPage"));
const GovSignatureEnvelopes = lazy(() => import("./pages/governance/SignatureEnvelopesPage"));
const GovWorkflowDesigner = lazy(() => import("./pages/governance/WorkflowDesignerPage"));
const GovComplianceAudit = lazy(() => import("./pages/governance/ComplianceAuditPage"));
const GovPublicShareViewer = lazy(() => import("./pages/governance/PublicShareViewer"));
// Master Data Governance Suite (MDM)
const MDMOverview = lazy(() => import("./pages/mdm/MDMOverviewPage"));
const MDMHierarchies = lazy(() => import("./pages/mdm/MDMHierarchiesPage"));
const MDMDedup = lazy(() => import("./pages/mdm/MDMDedupPage"));
const MDMValidationPolicies = lazy(() => import("./pages/mdm/MDMValidationPoliciesPage"));
const MDMCreditProfiles = lazy(() => import("./pages/mdm/MDMCreditProfilesPage"));
const MDMTaxRegistrations = lazy(() => import("./pages/mdm/MDMTaxRegistrationsPage"));
const MDMAddresses = lazy(() => import("./pages/mdm/MDMAddressesPage"));
const MDMContacts = lazy(() => import("./pages/mdm/MDMContactsPage"));
const MDMSegments = lazy(() => import("./pages/mdm/MDMSegmentsPage"));
const MDMStewardship = lazy(() => import("./pages/mdm/MDMStewardshipPage"));
const MDMChangeLog = lazy(() => import("./pages/mdm/MDMChangeLogPage"));
// Service & ITSM Suite
const ITSMOverview = lazy(() => import("./pages/itsm/ITSMOverviewPage"));
const ITSMTickets = lazy(() => import("./pages/itsm/ITSMTicketsPage"));
const ITSMTicketDetail = lazy(() => import("./pages/itsm/ITSMTicketDetailPage"));
const ITSMSLAPolicies = lazy(() => import("./pages/itsm/ITSMSLAPoliciesPage"));
const ITSMKnowledgeBase = lazy(() => import("./pages/itsm/ITSMKnowledgeBasePage"));
const ITSMFieldService = lazy(() => import("./pages/itsm/ITSMFieldServicePage"));
const ITSMTechnicians = lazy(() => import("./pages/itsm/ITSMTechniciansPage"));
const ITSMContracts = lazy(() => import("./pages/itsm/ITSMContractsPage"));
const ITSMEscalations = lazy(() => import("./pages/itsm/ITSMEscalationsPage"));
const ITSMAnalytics = lazy(() => import("./pages/itsm/ITSMAnalyticsPage"));
const FixedAssets = lazy(() => import("./pages/FixedAssets"));
const DocumentExpiryTracking = lazy(() => import("./pages/DocumentExpiryTracking"));
const BudgetSetup = lazy(() => import("./pages/BudgetSetup"));
const CostAccounting = lazy(() => import("./pages/CostAccounting"));
const FinancialReports = lazy(() => import("./pages/FinancialReports"));
const SSWorkbookGallery = lazy(() => import("./pages/spreadsheet/WorkbookGallery"));
const SSTemplateLibrary = lazy(() => import("./pages/spreadsheet/TemplateLibrary"));
const SSSpreadsheetEditor = lazy(() => import("./pages/spreadsheet/SpreadsheetEditor"));
const SSScenarioComparison = lazy(() => import("./pages/spreadsheet/ScenarioComparison"));
const SSCommentsReview = lazy(() => import("./pages/spreadsheet/CommentsReview"));
const SSPublishWriteback = lazy(() => import("./pages/spreadsheet/PublishWriteback"));
const SSVersionHistory = lazy(() => import("./pages/spreadsheet/VersionHistory"));
const AuditBalanceSheet = lazy(() => import("./pages/AuditBalanceSheet"));
const BSReportConfig = lazy(() => import("./pages/BSReportConfig"));
const OpportunityReports = lazy(() => import("./pages/OpportunityReports"));
const ServiceModule = lazy(() => import("./pages/ServiceModule"));
const SalesDashboard = lazy(() => import("./pages/SalesDashboard"));
const KSACompliance = lazy(() => import("./pages/hr/KSACompliance"));
const InventoryDashboard = lazy(() => import("./pages/InventoryDashboard"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const FinanceKPIDrillDown = lazy(() => import("./pages/FinanceKPIDrillDown"));
const ProcurementAnalytics = lazy(() => import("./pages/procurement/ProcurementAnalytics"));
const SAPDatabases = lazy(() => import("./pages/SAPDatabases"));
const UserDefaults = lazy(() => import("./pages/UserDefaults"));
const DocumentAuthorizations = lazy(() => import("./pages/DocumentAuthorizations"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const IndustryPacksAdmin = lazy(() => import("./pages/settings/IndustryPacksAdmin"));
const CompanyDetails = lazy(() => import("./pages/CompanyDetails"));
const JournalEntries = lazy(() => import("./pages/JournalEntries"));
const JournalVouchers = lazy(() => import("./pages/JournalVouchers"));
const JEMappingRules = lazy(() => import("./pages/JEMappingRules"));
const FinancialPeriods = lazy(() => import("./pages/FinancialPeriods"));
const FinancialStatements = lazy(() => import("./pages/FinancialStatements"));
const TrialBalanceReport = lazy(() => import("./pages/TrialBalanceReport"));
const BalanceSheetReport = lazy(() => import("./pages/BalanceSheetReport"));
const ProfitLossReport = lazy(() => import("./pages/ProfitLossReport"));
const CashFlowStatement = lazy(() => import("./pages/CashFlowStatement"));
const GeneralLedgerReport = lazy(() => import("./pages/GeneralLedgerReport"));
const ARAgingReport = lazy(() => import("./pages/ARAgingReport"));
const APAgingReport = lazy(() => import("./pages/APAgingReport"));
const CostCenterSummary = lazy(() => import("./pages/CostCenterSummary"));
const CostCenterVariance = lazy(() => import("./pages/CostCenterVariance"));
const CostCenterTrends = lazy(() => import("./pages/CostCenterTrends"));
const CostCenterLedger = lazy(() => import("./pages/CostCenterLedger"));
const ConsolidationDashboard = lazy(() => import("./pages/ConsolidationDashboard"));
const ConsolidatedPL = lazy(() => import("./pages/ConsolidatedPL"));
const ConsolidatedBS = lazy(() => import("./pages/ConsolidatedBS"));
const ConsolidatedTB = lazy(() => import("./pages/ConsolidatedTB"));
const BillOfMaterials = lazy(() => import("./pages/BillOfMaterials"));
const MRPPlanning = lazy(() => import("./pages/MRPPlanning"));
const PickAndPack = lazy(() => import("./pages/PickAndPack"));
const QualityManagement = lazy(() => import("./pages/QualityManagement"));
const DunningManagement = lazy(() => import("./pages/DunningManagement"));
const BankReconciliationPage = lazy(() => import("./pages/BankReconciliationPage"));
const StatementImportWizard = lazy(() => import("./pages/banking/StatementImportWizard"));
const ReconciliationWorkbench = lazy(() => import("./pages/banking/ReconciliationWorkbench"));
const BankExceptionsPage = lazy(() => import("./pages/banking/BankExceptionsPage"));
const CashPositionDashboardPage = lazy(() => import("./pages/banking/CashPositionDashboardPage"));
const ForecastScenariosPage = lazy(() => import("./pages/banking/ForecastScenariosPage"));
const PaymentOptimizationPage = lazy(() => import("./pages/banking/PaymentOptimizationPage"));
const PaymentApprovalsPage = lazy(() => import("./pages/banking/PaymentApprovalsPage"));
const BankAccountHierarchy = lazy(() => import("./pages/banking/BankAccountHierarchy"));
const BankAdaptersRegistry = lazy(() => import("./pages/banking/BankAdaptersRegistry"));
const ReconRulesEngine = lazy(() => import("./pages/banking/ReconRulesEngine"));
const TreasuryApprovalPolicies = lazy(() => import("./pages/banking/TreasuryApprovalPolicies"));
const FXExposureMonitor = lazy(() => import("./pages/banking/FXExposureMonitor"));
const PaymentFraudRules = lazy(() => import("./pages/banking/PaymentFraudRules"));
const IntercompanyCashVisibility = lazy(() => import("./pages/banking/IntercompanyCashVisibility"));
const AuditTrailPage = lazy(() => import("./pages/AuditTrail"));
const FormSettingsPage = lazy(() => import("./pages/FormSettings"));
const RequiredFieldsSettings = lazy(() => import("./pages/RequiredFieldsSettings"));
const AlertsManagement = lazy(() => import("./pages/AlertsManagement"));
const DragAndRelate = lazy(() => import("./pages/DragAndRelate"));
const PrintLayoutDesigner = lazy(() => import("./pages/PrintLayoutDesigner"));
const PortfolioDashboard = lazy(() => import("./pages/pmo/PortfolioDashboard"));
const TMODashboard = lazy(() => import("./pages/tmo/TMODashboard"));
const PMOExecutiveDashboard = lazy(() => import("./pages/pmo/PMOExecutiveDashboard"));
const TMOExecutiveDashboard = lazy(() => import("./pages/tmo/TMOExecutiveDashboard"));
const LessonsLearned = lazy(() => import("./pages/pmo/LessonsLearned"));
const PMOAlertCenter = lazy(() => import("./pages/pmo/PMOAlertCenter"));
const PMOResourceManagement = lazy(() => import("./pages/pmo/PMOResourceManagement"));
const PMOStakeholderHub = lazy(() => import("./pages/pmo/PMOStakeholderHub"));
const PMODependencyTracking = lazy(() => import("./pages/pmo/PMODependencyTracking"));
const PMOPredictiveAnalytics = lazy(() => import("./pages/pmo/PMOPredictiveAnalytics"));
const PMOPortfolioOptimization = lazy(() => import("./pages/pmo/PMOPortfolioOptimization"));
const PMOComplianceAudit = lazy(() => import("./pages/pmo/PMOComplianceAudit"));
const BidDashboard = lazy(() => import("./pages/bids/BidDashboard"));
const UnifiedExecutiveDashboard = lazy(() => import("./pages/UnifiedExecutiveDashboard"));
const QTOModule = lazy(() => import("./pages/QTOModule"));
const BOQManagement = lazy(() => import("./pages/BOQManagement"));
const BOQVersionComparison = lazy(() => import("./pages/BOQVersionComparison"));
const VendorPrequalification = lazy(() => import("./pages/VendorPrequalification"));
const EVMDashboard = lazy(() => import("./pages/EVMDashboard"));
const IndustryIntelligence = lazy(() => import("./pages/IndustryIntelligence"));
const ProjectControlDashboard = lazy(() => import("./pages/ProjectControlDashboard"));
const FinancialControlDashboard = lazy(() => import("./pages/FinancialControlDashboard"));
const ExecutiveFinanceDashboard = lazy(() => import("./pages/ExecutiveFinanceDashboard"));
const WhatIfAnalysis = lazy(() => import("./pages/WhatIfAnalysis"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const TradingHub = lazy(() => import("./pages/trading/TradingHub"));
const Shipments = lazy(() => import("./pages/trading/Shipments"));
const Deals = lazy(() => import("./pages/trading/Deals"));
const ComplianceManagement = lazy(() => import("./pages/hr/ComplianceManagement"));
const EmployeeHandbook = lazy(() => import("./pages/hr/EmployeeHandbook"));
const AssetUtilization = lazy(() => import("./pages/AssetUtilization"));
const AssetFinancialIntelligence = lazy(() => import("./pages/AssetFinancialIntelligence"));
const AssetMaintenanceHub = lazy(() => import("./pages/AssetMaintenanceHub"));
const AssetLifecycleCompliance = lazy(() => import("./pages/AssetLifecycleCompliance"));
const AssetAdvancedAnalytics = lazy(() => import("./pages/AssetAdvancedAnalytics"));
const MeterReadingsPage = lazy(() => import("./pages/assets/MeterReadingsPage"));
const AssetReservationCalendar = lazy(() => import("./pages/assets/AssetReservationCalendar"));
const AssetIncidentRegister = lazy(() => import("./pages/assets/AssetIncidentRegister"));
const AssetOverhaulPage = lazy(() => import("./pages/assets/AssetOverhaulPage"));
const AssetBudgetPlanning = lazy(() => import("./pages/assets/AssetBudgetPlanning"));
const AssetReplacementEngine = lazy(() => import("./pages/assets/AssetReplacementEngine"));
const ITAssetIssuance = lazy(() => import("./pages/assets/ITAssetIssuance"));
const AssetHierarchy = lazy(() => import("./pages/assets/AssetHierarchy"));
const AssetGeoMap = lazy(() => import("./pages/assets/AssetGeoMap"));
const RentalAssetBilling = lazy(() => import("./pages/assets/RentalAssetBilling"));
const LeasedAssetRegister = lazy(() => import("./pages/assets/LeasedAssetRegister"));
const AssetAuditCount = lazy(() => import("./pages/assets/AssetAuditCount"));
const AssetDocumentLibrary = lazy(() => import("./pages/assets/AssetDocumentLibrary"));
const DowntimeAnalytics = lazy(() => import("./pages/assets/DowntimeAnalytics"));
const VendorScorecard = lazy(() => import("./pages/assets/VendorScorecard"));
const AssetControlTower = lazy(() => import("./pages/assets/AssetControlTower"));
const DepreciationBooks = lazy(() => import("./pages/assets/DepreciationBooks"));
const DepreciationSchedules = lazy(() => import("./pages/assets/DepreciationSchedules"));
const LeaseScenarioComparison = lazy(() => import("./pages/assets/LeaseScenarioComparison"));
const MaintenancePlans = lazy(() => import("./pages/assets/MaintenancePlans"));
const InspectionTemplates = lazy(() => import("./pages/assets/InspectionTemplates"));
const CustodyChainPage = lazy(() => import("./pages/assets/CustodyChainPage"));
const AssetProfitabilityPage = lazy(() => import("./pages/assets/AssetProfitabilityPage"));
const UtilizationHeatmapPage = lazy(() => import("./pages/assets/UtilizationHeatmapPage"));
const WarrantyAMCTracker = lazy(() => import("./pages/assets/WarrantyAMCTracker"));
const AssetCheckoutPage = lazy(() => import("./pages/assets/AssetCheckoutPage"));
const AssetTransferPage = lazy(() => import("./pages/assets/AssetTransferPage"));
const AssetDisposalPage = lazy(() => import("./pages/assets/AssetDisposalPage"));
const SparePartsLinkage = lazy(() => import("./pages/assets/SparePartsLinkage"));
const AssetLifecyclePage = lazy(() => import("./pages/assets/AssetLifecyclePage"));
const PredictiveMaintenancePage = lazy(() => import("./pages/assets/PredictiveMaintenancePage"));
const ReplacementRoadmapPage = lazy(() => import("./pages/assets/ReplacementRoadmapPage"));
const VendorScorecardMetricsPage = lazy(() => import("./pages/assets/VendorScorecardMetricsPage"));
const FieldInspectionPage = lazy(() => import("./pages/assets/FieldInspectionPage"));
const CalibrationTracker = lazy(() => import("./pages/assets/CalibrationTracker"));
const InsuranceTracker = lazy(() => import("./pages/assets/InsuranceTracker"));
const FuelConsumptionLog = lazy(() => import("./pages/assets/FuelConsumptionLog"));
const CapitalizationAccounting = lazy(() => import("./pages/assets/CapitalizationAccounting"));
const AssetWorkOrders = lazy(() => import("./pages/assets/AssetWorkOrders"));

// ECM Module
const ECMDashboard = lazy(() => import("./pages/ecm/ECMDashboard"));
const ECMRepository = lazy(() => import("./pages/ecm/ECMRepository"));
const ECMDocumentViewer = lazy(() => import("./pages/ecm/ECMDocumentViewer"));
const ECMSearch = lazy(() => import("./pages/ecm/ECMSearch"));
const ECMCorrespondenceIncoming = lazy(() => import("./pages/ecm/ECMCorrespondenceIncoming"));
const ECMCorrespondenceOutgoing = lazy(() => import("./pages/ecm/ECMCorrespondenceOutgoing"));
const ECMAuditTrail = lazy(() => import("./pages/ecm/ECMAuditTrail"));
const ECMMetadataTemplates = lazy(() => import("./pages/ecm/ECMMetadataTemplates"));
const ECMWorkflowDesigner = lazy(() => import("./pages/ecm/ECMWorkflowDesigner"));
const ECMElectronicSignatures = lazy(() => import("./pages/ecm/ECMElectronicSignatures"));
const ECMTasks = lazy(() => import("./pages/ecm/ECMTasks"));
const ECMDirectory = lazy(() => import("./pages/ecm/ECMDirectory"));
const ECMInternalMemos = lazy(() => import("./pages/ecm/ECMInternalMemos"));
const ECMReports = lazy(() => import("./pages/ecm/ECMReports"));
const ECMAdmin = lazy(() => import("./pages/ecm/ECMAdmin"));
const ECMRetentionPolicies = lazy(() => import("./pages/ecm/ECMRetentionPolicies"));
const ECMVersionManager = lazy(() => import("./pages/ecm/ECMVersionManager"));
const ECMEmailCaptureConfig = lazy(() => import("./pages/ecm/ECMEmailCaptureConfig"));

const SalesSmartForecast = lazy(() => import("./pages/SalesSmartForecast"));
const SalesLeadScoring = lazy(() => import("./pages/SalesLeadScoring"));
const SalesPerformanceAnalytics = lazy(() => import("./pages/SalesPerformanceAnalytics"));
const SalesRecommendations = lazy(() => import("./pages/SalesRecommendations"));
const SalesPricingOptimization = lazy(() => import("./pages/SalesPricingOptimization"));
const SalesCustomerHealth = lazy(() => import("./pages/SalesCustomerHealth"));
const SalesQuoteBuilder = lazy(() => import("./pages/SalesQuoteBuilder"));
const SalesCyclePrediction = lazy(() => import("./pages/SalesCyclePrediction"));
const SalesCompetitorIntel = lazy(() => import("./pages/SalesCompetitorIntel"));
const SalesInsightsAlerts = lazy(() => import("./pages/SalesInsightsAlerts"));
const SalesSegmentation = lazy(() => import("./pages/SalesSegmentation"));
const SalesTerritoryOptimization = lazy(() => import("./pages/SalesTerritoryOptimization"));
const Retainers = lazy(() => import("./pages/Retainers"));
const ClientPortalSettings = lazy(() => import("./pages/ClientPortalSettings"));
const ClientPortalApp = lazy(() => import("./pages/portal/ClientPortalApp"));
const SupplierComparison = lazy(() => import("./pages/procurement/SupplierComparison"));
const MobileExecutive = lazy(() => import("./pages/MobileExecutive"));
const WhatsAppCampaign = lazy(() => import("./components/crm/WhatsAppCampaign"));
const Vendor360 = lazy(() => import("./pages/Vendor360"));
const BranchHealth = lazy(() => import("./pages/BranchHealth"));
const ARCollections = lazy(() => import("./pages/ARCollections"));
const SupplierScorecards = lazy(() => import("./pages/SupplierScorecards"));
const SafetyIncidents = lazy(() => import("./pages/SafetyIncidents"));
const PreventiveMaintenance = lazy(() => import("./pages/PreventiveMaintenance"));
const ImportValidation = lazy(() => import("./pages/ImportValidation"));
const DataTransferWorkbench = lazy(() => import("./pages/DataTransferWorkbench"));
const ScenarioPlanning = lazy(() => import("./pages/ScenarioPlanning"));
const KPISubscriptions = lazy(() => import("./pages/KPISubscriptions"));
const GuidedTours = lazy(() => import("./pages/GuidedTours"));
const MobileSiteManager = lazy(() => import("./pages/MobileSiteManager"));
const AccountingDetermination = lazy(() => import("./pages/AccountingDetermination"));
const WorkflowBuilderPage = lazy(() => import("./pages/WorkflowBuilderPage"));
const CustomerCreditControl = lazy(() => import("./pages/CustomerCreditControl"));
const ExceptionCenter = lazy(() => import("./pages/ExceptionCenter"));
const EnterpriseExceptionCenter = lazy(() => import("./pages/EnterpriseExceptionCenter"));
const IntercompanyControlCenter = lazy(() => import("./pages/IntercompanyControlCenter"));
const MarginProtection = lazy(() => import("./pages/MarginProtection"));
const RevenueRecognitionEngine = lazy(() => import("./pages/RevenueRecognitionEngine"));
const BudgetControlCenter = lazy(() => import("./pages/BudgetControlCenter"));
const ProcurementCategoryManagement = lazy(() => import("./pages/ProcurementCategoryManagement"));
const SupplierRebateManagement = lazy(() => import("./pages/SupplierRebateManagement"));
const SLAEngine = lazy(() => import("./pages/SLAEngine"));
const ContractManagement = lazy(() => import("./pages/ContractManagement"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const ClauseLibrary = lazy(() => import("./pages/ClauseLibrary"));
const RenewalCalendar = lazy(() => import("./pages/RenewalCalendar"));
const BudgetVsActual = lazy(() => import("./pages/BudgetVsActual"));
const BoardroomReporting = lazy(() => import("./pages/BoardroomReporting"));
const CashFlowForecastCockpit = lazy(() => import("./pages/CashFlowForecastCockpit"));
const ReconciliationCenter = lazy(() => import("./pages/ReconciliationCenter"));
const OperationsCommandCenter = lazy(() => import("./pages/OperationsCommandCenter"));
const BusinessRulesSimulator = lazy(() => import("./pages/BusinessRulesSimulator"));
const ProductionCostingDashboard = lazy(() => import("./pages/ProductionCostingDashboard"));
const QualityCAPAWorkflow = lazy(() => import("./pages/QualityCAPAWorkflow"));
const CollectionsWorkbench = lazy(() => import("./pages/CollectionsWorkbench"));
const MasterDataGovernanceCenter = lazy(() => import("./pages/MasterDataGovernanceCenter"));
const WorkforcePlanning = lazy(() => import("./pages/WorkforcePlanning"));
const PriceHistoryIntelligence = lazy(() => import("./pages/PriceHistoryIntelligence"));
const RecruitmentPipeline = lazy(() => import("./pages/RecruitmentPipeline"));
const VariationOrderControl = lazy(() => import("./pages/VariationOrderControl"));
const DemandConsolidation = lazy(() => import("./pages/DemandConsolidation"));
const VendorPortal = lazy(() => import("./pages/VendorPortal"));
const SubcontractorPortalApp = lazy(() => import("./pages/subcontractor-portal/SubcontractorPortalApp"));
const SubcontractorPortalAdminHub = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorPortalAdminHub"));
const SubcontractorPackages = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorPackages"));
const SubcontractorProgressReview = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorProgressReview"));
const SubcontractorVariationsAdmin = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorVariations"));
const SubcontractorQAHSE = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorQAHSE"));
const SubcontractorIPCAdmin = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorIPC"));
const SubcontractorDocumentsAdmin = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorDocuments"));
const SubcontractorTasksAdmin = lazy(() => import("./pages/subcontractor-portal-admin/SubcontractorTasks"));
const SupplierPortalApp = lazy(() => import("./pages/supplier-portal/SupplierPortalApp"));
const SupplierHub = lazy(() => import("./pages/SupplierHub"));
const TrainingCompetency = lazy(() => import("./pages/TrainingCompetency"));
const IntercompanyTransactions = lazy(() => import("./pages/IntercompanyTransactions"));
const RecurringDocuments = lazy(() => import("./pages/RecurringDocuments"));
const PeriodEndClosing = lazy(() => import("./pages/PeriodEndClosing"));
const PeriodCloseControls = lazy(() => import("./pages/PeriodCloseControls"));
const TreasuryWorkspace = lazy(() => import("./pages/TreasuryWorkspace"));
const FixedAssetsRegister = lazy(() => import("./pages/FixedAssetsRegister"));
const LeaseAccounting = lazy(() => import("./pages/LeaseAccounting"));
const BankReconAutomation = lazy(() => import("./pages/BankReconAutomation"));
const AdvancedNumberingSeries = lazy(() => import("./pages/AdvancedNumberingSeries"));
const ContractRetentionMgmt = lazy(() => import("./pages/ContractRetentionMgmt"));
const SiteInspections = lazy(() => import("./pages/SiteInspections"));
const InterimPaymentCerts = lazy(() => import("./pages/InterimPaymentCerts"));
const SubcontractAgreements = lazy(() => import("./pages/SubcontractAgreements"));
const EquipmentAllocations = lazy(() => import("./pages/EquipmentAllocations"));
const MaterialConsumption = lazy(() => import("./pages/MaterialConsumption"));
const ProjectClaimsDisputes = lazy(() => import("./pages/ProjectClaimsDisputes"));
const JobRequisitions = lazy(() => import("./pages/JobRequisitions"));
const EmployeeLoans = lazy(() => import("./pages/EmployeeLoans"));
const PerformanceAppraisals = lazy(() => import("./pages/PerformanceAppraisals"));
const ShiftPlanning = lazy(() => import("./pages/ShiftPlanning"));
const OvertimeControl = lazy(() => import("./pages/hr/OvertimeControl"));
const LaborCampManagement = lazy(() => import("./pages/hr/LaborCampManagement"));
const HRGrievances = lazy(() => import("./pages/HRGrievances"));
const HRLetters = lazy(() => import("./pages/HRLetters"));
const OffboardingWorkflow = lazy(() => import("./pages/OffboardingWorkflow"));
const AIAnomalyDetection = lazy(() => import("./pages/AIAnomalyDetection"));
const ProjectStockReservation = lazy(() => import("./pages/ProjectStockReservation"));
const DeadStockDashboard = lazy(() => import("./pages/DeadStockDashboard"));
const MaterialSubstitution = lazy(() => import("./pages/MaterialSubstitution"));
const BudgetRequestWorkflow = lazy(() => import("./pages/BudgetRequestWorkflow"));
const DynamicFormBuilder = lazy(() => import("./pages/DynamicFormBuilder"));
const RowLevelPermissions = lazy(() => import("./pages/RowLevelPermissions"));
const MasterDataStewardship = lazy(() => import("./pages/MasterDataStewardship"));
const ServiceMaintenancePage = lazy(() => import("./pages/ServiceMaintenance"));
const SandboxTraining = lazy(() => import("./pages/SandboxTraining"));
const EmailDocumentCapture = lazy(() => import("./pages/EmailDocumentCapture"));
const OCRDocumentCapture = lazy(() => import("./pages/OCRDocumentCapture"));
const ProcessMiningDashboard = lazy(() => import("./pages/ProcessMiningDashboard"));
const SmartRecommendations = lazy(() => import("./pages/SmartRecommendations"));
const NLAssistant = lazy(() => import("./pages/NLAssistant"));
const ERPCopilot = lazy(() => import("./pages/ERPCopilot"));
const ControlledAIDashboard = lazy(() => import("./pages/controlled-ai/ControlledAIDashboard"));
const ControlledAIReviewQueue = lazy(() => import("./pages/controlled-ai/ControlledAIReviewQueue"));
const ControlledAIGovernance = lazy(() => import("./pages/controlled-ai/ControlledAIGovernance"));
const WorkflowAutoReminders = lazy(() => import("./pages/WorkflowAutoReminders"));
const StrategicGoals = lazy(() => import("./pages/StrategicGoals"));
const PredictiveCollections = lazy(() => import("./pages/PredictiveCollections"));
const PredictiveProjectRisk = lazy(() => import("./pages/PredictiveProjectRisk"));
const CrossCompanyAnalytics = lazy(() => import("./pages/CrossCompanyAnalytics"));
const ProfitabilityWaterfall = lazy(() => import("./pages/ProfitabilityWaterfall"));
const MeetingSummaries = lazy(() => import("./pages/MeetingSummaries"));
const DocumentClassification = lazy(() => import("./pages/DocumentClassification"));
const EnterpriseRiskRegister = lazy(() => import("./pages/EnterpriseRiskRegister"));
const ManagementDecisionLog = lazy(() => import("./pages/ManagementDecisionLog"));
const LoyaltyWallet = lazy(() => import("./pages/LoyaltyWallet"));
const POSPromotions = lazy(() => import("./pages/POSPromotions"));
const POSOfflineSync = lazy(() => import("./pages/POSOfflineSync"));
const CashierShiftReconciliation = lazy(() => import("./pages/CashierShiftReconciliation"));
const POSFraudDashboard = lazy(() => import("./pages/POSFraudDashboard"));
const OmnichannelPickup = lazy(() => import("./pages/OmnichannelPickup"));
const POSReturnsIntelligence = lazy(() => import("./pages/POSReturnsIntelligence"));
const BranchBenchmarking = lazy(() => import("./pages/BranchBenchmarking"));
const MobilePOS = lazy(() => import("./pages/MobilePOS"));
const CrossSellUpsell = lazy(() => import("./pages/CrossSellUpsell"));
const KitchenDisplay = lazy(() => import("./pages/KitchenDisplay"));
const DeliveryDispatch = lazy(() => import("./pages/DeliveryDispatch"));
const GiftCardManagement = lazy(() => import("./pages/GiftCardManagement"));
const SubscriptionBilling = lazy(() => import("./pages/SubscriptionBilling"));
const SmartReceipts = lazy(() => import("./pages/SmartReceipts"));
const SalesTargetTracker = lazy(() => import("./pages/SalesTargetTracker"));
const POSInventoryReservation = lazy(() => import("./pages/POSInventoryReservation"));
const LayawayInstallments = lazy(() => import("./pages/LayawayInstallments"));
const DigitalSignatureOTP = lazy(() => import("./pages/DigitalSignatureOTP"));
const AdvancedCashierPermissions = lazy(() => import("./pages/AdvancedCashierPermissions"));
const POSRepairIntake = lazy(() => import("./pages/POSRepairIntake"));
const CustomerOrderTracker = lazy(() => import("./pages/pos/CustomerOrderTracker"));
const ShelfLabelManagement = lazy(() => import("./pages/ShelfLabelManagement"));
const AbandonedCartRecovery = lazy(() => import("./pages/AbandonedCartRecovery"));
const StoreTaskBoard = lazy(() => import("./pages/StoreTaskBoard"));
const BranchTransferSelling = lazy(() => import("./pages/BranchTransferSelling"));
const CustomerFeedback = lazy(() => import("./pages/CustomerFeedback"));
const SocialInbox = lazy(() => import("./pages/SocialInbox"));
const CloseDashboard = lazy(() => import("./pages/financial-close/CloseDashboard"));
const CloseCalendar = lazy(() => import("./pages/financial-close/CloseCalendar"));
const ChecklistBoard = lazy(() => import("./pages/financial-close/ChecklistBoard"));
const EntityReadiness = lazy(() => import("./pages/financial-close/EntityReadiness"));
const ReconciliationQueue = lazy(() => import("./pages/financial-close/ReconciliationQueue"));
const VarianceReview = lazy(() => import("./pages/financial-close/VarianceReview"));
const SignoffMatrix = lazy(() => import("./pages/financial-close/SignoffMatrix"));
const ClosePackGenerator = lazy(() => import("./pages/financial-close/ClosePackGenerator"));
const TransportDispatchManagement = lazy(() => import("./pages/TransportDispatchManagement"));
const QualityLabSampleManagement = lazy(() => import("./pages/QualityLabSampleManagement"));
const EngineeringChangeControl = lazy(() => import("./pages/EngineeringChangeControl"));
const MaintenanceReliabilityAnalytics = lazy(() => import("./pages/MaintenanceReliabilityAnalytics"));
const EmployeeManagerSelfServiceHub = lazy(() => import("./pages/EmployeeManagerSelfServiceHub"));
const BoardPackGeneratorPage = lazy(() => import("./pages/BoardPackGenerator"));
const ProcessMiningAnalyzer = lazy(() => import("./pages/ProcessMiningAnalyzer"));
const DocumentRetentionCenter = lazy(() => import("./pages/DocumentRetentionCenter"));
const DataLineageExplorer = lazy(() => import("./pages/DataLineageExplorer"));
const ComplianceObligationTracker = lazy(() => import("./pages/ComplianceObligationTracker"));
const RiskBasedApprovalEngine = lazy(() => import("./pages/RiskBasedApprovalEngine"));
const CustomerPortalHub = lazy(() => import("./pages/CustomerPortalHub"));
const PMOPortfolioGovernance = lazy(() => import("./pages/PMOPortfolioGovernance"));
const IntegrationMonitorConsole = lazy(() => import("./pages/IntegrationMonitorConsole"));
const ReleaseReadinessCenter = lazy(() => import("./pages/ReleaseReadinessCenter"));
const BackgroundJobMonitor = lazy(() => import("./pages/BackgroundJobMonitor"));

// Admin Setup pages
const AdminTaxGroups = lazy(() => import("./pages/admin/TaxGroups"));
const AdminPaymentTerms = lazy(() => import("./pages/admin/PaymentTerms"));
const AdminBanks = lazy(() => import("./pages/admin/Banks"));
const AdminCustomerGroups = lazy(() => import("./pages/admin/CustomerGroups"));
const AdminVendorGroups = lazy(() => import("./pages/admin/VendorGroups"));
const AdminGeneralSettings = lazy(() => import("./pages/admin/GeneralSettings"));
const AdminPrintPreferences = lazy(() => import("./pages/admin/PrintPreferences"));
const AdminDocumentSettings = lazy(() => import("./pages/admin/DocumentSettings"));
const AdminPostingPeriods = lazy(() => import("./pages/admin/PostingPeriods"));
const AdminDocumentNumbering = lazy(() => import("./pages/admin/DocumentNumbering"));
const AdminExchangeRates = lazy(() => import("./pages/admin/ExchangeRates"));
const AdminUserDefaults = lazy(() => import("./pages/admin/UserDefaults"));
const AdminAuthorizations = lazy(() => import("./pages/admin/Authorizations"));
const AdminAlertsManagement = lazy(() => import("./pages/admin/AlertsManagement"));
const AdminLicenseAdmin = lazy(() => import("./pages/admin/LicenseAdmin"));
const AdminAddonManager = lazy(() => import("./pages/admin/AddonManager"));
const AdminWorkList = lazy(() => import("./pages/admin/WorkList"));
const AdminHelpContent = lazy(() => import("./pages/admin/HelpContentManager"));
const AdminMenuStructure = lazy(() => import("./pages/admin/MenuStructure"));
const AdminMenuAlias = lazy(() => import("./pages/admin/MenuAlias"));
const AdminEmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const AdminOpeningBalances = lazy(() => import("./pages/admin/OpeningBalances"));
const AdminImplementationCenter = lazy(() => import("./pages/admin/ImplementationCenter"));
const AdminImplementationTasks = lazy(() => import("./pages/admin/ImplementationTasks"));
const AdminImplementationProject = lazy(() => import("./pages/admin/ImplementationProject"));
const AdminConfigurationManagement = lazy(() => import("./pages/admin/ConfigurationManagement"));
const AdminPathSettings = lazy(() => import("./pages/admin/PathSettings"));
const AdminTooltipPreview = lazy(() => import("./pages/admin/TooltipPreview"));

// Sales A/R pages
const SalesBlanketAgreement = lazy(() => import("./pages/sales/SalesBlanketAgreement"));
const SalesQuotationPage = lazy(() => import("./pages/sales/SalesQuotationPage"));
const SalesOrderPage = lazy(() => import("./pages/sales/SalesOrderPage"));
const DeliveryPage = lazy(() => import("./pages/sales/DeliveryPage"));
const ReturnRequestPage = lazy(() => import("./pages/sales/ReturnRequestPage"));
const ReturnPage = lazy(() => import("./pages/sales/ReturnPage"));
const ARDownPaymentRequest = lazy(() => import("./pages/sales/ARDownPaymentRequest"));
const ARDownPaymentInvoice = lazy(() => import("./pages/sales/ARDownPaymentInvoice"));
const ARInvoicePage = lazy(() => import("./pages/sales/ARInvoicePage"));
const ARInvoicePaymentPage = lazy(() => import("./pages/sales/ARInvoicePaymentPage"));
const ARCreditMemoPage = lazy(() => import("./pages/sales/ARCreditMemoPage"));
const ARReserveInvoicePage = lazy(() => import("./pages/sales/ARReserveInvoicePage"));
const DocumentGenerationWizard = lazy(() => import("./pages/sales/DocumentGenerationWizard"));
const RecurringTransactionsPage = lazy(() => import("./pages/sales/RecurringTransactionsPage"));
const RecurringTemplatesPage = lazy(() => import("./pages/sales/RecurringTemplatesPage"));
const DocumentPrintingPage = lazy(() => import("./pages/sales/DocumentPrintingPage"));
const DunningWizardPage = lazy(() => import("./pages/sales/DunningWizardPage"));
const GrossProfitRecalcWizard = lazy(() => import("./pages/sales/GrossProfitRecalcWizard"));
const SalesAnalysisReport = lazy(() => import("./pages/sales/SalesAnalysisReport"));
const BackorderReport = lazy(() => import("./pages/sales/BackorderReport"));
const SalesQuotationReport = lazy(() => import("./pages/sales/SalesQuotationReport"));
const GrossProfitReport = lazy(() => import("./pages/sales/GrossProfitReport"));
const OpenItemsList = lazy(() => import("./pages/sales/OpenItemsList"));
const CustomerReceivablesAging = lazy(() => import("./pages/sales/CustomerReceivablesAging"));
const ReturnsRmaWorkbench = lazy(() => import("./pages/sales/ReturnsRmaWorkbench"));
const CreditOverrideInbox = lazy(() => import("./pages/sales/CreditOverrideInbox"));
// Quote-to-Cash pages
const BlanketAgreementsPage = lazy(() => import("./pages/sales/BlanketAgreementsPage"));
const DiscountMatrixPage = lazy(() => import("./pages/sales/DiscountMatrixPage"));
const CustomerPriceBookPage = lazy(() => import("./pages/sales/CustomerPriceBookPage"));
const CreditManagementDashboard = lazy(() => import("./pages/sales/CreditManagementDashboard"));
const DunningPolicyManager = lazy(() => import("./pages/sales/DunningPolicyManager"));
const CollectionsCasesPage = lazy(() => import("./pages/sales/CollectionsCasesPage"));
const DisputesManagementPage = lazy(() => import("./pages/sales/DisputesManagementPage"));
const RevenueRecognitionSchedules = lazy(() => import("./pages/sales/RevenueRecognitionSchedules"));
const TaxDeterminationPage = lazy(() => import("./pages/sales/TaxDeterminationPage"));
const IncotermsRegistry = lazy(() => import("./pages/sales/IncotermsRegistry"));
const ExportDocumentationPage = lazy(() => import("./pages/sales/ExportDocumentationPage"));
const CustomerPortalSharing = lazy(() => import("./pages/sales/CustomerPortalSharing"));
const CashCollectionAnalytics = lazy(() => import("./pages/sales/CashCollectionAnalytics"));

// Purchasing A/P pages
const PurchaseBlanketAgreement = lazy(() => import("./pages/purchasing/PurchaseBlanketAgreement"));
const PurchaseQuotationPage = lazy(() => import("./pages/purchasing/PurchaseQuotationPage"));
const PurchaseOrderPage = lazy(() => import("./pages/purchasing/PurchaseOrderPage"));
const GoodsReceiptPOPage = lazy(() => import("./pages/purchasing/GoodsReceiptPOPage"));
const GoodsReturnPage = lazy(() => import("./pages/purchasing/GoodsReturnPage"));
const APDownPaymentRequest = lazy(() => import("./pages/purchasing/APDownPaymentRequest"));
const APDownPaymentInvoice = lazy(() => import("./pages/purchasing/APDownPaymentInvoice"));
const APInvoicePage = lazy(() => import("./pages/purchasing/APInvoicePage"));
const APInvoicePaymentPage = lazy(() => import("./pages/purchasing/APInvoicePaymentPage"));
const APCreditMemoPage = lazy(() => import("./pages/purchasing/APCreditMemoPage"));
const APReserveInvoicePage = lazy(() => import("./pages/purchasing/APReserveInvoicePage"));
const PurchaseDocGenWizard = lazy(() => import("./pages/purchasing/PurchaseDocGenWizard"));
const PurchaseLandedCosts = lazy(() => import("./pages/purchasing/LandedCostsPage"));
const PurchaseRecurringPage = lazy(() => import("./pages/purchasing/PurchaseRecurringPage"));
const PurchaseRecurringTemplates = lazy(() => import("./pages/purchasing/PurchaseRecurringTemplates"));
const PurchaseDocPrinting = lazy(() => import("./pages/purchasing/PurchaseDocPrinting"));
const VendorPaymentsWizard = lazy(() => import("./pages/purchasing/VendorPaymentsWizard"));
const PurchaseAnalysisReport = lazy(() => import("./pages/purchasing/PurchaseAnalysisReport"));
const PurchaseQuotationReport = lazy(() => import("./pages/purchasing/PurchaseQuotationReport"));
const PurchaseOpenItemsList = lazy(() => import("./pages/purchasing/PurchaseOpenItemsList"));
const VendorLiabilitiesAging = lazy(() => import("./pages/purchasing/VendorLiabilitiesAging"));
const VendorBalancesReport = lazy(() => import("./pages/purchasing/VendorBalancesReport"));
const PurchaseBackorderReport = lazy(() => import("./pages/purchasing/PurchaseBackorderReport"));

// Business Partners pages
const BPMasterDataPage = lazy(() => import("./pages/bp/BPMasterDataPage"));
const BPCatalogNumbers = lazy(() => import("./pages/bp/BPCatalogNumbers"));
const BPLeadsPage = lazy(() => import("./pages/bp/LeadsPage"));
const BPActivitiesPage = lazy(() => import("./pages/bp/ActivitiesPage"));
const BPActivityStatusUpdate = lazy(() => import("./pages/bp/ActivityStatusUpdate"));
const BPCampaignWizard = lazy(() => import("./pages/bp/CampaignWizard"));
const BPCampaignList = lazy(() => import("./pages/bp/CampaignList"));
const BPCustomerStatement = lazy(() => import("./pages/bp/CustomerStatementReport"));
const BPDunningHistory = lazy(() => import("./pages/bp/DunningHistoryPage"));
const BPReports = lazy(() => import("./pages/bp/BPReports"));

// Inventory (new SAP-style pages)
const ItemMasterDataPage = lazy(() => import("./pages/inventory/ItemMasterDataPage"));
const InvPriceListsPage = lazy(() => import("./pages/inventory/PriceListsPage"));
const InvSpecialPrices = lazy(() => import("./pages/inventory/SpecialPricesPage"));
const InvPeriodVolumeDiscounts = lazy(() => import("./pages/inventory/PeriodVolumeDiscounts"));
const InvGlobalPriceUpdate = lazy(() => import("./pages/inventory/GlobalPriceUpdate"));
const InvPickPackManager = lazy(() => import("./pages/inventory/PickPackManagerPage"));
const InvTransferPage = lazy(() => import("./pages/inventory/InventoryTransferPage"));
const InvTransferRequestPage = lazy(() => import("./pages/inventory/InventoryTransferRequestPage"));
const InvSerialNumbers = lazy(() => import("./pages/inventory/SerialNumberManagement"));
const InvBatchNumbers = lazy(() => import("./pages/inventory/BatchNumberManagement"));
const InvReports = lazy(() => import("./pages/inventory/InventoryReports"));

// Construction Module pages
const ConstructionLeads = lazy(() => import("./pages/construction/LeadsOpportunities"));
const ConstructionTenderRegister = lazy(() => import("./pages/construction/TenderRegister"));
const ConstructionTenderDetails = lazy(() => import("./pages/construction/TenderDetails"));
const ConstructionBOQImport = lazy(() => import("./pages/construction/BOQImport"));
const ConstructionTenderBOQ = lazy(() => import("./pages/construction/TenderBOQ"));
const ConstructionEstimation = lazy(() => import("./pages/construction/EstimationWorkbook"));
const ConstructionResourceBuildUp = lazy(() => import("./pages/construction/ResourceBuildUp"));
const ConstructionRiskContingency = lazy(() => import("./pages/construction/RiskContingency"));
const ConstructionClarifications = lazy(() => import("./pages/construction/Clarifications"));
const ConstructionBidReview = lazy(() => import("./pages/construction/BidReview"));
const ConstructionTenderApproval = lazy(() => import("./pages/construction/TenderApproval"));
const ConstructionBidTracker = lazy(() => import("./pages/construction/BidTracker"));
const ConstructionTenderComparison = lazy(() => import("./pages/construction/TenderComparison"));
const ConstructionTenderResult = lazy(() => import("./pages/construction/TenderResult"));
const ConstructionAwardConversion = lazy(() => import("./pages/construction/AwardConversion"));
const ConstructionProjectWizard = lazy(() => import("./pages/construction/ProjectWizard"));
const ConstructionContractMaster = lazy(() => import("./pages/construction/ContractMaster"));
const ConstructionContractBreakdown = lazy(() => import("./pages/construction/ContractBreakdown"));
const ConstructionBOQSchedule = lazy(() => import("./pages/construction/BOQSchedule"));
const ConstructionMilestones = lazy(() => import("./pages/construction/Milestones"));
const ConstructionRetentionTerms = lazy(() => import("./pages/construction/RetentionTerms"));
const ConstructionAdvanceTerms = lazy(() => import("./pages/construction/AdvanceTerms"));
const ConstructionPenaltyRules = lazy(() => import("./pages/construction/PenaltyRules"));
const ConstructionWBSStructure = lazy(() => import("./pages/construction/WBSStructure"));
const ConstructionBudgetBaseline = lazy(() => import("./pages/construction/BudgetBaseline"));
const ConstructionBudgetVersions = lazy(() => import("./pages/construction/BudgetVersions"));
const ConstructionApprovalMatrix = lazy(() => import("./pages/construction/ApprovalMatrix"));
const ConstructionProjectDashboard = lazy(() => import("./pages/construction/ProjectDashboard"));
const ConstructionMasterSchedule = lazy(() => import("./pages/construction/MasterSchedule"));
const ConstructionLookaheadPlanning = lazy(() => import("./pages/construction/LookaheadPlanning"));
const ConstructionCashFlowForecast = lazy(() => import("./pages/construction/CashFlowForecast"));
const ConstructionRiskRegister = lazy(() => import("./pages/construction/RiskRegister"));
const ConstructionMobilizationChecklist = lazy(() => import("./pages/construction/MobilizationChecklist"));
const ConstructionDailySiteReport = lazy(() => import("./pages/construction/DailySiteReport"));
const ConstructionWeeklyProgressReport = lazy(() => import("./pages/construction/WeeklyProgressReport"));
const ConstructionMonthlyProgressReport = lazy(() => import("./pages/construction/MonthlyProgressReport"));
const ConstructionActivityProgress = lazy(() => import("./pages/construction/ActivityProgress"));
const ConstructionBOQProgress = lazy(() => import("./pages/construction/BOQProgress"));
const ConstructionSiteInstructions = lazy(() => import("./pages/construction/SiteInstructions"));
const ConstructionMethodStatements = lazy(() => import("./pages/construction/MethodStatements"));
const ConstructionSiteIssues = lazy(() => import("./pages/construction/SiteIssues"));
const ConstructionDelayEvents = lazy(() => import("./pages/construction/DelayEvents"));
const ConstructionSiteDiary = lazy(() => import("./pages/construction/SiteDiary"));
const ConstructionSiteCorrespondence = lazy(() => import("./pages/construction/SiteCorrespondence"));
const ConstructionManpowerPlan = lazy(() => import("./pages/construction/ManpowerPlan"));
const ConstructionDailyLabor = lazy(() => import("./pages/construction/DailyLabor"));
const ConstructionTimesheets = lazy(() => import("./pages/construction/Timesheets"));
const ConstructionLaborCost = lazy(() => import("./pages/construction/LaborCost"));
const ConstructionEquipmentRegister = lazy(() => import("./pages/construction/EquipmentRegister"));
const ConstructionFuelConsumption = lazy(() => import("./pages/construction/FuelConsumption"));
const ConstructionMaintenanceRequests = lazy(() => import("./pages/construction/MaintenanceRequests"));
const ConstructionEquipmentCost = lazy(() => import("./pages/construction/EquipmentCost"));
const ConstructionEquipmentProductivity = lazy(() => import("./pages/construction/EquipmentProductivity"));
const ConstructionGoodsReceiptProject = lazy(() => import("./pages/construction/GoodsReceiptProject"));
const ConstructionSiteTransfer = lazy(() => import("./pages/construction/SiteTransfer"));
const ConstructionMaterialIssue = lazy(() => import("./pages/construction/MaterialIssue"));
const ConstructionMaterialReturn = lazy(() => import("./pages/construction/MaterialReturn"));
const ConstructionWastageReport = lazy(() => import("./pages/construction/WastageReport"));
const ConstructionSiteStockCount = lazy(() => import("./pages/construction/SiteStockCount"));
const ConstructionMaterialTrace = lazy(() => import("./pages/construction/MaterialTrace"));
const ConstructionBudgetVsCommitment = lazy(() => import("./pages/construction/BudgetVsCommitment"));
const ConstructionBudgetVsActual = lazy(() => import("./pages/construction/BudgetVsActual"));
const ConstructionCostLedger = lazy(() => import("./pages/construction/CostLedger"));
const ConstructionCostByCode = lazy(() => import("./pages/construction/CostByCode"));
const ConstructionCommittedCost = lazy(() => import("./pages/construction/CommittedCost"));
const ConstructionForecastComplete = lazy(() => import("./pages/construction/ForecastComplete"));
const ConstructionEAC = lazy(() => import("./pages/construction/EAC"));
const ConstructionCostVariance = lazy(() => import("./pages/construction/CostVariance"));
const ConstructionMarginAnalysis = lazy(() => import("./pages/construction/MarginAnalysis"));
const ConstructionOverrunAlerts = lazy(() => import("./pages/construction/OverrunAlerts"));
const ConstructionBillingPlan = lazy(() => import("./pages/construction/BillingPlan"));
const ConstructionClientIPC = lazy(() => import("./pages/construction/ClientIPC"));
const ConstructionMOSBilling = lazy(() => import("./pages/construction/MOSBilling"));
const ConstructionVariationBilling = lazy(() => import("./pages/construction/VariationBilling"));
const ConstructionAdvanceRecovery = lazy(() => import("./pages/construction/AdvanceRecovery"));
const ConstructionTaxInvoice = lazy(() => import("./pages/construction/TaxInvoice"));
const ConstructionBillingDashboard = lazy(() => import("./pages/construction/BillingDashboard"));
const ConstructionProjectAging = lazy(() => import("./pages/construction/ProjectAging"));
const ConstructionVariationEstimates = lazy(() => import("./pages/construction/VariationEstimates"));
const ConstructionVariationApproval = lazy(() => import("./pages/construction/VariationApproval"));
const ConstructionVariationRegister = lazy(() => import("./pages/construction/VariationRegister"));
const ConstructionDelayClaims = lazy(() => import("./pages/construction/DelayClaims"));
const ConstructionEOTRequests = lazy(() => import("./pages/construction/EOTRequests"));
const ConstructionClaimValuation = lazy(() => import("./pages/construction/ClaimValuation"));
const ConstructionSnagList = lazy(() => import("./pages/construction/SnagList"));
const ConstructionTesting = lazy(() => import("./pages/construction/Testing"));
const ConstructionDefectRegister = lazy(() => import("./pages/construction/DefectRegister"));
const ConstructionHandover = lazy(() => import("./pages/construction/Handover"));
const ConstructionPracticalCompletion = lazy(() => import("./pages/construction/PracticalCompletion"));
const ConstructionFinalAccount = lazy(() => import("./pages/construction/FinalAccount"));
const ConstructionRetentionRelease = lazy(() => import("./pages/construction/RetentionRelease"));
const ConstructionDefectsLiability = lazy(() => import("./pages/construction/DefectsLiability"));
const ConstructionClosureChecklist = lazy(() => import("./pages/construction/ClosureChecklist"));
const ConstructionArchive = lazy(() => import("./pages/construction/Archive"));
const ConstructionBillingVsCost = lazy(() => import("./pages/construction/BillingVsCost"));
const ConstructionRetentionReport = lazy(() => import("./pages/construction/RetentionReport"));
const ConstructionSubcontractLiability = lazy(() => import("./pages/construction/SubcontractLiability"));
// Correspondence Management
const CorrespondenceDashboardPage = lazy(() => import("./pages/correspondence/CorrespondenceDashboardPage"));
const CorrespondenceIncomingList = lazy(() => import("./pages/correspondence/IncomingListPage"));
const CorrespondenceOutgoingList = lazy(() => import("./pages/correspondence/OutgoingListPage"));
const CorrespondenceNewIncoming = lazy(() => import("./pages/correspondence/NewIncomingPage"));
const CorrespondenceNewOutgoing = lazy(() => import("./pages/correspondence/NewOutgoingPage"));
const CorrespondenceDetail = lazy(() => import("./pages/correspondence/CorrespondenceDetailPage"));
const CorrespondenceSearch = lazy(() => import("./pages/correspondence/CorrespondenceSearchPage"));
const CorrespondenceReports = lazy(() => import("./pages/correspondence/CorrespondenceReportsPage"));
const CorrespondenceSettings = lazy(() => import("./pages/correspondence/CorrespondenceSettingsPage"));
const CorrespondenceEcmMonitor = lazy(() => import("./pages/correspondence/EcmSyncMonitorPage"));
const ConstructionMaterialReport = lazy(() => import("./pages/construction/MaterialReport"));
const ConstructionEquipmentReport = lazy(() => import("./pages/construction/EquipmentReport"));

// Manufacturing Module pages
const MfgBOMVersions = lazy(() => import("./pages/manufacturing/BOMVersions"));
const MfgRoutings = lazy(() => import("./pages/manufacturing/Routings"));
const MfgWorkCenters = lazy(() => import("./pages/manufacturing/WorkCenters"));
const MfgResources = lazy(() => import("./pages/manufacturing/Resources"));
const MfgProductionCalendars = lazy(() => import("./pages/manufacturing/ProductionCalendars"));
const MfgProductionForecast = lazy(() => import("./pages/manufacturing/ProductionForecast"));
const MfgMPS = lazy(() => import("./pages/manufacturing/MPS"));
const MfgIssueForProduction = lazy(() => import("./pages/manufacturing/IssueForProduction"));
const MfgReceiptFromProduction = lazy(() => import("./pages/manufacturing/ReceiptFromProduction"));
const MfgBackflush = lazy(() => import("./pages/manufacturing/BackflushProcessing"));
const MfgByProducts = lazy(() => import("./pages/manufacturing/ByProducts"));
const MfgRework = lazy(() => import("./pages/manufacturing/ReworkOrders"));
const MfgScrap = lazy(() => import("./pages/manufacturing/ScrapReporting"));
const MfgCapacity = lazy(() => import("./pages/manufacturing/CapacityPlanning"));
const MfgShopFloor = lazy(() => import("./pages/manufacturing/ShopFloor"));
const MfgWIPMonitor = lazy(() => import("./pages/manufacturing/WIPMonitor"));
const MfgCostAnalysis = lazy(() => import("./pages/manufacturing/ProductionCostAnalysis"));
const MfgVariance = lazy(() => import("./pages/manufacturing/ProductionVariance"));
const MfgWhatIf = lazy(() => import("./pages/manufacturing/WhatIfSimulation"));

// PMO pages
const PMOBaselines = lazy(() => import("./pages/pmo/ProjectBaselinesPage"));
const PMODependencies = lazy(() => import("./pages/pmo/TaskDependenciesPage"));
const PMOResourceLoading = lazy(() => import("./pages/pmo/ResourceLoadingPage"));
const PMORaid = lazy(() => import("./pages/pmo/RAIDLogPage"));
const PMOBvA = lazy(() => import("./pages/pmo/BudgetVsActualPage"));
const PMOStageGates = lazy(() => import("./pages/pmo/StageGatesPage"));
const PMOPortfolio = lazy(() => import("./pages/pmo/PortfolioGovernancePage"));
const PMOExec = lazy(() => import("./pages/pmo/ExecutivePortfolioPage"));
const PMOVariance = lazy(() => import("./pages/pmo/ScheduleVariancePage"));
const PMOCapacity = lazy(() => import("./pages/pmo/CapacityForecastingPage"));
const PMOScenarios = lazy(() => import("./pages/pmo/ScenarioPlanningPage"));
const PMONarratives = lazy(() => import("./pages/pmo/HealthNarrativesPage"));
const PMOBusinessCases = lazy(() => import("./pages/pmo/BusinessCasesPage"));
const PMOPortfolioScoring = lazy(() => import("./pages/pmo/PortfolioScoringPage"));
const PMOBenefits = lazy(() => import("./pages/pmo/BenefitsRealizationPage"));
const PMOFinancialHealth = lazy(() => import("./pages/pmo/FinancialHealthPage"));
const PMOGateTemplates = lazy(() => import("./pages/pmo/GateTemplatesPage"));
const PMOCapacityPlanning = lazy(() => import("./pages/pmo/CapacityPlanningPage"));

const InvItemGroups = lazy(() => import("./pages/inventory/ItemGroups"));
const InvUOMGroups = lazy(() => import("./pages/inventory/UOMGroups"));
const InvPosting = lazy(() => import("./pages/inventory/InventoryPosting"));
const InvCycleCountPlans = lazy(() => import("./pages/inventory/CycleCountPlans"));
const InvReorder = lazy(() => import("./pages/inventory/ReorderRecommendations"));
const InvRevaluation = lazy(() => import("./pages/inventory/InventoryRevaluation"));
const InvLandedCostAlloc = lazy(() => import("./pages/inventory/LandedCostAllocation"));
const InvStockAging = lazy(() => import("./pages/inventory/StockAging"));
const InvATP = lazy(() => import("./pages/inventory/ATP"));
const InvAudit = lazy(() => import("./pages/inventory/InventoryAudit"));
const InvValuation = lazy(() => import("./pages/inventory/InventoryValuation"));

// WMS enhancement pages
const WmsStockLedger = lazy(() => import("./pages/inventory/wms/StockLedgerPage"));
const WmsUomConversions = lazy(() => import("./pages/inventory/wms/UomConversionsPage"));
const WmsCartonPallet = lazy(() => import("./pages/inventory/wms/CartonPalletPage"));
const WmsReplenishment = lazy(() => import("./pages/inventory/wms/ReplenishmentPage"));
const WmsCycleCountGov = lazy(() => import("./pages/inventory/wms/CycleCountGovernancePage"));
const WmsMobileScan = lazy(() => import("./pages/inventory/wms/MobileScanWorkflowsPage"));
const WmsKpis = lazy(() => import("./pages/inventory/wms/WarehouseKpisPage"));
const WmsExceptions = lazy(() => import("./pages/inventory/wms/ExceptionsConsolePage"));
const Wms3PL = lazy(() => import("./pages/inventory/wms/ThirdPartyLogisticsPage"));
const WmsFefoFifo = lazy(() => import("./pages/inventory/wms/FefoFifoRulesPage"));
const WmsCrossWhReservations = lazy(() => import("./pages/inventory/wms/CrossWarehouseReservationsPage"));

// Procurement additional pages
const ProcPlanning = lazy(() => import("./pages/procurement/ProcurementPlanning"));
const ProcMaterialDemand = lazy(() => import("./pages/procurement/MaterialDemand"));
const ProcRFQManagement = lazy(() => import("./pages/procurement/RFQManagement"));
const ProcSupplierResponses = lazy(() => import("./pages/procurement/SupplierResponses"));
const ProcTechnicalEval = lazy(() => import("./pages/procurement/TechnicalEval"));
const ProcCommercialEval = lazy(() => import("./pages/procurement/CommercialEval"));
const ProcBidComparison = lazy(() => import("./pages/procurement/BidComparison"));
const ProcAwardRec = lazy(() => import("./pages/procurement/AwardRecommendation"));
const ProcFramework = lazy(() => import("./pages/procurement/FrameworkAgreements"));
const ProcApprovedVendors = lazy(() => import("./pages/procurement/ApprovedVendors"));
const ProcSpendAnalysis = lazy(() => import("./pages/procurement/SpendAnalysis"));
const ProcKPIs = lazy(() => import("./pages/procurement/ProcurementKPIs"));
const ProcCategoryMgmt = lazy(() => import("./pages/procurement/CategoryManagement"));
const ProcMatchExceptionWorkbench = lazy(() => import("./pages/procurement/MatchExceptionWorkbench"));
const ProcSupplierOnboarding = lazy(() => import("./pages/procurement/SupplierOnboardingWizard"));
const ProcSupplierScorecards = lazy(() => import("./pages/procurement/SupplierScorecards"));
const ProcSourcingEvents = lazy(() => import("./pages/procurement/SourcingEvents"));
const ProcToleranceRules = lazy(() => import("./pages/procurement/ToleranceRules"));
const ProcVendorRiskScoring = lazy(() => import("./pages/procurement/VendorRiskScoring"));
const ProcComplianceAlerts = lazy(() => import("./pages/procurement/ComplianceExpiryAlerts"));
const ProcApprovalThresholds = lazy(() => import("./pages/procurement/ApprovalThresholdsAdmin"));
const ProcRebateTracking = lazy(() => import("./pages/procurement/RebateTracking"));

// Restaurant Management
const RestaurantDashboard = lazy(() => import("./pages/restaurant/RestaurantDashboard"));
const RestaurantMenu = lazy(() => import("./pages/restaurant/RestaurantMenu"));
const RestaurantPOS = lazy(() => import("./pages/restaurant/RestaurantPOS"));
const RestaurantTables = lazy(() => import("./pages/restaurant/RestaurantTables"));
const RestaurantKitchen = lazy(() => import("./pages/restaurant/RestaurantKitchen"));
const RestaurantShifts = lazy(() => import("./pages/restaurant/RestaurantShifts"));
const RestaurantOrders = lazy(() => import("./pages/restaurant/RestaurantOrders"));
const RestaurantReservations = lazy(() => import("./pages/restaurant/RestaurantReservations"));
const RestaurantDelivery = lazy(() => import("./pages/restaurant/RestaurantDelivery"));
const RestaurantSettings = lazy(() => import("./pages/restaurant/RestaurantSettings"));
const RestaurantLoyalty = lazy(() => import("./pages/restaurant/RestaurantLoyalty"));
const RestaurantRecipes = lazy(() => import("./pages/restaurant/RestaurantRecipes"));
const RestaurantInventory = lazy(() => import("./pages/restaurant/RestaurantInventory"));
const RestaurantReports = lazy(() => import("./pages/restaurant/RestaurantReports"));
const RestaurantBenchmarking = lazy(() => import("./pages/restaurant/RestaurantBenchmarking"));
const RestaurantLoyaltyAdvanced = lazy(() => import("./pages/restaurant/RestaurantLoyaltyAdvanced"));
const RestaurantKDSCoordination = lazy(() => import("./pages/restaurant/RestaurantKDSCoordination"));
const RestaurantRecipeVariance = lazy(() => import("./pages/restaurant/RestaurantRecipeVariance"));
const RestaurantAggregatorHub = lazy(() => import("./pages/restaurant/RestaurantAggregatorHub"));
const RestaurantRoleDashboards = lazy(() => import("./pages/restaurant/RestaurantRoleDashboards"));

// Fleet Management
const FleetDashboard = lazy(() => import("./pages/fleet/FleetDashboard"));
const FleetAssets = lazy(() => import("./pages/fleet/FleetAssets"));
const FleetAssetDetail = lazy(() => import("./pages/fleet/FleetAssetDetail"));
const FleetDrivers = lazy(() => import("./pages/fleet/FleetDrivers"));
const FleetTrips = lazy(() => import("./pages/fleet/FleetTrips"));
const FleetFuel = lazy(() => import("./pages/fleet/FleetFuel"));
const FleetMaintenance = lazy(() => import("./pages/fleet/FleetMaintenance"));
const FleetCompliance = lazy(() => import("./pages/fleet/FleetCompliance"));
const FleetIncidents = lazy(() => import("./pages/fleet/FleetIncidents"));
const FleetLeases = lazy(() => import("./pages/fleet/FleetLeases"));
const FleetPMSchedules = lazy(() => import("./pages/fleet/FleetPMSchedules"));
const FleetUtilization = lazy(() => import("./pages/fleet/FleetUtilization"));
const FleetAccidents = lazy(() => import("./pages/fleet/FleetAccidents"));
const FleetFuelControl = lazy(() => import("./pages/fleet/FleetFuelControl"));
const FleetComplianceReminders = lazy(() => import("./pages/fleet/FleetComplianceReminders"));

// Administration & Setup module (production-ready hub + 4 workflows)
const SetupHub = lazy(() => import("./pages/setup/SetupHub"));
const SetupAuditLog = lazy(() => import("./pages/setup/SetupAuditLog"));
const SetupImportJobs = lazy(() => import("./pages/setup/SetupImportJobs"));
const SetupExportJobs = lazy(() => import("./pages/setup/SetupExportJobs"));
const SetupImplementationTasks = lazy(() => import("./pages/setup/SetupImplementationTasks"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes before re-fetching
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes even when no components are subscribed
      gcTime: 10 * 60 * 1000,
      // Retry failed requests once before showing an error
      retry: 1,
      retryDelay: 1000,
      // Don't re-fetch when user switches browser tabs (reduces Supabase load)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function PageLoader() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // Delay to avoid flash on fast loads
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="flex flex-col gap-4 p-6 animate-in fade-in duration-300">
      {/* Top bar skeleton */}
      <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
      {/* Content skeleton rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted animate-pulse" style={{ animationDelay: "240ms" }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 rounded-xl bg-muted animate-pulse" style={{ animationDelay: "320ms" }} />
        <div className="h-48 rounded-xl bg-muted animate-pulse" style={{ animationDelay: "400ms" }} />
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
      <IndustryThemeProvider>
      <SyncProgressProvider>
      <AccessibilityProvider>
      <QAModeProvider>
      <DashboardPeriodProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <TranslationOverlay />
          <BrowserRouter>
            <WorkspaceTabsProvider>
            <KeyboardShortcutsDialog />
            <MobileRedirect />
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/questionnaire" element={<CustomerQuestionnaire />} />
                <Route path="/survey" element={<PublicSurvey />} />
                <Route path="/portal/:slug/*" element={<ClientPortalApp />} />
                <Route path="/subcontractor-portal/*" element={<SubcontractorPortalApp />} />
                <Route path="/supplier-portal/*" element={<SupplierPortalApp />} />
                <Route path="/share/:token" element={<GovPublicShareViewer />} />

                {/* Mobile shell — auth-protected, no MainLayout chrome */}
                <Route path="/m" element={<ProtectedRoute><MobileHome /></ProtectedRoute>} />
                <Route path="/m/wms" element={<ProtectedRoute><MobileWMS /></ProtectedRoute>} />
                <Route path="/m/cpms" element={<ProtectedRoute><MobileCPMS /></ProtectedRoute>} />
                <Route path="/m/field" element={<ProtectedRoute><MobileField /></ProtectedRoute>} />
                <Route path="/m/pos" element={<ProtectedRoute><MMobilePOS /></ProtectedRoute>} />
                <Route path="/m/banking" element={<ProtectedRoute><MMobileBanking /></ProtectedRoute>} />
                
                {/* Protected routes - permissions enforced via DB role_permissions */}
                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Index />} />
                  <Route path="/subcontractor-admin" element={<SubcontractorPortalAdminHub />} />
                  <Route path="/subcontractor-admin/packages" element={<SubcontractorPackages />} />
                  <Route path="/subcontractor-admin/progress" element={<SubcontractorProgressReview />} />
                  <Route path="/subcontractor-admin/variations" element={<SubcontractorVariationsAdmin />} />
                  <Route path="/subcontractor-admin/qa" element={<SubcontractorQAHSE />} />
                  <Route path="/subcontractor-admin/hse" element={<SubcontractorQAHSE />} />
                  <Route path="/subcontractor-admin/ipc" element={<SubcontractorIPCAdmin />} />
                  <Route path="/subcontractor-admin/documents" element={<SubcontractorDocumentsAdmin />} />
                  <Route path="/subcontractor-admin/tasks" element={<SubcontractorTasksAdmin />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/opportunities/:id" element={<OpportunityDetail />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/quotes/new" element={<Quotes />} />
                  <Route path="/business-partners" element={<BusinessPartners />} />
                  <Route path="/targets" element={<Targets />} />
                  <Route path="/activities" element={<Activities />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/calendar" element={<CalendarModule />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/asset-utilization" element={<AssetUtilization />} />
                  <Route path="/asset-finance" element={<AssetFinancialIntelligence />} />
                  <Route path="/asset-maintenance-hub" element={<AssetMaintenanceHub />} />
                  <Route path="/asset-lifecycle" element={<AssetLifecycleCompliance />} />
                  <Route path="/asset-advanced-analytics" element={<AssetAdvancedAnalytics />} />
                  <Route path="/asset-meter-readings" element={<MeterReadingsPage />} />
                  <Route path="/asset-reservations" element={<AssetReservationCalendar />} />
                  <Route path="/asset-incidents" element={<AssetIncidentRegister />} />
                  <Route path="/asset-overhauls" element={<AssetOverhaulPage />} />
                  <Route path="/asset-budget-planning" element={<AssetBudgetPlanning />} />
                  <Route path="/asset-replacement-engine" element={<AssetReplacementEngine />} />
                  <Route path="/asset-it-issuance" element={<ITAssetIssuance />} />
                  <Route path="/asset-hierarchy" element={<AssetHierarchy />} />
                  <Route path="/asset-geo-map" element={<AssetGeoMap />} />
                  <Route path="/asset-rental-billing" element={<RentalAssetBilling />} />
                  <Route path="/asset-leased-register" element={<LeasedAssetRegister />} />
                  <Route path="/asset-audit-count" element={<AssetAuditCount />} />
                  <Route path="/asset-document-library" element={<AssetDocumentLibrary />} />
                  <Route path="/asset-downtime-analytics" element={<DowntimeAnalytics />} />
                  <Route path="/asset-vendor-scorecard" element={<VendorScorecard />} />
                  <Route path="/asset-control-tower" element={<AssetControlTower />} />
                  <Route path="/asset-lifecycle" element={<AssetLifecyclePage />} />
                  <Route path="/asset-predictive" element={<PredictiveMaintenancePage />} />
                  <Route path="/asset-replacement-roadmap" element={<ReplacementRoadmapPage />} />
                  <Route path="/asset-vendor-metrics" element={<VendorScorecardMetricsPage />} />
                  <Route path="/asset-warranty-tracker" element={<WarrantyAMCTracker />} />
                  <Route path="/asset-checkout" element={<AssetCheckoutPage />} />
                  <Route path="/asset-transfers" element={<AssetTransferPage />} />
                  <Route path="/asset-disposals" element={<AssetDisposalPage />} />
                  <Route path="/asset-spare-parts" element={<SparePartsLinkage />} />
                  <Route path="/asset-inspections" element={<FieldInspectionPage />} />
                  <Route path="/asset-calibrations" element={<CalibrationTracker />} />
                  <Route path="/asset-insurance" element={<InsuranceTracker />} />
                  <Route path="/asset-fuel-logs" element={<FuelConsumptionLog />} />
                  <Route path="/asset-capitalization" element={<CapitalizationAccounting />} />
                  <Route path="/asset-work-orders" element={<AssetWorkOrders />} />
                  <Route path="/it-service" element={<ITService />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/visits" element={<Visits />} />
                  <Route path="/visit-analytics" element={<VisitAnalytics />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="/admin-settings" element={<AdminSettings />} />
                  <Route path="/admin/translations" element={<TranslationManager />} />
                  <Route path="/admin/group-structure" element={<GroupStructure />} />
                  <Route path="/admin/posting-calendar" element={<PostingCalendar />} />
                  <Route path="/admin/setup-wizard" element={<SetupWizard />} />
                  <Route path="/admin/implementation-checklist" element={<ImplementationChecklist />} />
                  <Route path="/notifications" element={<NotificationsInbox />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/workflow" element={<Workflow />} />
                  <Route path="/authorization" element={<Navigate to="/document-authorizations" replace />} />
                  <Route path="/sap-integration" element={<SAPIntegration />} />
                  <Route path="/sap-sync-center" element={<SAPSyncControlCenter />} />
                  <Route path="/personal-dashboard" element={<PersonalDashboardBuilder />} />
                  <Route path="/rollout-cockpit" element={<RolloutCockpit />} />
                  <Route path="/screen-builder" element={<ScreenBuilder />} />
                  <Route path="/role-workspaces" element={<RoleWorkspaces />} />
                  <Route path="/company-settings" element={<CompanySettings />} />
                  <Route path="/settings/industry-packs" element={<IndustryPacksAdmin />} />
                  <Route path="/company-details" element={<CompanyDetails />} />
                  <Route path="/whatsapp-settings" element={<WhatsAppSettings />} />
                  <Route path="/social-inbox" element={<SocialInbox />} />
                  <Route path="/hospital" element={<HospitalDashboard />} />
                  <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
                  <Route path="/hospital/reception" element={<HospitalReception />} />
                  <Route path="/hospital/patient-files" element={<HospitalReception />} />
                  <Route path="/hospital/patient-files/:patientId" element={<HospitalPatientFile />} />
                  <Route path="/hospital/opd" element={<HospitalOPD />} />
                  <Route path="/hospital/er" element={<HospitalER />} />
                  <Route path="/hospital/inpatient" element={<HospitalInpatient />} />
                  <Route path="/hospital/bed-management" element={<HospitalBedManagement />} />
                  <Route path="/hospital/pharmacy" element={<HospitalPharmacy />} />
                  <Route path="/hospital/billing" element={<HospitalBilling />} />
                  <Route path="/hospital/discharge" element={<HospitalDischarge />} />
                  <Route path="/hospital/or" element={<HospitalOR />} />
                  <Route path="/hospital/icu" element={<HospitalICU />} />
                  <Route path="/hospital/nicu" element={<HospitalNICU />} />
                  <Route path="/hospital/lab" element={<HospitalLab />} />
                  <Route path="/hospital/radiology" element={<HospitalRadiology />} />
                  <Route path="/hospital/insurance" element={<HospitalInsurance />} />
                  <Route path="/hospital/reports" element={<HospitalReports />} />
                  <Route path="/hospital/equipment" element={<HospitalEquipment />} />
                  <Route path="/hospital/appointments" element={<HospitalAppointments />} />
                  <Route path="/hospital/patient-master" element={<HospPatientMaster />} />
                  <Route path="/hospital/triage" element={<HospTriage />} />
                  <Route path="/hospital/physician-orders" element={<HospCPOE />} />
                  <Route path="/hospital/preauth" element={<HospPreauth />} />
                  <Route path="/hospital/discharge-planning" element={<HospDischargePlan />} />
                  <Route path="/hospital/medical-billing" element={<HospMedicalBilling />} />
                  <Route path="/hospital/patient-comms" element={<HospPatientComms />} />
                  <Route path="/hospital/interop" element={<HospInterop />} />
                  <Route path="/hospital/clinical-kpi" element={<HospClinicalKPI />} />
                  <Route path="/hr" element={<HRDashboard />} />
                  <Route path="/hr/employees" element={<Employees />} />
                  <Route path="/hr/departments" element={<Departments />} />
                  <Route path="/hr/positions" element={<Positions />} />
                  <Route path="/hr/leave" element={<LeaveManagement />} />
                  <Route path="/hr/attendance" element={<Attendance />} />
                  <Route path="/hr/payroll" element={<Payroll />} />
                  <Route path="/hr/performance" element={<Performance />} />
                  <Route path="/hr/training" element={<Training />} />
                  <Route path="/hr/recruitment" element={<Recruitment />} />
                  <Route path="/hr/ksa-compliance" element={<KSACompliance />} />
                  <Route path="/hr/self-service" element={<EmployeeSelfService />} />
                  <Route path="/hr/compliance" element={<ComplianceManagement />} />
                  <Route path="/hr/handbook" element={<EmployeeHandbook />} />
                  <Route path="/pm/projects" element={<Projects />} />
                  <Route path="/pm/projects/:projectId" element={<ProjectDetails />} />
                  <Route path="/pm/kanban/:projectId" element={<KanbanBoard />} />
                  <Route path="/pm/gantt/:projectId" element={<GanttChart />} />
                  <Route path="/technical-assessment" element={<TechnicalAssessment />} />
                  <Route path="/design-costing" element={<DesignCosting />} />
                  <Route path="/manufacturing" element={<Manufacturing />} />
                  <Route path="/delivery-installation" element={<DeliveryInstallation />} />
                  <Route path="/finance-gates" element={<FinanceGates />} />
                  <Route path="/sales-orders" element={<SalesOrders />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/finance/coa-by-entity" element={<FinCoaByEntity />} />
                  <Route path="/finance/dimensions" element={<FinDimensionAccounting />} />
                  <Route path="/finance/recurring-runner" element={<FinRecurringJERunner />} />
                  <Route path="/finance/eliminations-workflow" element={<FinEliminationsWorkflow />} />
                  <Route path="/finance/sensitive-approvals" element={<FinSensitiveApprovals />} />
                  <Route path="/finance/statement-designer" element={<FinStatementDesigner />} />
                  <Route path="/finance/audit-packs" element={<FinAuditPacks />} />
                  <Route path="/finance/ifrs-views" element={<FinIFRSReportingViews />} />
                  <Route path="/finance/tax-localization" element={<FinTaxLocalization />} />
                  <Route path="/finance/controller-dashboard" element={<FinControllerDashboard />} />
                  <Route path="/ar-invoices" element={<ARInvoices />} />
                  <Route path="/delivery-notes" element={<DeliveryNotes />} />
                  <Route path="/incoming-payments" element={<IncomingPayments />} />
                  <Route path="/material-requests" element={<MaterialRequests />} />
                  <Route path="/material-requests/workflow-settings" element={<MRWorkflowSettings />} />
                  <Route path="/items" element={<Items />} />
                  <Route path="/payment-certificates" element={<PaymentCertificates />} />
                  <Route path="/payment-certificate-types" element={<PaymentCertificateTypes />} />
                  <Route path="/user-config" element={<UserConfig />} />
                  <Route path="/region-config" element={<RegionConfig />} />
                  <Route path="/procurement" element={<ProcurementDashboard />} />
                  <Route path="/project-procurement" element={<ProjectProcurementDashboard />} />
                  <Route path="/procurement-hub" element={<ProcurementHub />} />
                  <Route path="/supplier-management" element={<SupplierManagement />} />
                  <Route path="/supplier-comparison" element={<SupplierComparison />} />
                  <Route path="/mobile-executive" element={<MobileExecutive />} />
                  <Route path="/whatsapp-campaign" element={<WhatsAppCampaign />} />
                  <Route path="/contract-progress" element={<ContractProgress />} />
                  <Route path="/sla-configuration" element={<SLAConfiguration />} />
                  <Route path="/mail-configuration" element={<MailConfiguration />} />
                  <Route path="/whatsapp-invoice" element={<WhatsAppInvoice />} />
                  <Route path="/numbering-series" element={<NumberingSeries />} />
                  <Route path="/sales-employees" element={<SalesEmployees />} />
                  <Route path="/dimensions" element={<Dimensions />} />
                  <Route path="/payment-means-settings" element={<PaymentMeansSettings />} />
                  <Route path="/sync-error-logs" element={<SyncErrorLogs />} />
                  <Route path="/warehouses" element={<Warehouses />} />
                  <Route path="/price-lists" element={<PriceLists />} />
                  <Route path="/tax-codes" element={<TaxCodes />} />
                  <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
                  <Route path="/cost-center-dimensions" element={<CostCenterDimensions />} />
                  <Route path="/metadata-studio" element={<MetadataStudio />} />
                  <Route path="/query-studio" element={<QueryStudio />} />
                  <Route path="/report-studio" element={<ReportStudio />} />
                  <Route path="/general-ledger" element={<GeneralLedger />} />
                  <Route path="/inventory/goods-receipt" element={<GoodsReceipt />} />
                  <Route path="/inventory/goods-issue" element={<GoodsIssue />} />
                  <Route path="/inventory/stock-transfer" element={<StockTransfer />} />
                  <Route path="/inventory/counting" element={<InventoryCounting />} />
                  <Route path="/inventory/bin-locations" element={<BinLocations />} />
                  <Route path="/inventory/batch-serial" element={<BatchSerialTracking />} />
                  <Route path="/inventory/item-warehouse" element={<ItemWarehouseInfo />} />
                  <Route path="/wms/receiving" element={<MobileReceiving />} />
                  <Route path="/wms/putaway" element={<MobilePutaway />} />
                  <Route path="/wms/picking" element={<PickingQueue />} />
                  <Route path="/wms/waves" element={<BatchWaveBuilder />} />
                  <Route path="/wms/packing" element={<PackingStation />} />
                  <Route path="/wms/loading" element={<LoadingDispatch />} />
                  <Route path="/wms/cycle-count" element={<CycleCountMobile />} />
                  <Route path="/wms/lot-serial" element={<LotSerialInquiry />} />
                  <Route path="/wms/heatmap" element={<WarehouseHeatmap />} />
                  <Route path="/wms/exceptions" element={<ExceptionConsole />} />
                  <Route path="/wms/transfer" element={<TransferExecution />} />
                  <Route path="/wms/returns" element={<ReturnHandling />} />
                  <Route path="/wms/barcode-rfid" element={<BarcodeRFIDTools />} />
                  <Route path="/ar-credit-memos" element={<ARCreditMemos />} />
                  <Route path="/ar-returns" element={<ARReturns />} />
                  <Route path="/banking/exchange-rates" element={<ExchangeRates />} />
                  <Route path="/banking/statements" element={<BankStatements />} />
                  <Route path="/banking/reconciliation" element={<PaymentReconciliation />} />
                  <Route path="/banking/outgoing-payments" element={<OutgoingPayments />} />
                  <Route path="/banking/dashboard" element={<BankingDashboard />} />
                  <Route path="/banking/cash-flow-forecast" element={<CashFlowForecasting />} />
                  <Route path="/banking/cash-flow-scenarios" element={<CashFlowScenarios />} />
                  <Route path="/banking/cash-position" element={<CashPositionDashboard />} />
                  <Route path="/banking/smart-reconciliation" element={<SmartReconciliation />} />
                  <Route path="/banking/multi-bank-recon" element={<MultiBankRecon />} />
                  <Route path="/banking/recon-exceptions" element={<ReconExceptions />} />
                  <Route path="/banking/payment-optimization" element={<PaymentOptimization />} />
                  <Route path="/banking/kpi-dashboard" element={<BankingKPIDashboard />} />
                  <Route path="/banking/drill-down" element={<BankingDrillDown />} />
                  <Route path="/banking/variance-analysis" element={<BankingVarianceAnalysis />} />
                  <Route path="/banking/aging-analysis" element={<BankingAgingAnalysis />} />
                  <Route path="/banking/mobile" element={<MobileBankingDashboard />} />
                  <Route path="/banking/ai-insights" element={<AIBankingInsights />} />
                  <Route path="/banking/workflow-automation" element={<BankingWorkflowAutomation />} />
                  <Route path="/banking/enhanced-fx" element={<EnhancedExchangeRates />} />
                  <Route path="/banking/statement-automation" element={<BankStatementAutomation />} />
                  <Route path="/banking/compliance-audit" element={<BankingComplianceAudit />} />
                  <Route path="/pos" element={<POSDashboardPage />} />
                  <Route path="/pos/terminal" element={<POSTerminalPage />} />
                  <Route path="/pos/sessions" element={<POSSessionsPage />} />
                  <Route path="/pos/transactions" element={<POSTransactionsPage />} />
                  <Route path="/pos/transactions/:id" element={<POSTransactionDetailPage />} />
                  <Route path="/pos/returns" element={<POSReturnsPage />} />
                  <Route path="/pos/settings" element={<POSSettingsPage />} />
                  <Route path="/pos/checklists" element={<POSChecklistsPage />} />
                  <Route path="/pos/cashier-productivity" element={<CashierProductivityPage />} />
                  <Route path="/pos/quick-sale" element={<POSQuickSale />} />
                  <Route path="/pos/loyalty" element={<LoyaltyWallet />} />
                  <Route path="/pos/promotions" element={<POSPromotions />} />
                  <Route path="/pos/gift-cards" element={<GiftCardManagement />} />
                  <Route path="/pos/layaway" element={<LayawayInstallments />} />
                  <Route path="/pos/pickup" element={<OmnichannelPickup />} />
                  <Route path="/pos/repair" element={<POSRepairIntake />} />
                  <Route path="/pos/fraud" element={<POSFraudDashboard />} />
                  <Route path="/pos/returns-intelligence" element={<POSReturnsIntelligence />} />
                  <Route path="/pos/offline-sync" element={<POSOfflineSync />} />
                  <Route path="/pos/card-reconciliation" element={<POSCardReconciliation />} />
                  <Route path="/pos/branch-benchmarking" element={<BranchBenchmarking />} />
                  <Route path="/pos/mobile" element={<MobilePOS />} />
                  <Route path="/track" element={<CustomerOrderTracker />} />
                  <Route path="/track/:token" element={<CustomerOrderTracker />} />
                  <Route path="/loyalty-wallet" element={<LoyaltyWallet />} />
                  <Route path="/pos-promotions" element={<POSPromotions />} />
                  <Route path="/bank-pos" element={<BankPOSSettings />} />
                  <Route path="/pos-card-reconciliation" element={<POSCardReconciliation />} />
                  <Route path="/pos-offline-sync" element={<POSOfflineSync />} />
                  <Route path="/cashier-shifts" element={<CashierShiftReconciliation />} />
                  <Route path="/pos-fraud" element={<POSFraudDashboard />} />
                  <Route path="/omnichannel-pickup" element={<OmnichannelPickup />} />
                  <Route path="/pos-returns" element={<POSReturnsIntelligence />} />
                  <Route path="/branch-benchmarking" element={<BranchBenchmarking />} />
                  <Route path="/mobile-pos" element={<MobilePOS />} />
                  <Route path="/cross-sell" element={<CrossSellUpsell />} />
                  <Route path="/kitchen-display" element={<KitchenDisplay />} />
                  <Route path="/delivery-dispatch" element={<DeliveryDispatch />} />
                  <Route path="/gift-cards" element={<GiftCardManagement />} />
                  <Route path="/customer-360" element={<Customer360 />} />
                  <Route path="/vendor-360" element={<Vendor360 />} />
                  <Route path="/branch-health" element={<BranchHealth />} />
                  <Route path="/sales-pipeline" element={<SalesPipeline />} />
                  <Route path="/follow-up-automation" element={<FollowUpAutomation />} />
                  <Route path="/cadences" element={<Cadences />} />
                  <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
                  <Route path="/email-templates" element={<EmailTemplates />} />
                  <Route path="/email-automation" element={<EmailAutomation />} />
                  <Route path="/email-signatures" element={<EmailSignatures />} />
                  <Route path="/notification-preferences" element={<NotificationPreferences />} />
                  <Route path="/document-management" element={<DocumentManagement />} />
                  <Route path="/elevenlabs-settings" element={<ElevenLabsSettings />} />
                  <Route path="/approval-workflows" element={<ApprovalWorkflows />} />
                  <Route path="/approval-inbox" element={<ApprovalInbox />} />
                  <Route path="/approval/stages" element={<ApprovalStagesPage />} />
                  <Route path="/approval/templates" element={<ApprovalTemplatesPage />} />
                  <Route path="/approval/status-report" element={<ApprovalStatusReportPage />} />
                  <Route path="/approval/decision-report" element={<ApprovalDecisionReportPage />} />
                  <Route path="/approval/substitute" element={<SubstituteAuthorizerPage />} />
                  <Route path="/approvals/delegations" element={<ApprovalDelegations />} />
                  <Route path="/approvals/sla" element={<ApprovalSLADashboard />} />
                  <Route path="/signatures/audit" element={<SignatureAuditViewer />} />
                  <Route path="/workflow/simulator" element={<WorkflowSimulator />} />
                  <Route path="/lowcode/publish-governance" element={<LowcodePublishGovernance />} />
                  <Route path="/audit/search" element={<UnifiedAuditSearch />} />
                  <Route path="/crm/dedupe" element={<CRMDedupeQueue />} />
                  <Route path="/crm/scoring" element={<CRMScoringRules />} />
                  <Route path="/crm/sla" element={<CRMSLAPolicies />} />
                  <Route path="/crm/capture-sources" element={<CRMCaptureSources />} />
                  <Route path="/crm/customer/:id" element={<Customer360Page />} />
                  <Route path="/crm/visit-capture" element={<GeoVisitCapture />} />
                  <Route path="/crm/territories" element={<CRMTerritories />} />
                  <Route path="/crm/account-hierarchy" element={<CRMAccountHierarchy />} />
                  <Route path="/crm/consent-log" element={<CRMConsentLog />} />
                  <Route path="/crm/regional-pipelines" element={<CRMRegionalPipelines />} />
                  <Route path="/crm/leads-inbox" element={<CRMLeadsInbox />} />
                  <Route path="/crm/sla-rules" element={<CRMSLARules />} />
                  <Route path="/crm/partner-referrals" element={<CRMPartnerReferrals />} />
                  <Route path="/crm/next-best-actions" element={<CRMNextBestActions />} />
                  <Route path="/crm/segments" element={<CRMSegments />} />
                  <Route path="/crm/customer-360" element={<CRMCustomer360 />} />
                  <Route path="/crm/message-templates" element={<CRMMessageTemplates />} />
                  <Route path="/crm/deal-risk" element={<CRMDealRisk />} />
                  <Route path="/hr/recruitment" element={<HRRecruitmentPage />} />
                  <Route path="/hr/onboarding" element={<HROnboardingPage />} />
                  <Route path="/hr/attendance-exceptions" element={<HRAttendanceExceptionsPage />} />
                  <Route path="/hr/payroll-audit" element={<HRPayrollAuditPage />} />
                  <Route path="/hr/appraisal-calibration" element={<HRAppraisalCalibrationPage />} />
                  <Route path="/hr/workforce-planning" element={<HRWorkforcePlanningPage />} />
                  <Route path="/hr/self-service" element={<HRSelfServicePage />} />
                  <Route path="/hr/statutory" element={<HRStatutoryReportingPage />} />
                  <Route path="/hr/ats-pipeline" element={<ATSPipelinePage />} />
                  <Route path="/hr/ats-screening-rules" element={<ATSScreeningRulesPage />} />
                  <Route path="/hr/contracts" element={<ContractLifecyclePage />} />
                  <Route path="/hr/regional-leave" element={<RegionalLeavePoliciesPage />} />
                  <Route path="/hr/payroll-controls" element={<PayrollControlsPage />} />
                  <Route path="/hr/ess-portal" element={<ESSPortalPage />} />
                  <Route path="/hr/grievances-enhanced" element={<HRGrievancesEnhancedPage />} />
                  <Route path="/hr/offboarding-enhanced" element={<HROffboardingEnhancedPage />} />
                  <Route path="/hr/document-expiry" element={<DocumentExpiryPage />} />
                  <Route path="/hr/attendance-exceptions-v2" element={<AttendanceExceptionsEnhancedPage />} />
                  <Route path="/qa-dashboard" element={<QADashboard />} />
                  <Route path="/executive-brief" element={<ExecutiveBriefPage />} />
                  <Route path="/executive-reporting" element={<ExecutiveReportingHub />} />
                  <Route path="/data-quality" element={<DataQualityCenter />} />
                  <Route path="/process-health" element={<ProcessHealthDashboard />} />
                  <Route path="/workspace-config" element={<WorkspaceConfig />} />
                  <Route path="/landed-costs" element={<LandedCosts />} />
                  <Route path="/landed-cost-setup" element={<LandedCostSetup />} />
                  <Route path="/landed-cost-setup/documents" element={<LandedCostSetup />} />
                  <Route path="/landed-cost-setup/categories" element={<LandedCostSetup />} />
                  <Route path="/landed-cost-setup/brokers" element={<LandedCostSetup />} />
                  <Route path="/landed-cost-setup/mappings" element={<LandedCostSetup />} />
                  <Route path="/landed-cost-setup/settings" element={<LandedCostSetup />} />
                  <Route path="/questionnaires" element={<Questionnaires />} />
                  <Route path="/zatca" element={<ZATCAIntegration />} />
                  <Route path="/cpms" element={<CPMSDashboard />} />
                  <Route path="/cpms/projects" element={<CPMSProjects />} />
                  <Route path="/cpms/project/:projectId" element={<CPMSProjectDetail />} />
                  <Route path="/cpms/expenses" element={<CPMSExpenses />} />
                  <Route path="/cpms/daily-reports" element={<CPMSDailyReports />} />
                  <Route path="/cpms/costs" element={<CPMSCosts />} />
                  <Route path="/cpms/billing" element={<CPMSBilling />} />
                  <Route path="/cpms/documents" element={<CPMSDocuments />} />
                  <Route path="/cpms/hse" element={<CPMSHSE />} />
                  <Route path="/cpms/tenders" element={<CPMSTenders />} />
                  <Route path="/cpms/resources" element={<CPMSResources />} />
                  <Route path="/cpms/clients" element={<CPMSClients />} />
                  <Route path="/cpms/finance" element={<CPMSFinance />} />
                  <Route path="/cpms/cost-control" element={<CPMSCostControl />} />
                  <Route path="/cpms/cost-codes" element={<CPMSCostCodes />} />
                  <Route path="/cpms/cost-code-report" element={<CPMSCostCodeReport />} />
                  <Route path="/cpms/job-costing" element={<CPMSJobCosting />} />
                  <Route path="/cpms/cash-flow" element={<CPMSCashFlowForecast />} />
                  <Route path="/cpms/commercial-control-tower" element={<CPMSCommercialControlTower />} />
                  <Route path="/cpms/rfis" element={<CPMSRFIs />} />
                  <Route path="/cpms/site-materials" element={<CPMSSiteMaterials />} />
                  <Route path="/cpms/labor-productivity" element={<CPMSLaborProductivity />} />
                  <Route path="/cpms/subcontractors" element={<CPMSSubcontractors />} />
                  <Route path="/cpms/subcontractor-rankings" element={<CPMSSubcontractorRankings />} />
                  <Route path="/cpms/progress-billing" element={<CPMSProgressBilling />} />
                  <Route path="/cpms/equipment-utilization" element={<CPMSEquipmentUtilization />} />
                  <Route path="/cpms/quality" element={<CPMSQualityCompliance />} />
                  <Route path="/cpms/qaqc" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/tickets" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/inspections" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/ncr" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/checklists" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/drawings" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/plan-viewer" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/siteview" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/approvals" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/workflow" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/qaqc/reports" element={<QAQCCommandCenter />} />
                  <Route path="/cpms/change-orders" element={<CPMSChangeOrders />} />
                  <Route path="/cpms/gantt" element={<CPMSGanttChart />} />
                  <Route path="/cpms/schedule-planning" element={<CPMSSchedulePlanning />} />
                  <Route path="/cpms/site-progress" element={<CPMSSiteProgress />} />
                  <Route path="/cpms/predictive" element={<CPMSPredictiveAnalytics />} />
                  <Route path="/cpms/delay-analysis" element={<CPMSDelayAnalysis />} />
                  <Route path="/cpms/cash-position" element={<CPMSProjectCashPosition />} />
                  <Route path="/cpms/equipment" element={<CPMSEquipmentMgmt />} />
                  <Route path="/cpms/compare" element={<CPMSProjectComparison />} />
                  <Route path="/cpms/report-templates" element={<CPMSReportTemplates />} />
                  <Route path="/cpms/notifications" element={<CPMSNotifications />} />
                  <Route path="/cpms/sustainability" element={<CPMSSustainability />} />
                  <Route path="/cpms/weather-iot" element={<CPMSWeatherIoT />} />
                  <Route path="/cpms/drawing-measurement" element={<CPMSDrawingMeasurement />} />
                  <Route path="/cpms/measurement-reporting" element={<CPMSMeasurementReporting />} />
                  <Route path="/cpms/analytics" element={<CPMSAnalyticsDashboard />} />
                  <Route path="/cpms/reports" element={<CPMSReportsPage />} />
                  <Route path="/cpms/mobile" element={<CPMSMobileHome />} />
                  <Route path="/cpms/mobile/time" element={<CPMSMobileTimeClock />} />
                  <Route path="/cpms/mobile/photos" element={<CPMSMobilePhotos />} />
                  {/* Contractor Suite */}
                  <Route path="/cpms/subcontracts" element={<SubcontractsPage />} />
                  <Route path="/cpms/variation-orders" element={<VariationOrdersPage />} />
                  <Route path="/cpms/client-ipc" element={<ClientIPCPage />} />
                  <Route path="/cpms/retention" element={<RetentionPage />} />
                  <Route path="/cpms/ctc" element={<CTCForecastPage />} />
                  <Route path="/cpms/delays" element={<DelayRegisterPage />} />
                  <Route path="/cpms/productivity" element={<ProductivityPage />} />
                  <Route path="/cpms/transmittals" element={<TransmittalsPage />} />
                  <Route path="/cpms/control-tower" element={<ControlTowerPage />} />
                  <Route path="/cpms/mobile-field" element={<MobileFieldPage />} />
                  {/* Governance Suite */}
                  <Route path="/governance/task-inbox" element={<GovTaskInbox />} />
                  <Route path="/governance/approval-templates" element={<GovApprovalTemplates />} />
                  <Route path="/governance/delegations" element={<GovDelegations />} />
                  <Route path="/governance/retention-rules" element={<GovRetentionRules />} />
                  <Route path="/governance/ocr-ingestion" element={<GovOcrIngestion />} />
                  <Route path="/governance/external-shares" element={<GovExternalShares />} />
                  <Route path="/governance/signature-envelopes" element={<GovSignatureEnvelopes />} />
                  <Route path="/governance/workflow-designer" element={<GovWorkflowDesigner />} />
                  <Route path="/governance/compliance-audit" element={<GovComplianceAudit />} />
                  {/* Master Data Governance */}
                  <Route path="/mdm" element={<MDMOverview />} />
                  <Route path="/mdm/hierarchies" element={<MDMHierarchies />} />
                  <Route path="/mdm/dedup" element={<MDMDedup />} />
                  <Route path="/mdm/validation-policies" element={<MDMValidationPolicies />} />
                  <Route path="/mdm/credit-profiles" element={<MDMCreditProfiles />} />
                  <Route path="/mdm/tax-registrations" element={<MDMTaxRegistrations />} />
                  <Route path="/mdm/addresses" element={<MDMAddresses />} />
                  <Route path="/mdm/contacts" element={<MDMContacts />} />
                  <Route path="/mdm/segments" element={<MDMSegments />} />
                  <Route path="/mdm/stewardship" element={<MDMStewardship />} />
                  <Route path="/mdm/change-log" element={<MDMChangeLog />} />
                  {/* Service & ITSM */}
                  <Route path="/itsm" element={<ITSMOverview />} />
                  <Route path="/itsm/tickets" element={<ITSMTickets />} />
                  <Route path="/itsm/tickets/:id" element={<ITSMTicketDetail />} />
                  <Route path="/itsm/sla-policies" element={<ITSMSLAPolicies />} />
                  <Route path="/itsm/knowledge-base" element={<ITSMKnowledgeBase />} />
                  <Route path="/itsm/field-service" element={<ITSMFieldService />} />
                  <Route path="/itsm/technicians" element={<ITSMTechnicians />} />
                  <Route path="/itsm/contracts" element={<ITSMContracts />} />
                  <Route path="/itsm/escalations" element={<ITSMEscalations />} />
                  <Route path="/itsm/analytics" element={<ITSMAnalytics />} />
                  <Route path="/fixed-assets" element={<FixedAssets />} />
                  <Route path="/budget-setup" element={<BudgetSetup />} />
                  <Route path="/cost-accounting" element={<CostAccounting />} />
                  <Route path="/cost-accounting/distribution-rules" element={<CostAccounting />} />
                  <Route path="/cost-accounting/hierarchy" element={<CostAccounting />} />
                  <Route path="/cost-accounting/cc-dr" element={<CostAccounting />} />
                  <Route path="/cost-accounting/ai-estimation" element={<CostAccounting />} />
                  <Route path="/cost-accounting/budget-vs-actual" element={<CostAccounting />} />
                  <Route path="/cost-accounting/work-packages" element={<CostAccounting />} />
                  <Route path="/cost-accounting/markup-margin" element={<CostAccounting />} />
                  <Route path="/cost-accounting/margin-analysis" element={<CostAccounting />} />
                  <Route path="/cost-accounting/rate-cards" element={<CostAccounting />} />
                  <Route path="/cost-accounting/materials" element={<CostAccounting />} />
                  <Route path="/cost-accounting/equipment" element={<CostAccounting />} />
                  <Route path="/cost-accounting/subcontractors" element={<CostAccounting />} />
                  <Route path="/cost-accounting/profitability" element={<CostAccounting />} />
                  <Route path="/cost-accounting/benchmarking" element={<CostAccounting />} />
                  <Route path="/cost-accounting/escalation" element={<CostAccounting />} />
                  <Route path="/cost-accounting/cpi-monitor" element={<CostAccounting />} />
                  <Route path="/cost-accounting/revenue-recognition" element={<CostAccounting />} />
                  <Route path="/cost-accounting/profit-forecast" element={<CostAccounting />} />
                  <Route path="/cost-accounting/what-if" element={<CostAccounting />} />
                  <Route path="/cost-accounting/supplier-scores" element={<CostAccounting />} />
                  <Route path="/cost-accounting/auto-allocation" element={<CostAccounting />} />
                  <Route path="/cost-accounting/executive" element={<CostAccounting />} />
                  <Route path="/cost-accounting/drill-down" element={<CostAccounting />} />
                  <Route path="/cost-accounting/resource-optimizer" element={<CostAccounting />} />
                  <Route path="/cost-accounting/value-engineering" element={<CostAccounting />} />
                  <Route path="/cost-accounting/alerts" element={<CostAccounting />} />
                  <Route path="/financial-reports" element={<FinancialReports />} />
                  <Route path="/audit-balance-sheet" element={<AuditBalanceSheet />} />
                  <Route path="/bs-report-config" element={<BSReportConfig />} />
                  <Route path="/opportunity-reports" element={<OpportunityReports />} />
                  <Route path="/service-module" element={<ServiceModule />} />
                  <Route path="/sales-dashboard" element={<SalesDashboard />} />
                  <Route path="/sales-smart-forecast" element={<SalesSmartForecast />} />
                  <Route path="/sales-lead-scoring" element={<SalesLeadScoring />} />
                  <Route path="/sales-performance" element={<SalesPerformanceAnalytics />} />
                  <Route path="/sales-recommendations" element={<SalesRecommendations />} />
                  <Route path="/sales-pricing" element={<SalesPricingOptimization />} />
                  <Route path="/sales-customer-health" element={<SalesCustomerHealth />} />
                  <Route path="/sales-quote-builder" element={<SalesQuoteBuilder />} />
                  <Route path="/sales-cycle-prediction" element={<SalesCyclePrediction />} />
                  <Route path="/sales-competitor-intel" element={<SalesCompetitorIntel />} />
                  <Route path="/sales-insights-alerts" element={<SalesInsightsAlerts />} />
                  <Route path="/sales-segmentation" element={<SalesSegmentation />} />
                  <Route path="/sales-territory" element={<SalesTerritoryOptimization />} />
                  <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
                  <Route path="/finance-dashboard" element={<FinanceDashboard />} />
                  <Route path="/finance-drilldown" element={<FinanceKPIDrillDown />} />
                  <Route path="/procurement-analytics" element={<ProcurementAnalytics />} />
                  <Route path="/sap-databases" element={<SAPDatabases />} />
                  <Route path="/user-defaults" element={<UserDefaults />} />
                  <Route path="/document-authorizations" element={<DocumentAuthorizations />} />
                  <Route path="/journal-entries" element={<JournalEntries />} />
                  <Route path="/journal-vouchers" element={<JournalVouchers />} />
                  <Route path="/je-mapping-rules" element={<JEMappingRules />} />
                  <Route path="/accounting-determination" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/rules" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/templates" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/gl-roles" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/controls" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/simulator" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/errors" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/logs" element={<AccountingDetermination />} />
                  <Route path="/accounting-determination/reports" element={<AccountingDetermination />} />
                  <Route path="/workflow-builder" element={<WorkflowBuilderPage />} />
                  <Route path="/customer-credit-control" element={<CustomerCreditControl />} />
                  <Route path="/exception-center" element={<ExceptionCenter />} />
                  <Route path="/enterprise-exception-center" element={<EnterpriseExceptionCenter />} />
                  <Route path="/intercompany-control-center" element={<IntercompanyControlCenter />} />
                  <Route path="/margin-protection" element={<MarginProtection />} />
                  <Route path="/revenue-recognition" element={<RevenueRecognitionEngine />} />
                  <Route path="/budget-control" element={<BudgetControlCenter />} />
                  <Route path="/procurement-categories" element={<ProcurementCategoryManagement />} />
                  <Route path="/supplier-rebates" element={<SupplierRebateManagement />} />
                  <Route path="/sla-engine" element={<SLAEngine />} />
                  <Route path="/contract-management" element={<ContractManagement />} />
                  <Route path="/contract-detail/:id" element={<ContractDetail />} />
                  <Route path="/clause-library" element={<ClauseLibrary />} />
                  <Route path="/renewal-calendar" element={<RenewalCalendar />} />
                  <Route path="/budget-vs-actual" element={<BudgetVsActual />} />
                  <Route path="/boardroom-reporting" element={<BoardroomReporting />} />
                  <Route path="/financial-periods" element={<FinancialPeriods />} />
                  <Route path="/financial-statements" element={<FinancialStatements />} />
                  <Route path="/financial-reports/trial-balance" element={<TrialBalanceReport />} />
                  <Route path="/financial-reports/balance-sheet" element={<BalanceSheetReport />} />
                  <Route path="/financial-reports/profit-loss" element={<ProfitLossReport />} />
                  <Route path="/financial-reports/cash-flow-statement" element={<CashFlowStatement />} />
                  <Route path="/financial-reports/general-ledger" element={<GeneralLedgerReport />} />
                  <Route path="/financial-reports/ar-aging" element={<ARAgingReport />} />
                  <Route path="/financial-reports/ap-aging" element={<APAgingReport />} />
                  <Route path="/financial-reports/cost-centers/summary" element={<CostCenterSummary />} />
                  <Route path="/financial-reports/cost-centers/variance" element={<CostCenterVariance />} />
                  <Route path="/financial-reports/cost-centers/trends" element={<CostCenterTrends />} />
                  <Route path="/financial-reports/cost-centers/ledger" element={<CostCenterLedger />} />
                  <Route path="/financial-reports/consolidation" element={<ConsolidationDashboard />} />
                  <Route path="/financial-reports/consolidation/profit-loss" element={<ConsolidatedPL />} />
                  <Route path="/financial-reports/consolidation/balance-sheet" element={<ConsolidatedBS />} />
                  <Route path="/financial-reports/consolidation/trial-balance" element={<ConsolidatedTB />} />
                  <Route path="/bill-of-materials" element={<BillOfMaterials />} />
                  <Route path="/mrp-planning" element={<MRPPlanning />} />
                  <Route path="/pick-and-pack" element={<PickAndPack />} />
                  <Route path="/quality-management" element={<QualityManagement />} />
                  <Route path="/dunning" element={<DunningManagement />} />
                  <Route path="/bank-reconciliation" element={<BankReconciliationPage />} />
                  <Route path="/banking/statement-import" element={<StatementImportWizard />} />
                  <Route path="/banking/reconciliation-workbench/:importId" element={<ReconciliationWorkbench />} />
                  <Route path="/banking/exceptions" element={<BankExceptionsPage />} />
                  <Route path="/banking/cash-position" element={<CashPositionDashboardPage />} />
                  <Route path="/banking/forecast-scenarios" element={<ForecastScenariosPage />} />
                  <Route path="/banking/payment-optimization" element={<PaymentOptimizationPage />} />
                  <Route path="/banking/payment-approvals" element={<PaymentApprovalsPage />} />
                  <Route path="/banking/account-hierarchy" element={<BankAccountHierarchy />} />
                  <Route path="/banking/bank-adapters" element={<BankAdaptersRegistry />} />
                  <Route path="/banking/recon-rules" element={<ReconRulesEngine />} />
                  <Route path="/banking/approval-policies" element={<TreasuryApprovalPolicies />} />
                  <Route path="/banking/fx-exposure" element={<FXExposureMonitor />} />
                  <Route path="/banking/fraud-rules" element={<PaymentFraudRules />} />
                  <Route path="/banking/ic-cash-visibility" element={<IntercompanyCashVisibility />} />
                  <Route path="/audit-trail" element={<AuditTrailPage />} />
                  <Route path="/form-settings" element={<FormSettingsPage />} />
                  <Route path="/required-fields" element={<RequiredFieldsSettings />} />
                  <Route path="/alerts-management" element={<AlertsManagement />} />
                  <Route path="/drag-and-relate" element={<DragAndRelate />} />
                  <Route path="/print-layout-designer" element={<PrintLayoutDesigner />} />
                  <Route path="/pmo/portfolio" element={<PortfolioDashboard />} />
                  <Route path="/pmo/executive" element={<PMOExecutiveDashboard />} />
                  <Route path="/pmo/lessons" element={<LessonsLearned />} />
                  <Route path="/pmo/alerts" element={<PMOAlertCenter />} />
                  <Route path="/pmo/resources" element={<PMOResourceManagement />} />
                  <Route path="/pmo/stakeholder" element={<PMOStakeholderHub />} />
                  <Route path="/pmo/dependencies" element={<PMODependencyTracking />} />
                  <Route path="/pmo/predictive" element={<PMOPredictiveAnalytics />} />
                  <Route path="/pmo/optimization" element={<PMOPortfolioOptimization />} />
                  <Route path="/pmo/compliance" element={<PMOComplianceAudit />} />
                  <Route path="/tmo" element={<TMODashboard />} />
                  <Route path="/tmo/executive" element={<TMOExecutiveDashboard />} />
                  <Route path="/bids" element={<BidDashboard />} />
                  <Route path="/unified-executive" element={<UnifiedExecutiveDashboard />} />
                  <Route path="/qto" element={<QTOModule />} />
                  <Route path="/boq" element={<BOQManagement />} />
                  <Route path="/boq-comparison" element={<BOQVersionComparison />} />
                  <Route path="/evm" element={<EVMDashboard />} />
                  <Route path="/vendor-prequalification" element={<VendorPrequalification />} />
                  <Route path="/industry-intelligence" element={<IndustryIntelligence />} />
                  <Route path="/project-control" element={<ProjectControlDashboard />} />
                  <Route path="/financial-control" element={<FinancialControlDashboard />} />
                  <Route path="/executive-finance" element={<ExecutiveFinanceDashboard />} />
                  <Route path="/what-if-analysis" element={<WhatIfAnalysis />} />
                  <Route path="/trading" element={<TradingHub />} />
                  <Route path="/shipments" element={<Shipments />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/retainers" element={<Retainers />} />
                  <Route path="/client-portals" element={<ClientPortalSettings />} />
                  <Route path="/ar-collections" element={<ARCollections />} />
                  <Route path="/supplier-scorecards" element={<SupplierScorecards />} />
                  <Route path="/safety-incidents" element={<SafetyIncidents />} />
                  <Route path="/preventive-maintenance" element={<PreventiveMaintenance />} />
                  <Route path="/import-validation" element={<ImportValidation />} />
                  <Route path="/data-transfer-workbench" element={<DataTransferWorkbench />} />
                  <Route path="/scenario-planning" element={<ScenarioPlanning />} />
                  <Route path="/kpi-subscriptions" element={<KPISubscriptions />} />
                   <Route path="/guided-tours" element={<GuidedTours />} />
                   <Route path="/cpms/mobile/site" element={<MobileSiteManager />} />
                   <Route path="/cash-flow-forecast" element={<CashFlowForecastCockpit />} />
                   <Route path="/reconciliation-center" element={<ReconciliationCenter />} />
                   <Route path="/operations-command-center" element={<OperationsCommandCenter />} />
                   <Route path="/business-rules-simulator" element={<BusinessRulesSimulator />} />
                   <Route path="/production-costing" element={<ProductionCostingDashboard />} />
                   <Route path="/quality-capa" element={<QualityCAPAWorkflow />} />
                   <Route path="/workforce-planning" element={<WorkforcePlanning />} />
                   <Route path="/recruitment-pipeline" element={<RecruitmentPipeline />} />
                   <Route path="/variation-orders" element={<VariationOrderControl />} />
                   <Route path="/demand-consolidation" element={<DemandConsolidation />} />
                   <Route path="/price-intelligence" element={<PriceHistoryIntelligence />} />
                   <Route path="/vendor-portal" element={<VendorPortal />} />
                   <Route path="/supplier-hub" element={<SupplierHub />} />
                   <Route path="/training-competency" element={<TrainingCompetency />} />
                   <Route path="/intercompany-transactions" element={<IntercompanyTransactions />} />
                   <Route path="/recurring-documents" element={<RecurringDocuments />} />
                   <Route path="/period-end-closing" element={<PeriodEndClosing />} />
                   <Route path="/period-close-controls" element={<PeriodCloseControls />} />
                   <Route path="/treasury-workspace" element={<TreasuryWorkspace />} />
                   <Route path="/fixed-assets-register" element={<FixedAssetsRegister />} />
                   <Route path="/lease-accounting" element={<LeaseAccounting />} />
                   <Route path="/bank-recon-automation" element={<BankReconAutomation />} />
                   <Route path="/advanced-numbering" element={<AdvancedNumberingSeries />} />
                   <Route path="/budget-request-workflow" element={<BudgetRequestWorkflow />} />
                   <Route path="/dynamic-form-builder" element={<DynamicFormBuilder />} />
                   <Route path="/row-level-permissions" element={<RowLevelPermissions />} />
                   <Route path="/master-data-stewardship" element={<MasterDataStewardship />} />
                   <Route path="/service-maintenance" element={<ServiceMaintenancePage />} />
                   <Route path="/sandbox-training" element={<SandboxTraining />} />
                   <Route path="/email-document-capture" element={<EmailDocumentCapture />} />
                   <Route path="/ocr-document-capture" element={<OCRDocumentCapture />} />
                   <Route path="/process-mining" element={<ProcessMiningDashboard />} />
                   <Route path="/smart-recommendations" element={<SmartRecommendations />} />
                   <Route path="/nl-assistant" element={<NLAssistant />} />
                   <Route path="/erp-copilot" element={<ERPCopilot />} />
                   <Route path="/controlled-ai" element={<ControlledAIDashboard />} />
                   <Route path="/controlled-ai/review" element={<ControlledAIReviewQueue />} />
                   <Route path="/controlled-ai/governance" element={<ControlledAIGovernance />} />
                   <Route path="/workflow-auto-reminders" element={<WorkflowAutoReminders />} />
                   <Route path="/strategic-goals" element={<StrategicGoals />} />
                   <Route path="/predictive-collections" element={<PredictiveCollections />} />
                   <Route path="/predictive-project-risk" element={<PredictiveProjectRisk />} />
                   <Route path="/cross-company-analytics" element={<CrossCompanyAnalytics />} />
                   <Route path="/profitability-waterfall" element={<ProfitabilityWaterfall />} />
                   <Route path="/meeting-summaries" element={<MeetingSummaries />} />
                   <Route path="/document-classification" element={<DocumentClassification />} />
                   <Route path="/enterprise-risk-register" element={<EnterpriseRiskRegister />} />
                    <Route path="/management-decision-log" element={<ManagementDecisionLog />} />
                    <Route path="/contract-retentions" element={<ContractRetentionMgmt />} />
                    <Route path="/site-inspections" element={<SiteInspections />} />
                    <Route path="/interim-payment-certs" element={<InterimPaymentCerts />} />
                    <Route path="/subcontract-agreements" element={<SubcontractAgreements />} />
                    <Route path="/equipment-allocations" element={<EquipmentAllocations />} />
                    <Route path="/material-consumption" element={<MaterialConsumption />} />
                    <Route path="/project-claims" element={<ProjectClaimsDisputes />} />
                    <Route path="/job-requisitions" element={<JobRequisitions />} />
                    <Route path="/employee-loans" element={<EmployeeLoans />} />
                    <Route path="/performance-appraisals" element={<PerformanceAppraisals />} />
                    <Route path="/shift-planning" element={<ShiftPlanning />} />
                    <Route path="/overtime-control" element={<OvertimeControl />} />
                    <Route path="/labor-camps" element={<LaborCampManagement />} />
                    <Route path="/hr-grievances" element={<HRGrievances />} />
                    <Route path="/hr-letters" element={<HRLetters />} />
                    <Route path="/offboarding" element={<OffboardingWorkflow />} />
                     <Route path="/ai-anomaly-detection" element={<AIAnomalyDetection />} />
                     <Route path="/document-expiry-tracking" element={<DocumentExpiryTracking />} />
                     <Route path="/stock-reservation" element={<ProjectStockReservation />} />
                     <Route path="/dead-stock" element={<DeadStockDashboard />} />
                     <Route path="/material-substitution" element={<MaterialSubstitution />} />
                     <Route path="/subscription-billing" element={<SubscriptionBilling />} />
                     <Route path="/smart-receipts" element={<SmartReceipts />} />
                     <Route path="/sales-target-tracker" element={<SalesTargetTracker />} />
                     <Route path="/pos-inventory-reservation" element={<POSInventoryReservation />} />
                     <Route path="/layaway-installments" element={<LayawayInstallments />} />
                     <Route path="/digital-signature-otp" element={<DigitalSignatureOTP />} />
                      <Route path="/cashier-permissions" element={<AdvancedCashierPermissions />} />
                      <Route path="/pos-repair-intake" element={<POSRepairIntake />} />
                      <Route path="/shelf-label-management" element={<ShelfLabelManagement />} />
                      <Route path="/abandoned-cart-recovery" element={<AbandonedCartRecovery />} />
                      <Route path="/store-task-board" element={<StoreTaskBoard />} />
                      <Route path="/branch-transfer-selling" element={<BranchTransferSelling />} />
                       <Route path="/customer-feedback" element={<CustomerFeedback />} />
                       <Route path="/close-dashboard" element={<CloseDashboard />} />
                       <Route path="/close-calendar" element={<CloseCalendar />} />
                       <Route path="/checklist-board" element={<ChecklistBoard />} />
                       <Route path="/entity-readiness" element={<EntityReadiness />} />
                       <Route path="/reconciliation-queue" element={<ReconciliationQueue />} />
                       <Route path="/variance-review" element={<VarianceReview />} />
                       <Route path="/signoff-matrix" element={<SignoffMatrix />} />
                       <Route path="/close-pack-generator" element={<ClosePackGenerator />} />
                       <Route path="/spreadsheet/gallery" element={<SSWorkbookGallery />} />
                       <Route path="/spreadsheet/templates" element={<SSTemplateLibrary />} />
                       <Route path="/spreadsheet/editor/:workbookId" element={<SSSpreadsheetEditor />} />
                       <Route path="/spreadsheet/scenarios" element={<SSScenarioComparison />} />
                       <Route path="/spreadsheet/comments" element={<SSCommentsReview />} />
                       <Route path="/spreadsheet/publish" element={<SSPublishWriteback />} />
                        <Route path="/spreadsheet/versions/:workbookId?" element={<SSVersionHistory />} />
                        <Route path="/collections-workbench" element={<CollectionsWorkbench />} />
                         <Route path="/mdg-center" element={<MasterDataGovernanceCenter />} />
                         <Route path="/transport-dispatch" element={<TransportDispatchManagement />} />
                         <Route path="/quality-lab" element={<QualityLabSampleManagement />} />
                         <Route path="/engineering-change-control" element={<EngineeringChangeControl />} />
                         <Route path="/maintenance-reliability" element={<MaintenanceReliabilityAnalytics />} />
                         <Route path="/self-service-hub" element={<EmployeeManagerSelfServiceHub />} />
                         <Route path="/board-pack-generator" element={<BoardPackGeneratorPage />} />
                         <Route path="/process-mining" element={<ProcessMiningAnalyzer />} />
                         <Route path="/document-retention" element={<DocumentRetentionCenter />} />
                         <Route path="/data-lineage" element={<DataLineageExplorer />} />
                         <Route path="/compliance-obligations" element={<ComplianceObligationTracker />} />
                         <Route path="/risk-approval-engine" element={<RiskBasedApprovalEngine />} />
                         <Route path="/customer-portal-hub" element={<CustomerPortalHub />} />
                         <Route path="/pmo-portfolio-governance" element={<PMOPortfolioGovernance />} />
                         <Route path="/integration-monitor" element={<IntegrationMonitorConsole />} />
                         <Route path="/release-readiness" element={<ReleaseReadinessCenter />} />
                         <Route path="/background-jobs" element={<BackgroundJobMonitor />} />
                         <Route path="/saas" element={<SaasOverview />} />
                         <Route path="/saas/clients" element={<SaasClients />} />
                         <Route path="/saas/clients/:id" element={<SaasClientDetail />} />
                         <Route path="/saas/plans" element={<SaasPlans />} />
                         <Route path="/saas/module-matrix" element={<SaasModuleMatrixPage />} />
                         <Route path="/saas/seats" element={<SaasSeats />} />
                         <Route path="/saas/security" element={<SaasSecurity />} />
                         <Route path="/saas/billing" element={<SaasBilling />} />
                         <Route path="/saas/audit-log" element={<SaasAuditLog />} />
                         {/* Unified Portal Administration */}
                         <Route path="/portal-admin" element={<PortalAdminHub />} />
                         <Route path="/portal-admin/members" element={<UnifiedPortalAdmin />} />
                         <Route path="/portal-admin/documents" element={<PortalDocumentExchange />} />
                         <Route path="/portal-admin/rfq-responses" element={<PortalRFQResponses />} />
                         <Route path="/portal-admin/approvals" element={<PortalApprovalTasks />} />
                         <Route path="/portal-admin/seats" element={<SaasSeatGovernance />} />
                         <Route path="/portal-admin/branding" element={<WhiteLabelBuilder />} />
                         <Route path="/portal-admin/security-policies" element={<PortalSecurityPolicies />} />
                         <Route path="/portal-admin/locales" element={<PortalLocales />} />
                         <Route path="/portal-admin/service-requests" element={<PortalServiceRequests />} />
                         <Route path="/portal-admin/subscription-requests" element={<PortalSubscriptionRequests />} />
                         <Route path="/portal-admin/tenant-sso" element={<TenantSSOConfig />} />
                         <Route path="/portal-admin/login-heatmap" element={<PortalLoginHeatmap />} />
                         <Route path="/portal-admin/activity-feed" element={<PortalActivityFeed />} />
                         <Route path="/portal-admin/rfq-ai-normalize" element={<RFQAINormalizer />} />
                         <Route path="/portal-admin/tenant-analytics" element={<TenantAnalyticsDashboard />} />
                         <Route path="/portal/:slug/service-request" element={<PortalSubmitServiceRequest />} />
                         {/* Supplier Portal Administration */}
                         <Route path="/supplier-portal-admin" element={<SupplierPortalAdminHub />} />
                         <Route path="/supplier-portal-admin/prequalification" element={<SupplierPrequalification />} />
                         <Route path="/supplier-portal-admin/disputes" element={<SupplierDisputes />} />
                         <Route path="/supplier-portal-admin/profile-approvals" element={<SupplierProfileApprovals />} />
                         <Route path="/supplier-portal-admin/compliance" element={<SupplierComplianceTracker />} />
                         <Route path="/supplier-portal-admin/scorecards" element={<SupplierScorecardPublishing />} />
                          {/* Admin Setup routes */}
                          <Route path="/admin/tax-groups" element={<AdminTaxGroups />} />
                          <Route path="/admin/payment-terms" element={<AdminPaymentTerms />} />
                          <Route path="/admin/banks" element={<AdminBanks />} />
                          <Route path="/admin/customer-groups" element={<AdminCustomerGroups />} />
                          <Route path="/admin/vendor-groups" element={<AdminVendorGroups />} />
                          <Route path="/admin/general-settings" element={<AdminGeneralSettings />} />
                          <Route path="/admin/print-preferences" element={<AdminPrintPreferences />} />
                          <Route path="/admin/document-settings" element={<AdminDocumentSettings />} />
                          <Route path="/admin/posting-periods" element={<AdminPostingPeriods />} />
                          <Route path="/admin/document-numbering" element={<AdminDocumentNumbering />} />
                          <Route path="/admin/exchange-rates" element={<AdminExchangeRates />} />
                          <Route path="/admin/user-defaults" element={<AdminUserDefaults />} />
                          <Route path="/admin/authorizations" element={<AdminAuthorizations />} />
                          <Route path="/admin/alerts-management" element={<AdminAlertsManagement />} />
                          <Route path="/admin/license-admin" element={<AdminLicenseAdmin />} />
                          <Route path="/admin/addon-manager" element={<AdminAddonManager />} />
                          <Route path="/admin/work-list" element={<AdminWorkList />} />
                          <Route path="/admin/help-content" element={<AdminHelpContent />} />
                          <Route path="/admin/menu-structure" element={<AdminMenuStructure />} />
                          <Route path="/admin/menu-alias" element={<AdminMenuAlias />} />
                          <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
                          <Route path="/admin/opening-balances" element={<AdminOpeningBalances />} />
                          <Route path="/admin/implementation-center" element={<AdminImplementationCenter />} />
                          <Route path="/admin/implementation-tasks" element={<AdminImplementationTasks />} />
                          <Route path="/admin/implementation-project" element={<AdminImplementationProject />} />
                          <Route path="/admin/configuration-management" element={<AdminConfigurationManagement />} />
                          <Route path="/admin/path-settings" element={<AdminPathSettings />} />
                          <Route path="/admin/tooltip-preview" element={<AdminTooltipPreview />} />
                          {/* Sales A/R routes */}
                          <Route path="/sales/blanket-agreement" element={<SalesBlanketAgreement />} />
                          <Route path="/sales/quotation" element={<SalesQuotationPage />} />
                          <Route path="/sales/order" element={<SalesOrderPage />} />
                          <Route path="/sales/delivery" element={<DeliveryPage />} />
                          <Route path="/sales/return-request" element={<ReturnRequestPage />} />
                          <Route path="/sales/return" element={<ReturnPage />} />
                          <Route path="/sales/dp-request" element={<ARDownPaymentRequest />} />
                          <Route path="/sales/dp-invoice" element={<ARDownPaymentInvoice />} />
                          <Route path="/sales/ar-invoice" element={<ARInvoicePage />} />
                          <Route path="/sales/ar-invoice-payment" element={<ARInvoicePaymentPage />} />
                          <Route path="/sales/credit-memo" element={<ARCreditMemoPage />} />
                          <Route path="/sales/reserve-invoice" element={<ARReserveInvoicePage />} />
                          <Route path="/sales/doc-generation" element={<DocumentGenerationWizard />} />
                          <Route path="/sales/recurring" element={<RecurringTransactionsPage />} />
                          <Route path="/sales/recurring-templates" element={<RecurringTemplatesPage />} />
                          <Route path="/sales/doc-printing" element={<DocumentPrintingPage />} />
                          <Route path="/sales/dunning" element={<DunningWizardPage />} />
                          <Route path="/sales/gp-recalc" element={<GrossProfitRecalcWizard />} />
                          <Route path="/sales/analysis" element={<SalesAnalysisReport />} />
                          <Route path="/sales/backorder" element={<BackorderReport />} />
                          <Route path="/sales/quotation-report" element={<SalesQuotationReport />} />
                          <Route path="/sales/gp-report" element={<GrossProfitReport />} />
                           <Route path="/sales/open-items" element={<OpenItemsList />} />
                           <Route path="/sales/aging" element={<CustomerReceivablesAging />} />
                           <Route path="/sales/rma" element={<ReturnsRmaWorkbench />} />
                           <Route path="/sales/returns-workbench" element={<ReturnsRmaWorkbench />} />
                           <Route path="/sales/credit-overrides" element={<CreditOverrideInbox />} />
                           <Route path="/credit-override-inbox" element={<CreditOverrideInbox />} />

                           {/* Quote-to-Cash routes */}
                           <Route path="/sales/blanket-agreements" element={<BlanketAgreementsPage />} />
                           <Route path="/sales/discount-matrix" element={<DiscountMatrixPage />} />
                           <Route path="/sales/price-books" element={<CustomerPriceBookPage />} />
                           <Route path="/sales/credit-management" element={<CreditManagementDashboard />} />
                           <Route path="/sales/dunning-policies" element={<DunningPolicyManager />} />
                           <Route path="/sales/collections" element={<CollectionsCasesPage />} />
                           <Route path="/sales/disputes" element={<DisputesManagementPage />} />
                           <Route path="/sales/revenue-recognition" element={<RevenueRecognitionSchedules />} />
                           <Route path="/sales/tax-determination" element={<TaxDeterminationPage />} />
                           <Route path="/sales/incoterms" element={<IncotermsRegistry />} />
                           <Route path="/sales/export-docs" element={<ExportDocumentationPage />} />
                           <Route path="/sales/portal-sharing" element={<CustomerPortalSharing />} />
                           <Route path="/sales/cash-analytics" element={<CashCollectionAnalytics />} />

                           {/* Purchasing A/P routes */}
                           <Route path="/purchasing/blanket-agreement" element={<PurchaseBlanketAgreement />} />
                           <Route path="/purchasing/quotation" element={<PurchaseQuotationPage />} />
                           <Route path="/purchasing/order" element={<PurchaseOrderPage />} />
                           <Route path="/purchasing/goods-receipt" element={<GoodsReceiptPOPage />} />
                           <Route path="/purchasing/goods-return" element={<GoodsReturnPage />} />
                           <Route path="/purchasing/dp-request" element={<APDownPaymentRequest />} />
                           <Route path="/purchasing/dp-invoice" element={<APDownPaymentInvoice />} />
                           <Route path="/purchasing/ap-invoice" element={<APInvoicePage />} />
                           <Route path="/purchasing/ap-invoice-payment" element={<APInvoicePaymentPage />} />
                           <Route path="/purchasing/credit-memo" element={<APCreditMemoPage />} />
                           <Route path="/purchasing/reserve-invoice" element={<APReserveInvoicePage />} />
                           <Route path="/purchasing/doc-generation" element={<PurchaseDocGenWizard />} />
                           <Route path="/purchasing/landed-costs" element={<PurchaseLandedCosts />} />
                           <Route path="/purchasing/recurring" element={<PurchaseRecurringPage />} />
                           <Route path="/purchasing/recurring-templates" element={<PurchaseRecurringTemplates />} />
                           <Route path="/purchasing/doc-printing" element={<PurchaseDocPrinting />} />
                           <Route path="/purchasing/vendor-payments" element={<VendorPaymentsWizard />} />
                           <Route path="/purchasing/analysis" element={<PurchaseAnalysisReport />} />
                           <Route path="/purchasing/quotation-report" element={<PurchaseQuotationReport />} />
                           <Route path="/purchasing/open-items" element={<PurchaseOpenItemsList />} />
                           <Route path="/purchasing/vendor-aging" element={<VendorLiabilitiesAging />} />
                           <Route path="/purchasing/vendor-balances" element={<VendorBalancesReport />} />
                           <Route path="/purchasing/backorder" element={<PurchaseBackorderReport />} />

                           {/* Business Partners routes */}
                           <Route path="/bp/master-data" element={<BPMasterDataPage />} />
                           <Route path="/bp/catalog-numbers" element={<BPCatalogNumbers />} />
                           <Route path="/bp/leads" element={<BPLeadsPage />} />
                           <Route path="/bp/activities" element={<BPActivitiesPage />} />
                           <Route path="/bp/activity-status" element={<BPActivityStatusUpdate />} />
                           <Route path="/bp/campaign-wizard" element={<BPCampaignWizard />} />
                           <Route path="/bp/campaigns" element={<BPCampaignList />} />
                           <Route path="/bp/customer-statement" element={<BPCustomerStatement />} />
                           <Route path="/bp/dunning-history" element={<BPDunningHistory />} />
                           <Route path="/bp/reports" element={<BPReports />} />

                           {/* Inventory (SAP-style) routes */}
                           <Route path="/inventory/item-master" element={<ItemMasterDataPage />} />
                           <Route path="/inventory/price-lists" element={<InvPriceListsPage />} />
                           <Route path="/inventory/special-prices" element={<InvSpecialPrices />} />
                           <Route path="/inventory/period-volume-discounts" element={<InvPeriodVolumeDiscounts />} />
                           <Route path="/inventory/global-price-update" element={<InvGlobalPriceUpdate />} />
                           <Route path="/inventory/pick-pack-manager" element={<InvPickPackManager />} />
                           <Route path="/inventory/transfer" element={<InvTransferPage />} />
                           <Route path="/inventory/transfer-request" element={<InvTransferRequestPage />} />
                           <Route path="/inventory/serial-numbers" element={<InvSerialNumbers />} />
                           <Route path="/inventory/batch-numbers" element={<InvBatchNumbers />} />
                            <Route path="/inventory/reports" element={<InvReports />} />

                            {/* ECM Routes */}
                            <Route path="/ecm/dashboard" element={<ECMDashboard />} />
                            <Route path="/ecm/repository" element={<ECMRepository />} />
                            <Route path="/ecm/document/:id" element={<ECMDocumentViewer />} />
                            <Route path="/ecm/search" element={<ECMSearch />} />
                            <Route path="/ecm/correspondence/incoming" element={<ECMCorrespondenceIncoming />} />
                            <Route path="/ecm/correspondence/outgoing" element={<ECMCorrespondenceOutgoing />} />
                            <Route path="/ecm/correspondence/memos" element={<ECMInternalMemos />} />
                            <Route path="/ecm/workflow-designer" element={<ECMWorkflowDesigner />} />
                            <Route path="/ecm/signatures" element={<ECMElectronicSignatures />} />
                            <Route path="/ecm/tasks" element={<ECMTasks />} />
                            <Route path="/ecm/directory" element={<ECMDirectory />} />
                            <Route path="/ecm/reports" element={<ECMReports />} />
                            <Route path="/ecm/audit-trail" element={<ECMAuditTrail />} />
                            <Route path="/ecm/metadata-templates" element={<ECMMetadataTemplates />} />
                            <Route path="/ecm/admin" element={<ECMAdmin />} />
                            <Route path="/ecm/retention-policies" element={<ECMRetentionPolicies />} />
                            <Route path="/ecm/document/:id/versions" element={<ECMVersionManager />} />
                            <Route path="/ecm/email-capture-config" element={<ECMEmailCaptureConfig />} />

                            {/* Construction Module routes */}
                            <Route path="/construction/leads" element={<ConstructionLeads />} />
                            <Route path="/construction/tender-register" element={<ConstructionTenderRegister />} />
                            <Route path="/construction/tender-details" element={<ConstructionTenderDetails />} />
                            <Route path="/construction/boq-import" element={<ConstructionBOQImport />} />
                            <Route path="/construction/tender-boq" element={<ConstructionTenderBOQ />} />
                            <Route path="/construction/estimation" element={<ConstructionEstimation />} />
                            <Route path="/construction/resource-buildup" element={<ConstructionResourceBuildUp />} />
                            <Route path="/construction/risk-contingency" element={<ConstructionRiskContingency />} />
                            <Route path="/construction/clarifications" element={<ConstructionClarifications />} />
                            <Route path="/construction/bid-review" element={<ConstructionBidReview />} />
                            <Route path="/construction/tender-approval" element={<ConstructionTenderApproval />} />
                            <Route path="/construction/bid-tracker" element={<ConstructionBidTracker />} />
                            <Route path="/construction/tender-comparison" element={<ConstructionTenderComparison />} />
                            <Route path="/construction/tender-result" element={<ConstructionTenderResult />} />
                            <Route path="/construction/award-conversion" element={<ConstructionAwardConversion />} />
                            <Route path="/construction/project-wizard" element={<ConstructionProjectWizard />} />
                            <Route path="/construction/contract-master" element={<ConstructionContractMaster />} />
                            <Route path="/construction/contract-breakdown" element={<ConstructionContractBreakdown />} />
                            <Route path="/construction/boq-schedule" element={<ConstructionBOQSchedule />} />
                            <Route path="/construction/milestones" element={<ConstructionMilestones />} />
                            <Route path="/construction/retention-terms" element={<ConstructionRetentionTerms />} />
                            <Route path="/construction/advance-terms" element={<ConstructionAdvanceTerms />} />
                            <Route path="/construction/penalty-rules" element={<ConstructionPenaltyRules />} />
                            <Route path="/construction/wbs-structure" element={<ConstructionWBSStructure />} />
                            <Route path="/construction/budget-baseline" element={<ConstructionBudgetBaseline />} />
                            <Route path="/construction/budget-versions" element={<ConstructionBudgetVersions />} />
                            <Route path="/construction/approval-matrix" element={<ConstructionApprovalMatrix />} />
                            <Route path="/construction/project-dashboard" element={<ConstructionProjectDashboard />} />
                            <Route path="/construction/master-schedule" element={<ConstructionMasterSchedule />} />
                            <Route path="/construction/lookahead" element={<ConstructionLookaheadPlanning />} />
                            <Route path="/construction/cash-flow" element={<ConstructionCashFlowForecast />} />
                            <Route path="/construction/risk-register" element={<ConstructionRiskRegister />} />
                            <Route path="/construction/mobilization" element={<ConstructionMobilizationChecklist />} />
                            <Route path="/construction/daily-site-report" element={<ConstructionDailySiteReport />} />
                            <Route path="/construction/weekly-report" element={<ConstructionWeeklyProgressReport />} />
                            <Route path="/construction/monthly-report" element={<ConstructionMonthlyProgressReport />} />
                            <Route path="/construction/activity-progress" element={<ConstructionActivityProgress />} />
                            <Route path="/construction/boq-progress" element={<ConstructionBOQProgress />} />
                            <Route path="/construction/site-instructions" element={<ConstructionSiteInstructions />} />
                            <Route path="/construction/method-statements" element={<ConstructionMethodStatements />} />
                            <Route path="/construction/site-issues" element={<ConstructionSiteIssues />} />
                            <Route path="/construction/delay-events" element={<ConstructionDelayEvents />} />
                            <Route path="/construction/site-diary" element={<ConstructionSiteDiary />} />
                            <Route path="/construction/site-correspondence" element={<ConstructionSiteCorrespondence />} />
                            {/* Correspondence Management */}
                            <Route path="/correspondence" element={<CorrespondenceDashboardPage />} />
                            <Route path="/correspondence/incoming" element={<CorrespondenceIncomingList />} />
                            <Route path="/correspondence/outgoing" element={<CorrespondenceOutgoingList />} />
                            <Route path="/correspondence/incoming/new" element={<CorrespondenceNewIncoming />} />
                            <Route path="/correspondence/outgoing/new" element={<CorrespondenceNewOutgoing />} />
                            <Route path="/correspondence/search" element={<CorrespondenceSearch />} />
                            <Route path="/correspondence/reports" element={<CorrespondenceReports />} />
                            <Route path="/correspondence/settings" element={<CorrespondenceSettings />} />
                            <Route path="/correspondence/ecm-monitor" element={<CorrespondenceEcmMonitor />} />
                            <Route path="/correspondence/:id" element={<CorrespondenceDetail />} />
                            <Route path="/construction/manpower-plan" element={<ConstructionManpowerPlan />} />
                            <Route path="/construction/daily-labor" element={<ConstructionDailyLabor />} />
                            <Route path="/construction/timesheets" element={<ConstructionTimesheets />} />
                            <Route path="/construction/labor-cost" element={<ConstructionLaborCost />} />
                            <Route path="/construction/equipment-register" element={<ConstructionEquipmentRegister />} />
                            <Route path="/construction/fuel-consumption" element={<ConstructionFuelConsumption />} />
                            <Route path="/construction/maintenance-requests" element={<ConstructionMaintenanceRequests />} />
                            <Route path="/construction/equipment-cost" element={<ConstructionEquipmentCost />} />
                            <Route path="/construction/equipment-productivity" element={<ConstructionEquipmentProductivity />} />
                            <Route path="/construction/goods-receipt-project" element={<ConstructionGoodsReceiptProject />} />
                            <Route path="/construction/site-transfer" element={<ConstructionSiteTransfer />} />
                            <Route path="/construction/material-issue" element={<ConstructionMaterialIssue />} />
                            <Route path="/construction/material-return" element={<ConstructionMaterialReturn />} />
                            <Route path="/construction/wastage-report" element={<ConstructionWastageReport />} />
                            <Route path="/construction/site-stock-count" element={<ConstructionSiteStockCount />} />
                            <Route path="/construction/material-trace" element={<ConstructionMaterialTrace />} />
                            <Route path="/construction/budget-vs-commitment" element={<ConstructionBudgetVsCommitment />} />
                            <Route path="/construction/budget-vs-actual" element={<ConstructionBudgetVsActual />} />
                            <Route path="/construction/cost-ledger" element={<ConstructionCostLedger />} />
                            <Route path="/construction/cost-by-code" element={<ConstructionCostByCode />} />
                            <Route path="/construction/committed-cost" element={<ConstructionCommittedCost />} />
                            <Route path="/construction/forecast-complete" element={<ConstructionForecastComplete />} />
                            <Route path="/construction/eac" element={<ConstructionEAC />} />
                            <Route path="/construction/cost-variance" element={<ConstructionCostVariance />} />
                            <Route path="/construction/margin-analysis" element={<ConstructionMarginAnalysis />} />
                            <Route path="/construction/overrun-alerts" element={<ConstructionOverrunAlerts />} />
                            <Route path="/construction/billing-plan" element={<ConstructionBillingPlan />} />
                            <Route path="/construction/client-ipc" element={<ConstructionClientIPC />} />
                            <Route path="/construction/mos-billing" element={<ConstructionMOSBilling />} />
                            <Route path="/construction/variation-billing" element={<ConstructionVariationBilling />} />
                            <Route path="/construction/advance-recovery" element={<ConstructionAdvanceRecovery />} />
                            <Route path="/construction/tax-invoice" element={<ConstructionTaxInvoice />} />
                            <Route path="/construction/billing-dashboard" element={<ConstructionBillingDashboard />} />
                            <Route path="/construction/project-aging" element={<ConstructionProjectAging />} />
                            <Route path="/construction/variation-estimates" element={<ConstructionVariationEstimates />} />
                            <Route path="/construction/variation-approval" element={<ConstructionVariationApproval />} />
                            <Route path="/construction/variation-register" element={<ConstructionVariationRegister />} />
                            <Route path="/construction/delay-claims" element={<ConstructionDelayClaims />} />
                            <Route path="/construction/eot-requests" element={<ConstructionEOTRequests />} />
                            <Route path="/construction/claim-valuation" element={<ConstructionClaimValuation />} />
                            <Route path="/construction/snag-list" element={<ConstructionSnagList />} />
                            <Route path="/construction/testing" element={<ConstructionTesting />} />
                            <Route path="/construction/defect-register" element={<ConstructionDefectRegister />} />
                            <Route path="/construction/handover" element={<ConstructionHandover />} />
                            <Route path="/construction/practical-completion" element={<ConstructionPracticalCompletion />} />
                            <Route path="/construction/final-account" element={<ConstructionFinalAccount />} />
                            <Route path="/construction/retention-release" element={<ConstructionRetentionRelease />} />
                            <Route path="/construction/defects-liability" element={<ConstructionDefectsLiability />} />
                            <Route path="/construction/closure-checklist" element={<ConstructionClosureChecklist />} />
                            <Route path="/construction/archive" element={<ConstructionArchive />} />
                            <Route path="/construction/billing-vs-cost" element={<ConstructionBillingVsCost />} />
                            <Route path="/construction/retention-report" element={<ConstructionRetentionReport />} />
                            <Route path="/construction/subcontract-liability" element={<ConstructionSubcontractLiability />} />
                            <Route path="/construction/material-report" element={<ConstructionMaterialReport />} />
                            <Route path="/construction/equipment-report" element={<ConstructionEquipmentReport />} />

                            {/* Manufacturing Module routes */}
                            <Route path="/manufacturing/bom-versions" element={<MfgBOMVersions />} />
                            <Route path="/manufacturing/routings" element={<MfgRoutings />} />
                            <Route path="/manufacturing/work-centers" element={<MfgWorkCenters />} />
                            <Route path="/manufacturing/resources" element={<MfgResources />} />
                            <Route path="/manufacturing/calendars" element={<MfgProductionCalendars />} />
                            <Route path="/manufacturing/forecast" element={<MfgProductionForecast />} />
                            <Route path="/manufacturing/mps" element={<MfgMPS />} />
                            <Route path="/manufacturing/issue" element={<MfgIssueForProduction />} />
                            <Route path="/manufacturing/receipt" element={<MfgReceiptFromProduction />} />
                            <Route path="/manufacturing/backflush" element={<MfgBackflush />} />
                            <Route path="/manufacturing/by-products" element={<MfgByProducts />} />
                            <Route path="/manufacturing/rework" element={<MfgRework />} />
                            <Route path="/manufacturing/scrap" element={<MfgScrap />} />
                            <Route path="/manufacturing/capacity" element={<MfgCapacity />} />
                            <Route path="/manufacturing/shop-floor" element={<MfgShopFloor />} />
                            <Route path="/manufacturing/wip-monitor" element={<MfgWIPMonitor />} />
                            <Route path="/manufacturing/cost-analysis" element={<MfgCostAnalysis />} />
                            <Route path="/manufacturing/variance" element={<MfgVariance />} />
                            <Route path="/manufacturing/what-if" element={<MfgWhatIf />} />
                            <Route path="/manufacturing/simulation" element={<Navigate to="/manufacturing/what-if" replace />} />

                            {/* PMO routes */}
                            <Route path="/pmo/baselines" element={<PMOBaselines />} />
                            <Route path="/pmo/dependencies" element={<PMODependencies />} />
                            <Route path="/pmo/resource-loading" element={<PMOResourceLoading />} />
                            <Route path="/pmo/raid" element={<PMORaid />} />
                            <Route path="/pmo/budget-vs-actual" element={<PMOBvA />} />
                            <Route path="/pmo/stage-gates" element={<PMOStageGates />} />
                            <Route path="/pmo/portfolios" element={<PMOPortfolio />} />
                            <Route path="/pmo/executive" element={<PMOExec />} />
                            <Route path="/pmo/variance" element={<PMOVariance />} />
                            <Route path="/pmo/capacity" element={<PMOCapacity />} />
                            <Route path="/pmo/scenarios" element={<PMOScenarios />} />
                            <Route path="/pmo/narratives" element={<PMONarratives />} />
                            <Route path="/pmo/business-cases" element={<PMOBusinessCases />} />
                            <Route path="/pmo/scoring" element={<PMOPortfolioScoring />} />
                            <Route path="/pmo/benefits" element={<PMOBenefits />} />
                            <Route path="/pmo/financial-health" element={<PMOFinancialHealth />} />
                            <Route path="/pmo/gate-templates" element={<PMOGateTemplates />} />
                            <Route path="/pmo/capacity-planning" element={<PMOCapacityPlanning />} />

                            {/* Inventory additional routes */}
                            <Route path="/inventory/item-groups" element={<InvItemGroups />} />
                            <Route path="/inventory/uom-groups" element={<InvUOMGroups />} />
                            <Route path="/inventory/posting" element={<InvPosting />} />
                            <Route path="/inventory/cycle-count-plans" element={<InvCycleCountPlans />} />
                            <Route path="/inventory/reorder" element={<InvReorder />} />
                            <Route path="/inventory/revaluation" element={<InvRevaluation />} />
                            <Route path="/inventory/landed-cost" element={<InvLandedCostAlloc />} />
                            <Route path="/inventory/stock-aging" element={<InvStockAging />} />
                            <Route path="/inventory/atp" element={<InvATP />} />
                            <Route path="/inventory/audit" element={<InvAudit />} />
                            <Route path="/inventory/valuation" element={<InvValuation />} />

                            {/* WMS enhancement routes */}
                            <Route path="/inventory/wms/stock-ledger" element={<WmsStockLedger />} />
                            <Route path="/inventory/wms/uom-conversions" element={<WmsUomConversions />} />
                            <Route path="/inventory/wms/carton-pallet" element={<WmsCartonPallet />} />
                            <Route path="/inventory/wms/replenishment" element={<WmsReplenishment />} />
                            <Route path="/inventory/wms/cycle-count-governance" element={<WmsCycleCountGov />} />
                            <Route path="/inventory/wms/mobile-scan" element={<WmsMobileScan />} />
                            <Route path="/inventory/wms/kpis" element={<WmsKpis />} />
                            <Route path="/inventory/wms/exceptions" element={<WmsExceptions />} />
                            <Route path="/inventory/wms/3pl" element={<Wms3PL />} />
                            <Route path="/inventory/wms/fefo-fifo" element={<WmsFefoFifo />} />
                            <Route path="/inventory/wms/cross-warehouse-reservations" element={<WmsCrossWhReservations />} />

                            {/* Procurement additional routes */}
                            <Route path="/procurement/planning" element={<ProcPlanning />} />
                            <Route path="/procurement/material-demand" element={<ProcMaterialDemand />} />
                            <Route path="/procurement/rfq-management" element={<ProcRFQManagement />} />
                            <Route path="/procurement/supplier-responses" element={<ProcSupplierResponses />} />
                            <Route path="/procurement/technical-eval" element={<ProcTechnicalEval />} />
                            <Route path="/procurement/commercial-eval" element={<ProcCommercialEval />} />
                            <Route path="/procurement/bid-comparison" element={<ProcBidComparison />} />
                            <Route path="/procurement/award-recommendation" element={<ProcAwardRec />} />
                            <Route path="/procurement/framework-agreements" element={<ProcFramework />} />
                            <Route path="/procurement/approved-vendors" element={<ProcApprovedVendors />} />
                            <Route path="/procurement/spend-analysis" element={<ProcSpendAnalysis />} />
                            <Route path="/procurement/kpis" element={<ProcKPIs />} />
                            <Route path="/procurement/category-management" element={<ProcCategoryMgmt />} />
                            <Route path="/procurement/match-exceptions" element={<ProcMatchExceptionWorkbench />} />
                            <Route path="/procurement/supplier-onboarding" element={<ProcSupplierOnboarding />} />
                            <Route path="/procurement/supplier-scorecards" element={<ProcSupplierScorecards />} />
                            <Route path="/procurement/sourcing-events" element={<ProcSourcingEvents />} />
                            <Route path="/procurement/tolerance-rules" element={<ProcToleranceRules />} />
                            <Route path="/procurement/vendor-risk" element={<ProcVendorRiskScoring />} />
                            <Route path="/procurement/compliance-alerts" element={<ProcComplianceAlerts />} />
                            <Route path="/procurement/approval-thresholds" element={<ProcApprovalThresholds />} />
                            <Route path="/procurement/rebates" element={<ProcRebateTracking />} />

                            {/* Integration Management */}
                            <Route path="/integration" element={<IntegrationDashboard />} />
                            <Route path="/integration/api-management" element={<IntegrationApiManagement />} />
                            <Route path="/integration/webhooks" element={<IntegrationWebhooks />} />
                            <Route path="/integration/templates" element={<IntegrationTemplates />} />
                            <Route path="/integration/connectors" element={<IntegrationConnectorsDocs />} />
                            <Route path="/integration/docs" element={<IntegrationConnectorsDocs />} />
                            <Route path="/integration/monitoring" element={<IntegrationMonitoring />} />

                            {/* Global Compliance & Localization */}
                            <Route path="/global-compliance" element={<GlobalComplianceDashboard />} />
                            <Route path="/global-compliance/country-packs" element={<CountryPacks />} />
                            <Route path="/global-compliance/rule-engine" element={<RuleEngine />} />
                            <Route path="/global-compliance/legal-entities" element={<LegalEntityCompliance />} />
                            <Route path="/global-compliance/localization" element={<LocalizationAssets />} />
                            <Route path="/global-compliance/statutory" element={<StatutoryReports />} />

                             {/* Restaurant Management */}
                             <Route path="/restaurant" element={<RestaurantDashboard />} />
                             <Route path="/restaurant/menu" element={<RestaurantMenu />} />
                             <Route path="/restaurant/pos" element={<RestaurantPOS />} />
                             <Route path="/restaurant/tables" element={<RestaurantTables />} />
                             <Route path="/restaurant/kitchen" element={<RestaurantKitchen />} />
                             <Route path="/restaurant/shifts" element={<RestaurantShifts />} />
                             <Route path="/restaurant/orders" element={<RestaurantOrders />} />
                             <Route path="/restaurant/reservations" element={<RestaurantReservations />} />
                             <Route path="/restaurant/delivery" element={<RestaurantDelivery />} />
                             <Route path="/restaurant/settings" element={<RestaurantSettings />} />
                             <Route path="/restaurant/loyalty" element={<RestaurantLoyalty />} />
                             <Route path="/restaurant/recipes" element={<RestaurantRecipes />} />
                             <Route path="/restaurant/inventory" element={<RestaurantInventory />} />
                             <Route path="/restaurant/reports" element={<RestaurantReports />} />
                             <Route path="/restaurant/benchmarking" element={<RestaurantBenchmarking />} />
                             <Route path="/restaurant/loyalty-advanced" element={<RestaurantLoyaltyAdvanced />} />
                             <Route path="/restaurant/kds-coordination" element={<RestaurantKDSCoordination />} />
                             <Route path="/restaurant/recipe-variance" element={<RestaurantRecipeVariance />} />
                             <Route path="/restaurant/aggregator-hub" element={<RestaurantAggregatorHub />} />
                             <Route path="/restaurant/role-dashboards" element={<RestaurantRoleDashboards />} />

                             {/* Fleet Management */}
                             <Route path="/fleet" element={<FleetDashboard />} />
                            <Route path="/fleet/assets" element={<FleetAssets />} />
                            <Route path="/fleet/assets/:id" element={<FleetAssetDetail />} />
                            <Route path="/fleet/drivers" element={<FleetDrivers />} />
                            <Route path="/fleet/trips" element={<FleetTrips />} />
                            <Route path="/fleet/fuel" element={<FleetFuel />} />
                            <Route path="/fleet/maintenance" element={<FleetMaintenance />} />
                            <Route path="/fleet/compliance" element={<FleetCompliance />} />
                            <Route path="/fleet/incidents" element={<FleetIncidents />} />
                            <Route path="/fleet/leases" element={<FleetLeases />} />
                            <Route path="/fleet/pm-schedules" element={<FleetPMSchedules />} />
                            <Route path="/fleet/utilization" element={<FleetUtilization />} />
                            <Route path="/fleet/accidents" element={<FleetAccidents />} />
                            <Route path="/fleet/fuel-control" element={<FleetFuelControl />} />
                            <Route path="/fleet/compliance-reminders" element={<FleetComplianceReminders />} />

                  {/* ─────────────────────────────────────────────────────────────
                      Navigation alignment redirects (legacy / sidebar paths → real pages)
                      Keeps bookmarks, favorites, and old menu items working.
                      ───────────────────────────────────────────────────────────── */}
                  {/* ─── Administration & Setup: real pages + back-compat redirects ─── */}
                  <Route path="/setup" element={<SetupHub />} />
                  <Route path="/setup/hub" element={<Navigate to="/setup" replace />} />
                  <Route path="/setup/audit-log" element={<SetupAuditLog />} />
                  <Route path="/setup/imports" element={<SetupImportJobs />} />
                  <Route path="/setup/exports" element={<SetupExportJobs />} />
                  <Route path="/setup/implementation-tasks" element={<SetupImplementationTasks />} />

                  {/* Legacy /setup/* deep links — preserved for bookmarks */}
                  <Route path="/setup/general" element={<Navigate to="/admin/general-settings" replace />} />
                  <Route path="/setup/financials" element={<Navigate to="/admin/posting-periods" replace />} />
                  <Route path="/setup/opportunities" element={<Navigate to="/opportunities" replace />} />
                  <Route path="/setup/sales" element={<Navigate to="/sales-orders" replace />} />
                  <Route path="/setup/purchasing" element={<Navigate to="/purchase-orders" replace />} />
                  <Route path="/setup/business-partners" element={<Navigate to="/business-partners" replace />} />
                  <Route path="/setup/banking" element={<Navigate to="/admin/banks" replace />} />
                  <Route path="/setup/inventory" element={<Navigate to="/inventory" replace />} />
                  <Route path="/setup/resources" element={<Navigate to="/cpms/resources" replace />} />
                  <Route path="/setup/service" element={<Navigate to="/service-maintenance" replace />} />
                  <Route path="/setup/human-resources" element={<Navigate to="/hr" replace />} />
                  <Route path="/setup/project-management" element={<Navigate to="/projects" replace />} />
                  <Route path="/setup/production" element={<Navigate to="/production-costing" replace />} />
                  <Route path="/setup/users-branches" element={<Navigate to="/admin/authorizations" replace />} />
                  <Route path="/setup/electronic-documents" element={<Navigate to="/zatca" replace />} />
                  <Route path="/setup/companies" element={<Navigate to="/admin/companies" replace />} />
                  <Route path="/setup/branches" element={<Navigate to="/admin/branches" replace />} />
                  <Route path="/setup/regions" element={<Navigate to="/admin/regions" replace />} />
                  <Route path="/setup/periods" element={<Navigate to="/admin/posting-periods" replace />} />
                  <Route path="/setup/numbering" element={<Navigate to="/admin/document-numbering" replace />} />
                  <Route path="/setup/authorizations" element={<Navigate to="/admin/authorizations" replace />} />

                  {/* Utilities: legacy /utilities/* paths */}
                  <Route path="/utilities" element={<Navigate to="/setup" replace />} />
                  <Route path="/utilities/period-end-closing" element={<Navigate to="/period-end-closing" replace />} />
                  <Route path="/utilities/check-numbering" element={<Navigate to="/admin/document-numbering" replace />} />
                  <Route path="/utilities/duplicate-layout" element={<Navigate to="/print-layout-designer" replace />} />
                  <Route path="/utilities/transfer-correction" element={<Navigate to="/inventory/stock-transfer" replace />} />
                  <Route path="/utilities/master-cleanup" element={<Navigate to="/mdg-center" replace />} />
                  <Route path="/utilities/series-converter" element={<Navigate to="/admin/document-numbering" replace />} />
                  <Route path="/utilities/ui-config" element={<Navigate to="/workspace-config" replace />} />
                  <Route path="/utilities/connected-clients" element={<Navigate to="/integration-monitor" replace />} />
                  <Route path="/utilities/change-logs-cleanup" element={<Navigate to="/background-jobs" replace />} />
                  <Route path="/utilities/data-protection" element={<Navigate to="/document-retention" replace />} />
                  <Route path="/utilities/audit-log" element={<Navigate to="/setup/audit-log" replace />} />
                  <Route path="/utilities/implementation-tasks" element={<Navigate to="/setup/implementation-tasks" replace />} />

                  {/* Data import / export hub — real pages */}
                  <Route path="/data-import" element={<Navigate to="/setup/imports" replace />} />
                  <Route path="/data-import/import-excel" element={<Navigate to="/setup/imports" replace />} />
                  <Route path="/data-import/import-sap" element={<Navigate to="/sap-sync-center" replace />} />
                  <Route path="/data-import/import-assets" element={<Navigate to="/setup/imports" replace />} />
                  <Route path="/data-import/import-financial" element={<Navigate to="/setup/imports" replace />} />
                  <Route path="/data-export" element={<Navigate to="/setup/exports" replace />} />
                  <Route path="/data-export/excel" element={<Navigate to="/setup/exports" replace />} />

                  {/* Sales sub-pages that were renamed */}
                  <Route path="/sales/discount-groups" element={<Navigate to="/sales-pricing" replace />} />
                  <Route path="/sales/territories" element={<Navigate to="/sales-territory" replace />} />
                  <Route path="/sales/forecast" element={<Navigate to="/sales-smart-forecast" replace />} />

                  {/* Manufacturing renames */}
                  <Route path="/manufacturing/dashboard" element={<Navigate to="/manufacturing" replace />} />
                  <Route path="/manufacturing/wip" element={<Navigate to="/manufacturing/wip-monitor" replace />} />

                  {/* Construction / subcontract — route to nearest implemented hub */}
                  <Route path="/construction/site-dashboard" element={<Navigate to="/construction/project-dashboard" replace />} />
                  <Route path="/construction/procurement-plan" element={<Navigate to="/project-procurement" replace />} />
                  <Route path="/construction/billing-forecast" element={<Navigate to="/cpms/billing" replace />} />
                  <Route path="/construction/rfqs" element={<Navigate to="/cpms/tenders" replace />} />
                  <Route path="/construction/commercial-comparison" element={<Navigate to="/cpms/compare" replace />} />
                  <Route path="/construction/subcontract-packages" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/subcontract-boq" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/subcontract-variations" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/subcontract-advance" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/subcontract-ipc" element={<Navigate to="/interim-payment-certs" replace />} />
                  <Route path="/construction/subcontract-retention" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/subcontract-payment" element={<Navigate to="/cpms/subcontractors" replace />} />
                  <Route path="/construction/back-charges" element={<Navigate to="/cpms/subcontractors" replace />} />

                  {/* Other renames */}
                  <Route path="/project-claims-disputes" element={<Navigate to="/project-claims" replace />} />
                  <Route path="/spreadsheet/versions" element={<Navigate to="/construction/budget-versions" replace />} />
                   </Route>
                
                <Route path="/onboarding/create-company" element={<CreateCompanyWizard />} />
                <Route path="/onboarding/copy-company" element={<CopyCompanyWizard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
            </WorkspaceTabsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </DashboardPeriodProvider>
      </QAModeProvider>
      </AccessibilityProvider>
      </SyncProgressProvider>
      </IndustryThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
