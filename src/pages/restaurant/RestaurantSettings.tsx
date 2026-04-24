import { useState } from 'react';
import { useRestaurantBranches } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Store, Utensils, Receipt, CreditCard, Shield, Bell, Settings, Percent, Tag } from 'lucide-react';

export default function RestaurantSettings() {
  const { data: branches } = useRestaurantBranches();

  const configSections = [
    { title: 'Brands & Branches', icon: Building2, items: ['Brand setup', 'Branch configuration', 'Operating hours', 'Default warehouse per branch', 'Cost center mapping'] },
    { title: 'Dining Areas & Tables', icon: Store, items: ['Floor plan configuration', 'Table capacity', 'Area assignment', 'Table shapes and positions'] },
    { title: 'Kitchen Stations', icon: Utensils, items: ['Station names', 'Routing rules', 'Display preferences', 'Preparation time targets'] },
    { title: 'Tax & Service Charges', icon: Percent, items: ['VAT configuration (15%)', 'Service charge %', 'Tax-inclusive pricing', 'Tax exemptions'] },
    { title: 'Receipt & Print', icon: Receipt, items: ['Receipt header/footer', 'Company/branch info', 'VAT number', 'QR code', 'Thermal/A4 format'] },
    { title: 'Payment Methods', icon: CreditCard, items: ['Cash', 'Card', 'Bank transfer', 'Digital wallet', 'Split payment', 'COD for delivery'] },
    { title: 'Promotions & Loyalty', icon: Tag, items: ['Promotion rules', 'Coupon codes', 'Happy hour config', 'Loyalty earning rules', 'Redemption limits'] },
    { title: 'Approval Rules', icon: Shield, items: ['Discount > threshold', 'Price override', 'Refund approval', 'Void/cancel approval', 'Shift discrepancy'] },
    { title: 'Notifications', icon: Bell, items: ['Low stock alerts', 'Kitchen delay alerts', 'Shift discrepancy', 'Order status updates', 'Delivery delays'] },
    { title: 'General', icon: Settings, items: ['Default walk-in customer', 'Numbering series', 'Offline mode config', 'Aggregator API settings', 'Delivery zone setup'] },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Restaurant Settings</h1>
        <p className="text-sm text-muted-foreground">Configure brands, branches, terminals, kitchen, tax, receipts, and business rules</p>
      </div>

      {/* Branches overview */}
      <Card className="border">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Restaurant Branches</CardTitle></CardHeader>
        <CardContent>
          {(branches || []).length > 0 ? (
            <div className="space-y-2">
              {(branches || []).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">{b.branch_name}</p>
                    <p className="text-xs text-muted-foreground">WH: {b.default_warehouse_code || 'N/A'} • Tax: {b.default_tax_code || 'VAT15'} • Service: {b.service_charge_percent || 0}%</p>
                  </div>
                  <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No branches configured yet</p>}
        </CardContent>
      </Card>

      {/* Config sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configSections.map(section => (
          <Card key={section.title} className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><section.icon className="h-4 w-4" />{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {section.items.map(item => (
                  <div key={item} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Configured</Badge>
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
