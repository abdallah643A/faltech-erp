import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, DollarSign, Image, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PortalProjectDetail({ portal }: { portal: any }) {
  const { t } = useLanguage();
  const { slug, projectId } = useParams();
  const navigate = useNavigate();
  const pc = portal.primary_color || '#1e40af';

  const { data: project } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: async () => {
      const { data } = await supabase.from('cpms_projects').select('*').eq('id', projectId!).single();
      return data;
    },
    enabled: !!projectId,
  });

  // Milestones / payment schedule
  const { data: milestones = [] } = useQuery({
    queryKey: ['portal-milestones', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('cpms_payment_milestones')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order');
      return data || [];
    },
    enabled: !!projectId,
  });

  // Photos
  const { data: photos = [] } = useQuery({
    queryKey: ['portal-photos', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('cpms_site_photos')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Shared documents
  const { data: docs = [] } = useQuery({
    queryKey: ['portal-shared-docs', portal.id, projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('portal_shared_documents')
        .select('*')
        .eq('portal_id', portal.id)
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!projectId && portal.show_documents !== false,
  });

  if (!project) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/portal/${slug}/projects`)} className="text-gray-500">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
      </Button>

      {/* Header */}
      <div className="rounded-xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${pc}, ${pc}cc)` }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm">{project.project_number}</p>
            <h2 className="text-2xl font-bold mt-1">{project.name}</h2>
            {project.city && (
              <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {project.city}
              </p>
            )}
          </div>
          <Badge className="bg-white/20 text-white border-0 text-sm">
            {(project.status || 'draft').replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Progress</p>
            <p className="text-2xl font-bold mt-1" style={{ color: pc }}>{project.percent_complete || 0}%</p>
            <Progress value={project.percent_complete || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Contract Value</p>
            <p className="text-2xl font-bold mt-1">{Number(project.contract_value || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">SAR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Start Date</p>
            <p className="text-lg font-bold mt-1">
              {project.start_date ? format(new Date(project.start_date), 'MMM dd, yyyy') : 'TBD'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-gray-500">Target Completion</p>
            <p className="text-lg font-bold mt-1">
              {project.end_date ? format(new Date(project.end_date), 'MMM dd, yyyy') : 'TBD'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Timeline */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: pc }} /> Project Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((m: any, idx: number) => (
                <div key={m.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      m.status === 'completed' ? 'bg-emerald-500' :
                      m.status === 'invoiced' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < milestones.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{m.description}</p>
                      <Badge variant="outline" className="text-xs">
                        {m.percentage}% · {Number(m.amount || 0).toLocaleString()} SAR
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {m.target_date ? format(new Date(m.target_date), 'MMM dd, yyyy') : 'No date set'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" style={{ color: pc }} /> Site Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo: any) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity">
                  <img src={photo.photo_url} alt={photo.caption || 'Site photo'} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared Documents */}
      {portal.show_documents !== false && docs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: pc }} /> Project Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docs.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: `${pc}10` }}>
                      <FileText className="h-4 w-4" style={{ color: pc }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.document_name}</p>
                      <p className="text-xs text-gray-500">{doc.category} · {format(new Date(doc.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  {doc.document_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.document_url} target="_blank" rel="noopener noreferrer">Download</a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
