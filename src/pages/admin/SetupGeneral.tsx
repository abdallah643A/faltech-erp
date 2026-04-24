import { useSettingsService } from '@/hooks/useSettingsService';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { AdminPageLayout, AdminSection, SettingField } from '@/components/admin/AdminPageLayout';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, Bell, Globe, Wrench, Clock } from 'lucide-react';

export default function SetupGeneral() {
  const s = useSettingsService('setup_general');
  const { entries: auditEntries } = useAuditTrail('setup_general');

  const F = ({ label, k, type = 'text', help, opts, effect, required }: {
    label: string; k: string; type?: string; help?: string;
    opts?: { value: string; label: string }[]; effect?: string; required?: boolean;
  }) => (
    <SettingField label={label} helpText={help} error={s.validationErrors[k]} effectType={effect} required={required}>
      {type === 'switch' ? (
        <Switch checked={s.getValue(k) === 'true'} onCheckedChange={v => s.setValue(k, v ? 'true' : 'false')} />
      ) : type === 'select' && opts ? (
        <Select value={s.getValue(k)} onValueChange={v => s.setValue(k, v)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input type={type === 'number' ? 'number' : 'text'} value={s.getValue(k)} onChange={e => s.setValue(k, e.target.value)} className="h-8" />
      )}
    </SettingField>
  );

  return (
    <AdminPageLayout
      title="General Setup" titleAr="الإعداد العام"
      description="System-wide operational behavior, localization, workflow, and security defaults"
      descriptionAr="سلوك النظام التشغيلي الافتراضي"
      icon={<Settings className="h-6 w-6" />} module="setup_general"
      isDirty={s.isDirty} isLoading={s.isLoading} isSaving={s.isSaving}
      onSave={() => s.save([])} onReset={s.reset} onResetToDefaults={() => s.resetToDefaults([])}
      changeSummary={s.getChangeSummary()} auditEntries={auditEntries}
      affectedModules={['All Modules']}
    >
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="system" className="gap-1"><Settings className="h-3 w-3" />System</TabsTrigger>
          <TabsTrigger value="localization" className="gap-1"><Globe className="h-3 w-3" />Localization</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1"><Wrench className="h-3 w-3" />Workflow</TabsTrigger>
          <TabsTrigger value="security" className="gap-1"><Shield className="h-3 w-3" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-3 w-3" />Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <AdminSection title="Company & Branch Defaults" description="Default context for new transactions and sessions">
            <F label="Default Company" k="default_company" type="select" opts={[{ value: 'main', label: 'Main Company' }]} effect="next_session" />
            <F label="Default Branch" k="default_branch" type="select" opts={[{ value: 'hq', label: 'Headquarters' }]} effect="next_session" />
            <F label="Default Landing Page" k="default_landing_page" type="select" opts={[
              { value: 'dashboard', label: 'Dashboard' }, { value: 'inbox', label: 'Approval Inbox' }, { value: 'worklist', label: 'Work List' }
            ]} effect="next_session" />
            <F label="Auto Logout Timeout (minutes)" k="auto_logout_minutes" type="number" help="0 = no timeout" effect="next_session" />
            <F label="Auto-Save Draft Documents" k="auto_save_drafts" type="switch" help="Automatically save document drafts every 60 seconds" effect="immediate" />
            <F label="Session Timeout Warning (seconds)" k="timeout_warning_secs" type="number" help="Show warning before auto-logout" effect="next_session" />
          </AdminSection>

          <AdminSection title="Attachment & Notes Policies" description="Controls for mandatory documentation">
            <F label="Attachment Required on Selected Transactions" k="attachment_required" type="switch" help="Enforce file attachment on documents flagged in Document Settings" effect="immediate" />
            <F label="Notes Mandatory on Selected Actions" k="notes_mandatory" type="switch" help="Require notes when approving, rejecting, or cancelling" effect="immediate" />
            <F label="Max Attachment Size (MB)" k="max_attachment_mb" type="number" effect="immediate" />
            <F label="Allowed File Types" k="allowed_file_types" help="Comma-separated: pdf,xlsx,docx,jpg,png" effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="localization" className="space-y-4">
          <AdminSection title="Language & Regional" description="Language, date, number, and timezone settings">
            <F label="System Language" k="system_language" type="select" opts={[
              { value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }
            ]} effect="next_session" required />
            <F label="Secondary Language" k="secondary_language" type="select" opts={[
              { value: 'none', label: 'None' }, { value: 'en', label: 'English' }, { value: 'ar', label: 'Arabic' }
            ]} effect="next_session" />
            <F label="Date Format" k="date_format" type="select" opts={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
            ]} effect="immediate" />
            <F label="Time Format" k="time_format" type="select" opts={[
              { value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }
            ]} effect="immediate" />
            <F label="Number Format" k="number_format" type="select" opts={[
              { value: '1,234.56', label: '1,234.56' }, { value: '1.234,56', label: '1.234,56' }
            ]} effect="immediate" />
            <F label="Decimal Precision" k="decimal_precision" type="select" opts={[
              { value: '0', label: '0' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }
            ]} help="Affects pricing, inventory valuation, and accounting" effect="immediate" />
            <F label="Rounding Method" k="rounding_method" type="select" opts={[
              { value: 'round', label: 'Round Half Up' }, { value: 'floor', label: 'Always Round Down' }, { value: 'ceil', label: 'Always Round Up' }
            ]} effect="future_transactions" />
            <F label="Timezone" k="timezone" type="select" opts={[
              { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' }, { value: 'UTC', label: 'UTC' }
            ]} effect="next_session" />
            <F label="Working Week" k="working_week" type="select" opts={[
              { value: 'sun-thu', label: 'Sunday–Thursday' }, { value: 'mon-fri', label: 'Monday–Friday' }
            ]} effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <AdminSection title="Approval & Workflow Defaults" description="System-level approval behavior">
            <F label="Default Approval Requirement" k="default_approval_required" type="switch" help="When enabled, all new document types require approval by default" effect="immediate" />
            <F label="Approval Workflow Engine Enabled" k="approval_engine_enabled" type="switch" help="Master switch for the approval process module" effect="immediate" />
            <F label="Allow Delegation of Authority" k="allow_delegation" type="switch" help="Enable substitute authorizer functionality" effect="immediate" />
            <F label="Escalation After (hours)" k="escalation_hours" type="number" help="Default escalation time for pending approvals" effect="immediate" />
            <F label="Require Rejection Comments" k="require_rejection_comments" type="switch" effect="immediate" />
          </AdminSection>

          <AdminSection title="Document Lifecycle" description="Controls how documents transition through states">
            <F label="Allow Document Reopening" k="allow_document_reopening" type="switch" help="Allow cancelled/closed documents to be reopened" effect="immediate" />
            <F label="Require Reason for Cancellation" k="require_cancel_reason" type="switch" effect="immediate" />
            <F label="Auto-Close Base Documents" k="auto_close_base_docs" type="switch" help="Automatically close quotations when all linked orders are complete" effect="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <AdminSection title="Authentication & Access" description="Password, session, and access control policies">
            <F label="Password Complexity" k="password_complexity" type="select" opts={[
              { value: 'basic', label: 'Basic (8+ chars)' }, { value: 'medium', label: 'Medium (8+ chars, mixed case, number)' }, { value: 'strong', label: 'Strong (12+ chars, special char)' }
            ]} help="Applies on next password change" effect="next_session" />
            <F label="Two-Factor Authentication" k="two_factor_required" type="select" opts={[
              { value: 'disabled', label: 'Disabled' }, { value: 'optional', label: 'Optional' }, { value: 'required', label: 'Required for All Users' }
            ]} effect="next_session" />
            <F label="Max Login Attempts" k="max_login_attempts" type="number" help="Lock account after N failed attempts" effect="immediate" />
            <F label="Password Expiry (days)" k="password_expiry_days" type="number" help="0 = never expires" effect="next_session" />
          </AdminSection>

          <AdminSection title="Audit & Compliance" description="Logging and retention settings">
            <F label="Audit Log Retention (days)" k="audit_retention_days" type="number" help="How long to keep change history" effect="immediate" />
            <F label="Log Failed Login Attempts" k="log_failed_logins" type="switch" effect="immediate" />
            <F label="Log Data Exports" k="log_data_exports" type="switch" help="Track when users export data" effect="immediate" />
            <F label="Require Comment on Critical Changes" k="require_critical_comments" type="switch" help="Force users to enter reason for critical setting changes" effect="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <AdminSection title="Notification Channels" description="Control how the system sends alerts and reminders">
            <F label="Email Notifications Enabled" k="email_notifications" type="switch" effect="immediate" />
            <F label="In-App Notifications Enabled" k="inapp_notifications" type="switch" effect="immediate" />
            <F label="Push Notifications Enabled" k="push_notifications" type="switch" effect="immediate" />
            <F label="Default Reminder Frequency" k="reminder_frequency" type="select" opts={[
              { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'none', label: 'No Reminders' }
            ]} effect="immediate" />
            <F label="Notify on Approval Required" k="notify_approval_required" type="switch" effect="immediate" />
            <F label="Notify on Document Overdue" k="notify_overdue" type="switch" effect="immediate" />
            <F label="Escalation Notification" k="escalation_notify" type="switch" help="Send alert when approvals are escalated" effect="immediate" />
          </AdminSection>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
