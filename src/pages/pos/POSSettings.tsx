import { usePOSProfiles } from '@/hooks/usePOSData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Plus, Monitor, Store } from 'lucide-react';

export default function POSSettings() {
  const { data: profiles, isLoading } = usePOSProfiles();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">POS Settings</h1><p className="text-sm text-muted-foreground">Configure POS profiles, terminals, and business rules</p></div>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Profile</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Store className="h-4 w-4" /> POS Profiles</CardTitle></CardHeader>
          <CardContent>
            {(profiles || []).length > 0 ? (
              <div className="space-y-2">
                {(profiles || []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="text-sm font-medium">{p.profile_name}</p>
                      <p className="text-xs text-muted-foreground">WH: {p.default_warehouse_code || 'N/A'} • Price List: {p.default_price_list || 'Default'}</p>
                    </div>
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No profiles configured. Create a POS profile to define terminal defaults.</p>}
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" /> Terminal Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Default Tax', desc: 'VAT 15% applied on all POS sales' },
              { label: 'Receipt Series', desc: 'POS-YYYY-NNNNN auto-numbering' },
              { label: 'Shift Policy', desc: 'Mandatory shift open before selling' },
              { label: 'Discount Limit', desc: 'Max 10% without manager approval' },
              { label: 'Credit Sales', desc: 'Disabled for walk-in customers' },
              { label: 'Negative Stock', desc: 'Not allowed — real-time stock check' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-2 border rounded">
                <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                <Badge variant="outline" className="text-xs">Configured</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Payment Methods', items: ['Cash', 'Card', 'Bank Transfer', 'Digital Wallet', 'Split Payment', 'Loyalty Redemption'] },
          { title: 'Receipt Template', items: ['Company header', 'Branch info', 'VAT number', 'Cashier name', 'QR code placeholder', 'Return policy'] },
          { title: 'Approval Rules', items: ['Discount > 10%', 'Price override', 'Refund > SAR 500', 'No-receipt return', 'Credit sale', 'Void transaction'] },
        ].map(section => (
          <Card key={section.title} className="border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{section.title}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {section.items.map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
