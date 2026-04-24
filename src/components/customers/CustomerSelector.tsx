import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, Building2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface SelectedCustomer {
  id: string | null;
  code: string;
  name: string;
  phone: string;
  type: 'business_partner' | 'lead' | 'new';
}

interface CustomerSelectorProps {
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  required?: boolean;
  disabled?: boolean;
}

export function CustomerSelector({ value, onChange, required = false, disabled = false }: CustomerSelectorProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all business partners (includes leads)
  const { data: allPartners = [] } = useQuery({
    queryKey: ['business-partners-all-selector'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('id, card_code, card_name, card_type, email, phone, mobile, status')
        .order('card_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
  
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    type: 'business_partner' as 'business_partner' | 'lead',
    name: '',
    code: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);

  const allOptions = useMemo(() => {
    const bpOptions = allPartners
      .filter(bp => bp.card_type !== 'lead')
      .map(bp => ({
        id: bp.id,
        code: bp.card_code,
        name: bp.card_name,
        phone: bp.phone || bp.email || '',
        type: 'business_partner' as const,
        label: `${bp.card_code} - ${bp.card_name}`,
      }));

    const leadOptions = allPartners
      .filter(bp => bp.card_type === 'lead')
      .map(bp => ({
        id: bp.id,
        code: bp.card_code,
        name: bp.card_name,
        phone: bp.phone || bp.email || '',
        type: 'lead' as const,
        label: `${bp.card_code} - ${bp.card_name}`,
      }));

    return { bpOptions, leadOptions };
  }, [allPartners]);

  const handleSelect = (option: { id: string; code: string; name: string; phone: string; type: 'business_partner' | 'lead'; label: string }) => {
    onChange({
      id: option.id,
      code: option.code,
      name: option.name,
      phone: option.phone,
      type: option.type,
    });
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (!newCustomer.name) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الاسم مطلوب' : 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const cardType = newCustomer.type === 'lead' ? 'lead' : 'customer';
      const code = newCustomer.code || `${cardType === 'lead' ? 'L' : 'C'}-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase
        .from('business_partners')
        .insert({
          card_code: code,
          card_name: newCustomer.name,
          card_type: cardType,
          phone: newCustomer.phone,
          email: newCustomer.email,
          status: cardType === 'lead' ? 'New' : 'active',
        })
        .select()
        .single();

      if (error) throw error;

      onChange({
        id: data.id,
        code: data.card_code,
        name: data.card_name,
        phone: data.phone || '',
        type: newCustomer.type,
      });

      queryClient.invalidateQueries({ queryKey: ['business-partners-all-selector'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners'] });
      queryClient.invalidateQueries({ queryKey: ['business-partners-list'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      toast({
        title: language === 'ar' ? 'تم بنجاح' : 'Success',
        description: language === 'ar' ? 'تم إضافة العميل بنجاح' : 'Customer added successfully',
      });

      setShowAddDialog(false);
      setNewCustomer({ type: 'business_partner', name: '', code: '', phone: '', email: '' });
    } catch (error: any) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayValue = value 
    ? `${value.code} - ${value.name}` 
    : (language === 'ar' ? 'اختر العميل...' : 'Select customer...');

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
            disabled={disabled}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder={language === 'ar' ? 'بحث...' : 'Search...'} />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { setOpen(false); setShowAddDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'إضافة جديد' : 'Add New'}
                  </Button>
                </div>
              </CommandEmpty>
              
              {allOptions.bpOptions.length > 0 && (
                <CommandGroup heading={language === 'ar' ? 'شركاء الأعمال' : 'Business Partners'}>
                  {allOptions.bpOptions.map((option) => (
                    <CommandItem key={option.id} value={option.label} onSelect={() => handleSelect(option)}>
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{option.label}</span>
                      {value?.id === option.id && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {allOptions.leadOptions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={language === 'ar' ? 'العملاء المحتملين' : 'Leads'}>
                    {allOptions.leadOptions.map((option) => (
                      <CommandItem key={option.id} value={option.label} onSelect={() => handleSelect(option)}>
                        <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{option.label}</span>
                        {value?.id === option.id && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => { setOpen(false); setShowAddDialog(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>{language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'إضافة عميل جديد' : 'Add New Customer'}</DialogTitle>
            <DialogDescription>
              {language === 'ar' ? 'أضف عميل جديد كشريك أعمال أو عميل محتمل' : 'Add a new customer as a business partner or lead'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
              <Select value={newCustomer.type} onValueChange={(v: 'business_partner' | 'lead') => setNewCustomer({ ...newCustomer, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_partner">{language === 'ar' ? 'شريك أعمال' : 'Business Partner'}</SelectItem>
                  <SelectItem value="lead">{language === 'ar' ? 'عميل محتمل' : 'Lead'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الاسم' : 'Name'} *</Label>
                <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الكود' : 'Code'}</Label>
                <Input value={newCustomer.code} onChange={(e) => setNewCustomer({ ...newCustomer, code: e.target.value })} placeholder="Auto" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رقم الجوال' : 'Mobile'}</Label>
                <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'البريد' : 'Email'}</Label>
                <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleAddNew} disabled={saving}>{language === 'ar' ? 'إضافة' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
