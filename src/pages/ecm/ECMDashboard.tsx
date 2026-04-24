import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, FolderOpen, Mail, Clock, AlertTriangle, CheckCircle2,
  Upload, Search, BarChart3, TrendingUp, Users, Shield
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0066cc', '#1a7a4a', '#e8a000', '#cc0000', '#6b7280', '#8b5cf6'];

export default function ECMDashboard() {
  const navigate = useNavigate();

  const { data: docStats } = useQuery({
    queryKey: ['ecm-doc-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_documents').select('status, document_type, department');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: corrStats } = useQuery({
    queryKey: ['ecm-corr-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ecm_correspondences').select('status, correspondence_type, priority');
      if (error) throw error;
      return data || [];
    },
  });

  const totalDocs = docStats?.length || 0;
  const activeDocs = docStats?.filter(d => d.status === 'active').length || 0;
  const expiringDocs = docStats?.filter(d => d.status === 'expiring_soon').length || 0;
  const expiredDocs = docStats?.filter(d => d.status === 'expired').length || 0;

  const totalCorr = corrStats?.length || 0;
  const incomingCorr = corrStats?.filter(c => c.correspondence_type === 'incoming').length || 0;
  const outgoingCorr = corrStats?.filter(c => c.correspondence_type === 'outgoing').length || 0;
  const pendingCorr = corrStats?.filter(c => ['received', 'assigned', 'in_progress'].includes(c.status || '')).length || 0;

  const docsByType = Object.entries(
    (docStats || []).reduce((acc: Record<string, number>, d) => {
      acc[d.document_type || 'general'] = (acc[d.document_type || 'general'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const corrByStatus = Object.entries(
    (corrStats || []).reduce((acc: Record<string, number>, c) => {
      acc[c.status || 'unknown'] = (acc[c.status || 'unknown'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value }));

  const kpis = [
    { label: 'Total Documents', value: totalDocs, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Documents', value: activeDocs, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Expiring Soon', value: expiringDocs, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Correspondence', value: totalCorr, icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Actions', value: pendingCorr, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Expired Documents', value: expiredDocs, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enterprise Content Management</h1>
          <p className="text-muted-foreground text-sm">Document Management & Correspondence System</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/ecm/search')}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
          <Button onClick={() => navigate('/ecm/repository')}>
            <Upload className="h-4 w-4 mr-2" /> Upload Document
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Document Repository', icon: FolderOpen, href: '/ecm/repository', color: 'bg-blue-500' },
          { label: 'Incoming Mail', icon: Mail, href: '/ecm/correspondence/incoming', color: 'bg-green-500' },
          { label: 'Outgoing Mail', icon: Mail, href: '/ecm/correspondence/outgoing', color: 'bg-purple-500' },
          { label: 'Audit Trail', icon: Shield, href: '/ecm/audit', color: 'bg-orange-500' },
        ].map((action) => (
          <Card key={action.label} className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => navigate(action.href)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-3 rounded-lg ${action.color} text-white`}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="font-medium text-sm">{action.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Documents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {docsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={docsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0066cc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No documents yet</p>
                  <Button variant="link" size="sm" onClick={() => navigate('/ecm/repository')}>
                    Upload your first document
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Correspondence by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {corrByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={corrByStatus} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {corrByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No correspondence yet</p>
                  <Button variant="link" size="sm" onClick={() => navigate('/ecm/correspondence/incoming')}>
                    Register first correspondence
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
