import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Square, X, Save, Plus, Trash2, Upload, Eye } from 'lucide-react';
import { Lead, LeadInput } from '@/hooks/useLeads';
import { cn } from '@/lib/utils';
import { RequiredFieldsProvider, useRequiredFieldsContext, useRequiredFieldValidation } from '@/components/RequiredFieldsProvider';

interface ContactPerson {
  id: string;
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  title: string;
  position: string;
  address: string;
  phone1: string;
  phone2: string;
  mobile: string;
  fax: string;
  email: string;
  remarks1: string;
  remarks2: string;
  isDefault: boolean;
  active: boolean;
}

interface Attachment {
  id: string;
  fileName: string;
  targetPath: string;
  attachmentDate: string;
  freeText: string;
}

interface LeadMasterDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  formData: LeadInput & { notes?: string };
  setFormData: (data: LeadInput & { notes?: string }) => void;
  onSubmit: () => void;
  users: Array<{ user_id: string; full_name: string | null; email: string }>;
  isAdmin: boolean;
  currentUserId?: string;
}

function SAPField({ label, children, className, fieldName }: { label: string; children: React.ReactNode; className?: string; fieldName?: string }) {
  const ctx = useRequiredFieldsContext();
  const isRequired = fieldName ? ctx?.isFieldRequired(fieldName) ?? false : false;
  const isSystemDefault = fieldName ? ctx?.isSystemDefault(fieldName) ?? false : false;

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!fieldName || !ctx || isSystemDefault) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.toggleRequired(fieldName);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        onDoubleClick={handleDoubleClick}
        title={isSystemDefault ? 'System required (locked)' : isRequired ? 'Double-click to make optional' : 'Double-click to make required'}
        className={cn(
          "text-[11px] text-muted-foreground whitespace-nowrap min-w-[130px] md:min-w-[150px] text-right pr-2 select-none",
          isRequired && "font-bold text-foreground",
          !isSystemDefault && fieldName && "cursor-pointer"
        )}
      >
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function SAPInput({ value, onChange, placeholder, disabled, type, className }: {
  value: string | number;
  onChange?: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type || 'text'}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full h-[26px] px-1.5 text-[12px] border border-border bg-background rounded-none focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-muted/50 disabled:text-muted-foreground",
        className
      )}
    />
  );
}

function SAPSelect({ value, onChange, children, className }: {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-[26px] text-[12px] rounded-none border-border px-1.5 py-0", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="text-[12px]">{children}</SelectContent>
    </Select>
  );
}

const emptyContact = (): ContactPerson => ({
  id: crypto.randomUUID(),
  name: '',
  firstName: '',
  middleName: '',
  lastName: '',
  title: '',
  position: '',
  address: '',
  phone1: '',
  phone2: '',
  mobile: '',
  fax: '',
  email: '',
  remarks1: '',
  remarks2: '',
  isDefault: false,
  active: true,
});

