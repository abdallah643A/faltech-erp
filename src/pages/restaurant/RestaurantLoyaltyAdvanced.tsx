import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  useLoyaltyTiers, useLoyaltyTierMutations,
  useLoyaltyRewards, useLoyaltyRewardMutations,
  useLoyaltyCampaigns, useLoyaltyCampaignMutations,
} from '@/hooks/useRestaurantEnhanced';
import { Crown, Gift, Megaphone, Plus } from 'lucide-react';

export default function RestaurantLoyaltyAdvanced() {
  const { data: tiers } = useLoyaltyTiers();
  const { data: rewards } = useLoyaltyRewards();
  const { data: campaigns } = useLoyaltyCampaigns();
  const tierMut = useLoyaltyTierMutations();
  const rewardMut = useLoyaltyRewardMutations();
  const campMut = useLoyaltyCampaignMutations();

  const [tierForm, setTierForm] = useState({ tier_code: '', tier_name: '', min_spend: 0, points_multiplier: 1, color: '#cd7f32' });
  const [rewardForm, setRewardForm] = useState({ reward_name: '', reward_type: 'discount', points_cost: 100, discount_value: 10 });
  const [campForm, setCampForm] = useState({ campaign_name: '', campaign_type: 'birthday', bonus_points: 100, message_template: '', channel: 'sms' });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-primary" /> Loyalty Program</h1>
        <p className="text-sm text-muted-foreground">Tiers, rewards catalog, and automated campaigns</p>
      </div>

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers"><Crown className="h-3.5 w-3.5 mr-1.5" /> Tiers</TabsTrigger>
          <TabsTrigger value="rewards"><Gift className="h-3.5 w-3.5 mr-1.5" /> Rewards</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="h-3.5 w-3.5 mr-1.5" /> Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-3">
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Tier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Loyalty Tier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Code</Label><Input value={tierForm.tier_code} onChange={e => setTierForm({ ...tierForm, tier_code: e.target.value })} /></div>
                <div><Label>Name</Label><Input value={tierForm.tier_name} onChange={e => setTierForm({ ...tierForm, tier_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Min Spend (SAR)</Label><Input type="number" value={tierForm.min_spend} onChange={e => setTierForm({ ...tierForm, min_spend: +e.target.value })} /></div>
                  <div><Label>Points Multiplier</Label><Input type="number" step="0.1" value={tierForm.points_multiplier} onChange={e => setTierForm({ ...tierForm, points_multiplier: +e.target.value })} /></div>
                </div>
                <div><Label>Color</Label><Input type="color" value={tierForm.color} onChange={e => setTierForm({ ...tierForm, color: e.target.value })} /></div>
                <Button className="w-full" onClick={() => tierMut.upsert.mutate(tierForm)}>Save Tier</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="grid md:grid-cols-3 gap-3">
            {(tiers || []).map((t: any) => (
              <Card key={t.id} style={{ borderTop: `3px solid ${t.color}` }}>
                <CardContent className="p-4">
                  <h3 className="font-bold">{t.tier_name}</h3>
                  <p className="text-xs text-muted-foreground">Min: SAR {t.min_spend} · {t.points_multiplier}x points</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-3">
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Reward</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Reward</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={rewardForm.reward_name} onChange={e => setRewardForm({ ...rewardForm, reward_name: e.target.value })} /></div>
                <div><Label>Type</Label>
                  <Select value={rewardForm.reward_type} onValueChange={v => setRewardForm({ ...rewardForm, reward_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Discount Amount</SelectItem>
                      <SelectItem value="percent_off">Percent Off</SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Points Cost</Label><Input type="number" value={rewardForm.points_cost} onChange={e => setRewardForm({ ...rewardForm, points_cost: +e.target.value })} /></div>
                  <div><Label>Value</Label><Input type="number" value={rewardForm.discount_value} onChange={e => setRewardForm({ ...rewardForm, discount_value: +e.target.value })} /></div>
                </div>
                <Button className="w-full" onClick={() => rewardMut.create.mutate(rewardForm)}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="grid md:grid-cols-2 gap-3">
            {(rewards || []).map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Gift className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-medium">{r.reward_name}</h3>
                    <p className="text-xs text-muted-foreground">{r.reward_type} · {r.discount_value}</p>
                  </div>
                  <Badge>{r.points_cost} pts</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-3">
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> New Campaign</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Loyalty Campaign</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={campForm.campaign_name} onChange={e => setCampForm({ ...campForm, campaign_name: e.target.value })} /></div>
                <div><Label>Trigger</Label>
                  <Select value={campForm.campaign_type} onValueChange={v => setCampForm({ ...campForm, campaign_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="visit_milestone">Visit Milestone</SelectItem>
                      <SelectItem value="inactive">Win-back (Inactive)</SelectItem>
                      <SelectItem value="tier_upgrade">Tier Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Bonus Points</Label><Input type="number" value={campForm.bonus_points} onChange={e => setCampForm({ ...campForm, bonus_points: +e.target.value })} /></div>
                  <div><Label>Channel</Label>
                    <Select value={campForm.channel} onValueChange={v => setCampForm({ ...campForm, channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="in_app">In-app</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Message</Label><Textarea value={campForm.message_template} onChange={e => setCampForm({ ...campForm, message_template: e.target.value })} /></div>
                <Button className="w-full" onClick={() => campMut.create.mutate(campForm)}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="space-y-2">
            {(campaigns || []).map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <h3 className="font-medium">{c.campaign_name}</h3>
                    <p className="text-xs text-muted-foreground">{c.campaign_type} · {c.channel} · {c.bonus_points} bonus pts</p>
                  </div>
                  <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Active' : 'Paused'}</Badge>
                  <span className="text-xs text-muted-foreground">{c.total_sent} sent</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
