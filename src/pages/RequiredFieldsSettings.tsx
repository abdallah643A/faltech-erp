import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/hooks/useActiveCompany';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Search, Plus, Settings2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

const MODULES = [
  { value: 'leads', label: 'Leads' },
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'sales_orders', label: 'Sales Orders' },
  { value: 'purchase_orders', label: 'Purchase Orders' },
  { value: 'ar_invoices', label: 'AR Invoices' },
  { value: 'ap_invoices', label: 'AP Invoices' },
  { value: 'quotations', label: 'Quotations' },
  { value: 'activities', label: 'Activities' },
  { value: 'business_partners', label: 'Business Partners' },
  { value: 'items', label: 'Items' },
  { value: 'projects', label: 'Projects' },
  { value: 'rfis', label: 'RFIs' },
  { value: 'shipments', label: 'Shipments' },
  { value: 'budget_items', label: 'Budget Items' },
  { value: 'employees', label: 'Employees' },
  { value: 'material_requests', label: 'Material Requests' },
  { value: 'deliveries', label: 'Deliveries' },
  { value: 'incoming_payments', label: 'Incoming Payments' },
  { value: 'cost_codes', label: 'Cost Codes' },
  { value: 'schedule_of_values', label: 'Schedule of Values' },
  { value: 'project_phases', label: 'Project Phases' },
  { value: 'performance_reviews', label: 'Performance Reviews' },
  { value: 'deals', label: 'Deals' },
  { value: 'tmo_standards', label: 'TMO Standards' },
];

export default function RequiredFieldsSettings() {
  const { t } = useLanguage();
  const { activeCompanyId } = useActiveCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState('leads');
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['required-fields-admin', selectedModule, activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('required_field_settings' as any)
        .select('*')
        .eq('module', selectedModule)
        .or(`company_id.is.null${activeCompanyId ? `,company_id.eq.${activeCompanyId}` : ''}`)
        .order('field_name') as any);
      if (error) throw error;
      return data as any[];
    },
  });

  // Merge settings: company-specific overrides system defaults
  const mergedSettings = (() => {
    const map = new Map<string, any>();
    settings.filter((s: any) => !s.company_id).forEach((s: any) => map.set(s.field_name, s));
    settings.filter((s: any) => s.company_id).forEach((s: any) => map.set(s.field_name, { ...s, hasOverride: true }));
    return Array.from(map.values());
  })();

  const filtered = mergedSettings.filter(s =>
    s.field_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleField = useMutation({
    mutationFn: async ({ fieldName, currentRequired, isSystemDefault }: { fieldName: string; currentRequired: boolean; isSystemDefault: boolean }) => {
      if (isSystemDefault) throw new Error('Cannot change system default');
      if (!activeCompanyId) throw new Error('No active company');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase
        .from('required_field_settings' as any)
        .upsert({
          company_id: activeCompanyId,
          module: selectedModule,
          field_name: fieldName,
          is_required: !currentRequired,
          is_system_default: false,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,module,field_name' }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['required-fields-admin', selectedModule] });
      queryClient.invalidateQueries({ queryKey: ['required-fields', selectedModule] });
      toast({ title: 'Field updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addField = useMutation({
    mutationFn: async (fieldName: string) => {
      if (!activeCompanyId) throw new Error('No active company');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase
        .from('required_field_settings' as any)
        .insert({
          company_id: activeCompanyId,
          module: selectedModule,
          field_name: fieldName,
          is_required: true,
          is_system_default: false,
          updated_by: user?.id,
        }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['required-fields-admin', selectedModule] });
      queryClient.invalidateQueries({ queryKey: ['required-fields', selectedModule] });
      setAddDialogOpen(false);
      setNewFieldName('');
      toast({ title: 'Field added as required' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const formatFieldName = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Required Fields Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which fields are mandatory for each module. System defaults cannot be changed.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Info className="h-4 w-4" />
                <span>Double-click any field label in forms to toggle required status</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              You can also toggle required fields directly in any form by double-clicking on the field label. Changes apply company-wide.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead className="text-center">Required</TableHead>
                <TableHead className="text-center">{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {isLoading ? 'Loading...' : 'No fields configured for this module'}
                  </TableCell>
                </TableRow>
              ) : filtered.map(s => (
                <TableRow key={s.field_name}>
                  <TableCell>
                    <span className={s.is_required ? 'font-bold' : ''}>
                      {formatFieldName(s.field_name)}
                      {s.is_required && <span className="text-destructive ml-1">*</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.is_system_default ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Lock className="h-3 w-3" /> System Default
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={s.is_required}
                      disabled={s.is_system_default}
                      onCheckedChange={() => toggleField.mutate({
                        fieldName: s.field_name,
                        currentRequired: s.is_required,
                        isSystemDefault: s.is_system_default,
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {s.is_required ? (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">Required</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Optional</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add New Field Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Required Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Module</Label>
              <Input value={MODULES.find(m => m.value === selectedModule)?.label || selectedModule} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>Field Name (snake_case)</Label>
              <Input
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="e.g., phone_number"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must match the exact database column or form field name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => addField.mutate(newFieldName)} disabled={!newFieldName}>Add as Required</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
