import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function FormRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[220px_1fr] items-center gap-4 py-1.5 px-4', className)}>
      <Label className="text-sm text-muted-foreground text-right">{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function DisabledField({ value }: { value: string }) {
  return <Input value={value} disabled className="bg-muted/50 text-muted-foreground border-border/50" />;
}

function CheckboxRow({ label, checked, disabled, onChange }: { label: string; checked?: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5 py-1 px-4">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <span className={cn('text-sm', disabled && 'text-muted-foreground')}>{label}</span>
    </div>
  );
}

function GeneralTab() {
  const [subTab, setSubTab] = useState('local');
  return (
    <div className="space-y-0">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-8 rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="local" className="text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Local Language</TabsTrigger>
          <TabsTrigger value="foreign" className="text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">Foreign Language</TabsTrigger>
        </TabsList>
        <TabsContent value="local" className="mt-0">
          <div className="divide-y divide-border/30">
            <FormRow label="Company Name"><Input placeholder="Enter company name" className="border-border/60" /></FormRow>
            <FormRow label="Address"><Textarea rows={2} placeholder="Company address" className="border-border/60 resize-none" /></FormRow>
            <FormRow label="Street / PO Box"><Input className="border-border/60" /></FormRow>
            <FormRow label="Street No."><Input className="border-border/60" /></FormRow>
            <FormRow label="Block"><Input className="border-border/60" /></FormRow>
            <FormRow label="Building / Floor / Room"><Input className="border-border/60" /></FormRow>
            <FormRow label="City"><Input className="border-border/60" /></FormRow>
            <FormRow label="Zip Code"><Input className="border-border/60" /></FormRow>
            <FormRow label="County"><Input className="border-border/60" /></FormRow>
            <FormRow label="State">
              <Select><SelectTrigger className="border-border/60"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="riyadh">Riyadh</SelectItem>
                  <SelectItem value="jeddah">Jeddah</SelectItem>
                  <SelectItem value="dammam">Dammam</SelectItem>
                  <SelectItem value="makkah">Makkah</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Country/Region">
              <Select defaultValue="sa"><SelectTrigger className="border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sa">Saudi Arabia</SelectItem>
                  <SelectItem value="ae">United Arab Emirates</SelectItem>
                  <SelectItem value="kw">Kuwait</SelectItem>
                  <SelectItem value="bh">Bahrain</SelectItem>
                  <SelectItem value="om">Oman</SelectItem>
                  <SelectItem value="qa">Qatar</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Internet Address"><Input type="url" className="border-border/60" /></FormRow>
            <FormRow label="Printing Header"><Input className="border-border/60" /></FormRow>
            <FormRow label="Active Manager"><Input className="border-border/60" /></FormRow>
            <div className="h-3" />
            <FormRow label="Alias Name"><Input className="border-border/60" /></FormRow>
            <FormRow label="Telephone 1"><Input type="tel" className="border-border/60" /></FormRow>
            <FormRow label="Telephone 2"><Input type="tel" className="border-border/60" /></FormRow>
            <FormRow label="Fax"><Input type="tel" className="border-border/60" /></FormRow>
            <FormRow label="E-Mail"><Input type="email" className="border-border/60" /></FormRow>
            <FormRow label="GLN"><Input className="border-border/60" /></FormRow>
          </div>
        </TabsContent>
        <TabsContent value="foreign" className="mt-0">
          <div className="divide-y divide-border/30">
            <FormRow label="Company Name (Foreign)"><Input className="border-border/60" /></FormRow>
            <FormRow label="Address (Foreign)"><Textarea rows={2} className="border-border/60 resize-none" /></FormRow>
            <FormRow label="Street (Foreign)"><Input className="border-border/60" /></FormRow>
            <FormRow label="City (Foreign)"><Input className="border-border/60" /></FormRow>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountingDataTab() {
  return (
    <div className="divide-y divide-border/30">
      <FormRow label="Tax Office"><Input className="border-border/60" /></FormRow>
      <FormRow label="Federal Tax ID 1"><Input className="border-border/60" /></FormRow>
      <FormRow label="Federal Tax ID 2"><Input defaultValue="301011578900003" className="border-border/60" /></FormRow>
      <FormRow label="Accounts Office Ref. (AO Ref.)"><Input className="border-border/60" /></FormRow>
      <FormRow label="Additional ID"><Input defaultValue="301011578900003" className="border-border/60" /></FormRow>
      <FormRow label="Unique Taxpayer Ref. (UTR)"><Input className="border-border/60" /></FormRow>
      <FormRow label="Employer's Reference"><Input className="border-border/60" /></FormRow>
      <FormRow label="Company Tax Rate"><Input type="number" defaultValue="0.00" step="0.01" className="border-border/60 w-32" /></FormRow>
      <FormRow label="Exemption Number"><Input className="border-border/60" /></FormRow>
      <FormRow label="Tax Deduction Number"><Input className="border-border/60" /></FormRow>
      <FormRow label="Tax Official"><Input className="border-border/60" /></FormRow>
      <div className="py-2 space-y-1">
        <CheckboxRow label="Use Deferred Tax" />
        <CheckboxRow label="Apply Exchange Rate on Deferred Tax" />
      </div>
      <FormRow label="Tax Rate Determination">
        <Select defaultValue="posting-date"><SelectTrigger className="border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="posting-date">Posting Date</SelectItem>
            <SelectItem value="document-date">Document Date</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>
      <FormRow label="Holidays">
        <div className="flex items-center gap-2">
          <Select defaultValue="2009GB"><SelectTrigger className="border-border/60 bg-[hsl(var(--warning-bg,48_100%_96%))]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2009GB">2009GB</SelectItem>
            </SelectContent>
          </Select>
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
        </div>
      </FormRow>
      <div className="py-2">
        <CheckboxRow label="Extended Tax Reporting" />
      </div>
      <FormRow label="SEPA Creditor ID"><Input className="border-border/60" /></FormRow>
      <FormRow label="EORI Number"><Input className="border-border/60" /></FormRow>
      <div className="py-2 space-y-1">
        <CheckboxRow label="Allow External Calculation of Tax on A/R Documents" />
        <CheckboxRow label="Enable Automatic Adjustment of Payments with Cash Discount" />
      </div>
    </div>
  );
}

function BasicInitializationTab() {
  return (
    <div className="divide-y divide-border/30">
      <FormRow label="Chart of Accounts Template"><DisabledField value="User-Defined" /></FormRow>
      <FormRow label="Local Currency"><DisabledField value="Saudi Riyal" /></FormRow>
      <FormRow label="System Currency"><DisabledField value="Saudi Riyal" /></FormRow>
      <FormRow label="Default Account Currency">
        <Select defaultValue="all"><SelectTrigger className="border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="local">Local Currency Only</SelectItem>
            <SelectItem value="system">System Currency Only</SelectItem>
          </SelectContent>
        </Select>
      </FormRow>
      <div className="py-2 space-y-1">
        <CheckboxRow label="Display Credit Balance with Negative Sign" checked={true} disabled />
        <CheckboxRow label="Use Segmentation Accounts" disabled />
        <CheckboxRow label="Allow Negative Amounts for Reversal Transaction Posting" />
        <CheckboxRow label="Permit More than One Document Type per Series" disabled />
        <CheckboxRow label="Multi-Language Support" />
      </div>
      <div className="py-2 space-y-1">
        <CheckboxRow label="Use Perpetual Inventory" checked={true} disabled />
        <FormRow label="Item Groups Valuation Method">
          <Select defaultValue="moving-avg"><SelectTrigger className="border-border/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="moving-avg">Moving Average</SelectItem>
              <SelectItem value="fifo">FIFO</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <CheckboxRow label="Manage Item Cost per Warehouse" checked={true} disabled />
        <CheckboxRow label="Use Purchase Accounts Posting System" disabled />
        <CheckboxRow label="Allow Stock Release Without Item Cost" />
      </div>
      <div className="py-3 px-4 space-y-2">
        <Label className="text-sm font-medium">Manage Serial and Batch Cost By:</Label>
        <RadioGroup defaultValue="group" className="space-y-1.5 ml-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="group" id="cost-group" />
            <Label htmlFor="cost-group" className="text-sm font-normal">Items Group Valuation Method</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="serial" id="cost-serial" />
            <Label htmlFor="cost-serial" className="text-sm font-normal">Serial/Batch Valuation Method</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="py-2">
        <CheckboxRow label="Enable Separate Net and Gross Price Mode" />
      </div>
      <div className="py-3 px-4 space-y-2">
        <Label className="text-sm font-semibold border-b border-border/50 pb-1 block">House Bank</Label>
        <div className="space-y-0">
          <FormRow label="Ordering Party"><Input className="border-border/60" /></FormRow>
          <FormRow label="Default Bank Country/Region">
            <div className="flex items-center gap-2">
              <Select defaultValue="sa"><SelectTrigger className="border-border/60"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sa">Saudi Arabia</SelectItem>
                  <SelectItem value="ae">UAE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormRow>
          <FormRow label="Default Bank">
            <Select><SelectTrigger className="border-border/60"><SelectValue placeholder="Select bank" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rajhi">Al Rajhi Bank</SelectItem>
                <SelectItem value="ncb">National Commercial Bank</SelectItem>
                <SelectItem value="samba">Samba Financial Group</SelectItem>
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Default Account No.">
            <Select><SelectTrigger className="border-border/60"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent><SelectItem value="main">Main Account</SelectItem></SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Default Branch"><DisabledField value="" /></FormRow>
        </div>
      </div>
      <div className="py-2 space-y-1">
        <CheckboxRow label="Install Bank Statement Processing" />
        <CheckboxRow label="Enable Intrastat" />
      </div>
    </div>
  );
}

export default function CompanyDetails() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="page-enter max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="bg-[hsl(215_50%_23%)] text-white px-6 py-3 rounded-t-lg flex items-center gap-3">
        <Building2 className="h-5 w-5" />
        <h1 className="text-lg font-semibold tracking-wide">
          {isAr ? 'تفاصيل الشركة' : 'Company Details'}
        </h1>
      </div>

      {/* Main card */}
      <div className="border border-border rounded-b-lg bg-card shadow-sm">
        <Tabs defaultValue="general">
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-2 h-10">
            <TabsTrigger value="general" className="text-sm rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {isAr ? 'عام' : 'General'}
            </TabsTrigger>
            <TabsTrigger value="accounting" className="text-sm rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {isAr ? 'البيانات المحاسبية' : 'Accounting Data'}
            </TabsTrigger>
            <TabsTrigger value="initialization" className="text-sm rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              {isAr ? 'التهيئة الأساسية' : 'Basic Initialization'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <GeneralTab />
          </TabsContent>
          <TabsContent value="accounting" className="mt-0">
            <AccountingDataTab />
          </TabsContent>
          <TabsContent value="initialization" className="mt-0">
            <BasicInitializationTab />
          </TabsContent>
        </Tabs>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm">
            {isAr ? 'مساعدة' : 'Help'}
          </Button>
          <Button variant="outline" size="sm">
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button size="sm">
            {isAr ? 'موافق' : 'OK'}
          </Button>
        </div>
      </div>
    </div>
  );
}
