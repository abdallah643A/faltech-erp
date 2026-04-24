import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBidManagement, Bid } from '@/hooks/useBidManagement';
import { Plus, Search, FileText, TrendingUp, DollarSign, Target, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { ModuleHelpDrawer } from '@/components/shared/ModuleHelpDrawer';
import { getModuleById } from '@/data/helpContent';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import BidPipelineKanban from '@/components/bids/BidPipelineKanban';
import BidCostEstimation from '@/components/bids/BidCostEstimation';
import BidAnalytics from '@/components/bids/BidAnalytics';
import BidMaterialPrices from '@/components/bids/BidMaterialPrices';
import BidLaborRates from '@/components/bids/BidLaborRates';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  qualifying: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  under_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  no_bid: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function BidDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { bids, createBid, updateBid, deleteBid, bidStats } = useBidManagement();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);

  const stats = bidStats();

  const filteredBids = (bids.data || []).filter(b => {
    const matchesSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.bid_number.toLowerCase().includes(search.toLowerCase()) ||
      (b.client_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDeadlineColor = (dueDate: string | null) => {
    if (!dueDate) return '';
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return 'text-red-600 font-bold';
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    return 'text-green-600';
  };

  const handleCreateBid = async (formData: FormData) => {
    const bidNum = `BID-${Date.now().toString().slice(-6)}`;
    await createBid.mutateAsync({
      bid_number: bidNum,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      client_name: formData.get('client_name') as string,
      due_date: (formData.get('due_date') as string) || null,
      project_type: (formData.get('project_type') as string) || null,
      bid_type: (formData.get('bid_type') as string) || 'competitive',
      priority: (formData.get('priority') as string) || 'medium',
      estimated_value: Number(formData.get('estimated_value')) || 0,
      created_by: user?.id,
    } as any);
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('bid.title')}</h1>
          <p className="text-muted-foreground">{t('bid.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(() => { const m = getModuleById('crm'); return m ? <ModuleHelpDrawer module={m} /> : null; })()}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t('bid.createBid')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{t('bid.createBid')}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateBid(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input name="title" required placeholder="Bid title" />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input name="client_name" placeholder="Client organization" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input name="due_date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input name="estimated_value" type="number" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <select name="project_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select type</option>
                      <option value="commercial">Commercial</option>
                      <option value="residential">Residential</option>
                      <option value="industrial">Industrial</option>
                      <option value="infrastructure">Infrastructure</option>
                      <option value="government">Government</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <select name="priority" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" placeholder="Bid description" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={createBid.isPending}>Create Bid</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Bids</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalBids}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeBids}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Pipeline Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">{(stats.pipelineValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Won Value</span>
            </div>
            <p className="text-2xl font-bold mt-1">{(stats.wonValue / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Avg Margin</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avgMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="register">Bid Register</TabsTrigger>
          <TabsTrigger value="estimation">Cost Estimation</TabsTrigger>
          <TabsTrigger value="materials">Material Prices</TabsTrigger>
          <TabsTrigger value="labor">Labor Rates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <BidPipelineKanban />
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bids..." className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="qualifying">Qualifying</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bid #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                    <TableHead className="text-right">Final Price</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBids.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bids found. Create your first bid to get started.</TableCell></TableRow>
                  ) : filteredBids.map((bid) => (
                    <TableRow key={bid.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBid(bid)}>
                      <TableCell className="font-mono text-xs">{bid.bid_number}</TableCell>
                      <TableCell className="font-medium">{bid.title}</TableCell>
                      <TableCell>{bid.client_name || '-'}</TableCell>
                      <TableCell><Badge className={statusColors[bid.status] || ''}>{bid.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={priorityColors[bid.priority] || ''}>{bid.priority}</Badge></TableCell>
                      <TableCell className={getDeadlineColor(bid.due_date)}>
                        {bid.due_date ? (
                          <div className="flex items-center gap-1">
                            {differenceInDays(new Date(bid.due_date), new Date()) < 3 && <AlertTriangle className="h-3 w-3" />}
                            {format(new Date(bid.due_date), 'dd MMM yyyy')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{bid.estimated_value?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{bid.final_price?.toLocaleString() || '-'}</TableCell>
                      <TableCell className="text-right">{bid.margin_percent ? `${bid.margin_percent.toFixed(1)}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimation">
          <BidCostEstimation selectedBid={selectedBid} onSelectBid={setSelectedBid} bids={bids.data || []} />
        </TabsContent>

        <TabsContent value="materials">
          <BidMaterialPrices />
        </TabsContent>

        <TabsContent value="labor">
          <BidLaborRates />
        </TabsContent>

        <TabsContent value="analytics">
          <BidAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
