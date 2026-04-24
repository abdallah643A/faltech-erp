import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Star, Search, Send, Plus, Award, TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { useSupplierMetrics, useSupplierReviews, useSupplierRFQs, useRFQResponses } from '@/hooks/useSupplierRating';
import { SupplierScorecard } from '@/components/procurement/SupplierScorecard';
import { useBusinessPartners } from '@/hooks/useBusinessPartners';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { useLanguage } from '@/contexts/LanguageContext';

const formatSAR = (n: number) => new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
    ))}
    <span className="ml-1 text-xs font-medium">{rating.toFixed(1)}</span>
  </div>
);

const getRatingColor = (r: number) => r >= 4 ? 'text-green-600' : r >= 3 ? 'text-yellow-600' : 'text-red-600';
const getRecBadge = (r: string) => {
  const m: Record<string, string> = { excellent: 'bg-green-100 text-green-700', good: 'bg-blue-100 text-blue-700', acceptable: 'bg-yellow-100 text-yellow-700', do_not_use: 'bg-red-100 text-red-700' };
  return m[r] || 'bg-muted text-muted-foreground';
};

export default function SupplierComparison() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { vendors, isLoading } = useSupplierMetrics();
  const { reviews } = useSupplierReviews();
  const { rfqs, createRFQ } = useSupplierRFQs();
  const { businessPartners } = useBusinessPartners();
  const [activeTab, setActiveTab] = useState('comparison');
  const [sortBy, setSortBy] = useState('overall_rating');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({ supplier_id: '', reviewer_name: '', po_reference: '', on_time: true, quality_rating: 4, communication_rating: 4, price_rating: 'fair', issues: '', strengths: '', recommendation: 'good' });
  const [rfqForm, setRFQForm] = useState({ product_name: '', quantity: 0, unit: 'units', required_by: '', notes: '', selectedSuppliers: [] as string[] });
  const { createReview } = useSupplierReviews();
  const [selectedRFQ, setSelectedRFQ] = useState<string | null>(null);
  const { responses } = useRFQResponses(selectedRFQ || undefined);

  const filteredVendors = vendors
    .filter(v => v.card_name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.card_code?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'overall_rating') return (b.overall_rating || 0) - (a.overall_rating || 0);
      if (sortBy === 'total_purchase_value') return (b.total_purchase_value || 0) - (a.total_purchase_value || 0);
      if (sortBy === 'on_time_delivery_rate') return (b.on_time_delivery_rate || 0) - (a.on_time_delivery_rate || 0);
      if (sortBy === 'quality_score') return (b.quality_score || 0) - (a.quality_score || 0);
      return 0;
    });

  const supplierReviews = selectedSupplier ? reviews.filter((r: any) => r.supplier_id === selectedSupplier.id) : [];

  // Charts
  const topSuppliers = filteredVendors.slice(0, 10);
  const chartData = topSuppliers.map(v => ({ name: v.card_name?.substring(0, 15), rating: v.overall_rating || 0, purchases: v.total_purchase_value || 0 }));

  // Diversity metrics
  const totalPurchases = vendors.reduce((s, v) => s + (v.total_purchase_value || 0), 0);
  const topSupplierShare = totalPurchases > 0 && vendors.length > 0 ? ((vendors[0]?.total_purchase_value || 0) / totalPurchases) * 100 : 0;

  const handleSaveReview = () => {
  const { t } = useLanguage();

    createReview.mutate({ ...reviewForm, review_date: new Date().toISOString().split('T')[0] });
    setShowReviewDialog(false);
  };

  const handleCreateRFQ = () => {
    createRFQ.mutate({ product_name: rfqForm.product_name, quantity: rfqForm.quantity, unit: rfqForm.unit, required_by: rfqForm.required_by || null, notes: rfqForm.notes, status: 'sent' }, {
      onSuccess: (result: any) => {
        // Would create responses for selected suppliers
        setShowRFQDialog(false);
        setRFQForm({ product_name: '', quantity: 0, unit: 'units', required_by: '', notes: '', selectedSuppliers: [] });
      }
    });
  };

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/procurement')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Supplier Rating & Comparison</h1>
            <p className="text-xs text-muted-foreground">Performance tracking, RFQs, rankings & diversity analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowRFQDialog(true)}>
            <Send className="h-3.5 w-3.5 mr-1" /> Request Quotes
          </Button>
          <Button size="sm" onClick={() => { setReviewForm({ ...reviewForm, supplier_id: '' }); setShowReviewDialog(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Review
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Suppliers</p>
          <p className="text-lg font-bold">{vendors.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Avg Rating</p>
          <p className="text-lg font-bold">{vendors.length > 0 ? (vendors.reduce((s, v) => s + (v.overall_rating || 0), 0) / vendors.length).toFixed(1) : '0'}/5</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Total Purchases</p>
          <p className="text-lg font-bold">{formatSAR(totalPurchases)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Concentration Risk</p>
          <div className="flex items-center gap-1">
            <p className={`text-lg font-bold ${topSupplierShare > 60 ? 'text-red-600' : topSupplierShare > 40 ? 'text-yellow-600' : 'text-green-600'}`}>{topSupplierShare.toFixed(0)}%</p>
            {topSupplierShare > 60 && <Badge variant="destructive" className="text-[10px]">High</Badge>}
          </div>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="comparison" className="text-xs flex-shrink-0"><BarChart3 className="h-3 w-3 mr-1" /> Comparison</TabsTrigger>
          <TabsTrigger value="scorecard" className="text-xs flex-shrink-0"><Star className="h-3 w-3 mr-1" /> Scorecard</TabsTrigger>
          <TabsTrigger value="rankings" className="text-xs flex-shrink-0"><Award className="h-3 w-3 mr-1" /> Rankings</TabsTrigger>
          <TabsTrigger value="rfqs" className="text-xs flex-shrink-0"><Send className="h-3 w-3 mr-1" /> RFQs</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs flex-shrink-0"><Star className="h-3 w-3 mr-1" /> Reviews</TabsTrigger>
        </TabsList>

        {/* COMPARISON TAB */}
        <TabsContent value="comparison" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overall_rating">Best Rating</SelectItem>
                <SelectItem value="total_purchase_value">Highest Purchases</SelectItem>
                <SelectItem value="on_time_delivery_rate">Best On-Time</SelectItem>
                <SelectItem value="quality_score">Highest Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <TableSkeleton /> : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Rank</TableHead>
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs text-right">Rating</TableHead>
                    <TableHead className="text-xs text-right">On-Time %</TableHead>
                    <TableHead className="text-xs text-right">Quality</TableHead>
                    <TableHead className="text-xs text-right">Lead Time</TableHead>
                    <TableHead className="text-xs text-right">Total Purchases</TableHead>
                    <TableHead className="text-xs text-right">Orders</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((v, i) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSupplier(v)}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{v.card_name}</div>
                        <div className="text-[10px] text-muted-foreground">{v.card_code}</div>
                      </TableCell>
                      <TableCell className="text-right"><StarRating rating={v.overall_rating || 0} /></TableCell>
                      <TableCell className={`text-xs text-right font-medium ${(v.on_time_delivery_rate || 0) >= 90 ? 'text-green-600' : (v.on_time_delivery_rate || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{(v.on_time_delivery_rate || 0).toFixed(0)}%</TableCell>
                      <TableCell className="text-xs text-right">{(v.quality_score || 0).toFixed(0)}/100</TableCell>
                      <TableCell className="text-xs text-right">{(v.average_lead_time_days || 0).toFixed(0)} days</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatSAR(v.total_purchase_value || 0)}</TableCell>
                      <TableCell className="text-xs text-right">{v.total_purchase_count || 0}</TableCell>
                    </TableRow>
                  ))}
                  {filteredVendors.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No suppliers found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Supplier Ratings Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? 'hsl(var(--primary))' : i < 3 ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--muted-foreground) / 0.3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SCORECARD TAB */}
        <TabsContent value="scorecard" className="space-y-4">
          {selectedSupplier ? (
            <SupplierScorecard supplier={selectedSupplier} reviews={supplierReviews} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">Click a supplier from the Comparison tab to view their scorecard</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setActiveTab('comparison')}>
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Go to Comparison
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* RANKINGS TAB */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="grid gap-4">
            {/* Top Performers */}
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Top Performers</CardTitle></CardHeader>
              <CardContent>
                {filteredVendors.filter(v => (v.overall_rating || 0) >= 4).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No top performers yet. Add reviews to calculate ratings.</p>
                ) : filteredVendors.filter(v => (v.overall_rating || 0) >= 4).slice(0, 5).map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 text-[10px]">#{i + 1}</Badge>
                      <div><p className="text-xs font-medium">{v.card_name}</p><p className="text-[10px] text-muted-foreground">{v.industry || 'General'}</p></div>
                    </div>
                    <StarRating rating={v.overall_rating || 0} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Low Performers */}
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /> Needs Improvement</CardTitle></CardHeader>
              <CardContent>
                {filteredVendors.filter(v => (v.overall_rating || 0) > 0 && (v.overall_rating || 0) < 3.5).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No low-rated suppliers.</p>
                ) : filteredVendors.filter(v => (v.overall_rating || 0) > 0 && (v.overall_rating || 0) < 3.5).map(v => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div><p className="text-xs font-medium">{v.card_name}</p><p className="text-[10px] text-muted-foreground">On-time: {(v.on_time_delivery_rate || 0).toFixed(0)}%</p></div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={v.overall_rating || 0} />
                      <Badge variant="destructive" className="text-[10px]">Review</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Diversity Alert */}
            {topSupplierShare > 60 && (
              <Card className="border-destructive/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive" className="text-[10px] mt-0.5">⚠️ Risk</Badge>
                    <div>
                      <p className="text-xs font-medium">{topSupplierShare.toFixed(0)}% of purchases from {vendors[0]?.card_name}</p>
                      <p className="text-[10px] text-muted-foreground">Recommendation: Diversify to reduce supply chain risk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* RFQs TAB */}
        <TabsContent value="rfqs" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">RFQ #</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-right">Qty</TableHead>
                  <TableHead className="text-xs">Required By</TableHead>
                  <TableHead className="text-xs">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqs.map((rfq: any) => (
                  <TableRow key={rfq.id} className="cursor-pointer" onClick={() => setSelectedRFQ(rfq.id)}>
                    <TableCell className="text-xs font-medium">{rfq.rfq_number}</TableCell>
                    <TableCell className="text-xs">{rfq.product_name}</TableCell>
                    <TableCell className="text-xs text-right">{rfq.quantity} {rfq.unit}</TableCell>
                    <TableCell className="text-xs">{rfq.required_by ? format(new Date(rfq.required_by), 'MMM dd, yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={rfq.status === 'awarded' ? 'default' : 'secondary'} className="text-[10px]">{rfq.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {rfqs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">No RFQs yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>

          {selectedRFQ && responses.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">RFQ Responses</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Supplier</TableHead>
                      <TableHead className="text-xs text-right">Price</TableHead>
                      <TableHead className="text-xs text-right">Lead Time</TableHead>
                      <TableHead className="text-xs">Response Date</TableHead>
                      <TableHead className="text-xs">{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.supplier_name}</TableCell>
                        <TableCell className="text-xs text-right">{r.quoted_price ? formatSAR(r.quoted_price) : '-'}</TableCell>
                        <TableCell className="text-xs text-right">{r.lead_time_days ? `${r.lead_time_days} days` : '-'}</TableCell>
                        <TableCell className="text-xs">{r.response_date ? format(new Date(r.response_date), 'MMM dd') : 'Pending'}</TableCell>
                        <TableCell><Badge variant={r.status === 'awarded' ? 'default' : 'secondary'} className="text-[10px]">{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('common.date')}</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs">Reviewer</TableHead>
                  <TableHead className="text-xs text-right">Quality</TableHead>
                  <TableHead className="text-xs text-right">Communication</TableHead>
                  <TableHead className="text-xs">Price</TableHead>
                  <TableHead className="text-xs">On-Time</TableHead>
                  <TableHead className="text-xs">Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r: any) => {
                  const supplier = vendors.find(v => v.id === r.supplier_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.review_date ? format(new Date(r.review_date), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell className="text-xs font-medium">{supplier?.card_name || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">{r.reviewer_name}</TableCell>
                      <TableCell className="text-xs text-right"><StarRating rating={r.quality_rating || 0} /></TableCell>
                      <TableCell className="text-xs text-right"><StarRating rating={r.communication_rating || 0} /></TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{r.price_rating}</Badge></TableCell>
                      <TableCell className="text-xs">{r.on_time ? '✅' : '❌'}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${getRecBadge(r.recommendation)}`}>{r.recommendation}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {reviews.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No reviews yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Detail Side Panel */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{selectedSupplier.card_name} - Performance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Overall Rating</p><StarRating rating={selectedSupplier.overall_rating || 0} /></CardContent></Card>
                <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">On-Time Delivery</p><p className="text-sm font-bold">{(selectedSupplier.on_time_delivery_rate || 0).toFixed(0)}%</p></CardContent></Card>
                <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Quality Score</p><p className="text-sm font-bold">{(selectedSupplier.quality_score || 0).toFixed(0)}/100</p></CardContent></Card>
                <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Total Purchases</p><p className="text-sm font-bold">{formatSAR(selectedSupplier.total_purchase_value || 0)}</p><p className="text-[10px] text-muted-foreground">{selectedSupplier.total_purchase_count || 0} orders</p></CardContent></Card>
              </div>
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Recent Reviews</CardTitle></CardHeader>
                <CardContent>
                  {supplierReviews.length === 0 ? <p className="text-xs text-muted-foreground">No reviews yet</p> : supplierReviews.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="py-2 border-b last:border-0">
                      <div className="flex justify-between"><p className="text-xs font-medium">{r.reviewer_name}</p><p className="text-[10px] text-muted-foreground">{r.review_date}</p></div>
                      <div className="flex gap-2 mt-1"><StarRating rating={r.overall_rating || 0} /><Badge className={`text-[10px] ${getRecBadge(r.recommendation)}`}>{r.recommendation}</Badge></div>
                      {r.issues && <p className="text-[10px] text-red-600 mt-1">Issues: {r.issues}</p>}
                      {r.strengths && <p className="text-[10px] text-green-600 mt-1">Strengths: {r.strengths}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Button size="sm" className="w-full" onClick={() => { setReviewForm({ ...reviewForm, supplier_id: selectedSupplier.id }); setShowReviewDialog(true); setSelectedSupplier(null); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Review for {selectedSupplier.card_name}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Add Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Select value={reviewForm.supplier_id} onValueChange={v => setReviewForm({ ...reviewForm, supplier_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.card_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Reviewer Name</Label><Input className="h-9" value={reviewForm.reviewer_name} onChange={e => setReviewForm({ ...reviewForm, reviewer_name: e.target.value })} /></div>
            <div><Label className="text-xs">PO/Shipment Reference</Label><Input className="h-9" value={reviewForm.po_reference} onChange={e => setReviewForm({ ...reviewForm, po_reference: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={reviewForm.on_time} onCheckedChange={c => setReviewForm({ ...reviewForm, on_time: !!c })} /><Label className="text-xs">Delivered on time</Label></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Quality (1-5)</Label><Select value={String(reviewForm.quality_rating)} onValueChange={v => setReviewForm({ ...reviewForm, quality_rating: +v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Communication (1-5)</Label><Select value={String(reviewForm.communication_rating)} onValueChange={v => setReviewForm({ ...reviewForm, communication_rating: +v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-xs">Price Competitiveness</Label><Select value={reviewForm.price_rating} onValueChange={v => setReviewForm({ ...reviewForm, price_rating: v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="competitive">Competitive</SelectItem><SelectItem value="fair">Fair</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Recommendation</Label><Select value={reviewForm.recommendation} onValueChange={v => setReviewForm({ ...reviewForm, recommendation: v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excellent">Excellent</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="acceptable">Acceptable</SelectItem><SelectItem value="do_not_use">Do Not Use</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Issues</Label><Textarea className="min-h-[60px] text-xs" value={reviewForm.issues} onChange={e => setReviewForm({ ...reviewForm, issues: e.target.value })} /></div>
            <div><Label className="text-xs">Strengths</Label><Textarea className="min-h-[60px] text-xs" value={reviewForm.strengths} onChange={e => setReviewForm({ ...reviewForm, strengths: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowReviewDialog(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleSaveReview} disabled={!reviewForm.supplier_id || !reviewForm.reviewer_name || createReview.isPending}>
              {createReview.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFQ Dialog */}
      <Dialog open={showRFQDialog} onOpenChange={setShowRFQDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">Request for Quotation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Product Name</Label><Input className="h-9" value={rfqForm.product_name} onChange={e => setRFQForm({ ...rfqForm, product_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Quantity</Label><Input type="number" className="h-9" value={rfqForm.quantity} onChange={e => setRFQForm({ ...rfqForm, quantity: +e.target.value })} /></div>
              <div><Label className="text-xs">Unit</Label><Input className="h-9" value={rfqForm.unit} onChange={e => setRFQForm({ ...rfqForm, unit: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Required By</Label><Input type="date" className="h-9" value={rfqForm.required_by} onChange={e => setRFQForm({ ...rfqForm, required_by: e.target.value })} /></div>
            <div><Label className="text-xs">{t('common.notes')}</Label><Textarea className="min-h-[60px] text-xs" value={rfqForm.notes} onChange={e => setRFQForm({ ...rfqForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRFQDialog(false)}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={handleCreateRFQ} disabled={!rfqForm.product_name || createRFQ.isPending}>
              {createRFQ.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Send RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
