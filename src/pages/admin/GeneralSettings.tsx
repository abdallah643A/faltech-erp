import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettingsService } from '@/hooks/useSettingsService';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { AdminPageLayout, AdminSection, SettingField } from '@/components/admin/AdminPageLayout';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Package, Eye, Type } from 'lucide-react';

export default function GeneralSettings() {
  const { activeCompanyId } = useActiveCompany();
  const { language } = useLanguage();
  const settings = useSettingsService('general');
  const { entries: auditEntries } = useAuditTrail('general');

  if (!activeCompanyId) return <div className="p-6 text-muted-foreground">Please select a company first.</div>;

  const SField = ({ label, settingKey, type = 'text', helpText, options, effectType, required }: {
    label: string; settingKey: string; type?: string; helpText?: string; 
    options?: { value: string; label: string }[]; effectType?: string; required?: boolean;
  }) => (
    <SettingField label={label} helpText={helpText} error={settings.validationErrors[settingKey]} effectType={effectType} required={required}>
      {type === 'switch' ? (
        <Switch checked={settings.getValue(settingKey) === 'true'} onCheckedChange={v => settings.setValue(settingKey, v ? 'true' : 'false')} />
      ) : type === 'select' && options ? (
        <Select value={settings.getValue(settingKey)} onValueChange={v => settings.setValue(settingKey, v)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input type={type === 'number' ? 'number' : 'text'} value={settings.getValue(settingKey)} onChange={e => settings.setValue(settingKey, e.target.value)} className="h-8" />
      )}
    </SettingField>
  );

  return (
    <AdminPageLayout
      title="General Settings"
      titleAr="الإعدادات العامة"
      description="Configure system-wide defaults for business partners, items, display, and fonts"
      descriptionAr="تهيئة الإعدادات الافتراضية على مستوى النظام"
      icon={<Settings className="h-6 w-6" />}
      module="general"
      isDirty={settings.isDirty}
      isLoading={settings.isLoading}
      isSaving={settings.isSaving}
      onSave={() => settings.save([])}
      onReset={settings.reset}
      changeSummary={settings.getChangeSummary()}
      auditEntries={auditEntries}
      affectedModules={['Sales', 'Purchasing', 'Inventory', 'Finance']}
    >
      <Tabs defaultValue="bp" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="bp" className="gap-1"><Users className="h-3 w-3" />Business Partners</TabsTrigger>
          <TabsTrigger value="items" className="gap-1"><Package className="h-3 w-3" />Items</TabsTrigger>
          <TabsTrigger value="display" className="gap-1"><Eye className="h-3 w-3" />Display</TabsTrigger>
          <TabsTrigger value="font" className="gap-1"><Type className="h-3 w-3" />Font & Background</TabsTrigger>
        </TabsList>

        <TabsContent value="bp" className="space-y-4">
          <AdminSection title="Customer/Vendor Defaults" description="Default grouping and behavior for business partner management">
            <SField label="Default Customer Group" settingKey="default_customer_group" helpText="Applied to new customers when no group is selected" effectType="future_transactions" />
            <SField label="Default Vendor Group" settingKey="default_vendor_group" helpText="Applied to new vendors" effectType="future_transactions" />
            <SField label="Dunning Level" settingKey="dunning_level" type="number" helpText="Maximum dunning levels for overdue reminders (1-9)" effectType="immediate" />
            <SField label="Manage Customer Activity" settingKey="manage_customer_activity" type="switch" helpText="Enable activity tracking (calls, meetings) for customers" effectType="immediate" />
            <SField label="Duplicate Tax Number Check" settingKey="duplicate_tax_check" type="select" options={[
              { value: 'none', label: 'No Check' }, { value: 'warn', label: 'Warning' }, { value: 'block', label: 'Block' }
            ]} helpText="Control duplicate tax/VAT numbers across partners" effectType="immediate" />
            <SField label="Credit Limit Default" settingKey="credit_limit_default" type="number" helpText="Default credit limit for new customers" effectType="future_transactions" />
            <SField label="Territory Mandatory" settingKey="territory_mandatory" type="switch" helpText="Require territory assignment on BP creation" effectType="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <AdminSection title="Item Master Defaults" description="Default values for new item creation and inventory behavior">
            <SField label="Default Item Group" settingKey="default_item_group" effectType="future_transactions" />
            <SField label="Default Warehouse" settingKey="default_warehouse" helpText="Primary warehouse for stock operations" effectType="immediate" />
            <SField label="Default Price List" settingKey="default_price_list" helpText="Base price list for sales documents" effectType="future_transactions" />
            <SField label="Manage Items by Warehouse" settingKey="manage_items_by_warehouse" type="switch" helpText="Track item quantities per warehouse" effectType="immediate" />
            <SField label="Negative Inventory Allowed" settingKey="negative_inventory" type="select" options={[
              { value: 'none', label: 'Not Allowed' }, { value: 'warn', label: 'Warning Only' }, { value: 'allow', label: 'Allow' }
            ]} helpText="Controls whether stock can go below zero" effectType="immediate" />
            <SField label="Batch/Serial Required" settingKey="batch_serial_required" type="select" options={[
              { value: 'none', label: 'Not Required' }, { value: 'batch', label: 'Batch Only' }, { value: 'serial', label: 'Serial Only' }, { value: 'both', label: 'Both' }
            ]} helpText="Enforce batch/serial tracking on items" effectType="future_transactions" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <AdminSection title="Display & Formatting" description="Controls how dates, numbers, and time appear across the ERP">
            <SField label="Date Format" settingKey="date_format" type="select" options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
            ]} helpText="System-wide date display format" effectType="immediate" />
            <SField label="Decimal Places" settingKey="decimal_places" type="select" options={[
              { value: '0', label: '0' }, { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }
            ]} helpText="Number of decimal places for amounts and quantities" effectType="immediate" />
            <SField label="Thousands Separator" settingKey="thousands_separator" type="switch" helpText="Show comma separators in numbers" effectType="immediate" />
            <SField label="Show Time in Documents" settingKey="show_time_in_documents" type="switch" helpText="Display time alongside date in document headers" effectType="immediate" />
            <SField label="Currency Symbol Position" settingKey="currency_position" type="select" options={[
              { value: 'before', label: 'Before Amount' }, { value: 'after', label: 'After Amount' }
            ]} effectType="immediate" />
          </AdminSection>
        </TabsContent>

        <TabsContent value="font" className="space-y-4">
          <AdminSection title="Appearance" description="Visual theme and font configuration">
            <SField label="Font Size" settingKey="font_size" type="select" options={[
              { value: '12', label: '12px' }, { value: '13', label: '13px' }, { value: '14', label: '14px (Default)' }, { value: '15', label: '15px' }, { value: '16', label: '16px' }
            ]} effectType="next_session" />
            <SField label="Theme" settingKey="theme" type="select" options={[
              { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }
            ]} effectType="next_session" />
          </AdminSection>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