function LeadMasterDataDialogInner({
  open, onOpenChange, lead, formData, setFormData, onSubmit, users, isAdmin, currentUserId
}: LeadMasterDataDialogProps) {
  const { validate } = useRequiredFieldValidation();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Contact Persons state
  const [contacts, setContacts] = useState<ContactPerson[]>(() => {
    if (formData.contact_person) {
      const c = emptyContact();
      c.name = formData.contact_person;
      c.firstName = formData.contact_person;
      c.phone1 = formData.phone || '';
      c.email = formData.email || '';
      c.mobile = formData.mobile || '';
      c.isDefault = true;
      return [c];
    }
    return [];
  });
  const [selectedContactId, setSelectedContactId] = useState<string | null>(contacts[0]?.id || null);

  // Properties state (64 checkboxes like SAP B1)
  const [properties, setProperties] = useState<boolean[]>(new Array(64).fill(false));

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

  // Accounting state
  const [accountingData, setAccountingData] = useState({
    consolidatingBP: '',
    consolidationType: 'payment' as 'payment' | 'delivery',
    accountsReceivable: '',
    downPaymentClearing: '',
    downPaymentInterim: '',
    planningGroup: '',
    isAffiliate: false,
  });

  // Remarks state - separate from notes for the free-text remarks tab
  const [remarks, setRemarks] = useState(formData.notes || '');

  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;

  const statusValue = (() => {
    const s = formData.status?.toLowerCase();
    if (!s || s === 'new' || s === 'hot' || s === 'warm' || s === 'cold') return 'active';
    if (s === 'inactive' || s === 'lost' || s === 'closed') return 'inactive';
    if (s === 'blocked') return 'blocked';
    return 'active';
  })();

  const addContact = () => {
    const c = emptyContact();
    c.name = 'Define New';
    setContacts(prev => [...prev, c]);
    setSelectedContactId(c.id);
  };

  const updateContact = (field: keyof ContactPerson, value: string | boolean) => {
    if (!selectedContactId) return;
    setContacts(prev => prev.map(c =>
      c.id === selectedContactId ? { ...c, [field]: value } : c
    ));
  };

  const removeContact = () => {
    if (!selectedContactId) return;
    setContacts(prev => {
      const filtered = prev.filter(c => c.id !== selectedContactId);
      setSelectedContactId(filtered[0]?.id || null);
      return filtered;
    });
  };

  const setDefaultContact = () => {
    if (!selectedContactId) return;
    setContacts(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === selectedContactId
    })));
  };

  const addAttachment = () => {
    const a: Attachment = {
      id: crypto.randomUUID(),
      fileName: '',
      targetPath: '',
      attachmentDate: new Date().toISOString().split('T')[0],
      freeText: '',
    };
    setAttachments(prev => [...prev, a]);
    setSelectedAttachmentId(a.id);
  };

  const removeAttachment = () => {
    if (!selectedAttachmentId) return;
    setAttachments(prev => {
      const filtered = prev.filter(a => a.id !== selectedAttachmentId);
      setSelectedAttachmentId(filtered[0]?.id || null);
      return filtered;
    });
  };

  const handleSubmit = () => {
    // Sync contact person data back to formData
    const defaultContact = contacts.find(c => c.isDefault) || contacts[0];
    const finalData = defaultContact
      ? {
          ...formData,
          contact_person: defaultContact.firstName || defaultContact.name,
          phone: defaultContact.phone1 || formData.phone,
          email: defaultContact.email || formData.email,
          mobile: defaultContact.mobile || formData.mobile,
          notes: remarks,
        }
      : { ...formData, notes: remarks };

    // Validate required fields
    if (!validate(finalData as Record<string, any>, {
      company_name: 'Company Name',
      card_name: 'Name',
      contact_person: 'Contact Person',
      email: 'Email',
      phone: 'Phone',
      mobile: 'Mobile',
      industry: 'Industry',
      source: 'Source',
    })) return;

    setFormData(finalData);
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0 border-0 overflow-hidden flex flex-col",
          isMaximized
            ? "!max-w-[100vw] !w-[100vw] !h-[100vh] !max-h-[100vh] !rounded-none"
            : "max-w-[95vw] md:max-w-[900px] lg:max-w-[1050px] max-h-[92vh]",
          isMinimized && "!max-h-[38px] !min-h-0"
        )}
        hideClose
      >
        {/* SAP-style Title Bar */}
        <div className="flex items-center justify-between bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] px-3 py-1.5 shrink-0 select-none">
          <span className="text-[13px] font-semibold tracking-wide">
            Business Partner Master Data {lead ? `- ${lead.card_code}` : '- New'}
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded-sm">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setIsMaximized(!isMaximized); setIsMinimized(false); }} className="p-1 hover:bg-white/10 rounded-sm">
              <Square className="h-3 w-3" />
            </button>
            <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-destructive/80 rounded-sm">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 overflow-y-auto bg-background">
            {/* Header Section - SAP-style dual column */}
            <div className="border-b border-border p-3 space-y-1.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                {/* Left Column */}
                <div className="space-y-1.5">
                  <SAPField label="Code">
                    <div className="flex gap-1">
                      <SAPInput value="Manual" disabled className="w-[70px] shrink-0" />
                      <SAPInput value={lead?.card_code || 'Auto'} disabled className="flex-1" />
                      <SAPSelect
                        value={formData.card_type || 'lead'}
                        onChange={(v) => setFormData({ ...formData, card_type: v })}
                        className="w-[90px] shrink-0"
                      >
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SAPSelect>
                    </div>
                  </SAPField>
                  <SAPField label="Name" fieldName="card_name">
                    <SAPInput
                      value={formData.card_name}
                      onChange={(v) => setFormData({ ...formData, card_name: v })}
                      placeholder="Business Partner Name"
                    />
                  </SAPField>
                  <SAPField label="Foreign Name">
                    <SAPInput value="" onChange={() => {}} placeholder="" />
                  </SAPField>
                  <SAPField label="Group">
                    <SAPSelect
                      value={formData.group_code || '_none'}
                      onChange={(v) => setFormData({ ...formData, group_code: v === '_none' ? '' : v })}
                    >
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="Customers">Customers</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                      <SelectItem value="SME">SME</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                    </SAPSelect>
                  </SAPField>
                  <SAPField label="Currency">
                    <SAPSelect
                      value={formData.currency || 'SAR'}
                      onChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectItem value="SAR">Saudi Riyal</SelectItem>
                      <SelectItem value="USD">US Dollar</SelectItem>
                      <SelectItem value="EUR">Euro</SelectItem>
                    </SAPSelect>
                  </SAPField>
                  <SAPField label="Federal Tax ID">
                    <SAPInput
                      value={formData.tax_id || ''}
                      onChange={(v) => setFormData({ ...formData, tax_id: v })}
                    />
                  </SAPField>
                  <SAPField label="Owner">
                    {isAdmin ? (
                      <SAPSelect
                        value={formData.assigned_to || currentUserId || ''}
                        onChange={(v) => setFormData({ ...formData, assigned_to: v })}
                      >
                        {users.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SAPSelect>
                    ) : (
                      <SAPInput
                        value={users.find(u => u.user_id === currentUserId)?.full_name || ''}
                        disabled
                      />
                    )}
                  </SAPField>
                </div>

                {/* Right Column */}
                <div className="space-y-1.5">
                  <SAPField label="Local Currency">
                    <SAPSelect
                      value={formData.currency || 'SAR'}
                      onChange={(v) => setFormData({ ...formData, currency: v })}
                    >
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SAPSelect>
                  </SAPField>
                  <SAPField label="Orders">
                    <SAPInput value="0.00" disabled />
                  </SAPField>
                  <SAPField label="Opportunities">
                    <SAPInput value="" disabled />
                  </SAPField>
                  <SAPField label="BP Type">
                    <SAPSelect
                      value={formData.card_type || 'lead'}
                      onChange={(v) => setFormData({ ...formData, card_type: v })}
                    >
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SAPSelect>
                  </SAPField>
                  <SAPField label="Source" fieldName="source">
                    <SAPSelect
                      value={formData.source || '_none'}
                      onChange={(v) => setFormData({ ...formData, source: v === '_none' ? '' : v })}
                    >
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Trade Show">Trade Show</SelectItem>
                      <SelectItem value="Cold Call">Cold Call</SelectItem>
                      <SelectItem value="Direct">Direct</SelectItem>
                    </SAPSelect>
                  </SAPField>
                  <SAPField label="Score">
                    <div className="flex items-center gap-2">
                      <SAPInput value={lead?.score || 0} disabled className="w-[60px]" />
                      {lead?.score != null && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0",
                          lead.score >= 80 ? 'text-success border-success/30' :
                          lead.score >= 50 ? 'text-warning border-warning/30' :
                          'text-muted-foreground'
                        )}>
                          {lead.score >= 80 ? 'Hot' : lead.score >= 50 ? 'Warm' : 'Cold'}
                        </Badge>
                      )}
                    </div>
                  </SAPField>
                </div>
              </div>
            </div>

            {/* Tabbed Body - SAP-style */}
            <div className="p-3">
              <Tabs defaultValue="general">
                <div className="overflow-x-auto -mx-3 px-3">
                  <TabsList className="inline-flex w-auto h-auto bg-transparent border-b border-border rounded-none p-0 gap-0">
                    {['General', 'Contact Persons', 'Addresses', 'Payment Terms', 'Accounting', 'Properties', 'Remarks', 'Attachments'].map(tab => (
                      <TabsTrigger
                        key={tab}
                        value={tab.toLowerCase().replace(/ /g, '-')}
                        className="rounded-none rounded-t-sm border border-b-0 border-border bg-muted/30 data-[state=active]:bg-background data-[state=active]:border-b-background text-[11px] px-2.5 md:px-3.5 py-1.5 -mb-px whitespace-nowrap"
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* General Tab */}
                <TabsContent value="general" className="border border-t-0 border-border p-3 mt-0 rounded-b-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                    <div className="space-y-1.5">
                      <SAPField label="Tel 1">
                        <SAPInput value={formData.phone || ''} onChange={(v) => setFormData({ ...formData, phone: v })} placeholder="+966XXXXXXXXX" />
                      </SAPField>
                      <SAPField label="Tel 2">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <SAPField label="Mobile Phone">
                        <SAPInput value={formData.mobile || ''} onChange={(v) => setFormData({ ...formData, mobile: v })} placeholder="+966 5X XXX XXXX" />
                      </SAPField>
                      <SAPField label="Fax">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <SAPField label="E-Mail">
                        <SAPInput value={formData.email || ''} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="email@company.com" />
                      </SAPField>
                      <SAPField label="Web Site">
                        <SAPInput value={formData.website || ''} onChange={(v) => setFormData({ ...formData, website: v })} placeholder="https://" />
                      </SAPField>
                      <SAPField label="Shipping Type">
                        <SAPSelect value="_none" onChange={() => {}}>
                          <SelectItem value="_none">-</SelectItem>
                        </SAPSelect>
                      </SAPField>
                      <SAPField label="Industry" fieldName="industry">
                        <SAPSelect value="_none" onChange={() => {}}>
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="construction">Construction</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                        </SAPSelect>
                      </SAPField>
                      <SAPField label="Type of Business">
                        <SAPSelect value="company" onChange={() => {}}>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="government">Government</SelectItem>
                        </SAPSelect>
                      </SAPField>
                    </div>
                    <div className="space-y-1.5">
                      <SAPField label="Contact Person">
                        <SAPInput value={formData.contact_person || ''} onChange={(v) => setFormData({ ...formData, contact_person: v })} />
                      </SAPField>
                      <SAPField label="ID No. 2">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <SAPField label="Unified Federal Tax ID">
                        <SAPInput value={formData.tax_id || ''} onChange={(v) => setFormData({ ...formData, tax_id: v })} />
                      </SAPField>
                      <SAPField label="Company Reg. No. (CRN)">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <SAPField label="Remarks">
                        <SAPInput value={formData.notes || ''} onChange={(v) => setFormData({ ...formData, notes: v })} />
                      </SAPField>
                      <div className="pt-2" />
                      <SAPField label="Sales Employee">
                        {isAdmin ? (
                          <SAPSelect
                            value={formData.assigned_to || currentUserId || '_none'}
                            onChange={(v) => setFormData({ ...formData, assigned_to: v === '_none' ? '' : v })}
                          >
                            <SelectItem value="_none">-No Sales Employee-</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                            ))}
                          </SAPSelect>
                        ) : (
                          <SAPInput value={users.find(u => u.user_id === currentUserId)?.full_name || '-No Sales Employee-'} disabled />
                        )}
                      </SAPField>
                      <div className="pt-2" />
                      <SAPField label="BP Channel Code">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <SAPField label="Territory">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Persons Tab - SAP B1 style with list + detail */}
                <TabsContent value="contact-persons" className="border border-t-0 border-border p-0 mt-0 rounded-b-sm">
                  <div className="flex flex-col md:flex-row min-h-[320px]">
                    {/* Left: Contact list */}
                    <div className="w-full md:w-[200px] border-r border-border flex flex-col">
                      <div className="flex-1 overflow-y-auto">
                        {contacts.map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedContactId(c.id)}
                            className={cn(
                              "px-2 py-1.5 text-[12px] cursor-pointer border-b border-border truncate",
                              selectedContactId === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                            )}
                          >
                            {c.firstName || c.name || 'Define New'}
                            {c.isDefault && <span className="text-[9px] text-muted-foreground ml-1">★</span>}
                          </div>
                        ))}
                        {contacts.length === 0 && (
                          <div className="px-2 py-3 text-[11px] text-muted-foreground text-center">No contacts</div>
                        )}
                      </div>
                      <div className="border-t border-border p-1.5 flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 flex-1" onClick={addContact}>
                          <Plus className="h-3 w-3 mr-0.5" /> Add
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={removeContact} disabled={!selectedContactId}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Right: Contact detail form */}
                    <div className="flex-1 p-3">
                      {selectedContact ? (
                        <div className="space-y-1.5">
                          <SAPField label="Contact ID">
                            <SAPInput value={selectedContact.name} onChange={(v) => updateContact('name', v)} placeholder="Define New" />
                          </SAPField>
                          <SAPField label="First Name">
                            <SAPInput value={selectedContact.firstName} onChange={(v) => updateContact('firstName', v)} />
                          </SAPField>
                          <SAPField label="Middle Name">
                            <SAPInput value={selectedContact.middleName} onChange={(v) => updateContact('middleName', v)} />
                          </SAPField>
                          <SAPField label="Last Name">
                            <SAPInput value={selectedContact.lastName} onChange={(v) => updateContact('lastName', v)} />
                          </SAPField>
                          <SAPField label="Title">
                            <SAPSelect value={selectedContact.title || '_none'} onChange={(v) => updateContact('title', v === '_none' ? '' : v)}>
                              <SelectItem value="_none">-</SelectItem>
                              <SelectItem value="Mr.">Mr.</SelectItem>
                              <SelectItem value="Mrs.">Mrs.</SelectItem>
                              <SelectItem value="Ms.">Ms.</SelectItem>
                              <SelectItem value="Dr.">Dr.</SelectItem>
                              <SelectItem value="Eng.">Eng.</SelectItem>
                            </SAPSelect>
                          </SAPField>
                          <SAPField label="Position">
                            <SAPInput value={selectedContact.position} onChange={(v) => updateContact('position', v)} />
                          </SAPField>
                          <SAPField label="Address">
                            <SAPInput value={selectedContact.address} onChange={(v) => updateContact('address', v)} />
                          </SAPField>
                          <SAPField label="Telephone 1" fieldName="phone">
                            <SAPInput value={selectedContact.phone1} onChange={(v) => updateContact('phone1', v)} />
                          </SAPField>
                          <SAPField label="Telephone 2">
                            <SAPInput value={selectedContact.phone2} onChange={(v) => updateContact('phone2', v)} />
                          </SAPField>
                          <SAPField label="Mobile Phone" fieldName="mobile">
                            <SAPInput value={selectedContact.mobile} onChange={(v) => updateContact('mobile', v)} />
                          </SAPField>
                          <SAPField label="Fax">
                            <SAPInput value={selectedContact.fax} onChange={(v) => updateContact('fax', v)} />
                          </SAPField>
                          <SAPField label="E-Mail" fieldName="email">
                            <SAPInput value={selectedContact.email} onChange={(v) => updateContact('email', v)} />
                          </SAPField>
                          <SAPField label="Remarks 1">
                            <SAPInput value={selectedContact.remarks1} onChange={(v) => updateContact('remarks1', v)} />
                          </SAPField>
                          <SAPField label="Remarks 2">
                            <SAPInput value={selectedContact.remarks2} onChange={(v) => updateContact('remarks2', v)} />
                          </SAPField>
                          <div className="flex items-center gap-4 pt-2 pl-[154px]">
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-3" onClick={setDefaultContact}>
                              Set as Default
                            </Button>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`contact-active-${selectedContact.id}`}
                                checked={selectedContact.active}
                                onCheckedChange={(v) => updateContact('active', !!v)}
                                className="h-3.5 w-3.5"
                              />
                              <Label htmlFor={`contact-active-${selectedContact.id}`} className="text-[11px] cursor-pointer">Active</Label>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[12px] text-muted-foreground">
                          Select a contact or click Add to create one
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Addresses Tab */}
                <TabsContent value="addresses" className="border border-t-0 border-border p-3 mt-0 rounded-b-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-foreground">Bill-To Address</span>
                      <textarea
                        className="w-full h-[80px] px-1.5 py-1 text-[12px] border border-border bg-background rounded-none focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                        value={formData.billing_address || ''}
                        onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-foreground">Ship-To Address</span>
                      <textarea
                        className="w-full h-[80px] px-1.5 py-1 text-[12px] border border-border bg-background rounded-none focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                        value={formData.shipping_address || ''}
                        onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Payment Terms Tab */}
                <TabsContent value="payment-terms" className="border border-t-0 border-border p-3 mt-0 rounded-b-sm">
                  <div className="space-y-4">
                    {/* House Bank section */}
                    <div>
                      <span className="text-[11px] font-semibold text-primary">House Bank</span>
                      <div className="border border-border p-2.5 mt-1 space-y-1.5">
                        <SAPField label="Country/Region">
                          <SAPSelect value="SA" onChange={() => {}}>
                            <SelectItem value="SA">Saudi Arabia</SelectItem>
                            <SelectItem value="AE">UAE</SelectItem>
                            <SelectItem value="BH">Bahrain</SelectItem>
                          </SAPSelect>
                        </SAPField>
                        <SAPField label="Bank">
                          <SAPInput value="" onChange={() => {}} placeholder="" />
                        </SAPField>
                        <SAPField label="Account">
                          <SAPInput value="" onChange={() => {}} />
                        </SAPField>
                        <SAPField label="Branch">
                          <SAPInput value="" onChange={() => {}} />
                        </SAPField>
                        <SAPField label="IBAN">
                          <SAPInput value="" onChange={() => {}} placeholder="SA..." />
                        </SAPField>
                        <SAPField label="BIC/SWIFT Code">
                          <SAPInput value="" onChange={() => {}} />
                        </SAPField>
                        <SAPField label="Control No.">
                          <SAPInput value="" onChange={() => {}} />
                        </SAPField>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
                      <SAPField label="Payment Terms">
                        <SAPSelect
                          value={formData.payment_terms || '_none'}
                          onChange={(v) => setFormData({ ...formData, payment_terms: v === '_none' ? '' : v })}
                        >
                          <SelectItem value="_none">-</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Net 90">Net 90</SelectItem>
                          <SelectItem value="COD">Cash on Delivery</SelectItem>
                        </SAPSelect>
                      </SAPField>
                      <SAPField label="Credit Limit">
                        <SAPInput
                          type="number"
                          value={formData.credit_limit || 0}
                          onChange={(v) => setFormData({ ...formData, credit_limit: parseFloat(v) || 0 })}
                        />
                      </SAPField>
                      <SAPField label="Max. Commitment">
                        <SAPInput value="0.00" disabled />
                      </SAPField>
                      <SAPField label="Opening Balance">
                        <SAPInput value="0.00" disabled />
                      </SAPField>
                    </div>
                    <div className="space-y-1.5">
                      <SAPField label="Reference Details">
                        <SAPInput value="" onChange={() => {}} />
                      </SAPField>
                      <div className="flex items-center gap-1.5 pl-[154px]">
                        <Checkbox id="collection-auth" className="h-3.5 w-3.5" />
                        <Label htmlFor="collection-auth" className="text-[11px] cursor-pointer">Collection Authorization</Label>
                      </div>
                      <SAPField label="Bank Charges Alloc. Code">
                        <SAPSelect value="_none" onChange={() => {}}>
                          <SelectItem value="_none">-</SelectItem>
                        </SAPSelect>
                      </SAPField>
                    </div>
                  </div>
                </TabsContent>

                {/* Accounting Tab - SAP B1 style with sub-tabs */}
                <TabsContent value="accounting" className="border border-t-0 border-border p-0 mt-0 rounded-b-sm">
                  <Tabs defaultValue="acc-general">
                    <TabsList className="inline-flex w-auto h-auto bg-transparent border-b border-border rounded-none p-0 gap-0 px-2 pt-1">
                      <TabsTrigger value="acc-general" className="rounded-none rounded-t-sm border border-b-0 border-border bg-muted/30 data-[state=active]:bg-background data-[state=active]:border-b-background text-[10px] px-2.5 py-1 -mb-px">
                        General
                      </TabsTrigger>
                      <TabsTrigger value="acc-tax" className="rounded-none rounded-t-sm border border-b-0 border-border bg-muted/30 data-[state=active]:bg-background data-[state=active]:border-b-background text-[10px] px-2.5 py-1 -mb-px">
                        Tax
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="acc-general" className="p-3 mt-0">
                      <div className="space-y-2">
                        <SAPField label="Consolidating BP">
                          <SAPInput value={accountingData.consolidatingBP} onChange={(v) => setAccountingData({ ...accountingData, consolidatingBP: v })} />
                        </SAPField>
                        <div className="flex items-center gap-6 pl-[154px]">
                          <div className="flex items-center gap-1.5">
                            <input type="radio" name="consolidation" id="cons-payment" checked={accountingData.consolidationType === 'payment'} onChange={() => setAccountingData({ ...accountingData, consolidationType: 'payment' })} className="h-3 w-3" />
                            <Label htmlFor="cons-payment" className="text-[11px] cursor-pointer">Payment Consolidation</Label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input type="radio" name="consolidation" id="cons-delivery" checked={accountingData.consolidationType === 'delivery'} onChange={() => setAccountingData({ ...accountingData, consolidationType: 'delivery' })} className="h-3 w-3" />
                            <Label htmlFor="cons-delivery" className="text-[11px] cursor-pointer">Delivery Consolidation</Label>
                          </div>
                        </div>
                        <div className="pt-2" />
                        <SAPField label="Accounts Receivable">
                          <SAPInput value={accountingData.accountsReceivable} onChange={(v) => setAccountingData({ ...accountingData, accountsReceivable: v })} placeholder="e.g. 120101001" />
                        </SAPField>
                        <SAPField label="Down Pmt Clearing Acct">
                          <SAPInput value={accountingData.downPaymentClearing} onChange={(v) => setAccountingData({ ...accountingData, downPaymentClearing: v })} placeholder="e.g. 220501001" />
                        </SAPField>
                        <SAPField label="Down Pmt Interim Acct">
                          <SAPInput value={accountingData.downPaymentInterim} onChange={(v) => setAccountingData({ ...accountingData, downPaymentInterim: v })} />
                        </SAPField>
                        <div className="pt-4" />
                        <SAPField label="Planning Group">
                          <SAPInput value={accountingData.planningGroup} onChange={(v) => setAccountingData({ ...accountingData, planningGroup: v })} />
                        </SAPField>
                        <div className="flex items-center gap-1.5 pl-[154px]">
                          <Checkbox
                            id="affiliate"
                            checked={accountingData.isAffiliate}
                            onCheckedChange={(v) => setAccountingData({ ...accountingData, isAffiliate: !!v })}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor="affiliate" className="text-[11px] cursor-pointer">Affiliate</Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="acc-tax" className="p-3 mt-0">
                      <div className="space-y-1.5">
                        <SAPField label="Tax Group">
                          <SAPSelect value="_none" onChange={() => {}}>
                            <SelectItem value="_none">-</SelectItem>
                            <SelectItem value="S1">Standard VAT</SelectItem>
                            <SelectItem value="E1">Exempt</SelectItem>
                            <SelectItem value="Z1">Zero-Rated</SelectItem>
                          </SAPSelect>
                        </SAPField>
                        <SAPField label="Tax Status">
                          <SAPSelect value="liable" onChange={() => {}}>
                            <SelectItem value="liable">Liable</SelectItem>
                            <SelectItem value="exempt">Exempt</SelectItem>
                          </SAPSelect>
                        </SAPField>
                        <SAPField label="Federal Tax ID">
                          <SAPInput value={formData.tax_id || ''} onChange={(v) => setFormData({ ...formData, tax_id: v })} />
                        </SAPField>
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* Properties Tab - SAP B1 style 64 checkboxes grid */}
                <TabsContent value="properties" className="border border-t-0 border-border p-3 mt-0 rounded-b-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-x-3 gap-y-1">
                    {properties.map((checked, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Checkbox
                          id={`prop-${idx}`}
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = [...properties];
                            next[idx] = !!v;
                            setProperties(next);
                          }}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor={`prop-${idx}`} className="text-[10px] cursor-pointer text-muted-foreground">
                          {idx + 1}
                        </Label>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Remarks Tab - free text area */}
                <TabsContent value="remarks" className="border border-t-0 border-border p-3 mt-0 rounded-b-sm">
                  <textarea
                    className="w-full h-[200px] px-2 py-1.5 text-[12px] border border-border bg-background rounded-none focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                  />
                </TabsContent>

                {/* Attachments Tab - SAP B1 style table with Browse/Display/Delete */}
                <TabsContent value="attachments" className="border border-t-0 border-border p-0 mt-0 rounded-b-sm">
                  <div className="flex flex-col md:flex-row min-h-[250px]">
                    {/* Attachment table */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-2 py-1.5 font-medium border-r border-border w-8">#</th>
                            <th className="text-left px-2 py-1.5 font-medium border-r border-border">Target Path</th>
                            <th className="text-left px-2 py-1.5 font-medium border-r border-border">File Name</th>
                            <th className="text-left px-2 py-1.5 font-medium border-r border-border w-[110px]">Attachment Date</th>
                            <th className="text-left px-2 py-1.5 font-medium w-[60px]">Free Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attachments.length === 0 ? (
                            Array.from({ length: 6 }).map((_, i) => (
                              <tr key={i} className="border-b border-border">
                                <td className="px-2 py-1.5 border-r border-border text-muted-foreground">&nbsp;</td>
                                <td className="px-2 py-1.5 border-r border-border">&nbsp;</td>
                                <td className="px-2 py-1.5 border-r border-border">&nbsp;</td>
                                <td className="px-2 py-1.5 border-r border-border">&nbsp;</td>
                                <td className="px-2 py-1.5">&nbsp;</td>
                              </tr>
                            ))
                          ) : (
                            attachments.map((att, idx) => (
                              <tr
                                key={att.id}
                                className={cn(
                                  "border-b border-border cursor-pointer",
                                  selectedAttachmentId === att.id ? "bg-primary/10" : "hover:bg-muted/30"
                                )}
                                onClick={() => setSelectedAttachmentId(att.id)}
                              >
                                <td className="px-2 py-1.5 border-r border-border">{idx + 1}</td>
                                <td className="px-2 py-1.5 border-r border-border">
                                  <input
                                    className="w-full bg-transparent border-none outline-none text-[11px]"
                                    value={att.targetPath}
                                    onChange={(e) => {
                                      setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, targetPath: e.target.value } : a));
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1.5 border-r border-border">
                                  <input
                                    className="w-full bg-transparent border-none outline-none text-[11px]"
                                    value={att.fileName}
                                    onChange={(e) => {
                                      setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, fileName: e.target.value } : a));
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1.5 border-r border-border text-muted-foreground">{att.attachmentDate}</td>
                                <td className="px-2 py-1.5">
                                  <input
                                    className="w-full bg-transparent border-none outline-none text-[11px]"
                                    value={att.freeText}
                                    onChange={(e) => {
                                      setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, freeText: e.target.value } : a));
                                    }}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div className="w-full md:w-[100px] border-t md:border-t-0 md:border-l border-border p-2 flex md:flex-col gap-1.5 items-start">
                      <Button variant="default" size="sm" className="h-7 text-[10px] px-3 w-full" onClick={addAttachment}>
                        <Upload className="h-3 w-3 mr-1" /> Browse
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 w-full" disabled={!selectedAttachmentId}>
                        <Eye className="h-3 w-3 mr-1" /> Display
                      </Button>
                      <div className="flex-1" />
                      <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 w-full" onClick={removeAttachment} disabled={!selectedAttachmentId}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Bottom Status Bar - SAP style */}
            <div className="border-t border-border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <RadioGroup
                  value={statusValue}
                  onValueChange={(v) => {
                    const statusMap: Record<string, string> = { active: 'New', inactive: 'inactive', blocked: 'blocked' };
                    setFormData({ ...formData, status: statusMap[v] || 'New' });
                  }}
                  className="flex items-center gap-4"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="active" id="status-active" className="h-3.5 w-3.5" />
                    <Label htmlFor="status-active" className="text-[11px] cursor-pointer">Active</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="inactive" id="status-inactive" className="h-3.5 w-3.5" />
                    <Label htmlFor="status-inactive" className="text-[11px] cursor-pointer">Inactive</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="blocked" id="status-blocked" className="h-3.5 w-3.5" />
                    <Label htmlFor="status-blocked" className="text-[11px] cursor-pointer">Blocked</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-[11px] h-7 px-3" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-[11px] h-7 px-4 gap-1.5" onClick={handleSubmit}>
                  <Save className="h-3.5 w-3.5" />
                  {lead ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LeadMasterDataDialog(props: LeadMasterDataDialogProps) {
  return (
    <RequiredFieldsProvider module="leads">
      <LeadMasterDataDialogInner {...props} />
    </RequiredFieldsProvider>
  );
}
