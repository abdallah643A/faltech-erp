import { useState } from 'react';
import { useRestaurantCustomers, useRestaurantLoyalty } from '@/hooks/useRestaurantPhase2';
import { useRestaurantPromotions } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Users, Star, Gift, Tag, Crown, Heart, TrendingUp } from 'lucide-react';

const tierColors: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-800', silver: 'bg-gray-100 text-gray-800', gold: 'bg-yellow-100 text-yellow-800', platinum: 'bg-purple-100 text-purple-800',
};

export default function RestaurantLoyalty() {
  const { data: customers, create: createCustomer } = useRestaurantCustomers();
  const { accounts, transactions } = useRestaurantLoyalty();
  const { data: promotions, create: createPromo } = useRestaurantPromotions();
  const [search, setSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewPromo, setShowNewPromo] = useState(false);
  const [custForm, setCustForm] = useState({ customer_name: '', phone: '', email: '', loyalty_tier: 'bronze', birth_date: '', is_corporate: false, corporate_name: '' });
  const [promoForm, setPromoForm] = useState({ promotion_name: '', promotion_type: 'percentage', discount_value: '', min_order_amount: '', start_date: '', end_date: '', promo_code: '', is_active: true });

  const filteredCustomers = (customers || []).filter((c: any) => {
    const q = search.toLowerCase();
    return !q || c.customer_name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
  });

  const totalPoints = (accounts?.data || []).reduce((s: number, a: any) => s + Number(a.points_balance || 0), 0);
  const activePromos = (promotions || []).filter((p: any) => p.is_active).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6" /> Loyalty & CRM</h1>
          <p className="text-sm text-muted-foreground">Customer profiles, loyalty programs, and promotions</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: (customers || []).length, icon: Users, color: 'text-blue-600' },
          { label: 'Loyalty Points Outstanding', value: totalPoints.toLocaleString(), icon: Star, color: 'text-yellow-600' },
          { label: 'Active Promotions', value: activePromos, icon: Tag, color: 'text-green-600' },
          { label: 'Corporate Accounts', value: (customers || []).filter((c: any) => c.is_corporate).length, icon: Crown, color: 'text-purple-600' },
        ].map(k => (
          <Card key={k.label} className="border">
            <CardContent className="p-3">
              <k.icon className={`h-4 w-4 ${k.color} mb-1`} />
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers" className="gap-1"><Users className="h-3.5 w-3.5" /> Customers</TabsTrigger>
          <TabsTrigger value="promotions" className="gap-1"><Tag className="h-3.5 w-3.5" /> Promotions</TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1"><Star className="h-3.5 w-3.5" /> Loyalty Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={() => setShowNewCustomer(true)}><Plus className="h-4 w-4 mr-1" /> Customer</Button>
          </div>

          <Card className="border">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Customer</th>
                  <th className="text-left py-2 px-3">Phone</th>
                  <th className="text-left py-2 px-3">Tier</th>
                  <th className="text-right py-2 px-3">Points</th>
                  <th className="text-right py-2 px-3">Total Spend</th>
                  <th className="text-right py-2 px-3">Visits</th>
                  <th className="text-left py-2 px-3">Last Visit</th>
                  <th className="text-left py-2 px-3">Type</th>
                </tr></thead>
                <tbody>
                  {filteredCustomers.map((c: any) => (
                    <tr key={c.id} className="border-b hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{c.customer_name}</td>
                      <td className="py-2 px-3 text-xs">{c.phone || '-'}</td>
                      <td className="py-2 px-3"><Badge className={`${tierColors[c.loyalty_tier] || ''} text-xs capitalize`}>{c.loyalty_tier}</Badge></td>
                      <td className="py-2 px-3 text-right font-bold">{Number(c.points_balance || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">SAR {Number(c.total_spend || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{c.visit_count || 0}</td>
                      <td className="py-2 px-3 text-xs">{c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : '-'}</td>
                      <td className="py-2 px-3">{c.is_corporate ? <Badge variant="outline" className="text-[10px]">Corporate</Badge> : <Badge variant="secondary" className="text-[10px]">Retail</Badge>}</td>
                    </tr>
                  ))}
                  {!filteredCustomers.length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">No customers found</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-3 mt-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowNewPromo(true)}><Plus className="h-4 w-4 mr-1" /> Promotion</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(promotions || []).map((p: any) => (
              <Card key={p.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{p.promotion_name}</h3>
                    <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px]">{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Type: <span className="capitalize font-medium text-foreground">{p.promotion_type?.replace('_', ' ')}</span></p>
                    <p>Value: <span className="font-medium text-foreground">{p.promotion_type === 'percentage' ? `${p.discount_value}%` : `SAR ${p.discount_value}`}</span></p>
                    {p.promo_code && <p>Code: <span className="font-mono font-medium text-foreground">{p.promo_code}</span></p>}
                    {p.min_order_amount > 0 && <p>Min Order: SAR {Number(p.min_order_amount).toFixed(2)}</p>}
                    <p>{p.start_date} → {p.end_date || '∞'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-3">
          <Card className="border">
            <CardHeader><CardTitle className="text-sm">Recent Loyalty Transactions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Points</th>
                  <th className="text-left py-2 px-3">Description</th>
                </tr></thead>
                <tbody>
                  {(transactions?.data || []).slice(0, 50).map((t: any) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2 px-3 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="py-2 px-3"><Badge variant={t.transaction_type === 'earn' ? 'default' : 'secondary'} className="text-xs">{t.transaction_type}</Badge></td>
                      <td className="py-2 px-3 text-right font-bold">{t.transaction_type === 'earn' ? '+' : '-'}{Number(t.points || 0)}</td>
                      <td className="py-2 px-3 text-xs">{t.description || '-'}</td>
                    </tr>
                  ))}
                  {!(transactions?.data || []).length && <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No loyalty transactions yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={custForm.customer_name} onChange={e => setCustForm({ ...custForm, customer_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={custForm.phone} onChange={e => setCustForm({ ...custForm, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={custForm.email} onChange={e => setCustForm({ ...custForm, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tier</Label>
                <Select value={custForm.loyalty_tier} onValueChange={v => setCustForm({ ...custForm, loyalty_tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Birthday</Label><Input type="date" value={custForm.birth_date} onChange={e => setCustForm({ ...custForm, birth_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={custForm.is_corporate} onCheckedChange={v => setCustForm({ ...custForm, is_corporate: v })} /><Label>Corporate Customer</Label></div>
            {custForm.is_corporate && <div><Label>Company Name</Label><Input value={custForm.corporate_name} onChange={e => setCustForm({ ...custForm, corporate_name: e.target.value })} /></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
            <Button onClick={() => { createCustomer.mutate(custForm); setShowNewCustomer(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Promotion Dialog */}
      <Dialog open={showNewPromo} onOpenChange={setShowNewPromo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={promoForm.promotion_name} onChange={e => setPromoForm({ ...promoForm, promotion_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={promoForm.promotion_type} onValueChange={v => setPromoForm({ ...promoForm, promotion_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                    <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                    <SelectItem value="happy_hour">Happy Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: e.target.value })} placeholder={promoForm.promotion_type === 'percentage' ? '%' : 'SAR'} /></div>
            </div>
            <div><Label>Promo Code</Label><Input value={promoForm.promo_code} onChange={e => setPromoForm({ ...promoForm, promo_code: e.target.value })} placeholder="Optional" /></div>
            <div><Label>Min Order (SAR)</Label><Input type="number" value={promoForm.min_order_amount} onChange={e => setPromoForm({ ...promoForm, min_order_amount: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={promoForm.start_date} onChange={e => setPromoForm({ ...promoForm, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={promoForm.end_date} onChange={e => setPromoForm({ ...promoForm, end_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPromo(false)}>Cancel</Button>
            <Button onClick={() => {
              createPromo.mutate({ ...promoForm, discount_value: parseFloat(promoForm.discount_value) || 0, min_order_amount: parseFloat(promoForm.min_order_amount) || 0 });
              setShowNewPromo(false);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
