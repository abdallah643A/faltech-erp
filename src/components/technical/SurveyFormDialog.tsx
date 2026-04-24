import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { SiteSurvey } from '@/hooks/useSiteSurveys';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Paperclip, Upload, X } from 'lucide-react';

interface SurveyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey: SiteSurvey | null;
  projectId?: string;
  salesOrderId?: string | null;
  customerName?: string | null;
  onSubmit: (data: Partial<SiteSurvey>) => void;
}

export function SurveyFormDialog({ open, onOpenChange, survey, projectId, salesOrderId, customerName, onSubmit }: SurveyFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<Partial<SiteSurvey>>({
    defaultValues: {
      survey_type: 'initial_assessment',
      status: 'scheduled',
      floor_type: 'concrete',
      power_phases: 'three',
      frequency: '50Hz',
      dust_level: 'low',
    },
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (survey) {
      reset(survey);
    } else {
      reset({
        project_id: projectId || null,
        sales_order_id: salesOrderId || null,
        survey_type: 'initial_assessment',
        status: 'scheduled',
        floor_type: 'concrete',
        power_phases: 'three',
        frequency: '50Hz',
        dust_level: 'low',
        customer_contact_name: customerName || '',
      });
    }
    setAttachments([]);
  }, [survey, projectId, salesOrderId, customerName, reset]);

  const onFormSubmit = async (data: Partial<SiteSurvey>) => {
    const cleaned = { ...data };
    const numericFields = ['site_length', 'site_width', 'site_height', 'ceiling_height', 'load_bearing_capacity',
      'voltage', 'available_load', 'distance_to_power_source', 'temperature_min', 'temperature_max',
      'humidity_min', 'humidity_max', 'entry_width', 'entry_height', 'crane_capacity', 'duration_estimate',
      'gps_latitude', 'gps_longitude'] as const;
    numericFields.forEach(f => {
      if ((cleaned as any)[f] === '' || (cleaned as any)[f] === undefined) (cleaned as any)[f] = null;
    });
    if (!cleaned.scheduled_date) cleaned.scheduled_date = null;
    // Pass attachments via a custom property so parent can handle upload after creation
    (cleaned as any)._attachments = attachments;
    onSubmit(cleaned);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setAttachments(prev => [...prev, ...Array.from(files)]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{survey ? 'Edit Site Survey' : 'Schedule New Site Survey'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-1">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="site">Site Info</TabsTrigger>
                <TabsTrigger value="power">Power & Env</TabsTrigger>
                <TabsTrigger value="infra">Infrastructure</TabsTrigger>
                <TabsTrigger value="report">Report</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Survey Type</Label>
                    <Select value={watch('survey_type') || 'initial_assessment'}
                      onValueChange={(v) => setValue('survey_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_assessment">Initial Assessment</SelectItem>
                        <SelectItem value="detailed_survey">Detailed Survey</SelectItem>
                        <SelectItem value="re_survey">Re-survey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={watch('status') || 'scheduled'}
                      onValueChange={(v) => setValue('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input type="date" {...register('scheduled_date')} />
                  </div>
                  <div>
                    <Label>Duration (hours)</Label>
                    <Input type="number" step="0.5" {...register('duration_estimate')} />
                  </div>
                  <div>
                    <Label>Customer Contact Name</Label>
                    <Input {...register('customer_contact_name')} placeholder="Contact person" />
                  </div>
                  <div>
                    <Label>Customer Contact Phone</Label>
                    <Input {...register('customer_contact_phone')} placeholder="+966..." />
                  </div>
                  <div className="col-span-2">
                    <Label>Site Address</Label>
                    <Textarea {...register('site_address')} placeholder="Full site address" rows={2} />
                  </div>
                  <div>
                    <Label>GPS Latitude</Label>
                    <Input type="number" step="any" {...register('gps_latitude')} />
                  </div>
                  <div>
                    <Label>GPS Longitude</Label>
                    <Input type="number" step="any" {...register('gps_longitude')} />
                  </div>
                  <div className="col-span-2">
                    <Label>Access Requirements</Label>
                    <Textarea {...register('access_requirements')} placeholder="Security clearance, PPE, etc." rows={2} />
                  </div>

                  {/* Attachments */}
                  <div className="col-span-2">
                    <Label className="flex items-center gap-2 mb-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments
                    </Label>
                    <div className="space-y-2">
                      {attachments.length > 0 && (
                        <div className="space-y-1">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-sm">
                              <span className="truncate max-w-[300px]">{file.name}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(index)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf"
                        onChange={handleAddFiles}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3 w-3 mr-1" />
                        Add Files
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="site" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Length (m)</Label>
                    <Input type="number" step="0.01" {...register('site_length')} />
                  </div>
                  <div>
                    <Label>Width (m)</Label>
                    <Input type="number" step="0.01" {...register('site_width')} />
                  </div>
                  <div>
                    <Label>Height (m)</Label>
                    <Input type="number" step="0.01" {...register('site_height')} />
                  </div>
                  <div>
                    <Label>Ceiling Height (m)</Label>
                    <Input type="number" step="0.01" {...register('ceiling_height')} />
                  </div>
                  <div>
                    <Label>Floor Type</Label>
                    <Select value={watch('floor_type') || ''} onValueChange={(v) => setValue('floor_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concrete">Concrete</SelectItem>
                        <SelectItem value="metal">Metal</SelectItem>
                        <SelectItem value="tiled">Tiled</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Load Bearing (kg/m²)</Label>
                    <Input type="number" step="0.01" {...register('load_bearing_capacity')} />
                  </div>
                  <div>
                    <Label>Entry Width (m)</Label>
                    <Input type="number" step="0.01" {...register('entry_width')} />
                  </div>
                  <div>
                    <Label>Entry Height (m)</Label>
                    <Input type="number" step="0.01" {...register('entry_height')} />
                  </div>
                  <div>
                    <Label>Stairway/Elevator</Label>
                    <Select value={watch('stairway_elevator') || ''} onValueChange={(v) => setValue('stairway_elevator', v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stairway">Stairway</SelectItem>
                        <SelectItem value="elevator">Elevator</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={watch('loading_dock') || false}
                      onCheckedChange={(v) => setValue('loading_dock', v)} />
                    <Label>Loading Dock</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={watch('crane_available') || false}
                      onCheckedChange={(v) => setValue('crane_available', v)} />
                    <Label>Crane Available</Label>
                  </div>
                  {watch('crane_available') && (
                    <div>
                      <Label>Crane Capacity (kg)</Label>
                      <Input type="number" {...register('crane_capacity')} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="power" className="space-y-4 mt-4">
                <h3 className="font-semibold text-sm">Power Availability</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Voltage (V)</Label>
                    <Input type="number" {...register('voltage')} />
                  </div>
                  <div>
                    <Label>Phases</Label>
                    <Select value={watch('power_phases') || ''} onValueChange={(v) => setValue('power_phases', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Phase</SelectItem>
                        <SelectItem value="three">Three Phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={watch('frequency') || ''} onValueChange={(v) => setValue('frequency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50Hz">50 Hz</SelectItem>
                        <SelectItem value="60Hz">60 Hz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Available Load (kW)</Label>
                    <Input type="number" step="0.1" {...register('available_load')} />
                  </div>
                  <div>
                    <Label>Distance to Power (m)</Label>
                    <Input type="number" step="0.1" {...register('distance_to_power_source')} />
                  </div>
                </div>

                <h3 className="font-semibold text-sm mt-6">Environmental Conditions</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Temp Min (°C)</Label>
                    <Input type="number" step="0.1" {...register('temperature_min')} />
                  </div>
                  <div>
                    <Label>Temp Max (°C)</Label>
                    <Input type="number" step="0.1" {...register('temperature_max')} />
                  </div>
                  <div>
                    <Label>Dust Level</Label>
                    <Select value={watch('dust_level') || ''} onValueChange={(v) => setValue('dust_level', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clean_room">Clean Room</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Humidity Min (%)</Label>
                    <Input type="number" step="0.1" {...register('humidity_min')} />
                  </div>
                  <div>
                    <Label>Humidity Max (%)</Label>
                    <Input type="number" step="0.1" {...register('humidity_max')} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={watch('corrosive_environment') || false}
                      onCheckedChange={(v) => setValue('corrosive_environment', v)} />
                    <Label>Corrosive Environment</Label>
                  </div>
                </div>
                <div>
                  <Label>Hazardous Area Classification</Label>
                  <Input {...register('hazardous_area_classification')} />
                </div>
              </TabsContent>

              <TabsContent value="infra" className="space-y-4 mt-4">
                <h3 className="font-semibold text-sm">Existing Infrastructure</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: 'compressed_air_available' as const, label: 'Compressed Air' },
                    { field: 'water_supply_available' as const, label: 'Water Supply' },
                    { field: 'drainage_system' as const, label: 'Drainage System' },
                    { field: 'hvac_system' as const, label: 'HVAC System' },
                    { field: 'fire_protection' as const, label: 'Fire Protection' },
                  ].map(({ field, label }) => (
                    <div key={field} className="flex items-center gap-2">
                      <Switch checked={watch(field) || false}
                        onCheckedChange={(v) => setValue(field, v)} />
                      <Label>{label}</Label>
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold text-sm mt-6">Special Requirements</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Special Customer Requirements</Label>
                    <Textarea {...register('special_requirements')} rows={2} />
                  </div>
                  <div>
                    <Label>Safety Considerations</Label>
                    <Textarea {...register('safety_considerations')} rows={2} />
                  </div>
                  <div>
                    <Label>Installation Constraints</Label>
                    <Textarea {...register('installation_constraints')} rows={2} />
                  </div>
                  <div>
                    <Label>Existing Equipment Interface</Label>
                    <Textarea {...register('existing_equipment_interface')} rows={2} />
                  </div>
                  <div>
                    <Label>Compliance Requirements (ISO, OSHA, etc.)</Label>
                    <Textarea {...register('compliance_requirements')} rows={2} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="report" className="space-y-4 mt-4">
                <div>
                  <Label>Executive Summary</Label>
                  <Textarea {...register('executive_summary')} rows={3} />
                </div>
                <div>
                  <Label>Detailed Findings</Label>
                  <Textarea {...register('detailed_findings')} rows={4} />
                </div>
                <div>
                  <Label>Recommendations</Label>
                  <Textarea {...register('recommendations')} rows={3} />
                </div>
                <div>
                  <Label>Challenges Identified</Label>
                  <Textarea {...register('challenges_identified')} rows={3} />
                </div>
                <div>
                  <Label>Proposed Solutions</Label>
                  <Textarea {...register('proposed_solutions')} rows={3} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {survey ? 'Update' : 'Create'} Survey
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
