import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useSAPSync } from '@/hooks/useSAPSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { SAPSyncButton } from '@/components/sap/SAPSyncButton';
import {
  ArrowLeft, DollarSign, Calendar, User, Building2, Target, TrendingUp,
  Activity, FileText, Shield, Clock, MapPin, Phone, Mail, BarChart3,
  ArrowUp, ArrowDown, Edit, Trash2, Plus
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { OpportunityScoreCard } from '@/components/opportunities/OpportunityScoreCard';

const stageOrder = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const stageColors: Record<string, string> = {
  'Discovery': 'bg-muted text-muted-foreground',
  'Qualification': 'bg-blue-500/10 text-blue-600',
  'Proposal': 'bg-amber-500/10 text-amber-600',
  'Negotiation': 'bg-primary/10 text-primary',
  'Closed Won': 'bg-green-500/10 text-green-600',
  'Closed Lost': 'bg-destructive/10 text-destructive',
};

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { sync: syncOpp } = useSAPSync();
  const { updateOpportunity, deleteOpportunity } = useOpportunities();

  // Fetch opportunity with related data
  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch linked activities
  const { data: activities = [] } = useQuery({
    queryKey: ['opportunity-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('opportunity_id', id!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch linked competitors
  const { data: competitors = [] } = useQuery({
    queryKey: ['opportunity-competitors', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunity_competitors')
        .select('*')
        .eq('opportunity_id', id!)
        .order('threat_level');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch linked quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ['opportunity-quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('opportunity_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch business partner details
  const { data: businessPartner } = useQuery({
    queryKey: ['opportunity-bp', opportunity?.business_partner_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_partners')
        .select('*')
        .eq('id', opportunity!.business_partner_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!opportunity?.business_partner_id,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency', currency: 'SAR', minimumFractionDigits: 0,
    }).format(value);

  const daysInPipeline = useMemo(() => {
    if (!opportunity) return 0;
    return differenceInDays(new Date(), parseISO(opportunity.created_at));
  }, [opportunity]);

  const daysToClose = useMemo(() => {
    if (!opportunity?.expected_close) return null;
    return differenceInDays(parseISO(opportunity.expected_close), new Date());
  }, [opportunity]);

  if (isLoading) {
    return (
      <div className="space-y-6 page-enter">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground mb-4">Opportunity not found</p>
        <Button onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Opportunities
        </Button>
      </div>
    );
  }

  const stageIndex = stageOrder.indexOf(opportunity.stage);
  const stageProgress = ((stageIndex + 1) / stageOrder.length) * 100;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/opportunities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground">{opportunity.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={stageColors[opportunity.stage]}>{opportunity.stage}</Badge>
              <span className="text-sm text-muted-foreground">
                {opportunity.company} • {daysInPipeline} days in pipeline
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate(`/activities?opportunityId=${opportunity.id}`)}>
            <Plus className="h-4 w-4 mr-1" /> Activity
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/quotes/new?opportunityId=${opportunity.id}&company=${encodeURIComponent(opportunity.company)}&value=${opportunity.value}`)}>
            <FileText className="h-4 w-4 mr-1" /> Quote
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncOpp('opportunity', 'to_sap', opportunity.id)}>
            <ArrowUp className="h-4 w-4 mr-1" /> Push SAP
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncOpp('opportunity', 'from_sap', opportunity.id)}>
            <ArrowDown className="h-4 w-4 mr-1" /> Pull SAP
          </Button>
        </div>
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            {stageOrder.map((stage, i) => (
              <div key={stage} className={`text-xs text-center flex-1 ${i <= stageIndex ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {stage}
              </div>
            ))}
          </div>
          <Progress value={stageProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Value</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(opportunity.value)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Weighted</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(opportunity.value * opportunity.probability / 100)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Probability</span>
            </div>
            <p className="text-lg font-bold mt-1">{opportunity.probability}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Days in Pipeline</span>
            </div>
            <p className="text-lg font-bold mt-1">{daysInPipeline}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Days to Close</span>
            </div>
            <p className="text-lg font-bold mt-1">{daysToClose !== null ? (daysToClose >= 0 ? daysToClose : `${Math.abs(daysToClose)} overdue`) : 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
              <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
              <TabsTrigger value="competitors">Competitors ({competitors.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Company', value: opportunity.company, icon: Building2 },
                      { label: 'Owner', value: opportunity.owner_name || 'Unassigned', icon: User },
                      { label: 'Industry', value: opportunity.industry || '-', icon: BarChart3 },
                      { label: 'Source', value: opportunity.source || '-', icon: Target },
                      { label: 'Territory', value: opportunity.territory?.toString() || '-', icon: MapPin },
                      { label: 'Contact Person', value: opportunity.contact_person || '-', icon: Phone },
                      { label: 'Interest Field', value: opportunity.interest_field || '-', icon: Activity },
                      { label: 'Closing Type', value: opportunity.closing_type || '-', icon: FileText },
                      { label: 'Start Date', value: opportunity.start_date ? format(parseISO(opportunity.start_date), 'MMM d, yyyy') : '-', icon: Calendar },
                      { label: 'Expected Close', value: opportunity.expected_close ? format(parseISO(opportunity.expected_close), 'MMM d, yyyy') : '-', icon: Calendar },
                      { label: 'Project Code', value: opportunity.project_code || '-', icon: FileText },
                      { label: 'SAP Doc Entry', value: opportunity.sap_doc_entry || '-', icon: Shield },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-medium">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(opportunity.notes || opportunity.remarks || opportunity.reason) && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        {opportunity.notes && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm">{opportunity.notes}</p>
                          </div>
                        )}
                        {opportunity.remarks && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                            <p className="text-sm">{opportunity.remarks}</p>
                          </div>
                        )}
                        {opportunity.reason && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Reason</p>
                            <p className="text-sm">{opportunity.reason}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/activities?opportunityId=${opportunity.id}`)}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No activities linked to this opportunity</p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((act: any) => (
                        <div key={act.id} className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${act.status === 'completed' ? 'bg-green-500' : act.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{act.subject}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{act.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(act.created_at), 'MMM d, yyyy HH:mm')}
                              {act.due_date && ` • Due: ${format(parseISO(act.due_date), 'MMM d')}`}
                            </p>
                            {act.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{act.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Linked Quotes</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/quotes/new?opportunityId=${opportunity.id}&company=${encodeURIComponent(opportunity.company)}&value=${opportunity.value}`)}>
                      <Plus className="h-4 w-4 mr-1" /> Create
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {quotes.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No quotes linked to this opportunity</p>
                  ) : (
                    <div className="space-y-3">
                      {quotes.map((q: any) => (
                        <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/quotes')}>
                          <div>
                            <p className="text-sm font-medium">Quote #{q.doc_num || q.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{q.customer_name} • {format(parseISO(q.created_at), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(q.total || 0)}</p>
                            <Badge variant="outline" className="text-xs">{q.status || 'draft'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competitors" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {competitors.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No competitors tracked for this opportunity</p>
                  ) : (
                    <div className="space-y-3">
                      {competitors.map((c: any) => (
                        <div key={c.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{c.competitor_name}</p>
                            <Badge variant={c.threat_level === 'high' ? 'destructive' : c.threat_level === 'medium' ? 'secondary' : 'outline'}>
                              {c.threat_level} threat
                            </Badge>
                          </div>
                          {c.pricing_position && <p className="text-xs text-muted-foreground">Pricing: {c.pricing_position}</p>}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {c.strengths && (
                              <div className="text-xs">
                                <span className="text-green-600 font-medium">Strengths:</span> {c.strengths}
                              </div>
                            )}
                            {c.weaknesses && (
                              <div className="text-xs">
                                <span className="text-red-600 font-medium">Weaknesses:</span> {c.weaknesses}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Score & Customer */}
        <div className="space-y-6">
          <OpportunityScoreCard
            opportunity={opportunity}
            activitiesCount={activities.length}
            competitorsCount={competitors.length}
            quotesCount={quotes.length}
            daysInPipeline={daysInPipeline}
          />

          {/* Customer Card */}
          {businessPartner && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{businessPartner.card_name}</p>
                  <p className="text-xs text-muted-foreground">{businessPartner.card_code}</p>
                  {businessPartner.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3 w-3" /> {businessPartner.phone}
                    </div>
                  )}
                  {businessPartner.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="h-3 w-3" /> {businessPartner.email}
                    </div>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => navigate(`/business-partners?id=${businessPartner.id}`)}>
                    View Customer 360
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(parseISO(opportunity.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(parseISO(opportunity.updated_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sync Status</span>
                <Badge variant="outline">{opportunity.sync_status || 'local'}</Badge>
              </div>
              {opportunity.max_local_total && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Local Total</span>
                  <span>{formatCurrency(opportunity.max_local_total)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
