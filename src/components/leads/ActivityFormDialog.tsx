import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ActivityInput } from '@/hooks/useActivities';
import { useLeads } from '@/hooks/useLeads';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { useDimensions } from '@/hooks/useDimensions';
import { RequiredFieldsProvider, useRequiredFieldValidation } from '@/components/RequiredFieldsProvider';
import { RFLabel } from '@/components/ui/RFLabel';

type RelatedType = 'lead' | 'opportunity' | 'business_partner' | '';

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName?: string;
  onSubmit: (activity: ActivityInput) => void;
}

function ActivityFormDialogInner({
  open,
  onOpenChange,
  leadId,
  leadName,
  onSubmit,
}: ActivityFormDialogProps) {
  const { t } = useLanguage();
  const { leads } = useLeads();
  const { opportunities } = useOpportunities();
  const { businessPartners } = useBusinessPartners();
  const { activeDimensions: employeeDimensions } = useDimensions('employees');
  const { validate } = useRequiredFieldValidation();

  const [relatedType, setRelatedType] = useState<RelatedType>(leadId ? 'lead' : '');
  const [relatedId, setRelatedId] = useState<string>(leadId || '');
  const [formData, setFormData] = useState<ActivityInput>({
    type: 'call',
    subject: '',
    description: '',
    business_partner_id: leadId,
  });

  useEffect(() => {
    if (open) {
      setRelatedType(leadId ? 'lead' : '');
      setRelatedId(leadId || '');
      setFormData({
        type: 'call',
        subject: '',
        description: '',
        business_partner_id: leadId,
      });
    }
  }, [open, leadId]);

  const getRelatedOptions = () => {
    switch (relatedType) {
      case 'lead':
        return leads.map((lead) => ({
          id: lead.id,
          name: `${lead.card_name} (${lead.card_code})`,
        }));
      case 'opportunity':
        return opportunities.map((opp) => ({
          id: opp.id,
          name: `${opp.name} - ${opp.company}`,
        }));
      case 'business_partner':
        return businessPartners.map((bp) => ({
          id: bp.id,
          name: `${bp.card_name} (${bp.card_code})`,
        }));
      default:
        return [];
    }
  };

  const handleRelatedTypeChange = (value: RelatedType) => {
    setRelatedType(value);
    setRelatedId('');
    setFormData({
      ...formData,
      lead_id: undefined,
      opportunity_id: undefined,
      business_partner_id: undefined,
    });
  };

  const handleRelatedIdChange = (value: string) => {
    setRelatedId(value);
    const updatedFormData = { ...formData };
    updatedFormData.lead_id = undefined;
    updatedFormData.opportunity_id = undefined;
    updatedFormData.business_partner_id = undefined;

    switch (relatedType) {
      case 'lead':
        updatedFormData.business_partner_id = value;
        break;
      case 'opportunity':
        updatedFormData.opportunity_id = value;
        break;
      case 'business_partner':
        updatedFormData.business_partner_id = value;
        break;
    }
    setFormData(updatedFormData);
  };

  const handleSubmit = () => {
    if (!validate(formData as Record<string, any>, {
      subject: 'Subject',
      type: 'Activity Type',
      description: 'Description',
      due_date: 'Due Date',
      assigned_to: 'Assigned To',
    })) return;
    if (!formData.subject) return;
    onSubmit(formData);
    setFormData({
      type: 'call',
      subject: '',
      description: '',
      business_partner_id: leadId,
    });
    setRelatedType(leadId ? 'lead' : '');
    setRelatedId(leadId || '');
    onOpenChange(false);
  };

  const relatedOptions = getRelatedOptions();
  const selectedRelatedName = leadName || relatedOptions.find((opt) => opt.id === relatedId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('activity.addActivity')}</DialogTitle>
          <DialogDescription>
            {selectedRelatedName
              ? `${t('activity.addActivity')} - ${selectedRelatedName}`
              : t('activity.addActivity')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <RFLabel fieldName="type">{t('activity.activityType')}</RFLabel>
            <Select
              value={formData.type}
              onValueChange={(value: ActivityInput['type']) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <RFLabel fieldName="related_type">{t('activity.relatedType')}</RFLabel>
            <Select
              value={relatedType}
              onValueChange={(value: RelatedType) => handleRelatedTypeChange(value)}
              disabled={!!leadId}
            >
              <SelectTrigger><SelectValue placeholder={t('activity.selectRelatedType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">{t('nav.leads')}</SelectItem>
                <SelectItem value="opportunity">{t('nav.opportunities')}</SelectItem>
                <SelectItem value="business_partner">{t('nav.businessPartners')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {relatedType && (
            <div className="space-y-2">
              <RFLabel fieldName="related_to">{t('activity.relatedTo')}</RFLabel>
              <Select value={relatedId} onValueChange={handleRelatedIdChange} disabled={!!leadId}>
                <SelectTrigger><SelectValue placeholder={t('common.search')} /></SelectTrigger>
                <SelectContent>
                  {relatedOptions.filter(option => option.id).map((option) => (
                    <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <RFLabel fieldName="subject">{t('activity.subject')}</RFLabel>
            <Input
              placeholder={t('activity.subject')}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <RFLabel fieldName="description">{t('activity.description')}</RFLabel>
            <Textarea
              placeholder={t('activity.description')}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <RFLabel fieldName="assigned_to">{t('activity.assignedTo')}</RFLabel>
            <Select
              value={formData.assigned_to || ''}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
            >
              <SelectTrigger><SelectValue placeholder={t('activity.selectUser')} /></SelectTrigger>
              <SelectContent>
              {employeeDimensions.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.cost_center})
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <RFLabel fieldName="due_date">{t('activity.dueDate')}</RFLabel>
            <Input
              type="datetime-local"
              value={formData.due_date || ''}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.subject}>
            {t('activity.addActivity')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityFormDialog(props: ActivityFormDialogProps) {
  return (
    <RequiredFieldsProvider module="activities">
      <ActivityFormDialogInner {...props} />
    </RequiredFieldsProvider>
  );
}
