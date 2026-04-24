import { usePMOAlerts } from '@/hooks/usePMOAlerts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BellOff, Bell, Mail, Save } from 'lucide-react';
import { useState, useEffect } from 'react';

const CATEGORIES = ['budget', 'schedule', 'resource', 'risk', 'quality'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function AlertSubscriptions() {
  const { subscriptions, upsertSubscription } = usePMOAlerts();
  const subMap = new Map(subscriptions.map(s => [s.alert_category, s]));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle>
        <CardDescription className="text-xs">Configure how you receive alerts for each category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid grid-cols-[1fr,70px,70px,100px] gap-3 pb-2 border-b text-[10px] text-muted-foreground font-medium">
          <span>Category</span>
          <span className="text-center">In-App</span>
          <span className="text-center">Email</span>
          <span className="text-center">Frequency</span>
        </div>
        {CATEGORIES.map(cat => {
          const sub = subMap.get(cat);
          return (
            <div key={cat} className="grid grid-cols-[1fr,70px,70px,100px] gap-3 py-2.5 items-center border-b last:border-0">
              <span className="text-sm font-medium capitalize">{cat}</span>
              <div className="flex justify-center">
                <Switch
                  checked={sub?.in_app_enabled ?? true}
                  onCheckedChange={(v) => upsertSubscription.mutate({ alert_category: cat, in_app_enabled: v })}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={sub?.email_enabled ?? true}
                  onCheckedChange={(v) => upsertSubscription.mutate({ alert_category: cat, email_enabled: v })}
                />
              </div>
              <Select
                value={sub?.email_frequency || 'immediate'}
                onValueChange={(v) => upsertSubscription.mutate({ alert_category: cat, email_frequency: v })}
              >
                <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily_digest">Daily Digest</SelectItem>
                  <SelectItem value="weekly_summary">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
