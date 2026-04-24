import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Save, Plus, Search, Upload, Download, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface MenuAliasEntry {
  id: string;
  menuItem: string;
  route: string;
  aliases: string[];
  aliasesAr: string[];
  searchCount: number;
}

const MOCK_ALIASES: MenuAliasEntry[] = [
  { id: '1', menuItem: 'Goods Receipt PO', route: '/goods-receipt', aliases: ['GRPO', 'Receipt from Supplier', 'Purchase Receipt', 'GR'], aliasesAr: ['استلام بضاعة', 'إيصال شراء'], searchCount: 342 },
  { id: '2', menuItem: 'Sales Order', route: '/sales-orders', aliases: ['SO', 'Customer Order', 'Sales Contract'], aliasesAr: ['أمر بيع', 'طلب عميل'], searchCount: 567 },
  { id: '3', menuItem: 'AR Invoice', route: '/ar-invoices', aliases: ['Customer Invoice', 'Sales Invoice', 'AR Inv', 'A/R Invoice'], aliasesAr: ['فاتورة عميل', 'فاتورة مبيعات'], searchCount: 489 },
  { id: '4', menuItem: 'AP Invoice', route: '/ap-invoices', aliases: ['Vendor Invoice', 'Purchase Invoice', 'AP Inv', 'A/P Invoice'], aliasesAr: ['فاتورة مورد', 'فاتورة مشتريات'], searchCount: 312 },
  { id: '5', menuItem: 'Journal Entry', route: '/journal-entries', aliases: ['JE', 'GL Entry', 'Manual Posting'], aliasesAr: ['قيد يومية', 'ترحيل يدوي'], searchCount: 201 },
  { id: '6', menuItem: 'Chart of Accounts', route: '/chart-of-accounts', aliases: ['COA', 'GL Accounts', 'Account List'], aliasesAr: ['دليل الحسابات', 'شجرة الحسابات'], searchCount: 178 },
  { id: '7', menuItem: 'Purchase Order', route: '/purchase-orders', aliases: ['PO', 'Vendor Order', 'Buy Order'], aliasesAr: ['أمر شراء', 'طلب مورد'], searchCount: 423 },
  { id: '8', menuItem: 'Delivery Note', route: '/delivery-notes', aliases: ['DN', 'Dispatch', 'Shipment'], aliasesAr: ['مذكرة تسليم', 'إرسالية'], searchCount: 156 },
];

export default function MenuAlias() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [newAliases, setNewAliases] = useState('');

  const filtered = MOCK_ALIASES.filter(a => !search || a.menuItem.toLowerCase().includes(search.toLowerCase()) || a.aliases.some(al => al.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'أسماء القوائم البديلة' : 'Menu Alias for Searching'}</h1>
          <p className="text-muted-foreground text-sm">{language === 'ar' ? 'إدارة المرادفات والاختصارات للبحث العام' : 'Manage search aliases, synonyms, and abbreviations for global menu search'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5 mr-1.5" />Import</Button>
          <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" />Export</Button>
          <Button size="sm"><Save className="h-3.5 w-3.5 mr-1.5" />Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1"><Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search menu items or aliases..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <Button variant="outline" size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Menu Item</TableHead><TableHead>Aliases (EN)</TableHead><TableHead>Aliases (AR)</TableHead><TableHead className="text-right">Searches</TableHead><TableHead className="w-16"></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => setEditing(item.id)}>
                    <TableCell className="font-medium">{item.menuItem}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{item.aliases.map(a => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}</div></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{item.aliasesAr.map(a => <Badge key={a} variant="outline" className="text-xs" dir="rtl">{a}</Badge>)}</div></TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.searchCount}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Search Analytics</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Searches Today</span><span className="font-medium">1,247</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Unmatched Searches</span><span className="font-medium text-orange-600">23</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Most Searched</span><span className="font-medium">SO (567)</span></div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-1">Top Unmatched Queries:</p>
                <div className="space-y-1">
                  {['bank recon', 'stock count', 'payslip'].map(q => (
                    <div key={q} className="flex items-center justify-between">
                      <span className="text-xs">{q}</span>
                      <Button variant="outline" size="sm" className="h-5 text-xs px-2">Add Alias</Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {editing && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Edit Aliases</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><label className="text-xs text-muted-foreground">English Aliases (comma-separated)</label><Textarea className="text-sm mt-1" rows={3} defaultValue={MOCK_ALIASES.find(a => a.id === editing)?.aliases.join(', ')} /></div>
                <div><label className="text-xs text-muted-foreground">Arabic Aliases (comma-separated)</label><Textarea className="text-sm mt-1" rows={3} dir="rtl" defaultValue={MOCK_ALIASES.find(a => a.id === editing)?.aliasesAr.join(', ')} /></div>
                <div><label className="text-xs text-muted-foreground">Department Keywords</label><Input className="h-8 text-sm" placeholder="e.g. finance, accounting" /></div>
                <Button size="sm" className="w-full"><Save className="h-3.5 w-3.5 mr-1.5" />Update Aliases</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
