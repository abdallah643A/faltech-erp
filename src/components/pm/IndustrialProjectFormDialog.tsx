import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/hooks/useProjects';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { Loader2 } from 'lucide-react';
import { CustomerSelector, SelectedCustomer } from '@/components/customers/CustomerSelector';

type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

interface IndustrialProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSubmit: (data: Partial<Project> & { project_type?: string }) => void;
  isSubmitting?: boolean;
}

export function IndustrialProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isSubmitting,
}: IndustrialProjectFormDialogProps) {
  const { businessPartners } = useBusinessPartners();
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'planning' as ProjectStatus,
    project_type: 'industrial' as 'standard' | 'industrial',
    start_date: '',
    end_date: '',
    budget: 0,
    contract_value: 0,
    payment_terms: '',
  });

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        code: project.code || '',
        description: project.description || '',
        status: project.status || 'planning',
        project_type: 'industrial',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget || 0,
        contract_value: 0,
        payment_terms: '',
      });
      // Set customer if exists
      if (project.business_partner_id) {
        const bp = businessPartners?.find(b => b.id === project.business_partner_id);
        if (bp) {
          setSelectedCustomer({
            id: bp.id,
            code: bp.card_code,
            name: bp.card_name,
            phone: bp.phone || '',
            type: 'business_partner',
          });
        }
      }
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        status: 'planning',
        project_type: 'industrial',
        start_date: '',
        end_date: '',
        budget: 0,
        contract_value: 0,
        payment_terms: '',
      });
      setSelectedCustomer(null);
    }
  }, [project, open, businessPartners]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      status: formData.status,
      project_type: formData.project_type,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      budget: Number(formData.budget) || 0,
      contract_value: Number(formData.contract_value) || 0,
      payment_terms: formData.payment_terms || null,
      customer_id: selectedCustomer?.id || null,
      business_partner_id: selectedCustomer?.type === 'business_partner' ? selectedCustomer.id : null,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project ? 'Edit Industrial Project' : 'Create Industrial Project'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Project Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., PRJ-2024-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Project description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={value => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type</Label>
                  <Select
                    value={formData.project_type}
                    onValueChange={value => setFormData(prev => ({ ...prev, project_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="customer" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Customer / Business Partner</Label>
                <CustomerSelector
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                />
              </div>

              {selectedCustomer && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium">Customer Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{selectedCustomer.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Code:</span>
                      <span className="ml-2">{selectedCustomer.code}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="ml-2">{selectedCustomer.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 capitalize">{selectedCustomer.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="financial" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_value">Contract Value (SAR)</Label>
                  <Input
                    id="contract_value"
                    type="number"
                    min={0}
                    value={formData.contract_value}
                    onChange={e => setFormData(prev => ({ ...prev, contract_value: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Project Budget (SAR)</Label>
                  <Input
                    id="budget"
                    type="number"
                    min={0}
                    value={formData.budget}
                    onChange={e => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Textarea
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={e => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                  rows={3}
                  placeholder="e.g., 30% advance, 40% on delivery, 30% after installation"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 mt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {project ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
