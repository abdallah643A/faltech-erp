import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectContract } from '@/hooks/useIndustrialProjects';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contract?: ProjectContract | null;
  onSubmit: (data: Partial<ProjectContract>) => void;
  isSubmitting?: boolean;
}

export function ContractFormDialog({
  open,
  onOpenChange,
  projectId,
  contract,
  onSubmit,
  isSubmitting,
}: ContractFormDialogProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectContract>>({
    project_id: projectId,
    contract_number: contract?.contract_number || '',
    contract_date: contract?.contract_date || new Date().toISOString().split('T')[0],
    signed_date: contract?.signed_date || '',
    contract_value: contract?.contract_value || 0,
    currency: contract?.currency || 'SAR',
    contract_file_url: contract?.contract_file_url || '',
    contract_type: contract?.contract_type || '',
    scope_of_work: contract?.scope_of_work || '',
    terms_and_conditions: contract?.terms_and_conditions || '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `contracts/${projectId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(fileName, 3600 * 24 * 365);

      setFormData(prev => ({
        ...prev,
        contract_file_url: urlData?.signedUrl || fileName,
      }));

      toast({ title: 'Contract file uploaded' });
    } catch (error: any) {
      toast({ 
        title: 'Upload failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      contract_value: Number(formData.contract_value) || 0,
      signed_date: formData.signed_date || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Edit Contract' : 'Add Contract'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number">Contract Number</Label>
              <Input
                id="contract_number"
                value={formData.contract_number || ''}
                onChange={e => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                placeholder="e.g., CNT-2024-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contract_type">Contract Type</Label>
              <Select
                value={formData.contract_type || ''}
                onValueChange={value => setFormData(prev => ({ ...prev, contract_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">Fixed Price</SelectItem>
                  <SelectItem value="time_materials">Time & Materials</SelectItem>
                  <SelectItem value="cost_plus">Cost Plus</SelectItem>
                  <SelectItem value="unit_price">Unit Price</SelectItem>
                  <SelectItem value="turnkey">Turnkey</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_value">Contract Value</Label>
              <Input
                id="contract_value"
                type="number"
                value={formData.contract_value || ''}
                onChange={e => setFormData(prev => ({ ...prev, contract_value: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency || 'SAR'}
                onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signed_date">Signed Date</Label>
              <Input
                id="signed_date"
                type="date"
                value={formData.signed_date || ''}
                onChange={e => setFormData(prev => ({ ...prev, signed_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope_of_work">Scope of Work</Label>
            <Textarea
              id="scope_of_work"
              value={formData.scope_of_work || ''}
              onChange={e => setFormData(prev => ({ ...prev, scope_of_work: e.target.value }))}
              rows={3}
              placeholder="Describe the scope of work..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms_and_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_and_conditions"
              value={formData.terms_and_conditions || ''}
              onChange={e => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
              rows={3}
              placeholder="Enter terms and conditions..."
            />
          </div>

          <div className="space-y-2">
            <Label>Contract Document</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="flex-1"
              />
              {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {formData.contract_file_url && (
              <a 
                href={formData.contract_file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View uploaded document
              </a>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contract ? 'Update Contract' : 'Create Contract'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
