import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSurveys, useSurveyPhotos, SiteSurvey } from '@/hooks/useSiteSurveys';
import { SurveyFormDialog } from '@/components/technical/SurveyFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ClipboardCheck, Plus, Search, MoreHorizontal, Eye, Edit, CheckCircle,
  MapPin, Calendar, Clock, Zap, ThermometerSun, AlertTriangle, X, Upload, Paperclip,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Scheduled', variant: 'outline' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const surveyTypeLabels: Record<string, string> = {
  initial_assessment: 'Initial Assessment',
  detailed_survey: 'Detailed Survey',
  re_survey: 'Re-survey',
};

export default function TechnicalAssessment() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { surveys, isLoading, createSurvey, updateSurvey, completeSurvey, approveSurvey } = useSiteSurveys();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<SiteSurvey | null>(null);
  const [detailsSurvey, setDetailsSurvey] = useState<SiteSurvey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [alertSalesOrderId, setAlertSalesOrderId] = useState<string | null>(null);
  const [alertProjectId, setAlertProjectId] = useState<string | null>(null);
  const [alertCustomerName, setAlertCustomerName] = useState<string | null>(null);

  // Fetch technical assessment alerts
  const { data: techAlerts } = useQuery({
    queryKey: ['technical-assessment-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_alerts')
        .select(`
          *,
          sales_order:sales_orders(doc_num, customer_name, contract_number, contract_value, total)
        `)
        .eq('alert_type', 'technical_assessment')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('finance_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-assessment-alerts'] });
      toast({ title: 'Alert resolved' });
    },
  });

  // Complete Technical Assessment - transition to Design & Costing
  const completeAssessment = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.rpc('complete_technical_assessment', {
        p_project_id: projectId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-surveys'] });
      queryClient.invalidateQueries({ queryKey: ['technical-assessment-alerts'] });
      toast({ title: 'Technical Assessment completed', description: 'Project advanced to Design & Costing phase' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error completing assessment', description: error.message, variant: 'destructive' });
    },
  });

  const filteredSurveys = (surveys || []).filter(s => {
    const matchesSearch = !searchTerm || 
      s.site_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || s.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: surveys?.length || 0,
    scheduled: surveys?.filter(s => s.status === 'scheduled').length || 0,
    inProgress: surveys?.filter(s => s.status === 'in_progress').length || 0,
    completed: surveys?.filter(s => s.status === 'completed').length || 0,
  };

  const handleSubmit = async (data: Partial<SiteSurvey>) => {
    const attachments: File[] = (data as any)._attachments || [];
    delete (data as any)._attachments;

    if (selectedSurvey) {
      updateSurvey.mutate({ id: selectedSurvey.id, ...data }, {
        onSuccess: async (updatedSurvey: any) => {
          if (attachments.length > 0) {
            const surveyId = updatedSurvey?.id || selectedSurvey.id;
            for (const file of attachments) {
              await uploadPhotoForSurvey(surveyId, file);
            }
            queryClient.invalidateQueries({ queryKey: ['survey-photos'] });
          }
        },
      });
    } else {
      const surveyData = {
        ...data,
        ...(alertSalesOrderId && { sales_order_id: alertSalesOrderId }),
        ...(alertProjectId && { project_id: alertProjectId }),
      };
      createSurvey.mutate(surveyData, {
        onSuccess: async (createdSurvey: any) => {
          if (alertSalesOrderId) {
            const matchingAlert = techAlerts?.find(a => a.sales_order_id === alertSalesOrderId);
            if (matchingAlert) {
              resolveAlert.mutate(matchingAlert.id);
            }
          }
          if (attachments.length > 0 && createdSurvey?.id) {
            for (const file of attachments) {
              await uploadPhotoForSurvey(createdSurvey.id, file);
            }
            queryClient.invalidateQueries({ queryKey: ['survey-photos'] });
          }
        },
      });
    }
    setFormOpen(false);
    setSelectedSurvey(null);
    setAlertSalesOrderId(null);
    setAlertProjectId(null);
    setAlertCustomerName(null);
  };

  const uploadPhotoForSurvey = async (surveyId: string, file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `surveys/${surveyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    await supabase.storage.from('project-documents').upload(fileName, file);
    const { data: urlData } = await supabase.storage.from('project-documents').createSignedUrl(fileName, 3600 * 24 * 365);
    await supabase.from('site_survey_photos').insert([{
      survey_id: surveyId,
      photo_type: 'attachment',
      file_url: urlData?.signedUrl || fileName,
      file_name: file.name,
      description: file.name,
      uploaded_by: user?.id,
    }]);
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Technical Assessment</h1>
          <p className="text-muted-foreground">
            Site surveys, specifications, and customer approvals
          </p>
        </div>
        <Button onClick={() => { setSelectedSurvey(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Site Survey
        </Button>
      </div>

      {/* Technical Assessment Alerts */}
      {techAlerts && techAlerts.length > 0 && (
        <div className="space-y-3">
          {techAlerts.map((alert) => (
            <Alert key={alert.id} variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 !text-amber-600" />
              <AlertTitle className="flex items-center justify-between">
                <span>{alert.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => resolveAlert.mutate(alert.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {alert.description}
                {alert.sales_order && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">SO-{alert.sales_order.doc_num}</Badge>
                    <span className="text-xs">{alert.sales_order.customer_name}</span>
                    {alert.sales_order.contract_value && (
                      <Badge variant="secondary" className="text-xs">
                        {alert.sales_order.contract_value.toLocaleString()} SAR
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      setAlertSalesOrderId(alert.sales_order_id);
                      setAlertProjectId(alert.project_id);
                      setAlertCustomerName(alert.sales_order?.customer_name || null);
                      setSelectedSurvey(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Site Survey
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ClipboardCheck className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Surveys</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.scheduled}</p><p className="text-xs text-muted-foreground">Scheduled</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{stats.inProgress}</p><p className="text-xs text-muted-foreground">In Progress</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search surveys..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Surveys Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Site Address</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Site Info</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading surveys...</TableCell></TableRow>
              ) : filteredSurveys.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No site surveys found</TableCell></TableRow>
              ) : (
                filteredSurveys.map((survey) => {
                  const statusCfg = statusConfig[survey.status] || statusConfig.scheduled;
                  return (
                    <TableRow key={survey.id} className="cursor-pointer" onClick={() => setDetailsSurvey(survey)}>
                      <TableCell><Badge variant="outline">{surveyTypeLabels[survey.survey_type] || survey.survey_type}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="max-w-[200px] truncate">{survey.site_address || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{survey.customer_contact_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{survey.customer_contact_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{survey.scheduled_date ? format(new Date(survey.scheduled_date), 'MMM dd, yyyy') : '—'}</TableCell>
                      <TableCell><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {survey.voltage && (<span className="flex items-center gap-0.5"><Zap className="h-3 w-3" />{survey.voltage}V</span>)}
                          {survey.temperature_max && (<span className="flex items-center gap-0.5"><ThermometerSun className="h-3 w-3" />{survey.temperature_max}°C</span>)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailsSurvey(survey); }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedSurvey(survey); setFormOpen(true); }}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            {survey.status !== 'completed' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); completeSurvey.mutate(survey.id); }}>
                                <CheckCircle className="h-4 w-4 mr-2" />Mark Complete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Survey Details Dialog */}
      {detailsSurvey && (
        <DetailDialog
          survey={detailsSurvey}
          open={!!detailsSurvey}
          onOpenChange={(open) => { if (!open) setDetailsSurvey(null); }}
          onApprove={() => { approveSurvey.mutate(detailsSurvey.id); setDetailsSurvey(null); }}
          onCompleteAssessment={(projectId) => {
            completeAssessment.mutate(projectId);
            setDetailsSurvey(null);
          }}
        />
      )}
      <SurveyFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) { setSelectedSurvey(null); setAlertSalesOrderId(null); setAlertProjectId(null); setAlertCustomerName(null); } }}
        survey={selectedSurvey}
        salesOrderId={alertSalesOrderId}
        projectId={alertProjectId}
        customerName={alertCustomerName}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function DetailDialog({ survey, open, onOpenChange, onApprove, onCompleteAssessment }: {
  survey: SiteSurvey; open: boolean; onOpenChange: (open: boolean) => void; onApprove: () => void;
  onCompleteAssessment: (projectId: string) => void;
}) {
  const statusCfg = statusConfig[survey.status] || statusConfig.scheduled;
  const { photos, isLoading: photosLoading, uploadPhoto } = useSurveyPhotos(survey.id);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadPhoto.mutateAsync({
        surveyId: survey.id,
        file,
        photoType: 'attachment',
        description: file.name,
      });
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Site Survey Details
            <Badge variant={statusCfg.variant} className="ml-2">{statusCfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-6 p-1">
            {/* General Info */}
            <div>
              <h3 className="font-semibold text-sm mb-3">General Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Survey Type" value={surveyTypeLabels[survey.survey_type] || survey.survey_type} />
                <InfoRow label="Scheduled Date" value={survey.scheduled_date ? format(new Date(survey.scheduled_date), 'MMM dd, yyyy') : '—'} />
                <InfoRow label="Duration" value={survey.duration_estimate ? `${survey.duration_estimate} hours` : '—'} />
                <InfoRow label="Contact" value={survey.customer_contact_name || '—'} />
                <InfoRow label="Phone" value={survey.customer_contact_phone || '—'} />
                <InfoRow label="Address" value={survey.site_address || '—'} />
              </div>
            </div>

            <Separator />

            {/* Site Dimensions */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Site Dimensions</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoRow label="Length" value={survey.site_length ? `${survey.site_length}m` : '—'} />
                <InfoRow label="Width" value={survey.site_width ? `${survey.site_width}m` : '—'} />
                <InfoRow label="Height" value={survey.site_height ? `${survey.site_height}m` : '—'} />
                <InfoRow label="Ceiling" value={survey.ceiling_height ? `${survey.ceiling_height}m` : '—'} />
                <InfoRow label="Floor" value={survey.floor_type || '—'} />
                <InfoRow label="Load" value={survey.load_bearing_capacity ? `${survey.load_bearing_capacity} kg/m²` : '—'} />
              </div>
            </div>

            <Separator />

            {/* Power & Environmental */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Power & Environment</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <InfoRow label="Voltage" value={survey.voltage ? `${survey.voltage}V` : '—'} />
                <InfoRow label="Phases" value={survey.power_phases || '—'} />
                <InfoRow label="Frequency" value={survey.frequency || '—'} />
                <InfoRow label="Load" value={survey.available_load ? `${survey.available_load} kW` : '—'} />
                <InfoRow label="Temp Range" value={survey.temperature_min && survey.temperature_max ? `${survey.temperature_min}–${survey.temperature_max}°C` : '—'} />
                <InfoRow label="Dust Level" value={survey.dust_level || '—'} />
              </div>
            </div>

            <Separator />

            {/* Infrastructure */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Infrastructure</h3>
              <div className="flex flex-wrap gap-2">
                {survey.compressed_air_available && <Badge variant="outline">Compressed Air ✓</Badge>}
                {survey.water_supply_available && <Badge variant="outline">Water Supply ✓</Badge>}
                {survey.drainage_system && <Badge variant="outline">Drainage ✓</Badge>}
                {survey.hvac_system && <Badge variant="outline">HVAC ✓</Badge>}
                {survey.fire_protection && <Badge variant="outline">Fire Protection ✓</Badge>}
                {survey.loading_dock && <Badge variant="outline">Loading Dock ✓</Badge>}
                {survey.crane_available && <Badge variant="outline">Crane ({survey.crane_capacity || '?'} kg)</Badge>}
              </div>
            </div>

            {/* Report */}
            {(survey.executive_summary || survey.recommendations) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm mb-3">Survey Report</h3>
                  {survey.executive_summary && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                      <p className="text-sm">{survey.executive_summary}</p>
                    </div>
                  )}
                  {survey.recommendations && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
                      <p className="text-sm">{survey.recommendations}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Attachments Section */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({photos?.length || 0})
                </h3>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploading ? 'Uploading...' : 'Upload'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              {photosLoading ? (
                <p className="text-sm text-muted-foreground">Loading attachments...</p>
              ) : photos && photos.length > 0 ? (
                <div className="space-y-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{photo.file_name || 'Attachment'}</p>
                          <p className="text-xs text-muted-foreground">{photo.description}</p>
                        </div>
                      </div>
                      <a href={photo.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments yet</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {survey.status === 'completed' && !survey.approved_at && (
            <Button onClick={onApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Survey
            </Button>
          )}
          {survey.status === 'completed' && survey.approved_at && survey.project_id && (
            <Button onClick={() => onCompleteAssessment(survey.project_id!)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Assessment & Advance to Design
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
